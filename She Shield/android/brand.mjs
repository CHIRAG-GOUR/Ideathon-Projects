// She Shield brand marks (SVG) — rendered to PNGs by safety-core/tools/icons.mjs.
const shield = 'M32 4l22 8v17c0 14.5-9.6 25.6-22 31-12.4-5.4-22-16.5-22-31V12z';
const heart = 'M32 18c-6 0-10 4.4-10 9.6C22 36 32 43 32 43s10-7 10-15.4C42 22.4 38 18 32 18z';
export const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E2DE2"/><stop offset="1" stop-color="#3B1E77"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><g transform="translate(9 8) scale(.72)"><path d="${shield}" fill="#FBF9FE"/><path d="${heart}" fill="#7C4DDB"/><circle cx="32" cy="27.5" r="3.6" fill="#E58FA8"/></g></svg>`;
export const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(22 21) scale(1)"><path d="${shield}" fill="#FBF9FE"/><path d="${heart}" fill="#7C4DDB"/><circle cx="32" cy="27.5" r="3.6" fill="#E58FA8"/></g></svg>`;
export const status = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="${shield} ${heart}" fill="#fff" fill-rule="evenodd"/></svg>`;
