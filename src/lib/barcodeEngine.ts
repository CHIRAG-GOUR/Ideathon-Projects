'use client';

/**
 * Real barcode decoding for live camera frames.
 *
 * 1. Uses the browser's built-in BarcodeDetector when available (Chrome on Android,
 *    macOS, ChromeOS) — fast and very reliable.
 * 2. Falls back to ZXing everywhere else (iOS Safari, Firefox, desktop Linux/Windows).
 *
 * Supported: Code 128 (used by our printed demo sheet), EAN-13, EAN-8, UPC-A, UPC-E.
 */

export type EngineName = 'native' | 'zxing';

export interface BarcodeEngine {
  name: EngineName;
  /** Returns the decoded text, or null when no barcode is visible in this frame. */
  detect: (video: HTMLVideoElement) => Promise<string | null>;
}

interface DetectedBarcodeLike {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcodeLike[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

const NATIVE_FORMATS = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e'];

/* ---------- Frame preprocessing (shared by both engines) ---------- */

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
  maxWidth: number;
  sharpen: boolean;
}

/**
 * Regions tried on successive frames. Centre crops match the on-screen scanning frame
 * and give small barcodes more pixels; the full frame catches labels held off-centre.
 * Sharpening (unsharp mask) rescues slightly out-of-focus phone frames — in testing it
 * turned blurry, far-away labels from unreadable into reliable reads.
 */
const REGIONS: Region[] = [
  { x: 0.1, y: 0.25, w: 0.8, h: 0.5, maxWidth: 1280, sharpen: true },
  { x: 0, y: 0, w: 1, h: 1, maxWidth: 1280, sharpen: false },
  { x: 0.1, y: 0.25, w: 0.8, h: 0.5, maxWidth: 1280, sharpen: false },
  { x: 0, y: 0, w: 1, h: 1, maxWidth: 1280, sharpen: true },
  { x: 0.2, y: 0.3, w: 0.6, h: 0.4, maxWidth: 1100, sharpen: true },
];

class FrameGrabber {
  canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  private blurBuf = new Float32Array(0);
  private tmpBuf = new Float32Array(0);

  /** Draws a region of the video and returns its greyscale pixels. */
  grab(video: HTMLVideoElement, r: Region): { gray: Uint8ClampedArray; width: number; height: number } | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const sw = Math.round(video.videoWidth * r.w);
    const sh = Math.round(video.videoHeight * r.h);
    const scale = Math.min(1.5, r.maxWidth / sw);
    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));
    this.canvas.width = width;
    this.canvas.height = height;
    ctx.drawImage(video, Math.round(video.videoWidth * r.x), Math.round(video.videoHeight * r.y), sw, sh, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
      gray[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
    }
    if (r.sharpen) this.unsharp(gray, width, height);
    return { gray, width, height };
  }

  /** In-place unsharp mask: out = px + 1.5 × (px − blur), blur = 5×5 box (separable). */
  private unsharp(px: Uint8ClampedArray, w: number, h: number) {
    const n = w * h;
    if (this.blurBuf.length < n) {
      this.blurBuf = new Float32Array(n);
      this.tmpBuf = new Float32Array(n);
    }
    const tmp = this.tmpBuf;
    const blur = this.blurBuf;
    const R = 2;
    const norm = 1 / (2 * R + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let k = -R; k <= R; k++) acc += px[row + Math.min(w - 1, Math.max(0, k))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc * norm;
        acc += px[row + Math.min(w - 1, x + R + 1)] - px[row + Math.max(0, x - R)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -R; k <= R; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
      for (let y = 0; y < h; y++) {
        blur[y * w + x] = acc * norm;
        acc += tmp[Math.min(h - 1, y + R + 1) * w + x] - tmp[Math.max(0, y - R) * w + x];
      }
    }
    for (let i = 0; i < n; i++) px[i] = px[i] + 1.5 * (px[i] - blur[i]);
  }

  /** Paints greyscale pixels back onto the canvas (for the native detector). */
  paint(gray: Uint8ClampedArray, width: number, height: number) {
    if (!this.ctx) return;
    const img = this.ctx.createImageData(width, height);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
      img.data[j] = img.data[j + 1] = img.data[j + 2] = gray[i];
      img.data[j + 3] = 255;
    }
    this.ctx.putImageData(img, 0, 0);
  }
}

async function createNativeEngine(): Promise<BarcodeEngine | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = Ctor.getSupportedFormats ? await Ctor.getSupportedFormats() : NATIVE_FORMATS;
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.includes('code_128')) return null;
    const detector = new Ctor({ formats });
    const grabber = new FrameGrabber();
    let frame = 0;
    return {
      name: 'native',
      detect: async (video) => {
        if (video.readyState < 2 || !video.videoWidth) return null;
        // Odd frames: the raw video. Even frames: a sharpened centre crop.
        let source: CanvasImageSource = video;
        if (frame++ % 2 === 1) {
          const g = grabber.grab(video, REGIONS[0]);
          if (g) {
            grabber.paint(g.gray, g.width, g.height);
            source = grabber.canvas;
          }
        }
        const results = await detector.detect(source);
        const hit = results.find((r) => r.rawValue && r.rawValue.trim().length > 0);
        return hit ? hit.rawValue : null;
      },
    };
  } catch {
    return null;
  }
}

async function createZxingEngine(): Promise<BarcodeEngine> {
  const lib = await import('@zxing/library');
  const { BarcodeFormat, DecodeHintType, MultiFormatOneDReader, RGBLuminanceSource, HybridBinarizer, BinaryBitmap } = lib;

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatOneDReader(hints);
  const grabber = new FrameGrabber();
  let frame = 0;

  return {
    name: 'zxing',
    detect: async (video) => {
      if (video.readyState < 2 || !video.videoWidth) return null;
      const g = grabber.grab(video, REGIONS[frame++ % REGIONS.length]);
      if (!g) return null;
      try {
        const source = new RGBLuminanceSource(g.gray, g.width, g.height);
        return reader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText();
      } catch {
        return null; // NotFoundException: nothing in this frame
      } finally {
        reader.reset();
      }
    },
  };
}

export async function createBarcodeEngine(prefer?: EngineName): Promise<BarcodeEngine> {
  if (prefer !== 'zxing') {
    const native = await createNativeEngine();
    if (native) return native;
  }
  return createZxingEngine();
}

export type CameraErrorKind = 'denied' | 'no-camera' | 'insecure' | 'in-use' | 'unsupported' | 'unknown';

export function classifyCameraError(err: unknown): CameraErrorKind {
  const name = err instanceof Error ? err.name : (err as { name?: string })?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use';
    case 'InsecureContext':
      return 'insecure';
    case 'Unsupported':
      return 'unsupported';
    default:
      return 'unknown';
  }
}

/** Opens the camera, preferring the rear (environment) camera on phones. */
export async function openCamera(deviceId?: string): Promise<MediaStream> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    const e = new Error('Camera needs HTTPS or localhost');
    e.name = 'InsecureContext';
    throw e;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    const e = new Error('getUserMedia is not supported');
    e.name = 'Unsupported';
    throw e;
  }
  const base: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };
  const video: MediaTrackConstraints = deviceId
    ? { ...base, deviceId: { exact: deviceId } }
    : { ...base, facingMode: { ideal: 'environment' } };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch (err) {
    // Some laptops reject the resolution hints — retry with the simplest request.
    if ((err as Error)?.name === 'OverconstrainedError' || (err as Error)?.name === 'NotReadableError') {
      return navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId } : true, audio: false });
    }
    throw err;
  }
}

/** Ask the camera for continuous autofocus where the device supports it. */
export async function tuneCameraTrack(track: MediaStreamTrack) {
  try {
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { focusMode?: string[] };
    if (caps.focusMode?.includes('continuous')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
    }
  } catch {
    // Not supported — fine.
  }
}

export function trackSupportsTorch(track: MediaStreamTrack | undefined): boolean {
  if (!track?.getCapabilities) return false;
  const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
  return Boolean(caps.torch);
}

export async function setTorch(track: MediaStreamTrack, on: boolean) {
  await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
}
