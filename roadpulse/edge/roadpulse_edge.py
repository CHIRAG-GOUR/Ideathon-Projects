"""RoadPulse edge agent for a vehicle computer (Jetson / Raspberry Pi / laptop).

camera → YOLOv8 → ByteTrack → gpsd fix → confirmed event → SQLite queue → /api/vehicle/events

Inference stays on the device. Only a confirmed pothole is uploaded (one small crop + coordinates);
frames are never streamed. Without a recent real GPS fix an event is dropped, never guessed.

Usage:
  export ROADPULSE_URL=https://roadpulse-ideathon.web.app
  export ROADPULSE_DEVICE_ID=...  ROADPULSE_DEVICE_KEY=...   # from Dashboard → Vehicles → Register
  python roadpulse_edge.py --model pothole-yolov8s.pt --camera 0
"""
import argparse, base64, json, os, socket, sqlite3, threading, time
from datetime import datetime, timezone

import cv2
import requests
from ultralytics import YOLO

MIN_HITS, MIN_CONF = 3, 0.45          # same confirmation rule as the web Live Drive
MAX_FIX_AGE_S, MAX_ACCURACY_M = 15, 100
URL = os.environ.get("ROADPULSE_URL", "https://roadpulse-ideathon.web.app").rstrip("/")
HEADERS = {"X-Device-Id": os.environ["ROADPULSE_DEVICE_ID"], "X-Device-Key": os.environ["ROADPULSE_DEVICE_KEY"]}


class Gps(threading.Thread):
    """Latest TPV fix from gpsd (localhost:2947). Nothing is reported until the receiver has a 2D/3D fix."""

    def __init__(self):
        super().__init__(daemon=True)
        self.fix = None

    def run(self):
        while True:
            try:
                with socket.create_connection(("127.0.0.1", 2947)) as s:
                    s.sendall(b'?WATCH={"enable":true,"json":true};\n')
                    for line in s.makefile():
                        m = json.loads(line)
                        if m.get("class") == "TPV" and m.get("mode", 0) >= 2 and "lat" in m:
                            acc = max(m.get("epx", 0), m.get("epy", 0)) or m.get("eph")
                            self.fix = (m["lat"], m["lon"], acc, time.time())
            except (OSError, ValueError):
                self.fix = None
                time.sleep(2)

    def current(self):
        f = self.fix
        if not f or time.time() - f[3] > MAX_FIX_AGE_S or (f[2] is not None and f[2] > MAX_ACCURACY_M):
            return None
        return f


class Queue:
    """Offline-safe queue: events survive power loss and no-network stretches."""

    def __init__(self, path="roadpulse-queue.db"):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, body TEXT)")
        self.lock = threading.Lock()

    def put(self, body):
        with self.lock:
            self.db.execute("INSERT INTO events (body) VALUES (?)", (json.dumps(body),))
            self.db.commit()

    def flush(self):
        with self.lock:
            rows = self.db.execute("SELECT id, body FROM events ORDER BY id LIMIT 20").fetchall()
        for rid, body in rows:
            try:
                r = requests.post(f"{URL}/api/vehicle/events", data=body, headers={**HEADERS, "Content-Type": "application/json"}, timeout=20)
            except requests.RequestException:
                return  # offline: keep everything, try later
            if r.ok or r.status_code in (400, 422):  # delivered, or permanently invalid
                with self.lock:
                    self.db.execute("DELETE FROM events WHERE id = ?", (rid,))
                    self.db.commit()
            else:
                return

    def pending(self):
        with self.lock:
            return self.db.execute("SELECT COUNT(*) FROM events").fetchone()[0]


def uploader(queue, gps):
    last_beat = 0
    while True:
        queue.flush()
        if time.time() - last_beat > 60:
            f = gps.current()
            try:
                requests.post(f"{URL}/api/vehicle/heartbeat", json={"latitude": f and f[0], "longitude": f and f[1]}, headers=HEADERS, timeout=10)
                last_beat = time.time()
            except requests.RequestException:
                pass
        time.sleep(15)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="YOLOv8 pothole weights (.pt or .onnx)")
    ap.add_argument("--camera", default="0", help="camera index or RTSP/file URL")
    ap.add_argument("--imgsz", type=int, default=640)
    a = ap.parse_args()

    requests.post(f"{URL}/api/vehicle/verify", headers=HEADERS, timeout=10).raise_for_status()
    gps, queue = Gps(), Queue()
    gps.start()
    threading.Thread(target=uploader, args=(queue, gps), daemon=True).start()

    model = YOLO(a.model)
    cam = cv2.VideoCapture(int(a.camera) if a.camera.isdigit() else a.camera)
    tracks = {}  # track id → {"hits", "best", "sent"}
    while True:
        ok, frame = cam.read()
        if not ok:
            time.sleep(0.5)
            continue
        res = model.track(frame, persist=True, tracker="bytetrack.yaml", imgsz=a.imgsz, conf=0.25, verbose=False)[0]
        if res.boxes.id is None:
            continue
        h, w = frame.shape[:2]
        for tid, conf, (x1, y1, x2, y2) in zip(res.boxes.id.int().tolist(), res.boxes.conf.tolist(), res.boxes.xyxy.tolist()):
            t = tracks.setdefault(tid, {"hits": 0, "best": 0.0, "sent": False})
            t["hits"] += 1
            t["best"] = max(t["best"], conf)
            if t["sent"] or t["hits"] < MIN_HITS or t["best"] < MIN_CONF:
                continue
            t["sent"] = True
            fix = gps.current()
            if not fix:
                print(f"pothole track {tid}: no GPS lock — not recorded")
                continue
            x1, y1, x2, y2 = max(0, int(x1)), max(0, int(y1)), min(w, int(x2)), min(h, int(y2))
            pad = int(0.25 * max(x2 - x1, y2 - y1))
            crop = frame[max(0, y1 - pad):min(h, y2 + pad), max(0, x1 - pad):min(w, x2 + pad)]
            jpeg = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 80])[1].tobytes()
            queue.put({
                "trackId": f"edge-{tid}", "confidence": round(t["best"], 3),
                "box": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1}, "imageWidth": w, "imageHeight": h,
                "latitude": fix[0], "longitude": fix[1], "accuracy": fix[2],
                "detectedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "imageJpegBase64": base64.b64encode(jpeg).decode(),
            })
            print(f"pothole track {tid} queued ({t['best']:.2f}) — {queue.pending()} pending")


if __name__ == "__main__":
    main()
