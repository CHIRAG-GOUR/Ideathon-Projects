// Safety Warriors brand marks (SVG) — rendered to PNGs by safety-core/tools/icons.mjs.
const hex = 'M32 3l25 14.5v29L32 61 7 46.5v-29z';
const bolt = 'M34 17l-10 17h8l-3 13 11-18h-8z';
export const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#2E2A6B"/><g transform="translate(6 6) scale(.8125)"><path d="M32 11l17 10v20L32 51 15 41V21z" fill="#0E9F8E" transform="translate(-9 -9) scale(1.28)"/><path d="${bolt}" fill="#FF9F5A" stroke="#2E2A6B" stroke-width="1.5" stroke-linejoin="round" transform="translate(-9 -9) scale(1.28)"/></g></svg>`;
export const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(22 22)"><path d="M32 11l17 10v20L32 51 15 41V21z" fill="#0E9F8E" transform="translate(-9 -9) scale(1.28)"/><path d="${bolt}" fill="#FF9F5A" stroke="#2E2A6B" stroke-width="1.5" stroke-linejoin="round" transform="translate(-9 -9) scale(1.28)"/></g></svg>`;
export const status = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="${hex} ${bolt}" fill="#fff" fill-rule="evenodd"/></svg>`;
