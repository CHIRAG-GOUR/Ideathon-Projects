'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted } from '@/lib/feedback';

export function SoundToggle() {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      onClick={() => {
        setMuted(!muted);
        setM(!muted);
      }}
      className="btn btn-ghost h-10 min-h-0 w-10 p-0"
      aria-label={muted ? 'Turn sounds on' : 'Turn sounds off'}
      aria-pressed={muted}
      title={muted ? 'Sounds off' : 'Sounds on'}
    >
      {muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
    </button>
  );
}
