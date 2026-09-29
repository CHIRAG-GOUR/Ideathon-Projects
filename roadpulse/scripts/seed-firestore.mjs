import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

// 1. Get OAuth Token from firebase-tools.json
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
let token = null;

try {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = cfg.tokens || cfg.user?.tokens;
  token = tokens?.access_token;
  const refreshToken = tokens?.refresh_token;

  // Refresh if needed
  if (!token && refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho85o8e.apps.googleusercontent.com',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    token = data.access_token;
  }
} catch (e) {
  console.error('Could not read firebase-tools config:', e.message);
}

if (!token) {
  console.error('Error: Could not obtain OAuth token. Please ensure you are logged into Firebase CLI (`npx firebase-tools login`).');
  process.exit(1);
}

const PROJECT_ID = 'ideathon-projects';
const DATABASE_ID = 'roadpulse';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: {
          values: v.map((item) => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: String(item) };
          }),
        },
      };
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
    }
  }
  return fields;
}

async function setDoc(collection, docId, data) {
  const url = `${BASE_URL}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to set document ${collection}/${docId}: HTTP ${res.status} - ${txt}`);
  }
  return res.json();
}

console.log('Seeding RoadPulse Firestore Database (`roadpulse`)...\n');

// 1. Set Admins
console.log('1. Setting Admins...');
await setDoc('config', 'admins', {
  emails: ['pa1@skillizee.io', 'chirag@skillizee.io', 'chirag.gour@gmail.com', 'admin@roadpulse.io'],
});
console.log('   ✓ config/admins seeded');

// 2. Set Jaipur Authorities
console.log('\n2. Seeding Jaipur Road Authorities...');
const authorities = [
  {
    id: 'auth_jaipur_greater',
    name: 'Jaipur Municipal Corporation Greater (Nagar Nigam Greater)',
    jurisdiction: 'Jaipur Greater Municipal Area (Malviya Nagar, Mansarovar, Sanganer, Jhotwara, Jagatpura, Vidhyadhar Nagar)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    city: 'Jaipur',
    submissionMethod: 'email',
    email: 'comm.greater@jaipurmc.org',
    sourceUrl: 'https://jaipurmc.org',
    slaText: '72 hours for high-severity pothole repair under monsoon road cell',
    enabled: true,
  },
  {
    id: 'auth_jaipur_heritage',
    name: 'Jaipur Municipal Corporation Heritage (Nagar Nigam Heritage)',
    jurisdiction: 'Jaipur Heritage Municipal Area (Walled City Pink City, Civil Lines, Amer, Kishanpole, Adarsh Nagar)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    city: 'Jaipur',
    submissionMethod: 'email',
    email: 'comm.heritage@jaipurmc.org',
    sourceUrl: 'https://heritage.jaipurmc.org',
    slaText: '48 hours for arterial walled-city roads',
    enabled: true,
  },
  {
    id: 'auth_jaipur_jda',
    name: 'Jaipur Development Authority (JDA)',
    jurisdiction: 'Jaipur Region Masterplan Roads, Arterials & Flyovers (JLN Marg, Tonk Rd, Gopalpura Bypass, Mahal Rd, Ajmer Rd Bypass)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    city: 'Jaipur',
    submissionMethod: 'email',
    email: 'complaint.jda@rajasthan.gov.in',
    sourceUrl: 'https://jda.urban.rajasthan.gov.in',
    slaText: '7 days for sector/development roads',
    enabled: true,
  },
  {
    id: 'auth_rajasthan_pwd_jaipur',
    name: 'Public Works Department Rajasthan (PWD Jaipur Division)',
    jurisdiction: 'State Highways & Major District Roads (MDR) in Jaipur District',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'se.jaipur@pwd.rajasthan.gov.in',
    sourceUrl: 'https://pwd.rajasthan.gov.in',
    slaText: 'Monsoon emergency response cell',
    enabled: true,
  },
  {
    id: 'auth_nhai_jaipur',
    name: 'National Highways Authority of India (NHAI RO Jaipur / PIU Jaipur)',
    jurisdiction: 'National Highways in Jaipur District (NH-48 Delhi-Jaipur-Ajmer, NH-21 Agra-Jaipur, NH-52 Kota/Bikaner, Jaipur Ring Road)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'rojaipur@nhai.org',
    sourceUrl: 'https://nhai.gov.in',
    slaText: '24-48 hours rapid highway maintenance',
    enabled: true,
  },
];

for (const auth of authorities) {
  await setDoc('authorities', auth.id, auth);
  console.log(`   ✓ [${auth.id}] ${auth.name} (${auth.email})`);
}

// 3. Create ready-to-use Paired Vehicle
console.log('\n3. Creating pre-configured Live Drive paired vehicle...');
const vehicleId = 'veh_jaipur_patrol_01';
const vehicleKey = 'RP-Jaipur-SecureKey-2026-X99';
const hashKey = (k) => createHash('sha256').update(k).digest('hex');

await setDoc('vehicles', vehicleId, {
  id: vehicleId,
  name: 'Jaipur Road Patrol 01',
  keyHash: hashKey(vehicleKey),
  createdAt: new Date().toISOString(),
  lastSeenAt: null,
  lastLatitude: null,
  lastLongitude: null,
  detections: 0,
  enabled: true,
});

console.log('   ✓ Vehicle registered:');
console.log('   ---------------------------------------------');
console.log(`   🚗 Name:        Jaipur Road Patrol 01`);
console.log(`   🔑 Device ID:   ${vehicleId}`);
console.log(`   🔐 Device Key:  ${vehicleKey}`);
console.log('   ---------------------------------------------');

console.log('\n✨ Database successfully populated with Jaipur Authorities, Admins, and Paired Vehicle!\n');
