import Link from 'next/link';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#FFFFFF" stroke="#DEDAD2" />
      <path d="M13 34 L18 6 M27 34 L22 6" stroke="#2B2F33" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 9v3M20 16v3M20 23v3" stroke="#F6B02A" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="20" cy="30.5" rx="5.2" ry="2.6" fill="#E5484D" />
      <path d="M5 21h5l2-4 3 8 2-4h2" stroke="#2F9A5E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="RoadPulse home">
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-xl font-bold tracking-tight text-graphite">
        Road<span className="text-road-500">Pulse</span>
      </span>
    </Link>
  );
}
