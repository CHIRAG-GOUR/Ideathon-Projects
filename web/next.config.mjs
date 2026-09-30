/** @type {import('next').NextConfig} */
export default {
  output: 'export', // static site: hosted on Firebase Hosting and bundled inside the Android app (works offline)
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: { externalDir: true }, // ../shared
};
