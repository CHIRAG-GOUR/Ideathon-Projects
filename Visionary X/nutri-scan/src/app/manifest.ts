import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nutri Scan — Scan anything. Understand your food.',
    short_name: 'Nutri Scan',
    description: 'Scan food with your phone camera for nutrition, allergens and expiry tracking.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F8FE',
    theme_color: '#7EE4D3',
    categories: ['food', 'health', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Scan food', url: '/scan', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'My Food', url: '/food', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
