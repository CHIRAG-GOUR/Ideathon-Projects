import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: { externalDir: true },
  env: {
    NEXT_PUBLIC_APP_ID: 'sheshield',
    NEXT_PUBLIC_DATABASE_ID: 'sheshield',
    NEXT_PUBLIC_ORIGIN: 'https://she-shield-app.web.app',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyBrQfqen78vsffdhdz5X6wTt6pChjJw6O0',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'ideathon-projects.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'ideathon-projects',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'ideathon-projects.firebasestorage.app',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:174113004916:web:5d5364a3d99e61f605a021',
  },
  webpack(config) {
    config.resolve.modules = [path.join(here, 'node_modules'), 'node_modules'];
    return config;
  },
};
