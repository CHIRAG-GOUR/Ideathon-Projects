import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  output: 'export', // static: hosted on Firebase Hosting and bundled inside the Android app (opens offline)
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: { externalDir: true }, // ../../safety-core
  env: { NEXT_PUBLIC_APP_ID: 'sheshield', NEXT_PUBLIC_DATABASE_ID: 'sheshield', NEXT_PUBLIC_ORIGIN: 'https://she-shield-app.web.app' },
  webpack(config) {
    // Shared Safety Core code resolves packages from this app (one copy of each library).
    config.resolve.modules = [path.join(here, 'node_modules'), 'node_modules'];
    return config;
  },
};
