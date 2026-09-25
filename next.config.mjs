/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  async redirects() {
    return [
      // Old routes from the first version of the project keep working.
      { source: '/scan', destination: '/scanner', permanent: false },
      { source: '/barcodes', destination: '/demo', permanent: false },
      { source: '/simulation', destination: '/warehouse', permanent: false },
      { source: '/app', destination: '/dashboard', permanent: false },
    ];
  },
};

export default nextConfig;
