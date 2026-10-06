// Beyond Legacy icon set: 24px, two-tone (a soft filled shape under a 1.8 stroke), drawn for this product.
// Decorative by default; pass a title when an icon stands alone.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number; title?: string };

function Svg({ size = 20, title, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...rest}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}
/** Soft fill behind a stroke: the two-tone half of the style. */
const Tone = ({ d }: { d: string }) => <path d={d} fill="currentColor" stroke="none" opacity={0.18} />;

// ---- navigation & concepts
export const IconOverview = (p: P) => <Svg {...p}><Tone d="M3.5 4.5h7v8h-7zM13.5 11.5h7v8h-7z" /><path d="M3.5 4.5h7v8h-7zM13.5 11.5h7v8h-7zM13.5 4.5h7v4h-7zM3.5 15.5h7v4h-7z" /></Svg>;
export const IconPlay = (p: P) => <Svg {...p}><Tone d="M3.5 9.5a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v3.5a4 4 0 0 1-7 2.6h-3a4 4 0 0 1-7-2.6z" /><path d="M3.5 9.5a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v3.5a4 4 0 0 1-7 2.6h-3a4 4 0 0 1-7-2.6zM8 9v4M6 11h4" /><circle cx="15.5" cy="10" r="1" /><circle cx="17.5" cy="12.5" r="1" /></Svg>;
export const IconShelf = (p: P) => <Svg {...p}><Tone d="M5 4h4v5H5zM11 5h3v4h-3zM6 13h3v5H6zM12 12h5v6h-5z" /><path d="M3 9.5h18M3 18.5h18M3 3v18M21 3v18M5 4h4v5.5M11 5h3v4.5M6 13h3v5.5M12 12h5v6.5" /></Svg>;
export const IconInventory = IconShelf;
export const IconNextMove = (p: P) => <Svg {...p}><Tone d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><circle cx="12" cy="12" r="9" /><path d="M8 12h7M12 8.5l3.5 3.5-3.5 3.5" /></Svg>;
export const IconProducts = (p: P) => <Svg {...p}><Tone d="M9 8h6l1 3v9H8v-9z" /><path d="M10 3h4v3l2 5v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9l2-5zM8 13h8" /></Svg>;
export const IconProduct = IconProducts;
export const IconInsights = (p: P) => <Svg {...p}><Tone d="M4 14h3v6H4zM10.5 9h3v11h-3zM17 5h3v15h-3z" /><path d="M4 14h3v6H4zM10.5 9h3v11h-3zM17 5h3v15h-3zM2.5 20.5h19" /></Svg>;
export const IconDemand = (p: P) => <Svg {...p}><Tone d="M3 20l5-6 4 3 8-9v12z" /><path d="M3 17l5-6 4 3 8-9M15 5h5v5" /></Svg>;
export const IconForecast = (p: P) => <Svg {...p}><Tone d="M3 6l5 4 4-1 4 5 5 3v4H3z" /><path d="M3 6l5 4 4-1 4 5 5 3" /><path d="M3 14.5h18" strokeDasharray="2 2.5" /><circle cx="16" cy="14" r="1.6" fill="currentColor" /></Svg>;
export const IconStore = (p: P) => <Svg {...p}><Tone d="M4 11h16v9H4z" /><path d="M4 11v9h16v-9M3 11 4.5 4h15L21 11" /><path d="M3 11c0 1.5 1.3 2.5 3 2.5S9 12.5 9 11c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5M10 20v-4h4v4" /></Svg>;
export const IconSettings = (p: P) => <Svg {...p}><Tone d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></Svg>;
export const IconRestock = (p: P) => <Svg {...p}><Tone d="M3.5 9 12 5l8.5 4v9L12 22l-8.5-4z" /><path d="M3.5 9 12 13l8.5-4M12 13v9M3.5 9v9L12 22l8.5-4V9L12 5" /><path d="M12 2v6M9.5 4.5 12 2l2.5 2.5" /></Svg>;
export const IconExpiry = (p: P) => <Svg {...p}><Tone d="M3 12.5 11.5 4h8.5v8.5L11.5 21z" /><path d="M3 12.5 11.5 4h8.5v8.5L11.5 21z" /><path d="M14.5 8.5v2.8l1.8 1.2" /><circle cx="15" cy="11" r="3.6" /></Svg>;
export const IconHold = (p: P) => <Svg {...p}><Tone d="M5 5h14v14H5z" /><rect x="5" y="5" width="14" height="14" rx="3" /><path d="M10 9.5v5M14 9.5v5" /></Svg>;
export const IconHealthy = (p: P) => <Svg {...p}><Tone d="M12 3 4.5 6v6c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6z" /><path d="M12 3 4.5 6v6c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6z" /><path d="m8.8 12.2 2.2 2.2 4.4-4.6" /></Svg>;
export const IconAlert = (p: P) => <Svg {...p}><Tone d="M12 3 2 20h20z" /><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17.2v.01" /></Svg>;
export const IconBell = (p: P) => <Svg {...p}><Tone d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" /></Svg>;
export const IconSync = (p: P) => <Svg {...p}><path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></Svg>;
export const IconUser = (p: P) => <Svg {...p}><Tone d="M12 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /><circle cx="12" cy="7.5" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></Svg>;

// ---- utility
export const IconMore = (p: P) => <Svg {...p}><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconMinus = (p: P) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IconX = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconChevronRight = (p: P) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;
export const IconChevronDown = (p: P) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const IconArrowLeft = (p: P) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const IconArrowRight = (p: P) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const IconTrendUp = (p: P) => <Svg {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></Svg>;
export const IconTrendDown = (p: P) => <Svg {...p}><path d="m3 7 6 6 4-4 8 8" /><path d="M15 17h6v-6" /></Svg>;
export const IconFlat = (p: P) => <Svg {...p}><path d="M4 12h16M15 7l5 5-5 5" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const IconInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></Svg>;
export const IconCalendar = (p: P) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>;
export const IconCart = (p: P) => <Svg {...p}><Tone d="M6.5 7H21l-2.5 8h-10z" /><path d="M3 4h2l2.4 11h11L21 7H6.2" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></Svg>;
export const IconTruck = (p: P) => <Svg {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></Svg>;
export const IconEdit = (p: P) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Svg>;
export const IconTrash = (p: P) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
export const IconSignOut = (p: P) => <Svg {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></Svg>;
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>;
export const IconBox = (p: P) => <Svg {...p}><Tone d="M4 8h16v12H4z" /><path d="M4 8h16v12H4zM3 4h18v4H3zM10 12h4" /></Svg>;
export const IconUndo = (p: P) => <Svg {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></Svg>;

/** Beyond Legacy mark: three shelf levels stepping up into a signal — stock becoming a decision. */
export function Logo({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill={onDark ? '#FBF5E9' : '#0E6B47'} />
      <rect x="12" y="43" width="26" height="7" rx="3.5" fill={onDark ? '#0E6B47' : '#FBF5E9'} />
      <rect x="12" y="31" width="20" height="7" rx="3.5" fill={onDark ? '#0E6B47' : '#FBF5E9'} opacity=".85" />
      <rect x="12" y="19" width="14" height="7" rx="3.5" fill={onDark ? '#0E6B47' : '#FBF5E9'} opacity=".7" />
      <circle cx="46" cy="22" r="5.5" fill="#F5B82E" />
      <path d="M43 34a12 12 0 0 0 12-12M42 43a21 21 0 0 0 21-21" stroke="#F5B82E" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".9" />
    </svg>
  );
}
