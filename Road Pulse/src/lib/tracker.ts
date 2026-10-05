import type { Box, Detection } from '@/types';
import { iou } from './detection/decode';

/**
 * Lightweight IoU tracker for Live Drive. A pothole becomes a confirmed event only after it has been
 * seen in several consecutive-ish frames — single-frame flickers never create reports.
 */
export interface Track {
  id: string;
  box: Box;
  hits: number;
  misses: number;
  bestConfidence: number;
  firstSeen: number;
  lastSeen: number;
  confirmed: boolean;
}

export const TRACK = { minHits: 3, maxMisses: 4, matchIou: 0.2, minConfidence: 0.45 } as const;

export class IouTracker {
  tracks: Track[] = [];
  private next = 1;

  /** Feed one frame's detections; returns tracks that became confirmed on this frame. */
  update(dets: Detection[], now: number): Track[] {
    const confirmedNow: Track[] = [];
    const unmatched = new Set(dets.map((_, i) => i));
    for (const t of this.tracks) {
      let bestI = -1;
      let bestIou: number = TRACK.matchIou;
      for (const i of unmatched) {
        const v = iou(t.box, dets[i].box);
        if (v > bestIou) {
          bestIou = v;
          bestI = i;
        }
      }
      if (bestI >= 0) {
        const d = dets[bestI];
        unmatched.delete(bestI);
        t.box = d.box;
        t.hits++;
        t.misses = 0;
        t.lastSeen = now;
        t.bestConfidence = Math.max(t.bestConfidence, d.confidence);
        if (!t.confirmed && t.hits >= TRACK.minHits && t.bestConfidence >= TRACK.minConfidence) {
          t.confirmed = true;
          confirmedNow.push(t);
        }
      } else {
        t.misses++;
      }
    }
    this.tracks = this.tracks.filter((t) => t.misses <= TRACK.maxMisses);
    for (const i of unmatched) {
      const d = dets[i];
      this.tracks.push({ id: `T${this.next++}`, box: d.box, hits: 1, misses: 0, bestConfidence: d.confidence, firstSeen: now, lastSeen: now, confirmed: false });
    }
    return confirmedNow;
  }
}

/** Haversine distance in metres. */
export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (bLat - aLat) * toR, dLon = (bLon - aLon) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
