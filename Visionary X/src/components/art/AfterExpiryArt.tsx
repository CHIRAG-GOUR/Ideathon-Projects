import React from 'react';

type SvgProps = React.SVGProps<SVGSVGElement> & { title?: string };

function Frame({ children, title, ...rest }: SvgProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      <ellipse cx="60" cy="111" rx="36" ry="4.5" fill="#6B4B2B" opacity="0.14" />
      {children}
    </svg>
  );
}

/** Butter Croissant illustration */
export function CroissantArt(props: SvgProps) {
  return (
    <Frame {...props}>
      {/* Background crescent curve */}
      <path
        d="M24 82 C16 70 20 48 38 42 C50 38 70 38 82 42 C100 48 104 70 96 82 C92 74 86 66 76 64 C64 62 56 62 44 64 C34 66 28 74 24 82 Z"
        fill="#D68B37"
      />
      {/* Main flaky buttery body */}
      <ellipse cx="60" cy="62" rx="26" ry="19" fill="#E6A14E" />
      <path
        d="M38 52 C44 48 52 46 60 46 C68 46 76 48 82 52 C86 60 84 72 80 78 C72 74 66 72 60 72 C54 72 48 74 40 78 C36 72 34 60 38 52 Z"
        fill="#F4B866"
      />
      {/* Flaky center crest */}
      <ellipse cx="60" cy="58" rx="14" ry="11" fill="#FDD78D" />
      <path d="M48 64 C52 60 56 58 60 58 C64 58 68 60 72 64" stroke="#B86F20" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M42 54 C46 50 52 48 60 48 C68 48 74 50 78 54" stroke="#B86F20" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M32 68 C36 62 40 58 46 56" stroke="#B86F20" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M88 68 C84 62 80 58 74 56" stroke="#B86F20" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Butter glaze sheen highlights */}
      <path d="M52 50 Q60 46 68 50" stroke="#FFF5DC" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M55 58 Q60 56 65 58" stroke="#FFF5DC" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9" />
      {/* Small butter cube accent */}
      <rect x="76" y="78" width="16" height="13" rx="2.5" fill="#FFE885" stroke="#E6C843" strokeWidth="1.5" transform="rotate(-12 84 84)" />
      <path d="M78 81 L86 79 L90 85" stroke="#FFF8CC" strokeWidth="1.5" fill="none" />
    </Frame>
  );
}

/** Paneer compost / plant soil nourishment art */
export function PaneerCompostArt(props: SvgProps) {
  return (
    <Frame {...props}>
      {/* Terracotta Plant Pot */}
      <path d="M34 68 L39 104 C39.5 106.5 42 108 45 108 L75 108 C78 108 80.5 106.5 81 104 L86 68 Z" fill="#C86A45" />
      <rect x="30" y="60" width="60" height="11" rx="4" fill="#DB7E58" stroke="#AE5532" strokeWidth="1.5" />
      {/* Rich dark compost soil */}
      <ellipse cx="60" cy="65" rx="26" ry="6" fill="#4B331E" />
      {/* Paneer calcium crumbles on top */}
      <rect x="44" y="62" width="5" height="4" rx="1" fill="#FFFDF5" stroke="#E2CFA9" strokeWidth="0.8" />
      <rect x="52" y="64" width="6" height="5" rx="1.2" fill="#FFFDF5" stroke="#E2CFA9" strokeWidth="0.8" />
      <rect x="62" y="61" width="5.5" height="4" rx="1" fill="#FFFDF5" stroke="#E2CFA9" strokeWidth="0.8" />
      <rect x="70" y="63" width="4.5" height="4" rx="1" fill="#FFFDF5" stroke="#E2CFA9" strokeWidth="0.8" />
      {/* Growing seedling sprout */}
      <path d="M60 64 Q60 42 54 32" stroke="#2F8F55" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Left green leaf */}
      <path d="M56 36 C42 34 38 22 50 18 C56 22 58 30 56 36 Z" fill="#5DB277" stroke="#237645" strokeWidth="1.5" />
      {/* Right fresh leaf */}
      <path d="M58 42 C72 38 76 26 64 22 C58 26 56 36 58 42 Z" fill="#96CFA3" stroke="#237645" strokeWidth="1.5" />
      {/* Sparkle of life */}
      <path d="M60 14 L62 19 L67 21 L62 23 L60 28 L58 23 L53 21 L58 19 Z" fill="#F5B633" />
    </Frame>
  );
}

/** Waste into value spot illustration */
export function SpotWasteToValue(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <ellipse cx="60" cy="108" rx="42" ry="5" fill="#6B4B2B" opacity="0.12" />
      {/* Big circular badge */}
      <circle cx="60" cy="56" r="44" fill="#F1F8F1" stroke="#C3E4C9" strokeWidth="2.5" />
      {/* Recycle loop background */}
      <path
        d="M38 48 C42 34 54 26 68 28 C78 30 86 38 88 50"
        stroke="#5DB277"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="6 4"
        fill="none"
      />
      <path
        d="M82 66 C78 78 66 86 52 84 C42 82 34 74 32 62"
        stroke="#F2A516"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="6 4"
        fill="none"
      />
      {/* Central gold recovery coin */}
      <circle cx="60" cy="56" r="22" fill="#F5B633" stroke="#D1850A" strokeWidth="2.5" />
      <circle cx="60" cy="56" r="18" fill="#F8CB63" />
      <text x="60" y="64" textAnchor="middle" fontSize="22" fontWeight="800" fill="#6B4B2B" fontFamily="var(--font-display)">
        ₹
      </text>
      {/* Sprout emerging */}
      <path d="M78 30 C86 28 88 20 80 18 C76 20 76 26 78 30 Z" fill="#2F8F55" />
      <circle cx="34" cy="38" r="3" fill="#F2A516" />
      <circle cx="86" cy="74" r="3.5" fill="#2F8F55" />
    </svg>
  );
}

/** Safety Inspection Spot */
export function SpotSafetyShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <ellipse cx="60" cy="108" rx="38" ry="5" fill="#6B4B2B" opacity="0.12" />
      {/* Shield outline */}
      <path
        d="M60 18 L88 28 C88 58 76 84 60 96 C44 84 32 58 32 28 Z"
        fill="#FFFDF8"
        stroke="#E4572E"
        strokeWidth="3.5"
      />
      <path
        d="M60 24 L82 32 C82 56 72 78 60 88 C48 78 38 56 38 32 Z"
        fill="#FDE6DF"
      />
      {/* Magnifier / Inspector eye */}
      <circle cx="58" cy="52" r="14" fill="#FFFFFF" stroke="#8F2A12" strokeWidth="2.5" />
      <circle cx="58" cy="52" r="6" fill="#E4572E" />
      <circle cx="56" cy="50" r="2" fill="#FFFFFF" />
      {/* Check badge */}
      <circle cx="82" cy="78" r="10" fill="#2F8F55" />
      <path d="M77 78 L80 81 L87 74" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Theme-matching grocery reuse icon */
export function AfterExpiryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 19H4.8a1.8 1.8 0 0 1-1.57-.88 1.8 1.8 0 0 1 0-1.78L6.8 10" />
      <path d="M11 19h8.2a1.8 1.8 0 0 0 1.57-.88 1.8 1.8 0 0 0 0-1.78L17.2 10" />
      <path d="M14 6l-3-3-3 3" />
      <path d="M11 3v7" />
      <path d="M12 12c-2.5 0-4.5 1.5-4.5 4 2.5 0 4.5-1.5 4.5-4z" fill="currentColor" fillOpacity="0.25" />
      <path d="M12 12c2.5 0 4.5 1.5 4.5 4-2.5 0-4.5-1.5-4.5-4z" fill="currentColor" fillOpacity="0.25" />
      <path d="M12 16v3" />
    </svg>
  );
}

