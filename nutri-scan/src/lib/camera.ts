/** Camera helpers: rear camera by default, front on request, clear error kinds for the UI. */
export type Facing = 'environment' | 'user';
export type CameraErrorKind = 'denied' | 'no-camera' | 'insecure' | 'in-use' | 'unsupported' | 'unknown';

export async function openCamera(facing: Facing): Promise<MediaStream> {
  if (!window.isSecureContext) throw Object.assign(new Error('insecure'), { name: 'InsecureContext' });
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unsupported'), { name: 'Unsupported' });
  const video: MediaTrackConstraints = { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === 'OverconstrainedError' || name === 'NotReadableError') {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
    }
    throw err;
  }
}

export function classifyCameraError(err: unknown): CameraErrorKind {
  switch ((err as Error)?.name) {
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

export async function tuneTrack(track: MediaStreamTrack) {
  try {
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { focusMode?: string[] };
    if (caps.focusMode?.includes('continuous')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
    }
  } catch {
    /* optional */
  }
}
