/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  // Static export for Firebase Hosting (no server needed). Output goes to /out.
  output: 'export',
  images: { unoptimized: true },
  // Old-route redirects live in firebase.json (static hosting handles them).
};

export default nextConfig;
