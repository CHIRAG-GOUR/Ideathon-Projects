// Generates a paired vehicle Device ID and Device Key in Firestore
import { randomBytes, createHash } from 'node:crypto';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ideathon-projects';
const DATABASE_ID = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || 'roadpulse';

const app = initializeApp({ projectId: PROJECT_ID }, 'seed-app-' + Date.now());
const db = getFirestore(app, DATABASE_ID);

const vehicleName = process.argv[2] || 'Jaipur Patrol Car 1';
const id = `veh_${randomBytes(5).toString('hex')}`;
const key = randomBytes(24).toString('base64url');
const hashKey = (k) => createHash('sha256').update(k).digest('hex');

const vehicle = {
  id,
  name: vehicleName,
  keyHash: hashKey(key),
  createdAt: new Date().toISOString(),
  lastSeenAt: null,
  lastLatitude: null,
  lastLongitude: null,
  detections: 0,
  enabled: true,
};

try {
  await db.collection('vehicles').doc(id).set(vehicle);
  console.log('\n==========================================');
  console.log('✅ VEHICLE PAIRED SUCCESSFULLY');
  console.log('==========================================');
  console.log(`🚗 Name:        ${vehicleName}`);
  console.log(`🔑 Device ID:   ${id}`);
  console.log(`🔐 Device Key:  ${key}`);
  console.log('==========================================');
  console.log('👉 INSTRUCTIONS:');
  console.log('1. Open RoadPulse on your phone or web app.');
  console.log('2. Navigate to "Live Drive" (/live).');
  console.log('3. Tap "Pair this device".');
  console.log('4. Enter the Device ID and Device Key above.');
  console.log('==========================================\n');
} catch (err) {
  console.error('Failed to create vehicle:', err.message);
  console.log('\nTip: If credentials are required, you can also register vehicles in the Admin Dashboard: https://roadpulse-ideathon.web.app/admin');
}
