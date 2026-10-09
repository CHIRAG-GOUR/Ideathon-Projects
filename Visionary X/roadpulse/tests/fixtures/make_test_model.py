"""Stand-in model with the exact YOLOv8 pothole ONNX interface (input 'images' [1,3,640,640] → 'output0' [1,5,8400]).
Used ONLY by automated tests (the app never ships it). Its confidence depends on the image: a frame whose mean
red channel is bright gives confident detections; a dim frame gives none. Three boxes of different sizes let the
tests check low / medium / high severity colouring."""
import numpy as np, onnx, sys
from onnx import helper, TensorProto, numpy_helper

N = 8400
boxes = np.zeros((1, 4, N), np.float32)
mask = np.zeros((1, 1, N), np.float32)
# (anchor, cx, cy, w, h, weight) in 640×640 model space
for a, cx, cy, w, h, wt in [(1000, 320, 420, 300, 180, 1.0), (1001, 324, 422, 300, 180, 0.9), (2000, 150, 250, 110, 70, 0.95), (3000, 520, 200, 40, 28, 0.92)]:
    boxes[0, :, a] = [cx, cy, w, h]
    mask[0, 0, a] = wt

nodes = [
    helper.make_node('ReduceMean', ['images'], ['mean'], axes=[2, 3], keepdims=1),                  # [1,3,1,1]
    helper.make_node('Slice', ['mean', 's0', 's1', 'sax'], ['red']),                                 # [1,1,1,1]
    helper.make_node('Sub', ['red', 'off'], ['r1']),
    helper.make_node('Mul', ['r1', 'gain'], ['r2']),
    helper.make_node('Clip', ['r2', 'lo', 'hi'], ['conf']),
    helper.make_node('Reshape', ['conf', 'shape3'], ['conf3']),                                      # [1,1,1]
    helper.make_node('Mul', ['mask', 'conf3'], ['scores']),                                          # [1,1,N]
    helper.make_node('Concat', ['boxes', 'scores'], ['output0'], axis=1),                            # [1,5,N]
]
inits = [
    numpy_helper.from_array(boxes, 'boxes'), numpy_helper.from_array(mask, 'mask'),
    numpy_helper.from_array(np.array([0], np.int64), 's0'), numpy_helper.from_array(np.array([1], np.int64), 's1'),
    numpy_helper.from_array(np.array([1], np.int64), 'sax'),
    numpy_helper.from_array(np.array(0.3, np.float32), 'off'), numpy_helper.from_array(np.array(3.0, np.float32), 'gain'),
    numpy_helper.from_array(np.array(0.0, np.float32), 'lo'), numpy_helper.from_array(np.array(0.95, np.float32), 'hi'),
    numpy_helper.from_array(np.array([1, 1, 1], np.int64), 'shape3'),
]
graph = helper.make_graph(nodes, 'pothole_test', [helper.make_tensor_value_info('images', TensorProto.FLOAT, [1, 3, 640, 640])],
                          [helper.make_tensor_value_info('output0', TensorProto.FLOAT, [1, 5, N])], inits)
model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 12)])
model.ir_version = 8
onnx.checker.check_model(model)
onnx.save(model, sys.argv[1])

import onnxruntime as ort
s = ort.InferenceSession(sys.argv[1])
bright = np.full((1, 3, 640, 640), 0.62, np.float32)
dim = np.full((1, 3, 640, 640), 0.3, np.float32)
print('bright conf', s.run(None, {'images': bright})[0][0, 4, 1000], 'dim conf', s.run(None, {'images': dim})[0][0, 4, 1000])
