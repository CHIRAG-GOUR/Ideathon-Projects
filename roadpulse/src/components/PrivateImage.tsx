'use client';

import { useEffect, useState } from 'react';
import { privateImage } from '@/lib/firebase';
import { cn } from '@/lib/cn';

/** Report photos are private; this loads them for the owner / admins through the server. */
export function PrivateImage({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!path) return;
    let revoked: string | null = null;
    privateImage(path)
      .then((u) => {
        revoked = u;
        setUrl(u);
      })
      .catch(() => setFailed(true));
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [path]);
  if (!path || failed) return <div className={cn('flex items-center justify-center bg-paper-200 text-xs font-semibold text-graphite-muted', className)}>{path ? 'Photo is private' : 'No photo'}</div>;
  if (!url) return <div className={cn('animate-pulse bg-paper-200', className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={cn('object-cover', className)} data-testid="private-image" />;
}
