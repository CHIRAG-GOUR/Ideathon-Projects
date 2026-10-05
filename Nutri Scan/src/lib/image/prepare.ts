/**
 * Shrink a camera frame / photo before it leaves the phone:
 * long edge ≤ 1024 px, JPEG, stepping quality down until it's under ~300 KB.
 * A 12 MP photo (4–6 MB) becomes ~120–250 KB — plenty for recognition, fast on mobile data.
 */
export interface PreparedImage {
  dataUrl: string; // full recognition image (JPEG)
  base64: string;
  mimeType: 'image/jpeg';
  bytes: number;
  width: number;
  height: number;
  thumb: string; // ~160 px preview, only kept if the user chooses to save it
}

const MAX_EDGE = 1024;
const TARGET_BYTES = 300_000;

type Source = HTMLVideoElement | ImageBitmap | HTMLCanvasElement | HTMLImageElement;

function sourceSize(src: Source): { w: number; h: number } {
  if (typeof HTMLVideoElement !== 'undefined' && src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight };
  if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: (src as ImageBitmap | HTMLCanvasElement).width, h: (src as ImageBitmap | HTMLCanvasElement).height };
}

function draw(src: Source, maxEdge: number, mirror = false): HTMLCanvasElement {
  const { w, h } = sourceSize(src);
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.imageSmoothingQuality = 'high';
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function prepareImage(src: Source, opts: { mirror?: boolean } = {}): PreparedImage {
  const canvas = draw(src, MAX_EDGE, opts.mirror);
  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length * 0.75 > TARGET_BYTES && quality > 0.45) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  const thumbCanvas = draw(canvas, 160);
  return {
    dataUrl,
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: 'image/jpeg',
    bytes: Math.round(dataUrl.length * 0.75),
    width: canvas.width,
    height: canvas.height,
    thumb: thumbCanvas.toDataURL('image/jpeg', 0.7),
  };
}

/** Decode an uploaded file (respecting phone EXIF rotation). */
export async function fileToBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('That image is too large (max 25 MB).');
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall back to <img> (e.g. HEIC on some browsers) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
