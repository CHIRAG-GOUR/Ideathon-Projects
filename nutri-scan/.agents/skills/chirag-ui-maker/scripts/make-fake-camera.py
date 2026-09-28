"""Turn a screenshot (e.g. a printed barcode card) into a fake webcam clip (.y4m) for Chromium.

Usage: python make-fake-camera.py card.png out.y4m [scale=0.3] [angle=4] [blur=0.8] [noise=5]
Then launch Chromium with:
  --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-video-capture=out.y4m
Requires: pip install pillow numpy
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

card, out = sys.argv[1], sys.argv[2]
scale, angle, blur, noise = (float(x) for x in (sys.argv[3:7] + ['0.3', '4', '0.8', '5'][len(sys.argv[3:7]):]))
W, H = 1280, 720
bg = Image.new('RGB', (W, H), (196, 170, 128))
im = Image.open(card).convert('RGB')
tw = int(W * scale); th = int(im.height * tw / im.width)
im = im.resize((tw, th), Image.LANCZOS).rotate(angle, expand=True, fillcolor=(196, 170, 128))
bg.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
if blur > 0:
    bg = bg.filter(ImageFilter.GaussianBlur(blur))
base = np.asarray(bg).astype(np.float32)
rng = np.random.default_rng(1)
with open(out, 'wb') as f:
    f.write(f'YUV4MPEG2 W{W} H{H} F15:1 Ip A1:1 C420jpeg\n'.encode())
    for _ in range(15):
        fr = np.clip(base + rng.normal(0, noise, base.shape), 0, 255)
        R, G, B = fr[..., 0], fr[..., 1], fr[..., 2]
        Y = 0.299 * R + 0.587 * G + 0.114 * B
        U = (-0.168736 * R - 0.331264 * G + 0.5 * B + 128).reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))
        V = (0.5 * R - 0.418688 * G - 0.081312 * B + 128).reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))
        f.write(b'FRAME\n')
        for P in (Y, U, V):
            f.write(np.clip(P, 0, 255).astype(np.uint8).tobytes())
print('wrote', out)
