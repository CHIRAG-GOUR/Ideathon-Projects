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
    name: 'Jaipur Nagar Nigam Greater (Municipal Corporation)',
    jurisdiction: 'Jaipur Greater (Malviya Nagar, Mansarovar, Sanganer, Jhotwara, Jagatpura, Vidhyadhar Nagar, Murlipura)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    city: 'Jaipur',
    submissionMethod: 'email',
    email: 'commissioner.jmc@rajasthan.gov.in',
    phone: '0141-2740510',
    helpline: '0141-2747400',
    smsHelpline: '9875280000',
    sourceUrl: 'https://jaipurmc.org',
    slaText: '72 hours for high-severity pothole repair under monsoon road cell',
    enabled: true,
  },
  {
    id: 'auth_jaipur_heritage',
    name: 'Jaipur Nagar Nigam Heritage (Municipal Corporation)',
    jurisdiction: 'Jaipur Heritage (Walled City Pink City, Civil Lines, Amer, Kishanpole, Adarsh Nagar, Moti Doongri)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    city: 'Jaipur',
    submissionMethod: 'email',
    email: 'nnjheritage@gmail.com',
    phone: '0141-2949220',
    helpline: '0141-2747400',
    sourceUrl: 'https://jaipurmcheritage.org',
    slaText: '48 hours for arterial walled-city and heritage zone roads',
    enabled: true,
  },
  {
    id: 'auth_jaipur_jda',
    name: 'Jaipur Development Authority (JDA)',
    jurisdiction: 'Jaipur Region Masterplan Arterials & Sector Roads (JLN Marg, Tonk Rd, Gopalpura Bypass, Mahal Rd, Prithviraj Nagar)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    city: 'Jaipur',
    submissionMethod: 'email',
    email: 'jda@rajasthan.gov.in',
    phone: '0141-2569696',
    enforcementPhone: '0141-2575151',
    sourceUrl: 'https://jda.rajasthan.gov.in',
    slaText: '7 days for sector/development roads and flyovers',
    enabled: true,
  },
  {
    id: 'auth_pwd_jaipur_city1',
    name: 'PWD Rajasthan (Jaipur City Division I - Central & East)',
    jurisdiction: 'State Highways, Major District Roads & PWD Arterials in Jaipur City Division I',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'eejcc1.pwd@rajasthan.gov.in',
    phone: '0141-2223521',
    sourceUrl: 'https://pwd.rajasthan.gov.in',
    slaText: 'PWD rapid response and monsoon emergency division',
    enabled: true,
  },
  {
    id: 'auth_pwd_jaipur_city2',
    name: 'PWD Rajasthan (Jaipur City Division II - West & South)',
    jurisdiction: 'State Highways, Major District Roads & PWD Arterials in Jaipur City Division II',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'eejaipurcity1.pwd@rajasthan.gov.in',
    phone: '0141-2223522',
    sourceUrl: 'https://pwd.rajasthan.gov.in',
    slaText: 'PWD rapid response and monsoon emergency division',
    enabled: true,
  },
  {
    id: 'auth_pwd_jaipur_se',
    name: 'PWD Rajasthan (Superintending Engineer - Jaipur Circle)',
    jurisdiction: 'Jaipur District PWD Circle Superintending Engineering Jurisdiction',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'se.jaipur@pwd.rajasthan.gov.in',
    phone: '0141-2223502',
    sourceUrl: 'https://pwd.rajasthan.gov.in',
    slaText: 'Circle engineering oversight and escalated road repair',
    enabled: true,
  },
  {
    id: 'auth_nhai_jaipur',
    name: 'National Highways Authority of India (NHAI RO / PIU Jaipur)',
    jurisdiction: 'National Highways in Jaipur (NH-48 Delhi-Jaipur-Ajmer, NH-21 Agra-Jaipur, NH-52 Kota/Bikaner, Jaipur Ring Road)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'rojaipur@nhai.org',
    phone: '0141-2292049',
    sourceUrl: 'https://nhai.gov.in',
    slaText: '24-48 hours rapid highway safety maintenance',
    enabled: true,
  },
  {
    id: 'auth_riico_sitapura',
    name: 'RIICO Unit Office (Jaipur Sitapura & EPIP)',
    jurisdiction: 'Sitapura Industrial Area, EPIP, and Tonk Road Industrial Corridors',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'sitapura@riico.co.in',
    phone: '0141-2770208',
    sourceUrl: 'https://industries.rajasthan.gov.in/riico',
    slaText: 'Industrial estate road infrastructure maintenance',
    enabled: true,
  },
  {
    id: 'auth_riico_vkia',
    name: 'RIICO Unit Office (Jaipur North - Vishwakarma Industrial Area)',
    jurisdiction: 'VKIA (Vishwakarma Industrial Area), Road No 1 to 14, Sikar Road Industrial Belt',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'jaipurnorth@riico.co.in',
    phone: '0141-2330540',
    sourceUrl: 'https://industries.rajasthan.gov.in/riico',
    slaText: 'VKIA industrial corridor road repair cell',
    enabled: true,
  },
  {
    id: 'auth_rajasthan_sampark',
    name: 'Rajasthan Sampark (Chief Minister Public Grievance Portal)',
    jurisdiction: 'State-wide citizen road grievance escalation (All Municipal & PWD jurisdictions)',
    country: 'India',
    state: 'Rajasthan',
    district: 'Jaipur',
    submissionMethod: 'email',
    email: 'sampark@rajasthan.gov.in',
    phone: '181',
    sourceUrl: 'https://sampark.rajasthan.gov.in',
    slaText: 'Statutory 181 CM Helpline grievance redressal timeline',
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
