'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { classifyCameraError, openCamera, tuneTrack, type CameraErrorKind, type Facing } from '@/lib/camera';

export interface CameraHandle {
  /** Freeze the current frame and return it as a full-resolution canvas. */
  capture: () => HTMLCanvasElement | null;
}

interface Props {
  facing: Facing;
  onStatus: (s: { state: 'starting' | 'live' | 'error'; error?: CameraErrorKind }) => void;
}

/**
 * Real camera via getUserMedia. Rear camera by default; switching facing restarts only the
 * stream (no page reload). A generation counter stops slow, superseded starts from leaking streams.
 * Frames never leave the phone until the user presses Capture.
 */
export const CameraView = forwardRef<CameraHandle, Props>(function CameraView({ facing, onStatus }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const gen = useRef(0);
  const statusCb = useRef(onStatus);
  statusCb.current = onStatus;
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const myGen = ++gen.current;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
    statusCb.current({ state: 'starting' });

    openCamera(facing)
      .then(async (s) => {
        if (cancelled || myGen !== gen.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        v.muted = true;
        v.setAttribute('playsinline', 'true');
        await v.play().catch(() => undefined);
        const track = s.getVideoTracks()[0];
        if (track) {
          await tuneTrack(track);
          track.addEventListener('ended', () => statusCb.current({ state: 'error', error: 'in-use' }));
        }
        if (cancelled || myGen !== gen.current) return;
        setLive(true);
        statusCb.current({ state: 'live' });
      })
      .catch((err) => {
        if (cancelled || myGen !== gen.current) return;
        statusCb.current({ state: 'error', error: classifyCameraError(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [facing]);

  // Release the camera when the scanner closes.
  useEffect(
    () => () => {
      gen.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      capture: () => {
        const v = video.current;
        if (!v || !v.videoWidth) return null;
        const c = document.createElement('canvas');
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        if (facing === 'user') {
          ctx.translate(c.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0);
        v.pause();
        return c;
      },
    }),
    [facing]
  );

  return (
    <video
      ref={video}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined, opacity: live ? 1 : 0, transition: 'opacity 250ms' }}
      playsInline
      muted
      autoPlay
      data-testid="camera-video"
      data-facing={facing}
      data-live={live ? 'true' : 'false'}
    />
  );
});
