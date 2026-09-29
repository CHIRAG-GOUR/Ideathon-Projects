/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // onnxruntime-web / firebase-admin must not be bundled into server code paths they don't belong to.
  experimental: { serverComponentsExternalPackages: ['firebase-admin', 'nodemailer'] },
  // ORT's runtime files are served from /ort (wasmPaths), so webpack must not re-emit its self-referencing .mjs.
  webpack(config) {
    config.module.rules.push({ test: /onnxruntime-web[\\/]dist[\\/].*\.mjs$/, parser: { url: false } });
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self)' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Live Drive is cross-origin isolated so the detector can use several CPU threads (SharedArrayBuffer).
      {
        source: '/live',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
      // Scripts and files loaded by the detector worker inside the isolated Live Drive page.
      ...['/_next/static/:path*', '/ort/:path*', '/models/:path*'].map((source) => ({
        source,
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      })),
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    ];
  },
};
export default nextConfig;
