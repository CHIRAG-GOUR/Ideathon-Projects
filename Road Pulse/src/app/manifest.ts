import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RoadPulse — Pothole detection & reporting',
    short_name: 'RoadPulse',
    description: 'Detect potholes while you drive, or report one you see.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF8F4',
    theme_color: '#FAF8F4',
    categories: ['utilities', 'navigation'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Report a Pothole', url: '/report' },
      { name: 'Live Drive', url: '/live' },
    ],
  };
}
