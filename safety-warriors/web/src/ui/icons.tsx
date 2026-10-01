// Safety Warriors line icons (original, 24×24, 2px stroke).
const P = {
  home: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z',
  shield: 'M12 3l7 2.6v5.6c0 4.6-3 8.2-7 9.8-4-1.6-7-5.2-7-9.8V5.6z',
  people: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.3a3.5 3.5 0 010 6.4M18 14.8c2 .6 3.2 2.3 3.5 5.2',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 001.7-1l2.4 1 2-3.4z',
  check: 'M20 6L9 17l-5-5',
  pin: 'M12 21s-7-6.4-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.6 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  vault: 'M4 5h16v14H4zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM12 10.5V12M7 19v2M17 19v2',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0',
  eyeoff: 'M3 3l18 18M10.6 6.1A9.6 9.6 0 0112 6c5 0 8.5 4.5 9.5 6a17 17 0 01-2.9 3.4M6.4 7.5A16.6 16.6 0 002.5 12c1 1.5 4.5 6 9.5 6a9 9 0 004.3-1.1M9.9 9.9a3 3 0 004.2 4.2',
  wifi: 'M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.8 16a4.6 4.6 0 016.4 0M12 19.5h.01',
  battery: 'M3 8h15v8H3zM21 11v2M6 11h5',
  gps: 'M12 19a7 7 0 100-14 7 7 0 000 14zM12 2v3M12 19v3M2 12h3M19 12h3M12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  mic: 'M9 6a3 3 0 016 0v5a3 3 0 01-6 0zM5.5 11a6.5 6.5 0 0013 0M12 17.5V21',
  camera: 'M4 8h3l2-2.5h6L17 8h3v11H4zM12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  note: 'M6 3h9l4 4v14H6zM14.5 3v4.5H19M9 12h7M9 16h5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 21c.8-4 3.8-6 7.5-6s6.7 2 7.5 6',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  sms: 'M4 5h16v11H9l-5 4zM8 10h.01M12 10h.01M16 10h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM6 15V9a3 3 0 013-3h3M18 9v6a3 3 0 01-3 3h-3',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V11M11 10.5V4a1.5 1.5 0 013 0v6.5M14 10.5V5.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7 6 6 0 01-5.2-3L3 14.5a1.6 1.6 0 012.6-1.8L8 15',
  volume: 'M4 9h4l5-4v14l-5-4H4zM17 9.5a3.5 3.5 0 010 5',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11M9 8h6',
  share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  refresh: 'M20 11a8 8 0 00-14.3-4.6L4 8M4 4v4h4M4 13a8 8 0 0014.3 4.6L20 16M20 20v-4h-4',
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[name]} />
    </svg>
  );
}
