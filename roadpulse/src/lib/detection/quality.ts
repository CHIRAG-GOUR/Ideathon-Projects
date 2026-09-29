/**
 * Is the photo usable? Real measurements on a downscaled greyscale copy:
 * - brightness: mean luma (0..255)
 * - sharpness: variance of the Laplacian (low = blurry)
 */
export interface Quality {
  brightness: number;
  sharpness: number;
  ok: boolean;
  problem: 'dark' | 'bright' | 'blurry' | null;
}

export const QUALITY_LIMITS = { minBrightness: 40, maxBrightness: 235, minSharpness: 12 } as const;

export function measureQuality(rgba: Uint8ClampedArray, width: number, height: number): Quality {
  const n = width * height;
  const g = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    g[i] = v;
    sum += v;
  }
  const brightness = sum / n;
  let lsum = 0, lsq = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = g[i - width] + g[i + width] + g[i - 1] + g[i + 1] - 4 * g[i];
      lsum += lap;
      lsq += lap * lap;
      count++;
    }
  }
  const mean = count ? lsum / count : 0;
  const sharpness = count ? lsq / count - mean * mean : 0;
  const problem = brightness < QUALITY_LIMITS.minBrightness ? 'dark' : brightness > QUALITY_LIMITS.maxBrightness ? 'bright' : sharpness < QUALITY_LIMITS.minSharpness ? 'blurry' : null;
  return { brightness: Math.round(brightness), sharpness: Math.round(sharpness * 10) / 10, ok: !problem, problem };
}
