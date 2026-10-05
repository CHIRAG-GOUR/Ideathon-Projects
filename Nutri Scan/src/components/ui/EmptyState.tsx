import React from 'react';
import Link from 'next/link';
import { Emoji3D } from '@/components/ui/Emoji3D';

export function EmptyState({ emoji, title, text, cta, href, onClick }: { emoji: string; title: string; text?: string; cta?: string; href?: string; onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-4xl border-2 border-dashed border-cloud-300 bg-white/60 px-6 py-10 text-center">
      <span className="text-5xl" aria-hidden>
        <Emoji3D emoji={emoji} size={64} />
      </span>
      <p className="mt-3 text-lg font-extrabold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-ink-muted">{text}</p>}
      {cta && href && (
        <Link href={href} className="btn btn-primary mt-5">
          {cta}
        </Link>
      )}
      {cta && onClick && !href && (
        <button onClick={onClick} className="btn btn-primary mt-5">
          {cta}
        </button>
      )}
    </div>
  );
}
