import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  output: 'export', // static: hosted on Firebase Hosting and bundled inside the Android app (opens offline)
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_APP_ID: 'lifelinehub',
    NEXT_PUBLIC_DATABASE_ID: 'lifelinehub',
    NEXT_PUBLIC_ORIGIN: 'https://lifeline-hub-app.web.app',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyBrQfqen78vsffdhdz5X6wTt6pChjJw6O0',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'ideathon-projects.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'ideathon-projects',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'ideathon-projects.firebasestorage.app',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:174113004916:web:8582603954128e9705a021',
  },
  webpack(config) {
    // Shared Safety Core code resolves packages from this app (one copy of each library).
    config.resolve.modules = [path.join(here, 'node_modules'), 'node_modules'];
    // …except where a package ships its own nested copy (react-three-fiber pins zustand 3 / its scheduler).
    const fiber = path.join(here, 'node_modules/@react-three/fiber');
    config.module.rules.push({
      test: /[\\/]@react-three[\\/]fiber[\\/]/,
      resolve: { alias: { zustand$: path.join(fiber, 'node_modules/zustand'), scheduler$: path.join(fiber, 'node_modules/scheduler') } },
    });
    return config;
  },
};
