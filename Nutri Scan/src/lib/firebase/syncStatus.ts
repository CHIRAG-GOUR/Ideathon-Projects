'use client';

import { create } from 'zustand';

export type SyncState = 'disabled' | 'connecting' | 'synced' | 'saving' | 'offline' | 'error';

export const useSyncStatus = create<{ state: SyncState; uid: string | null; set: (s: SyncState, uid?: string | null) => void }>((set) => ({
  state: 'connecting',
  uid: null,
  set: (state, uid) => set((prev) => ({ state, uid: uid === undefined ? prev.uid : uid })),
}));
