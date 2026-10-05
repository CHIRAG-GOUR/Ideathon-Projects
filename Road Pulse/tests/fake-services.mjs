// Stand-ins for external services in local tests only (the app never uses these in production):
//  /nominatim/reverse   OpenStreetMap Nominatim-compatible reverse geocoder      (POST /__geo  {mode: meerut|nowhere|fail})
//  /authority/api       a road authority's reporting API                         (POST /__auth {mode: accept|reject})
//  /tiles/...           blank map tiles so maps render offline
//  GET /__last          last request the "authority" received
import http from 'node:http';

let geo = 'meerut';
let auth = 'accept';
let last = null;
let n = 7780;
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');

http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const url = new URL(req.url, 'http://x');
  const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(o)); };
  if (url.pathname === '/__geo') { geo = JSON.parse(body).mode; return json(200, { geo }); }
  if (url.pathname === '/__auth') { auth = JSON.parse(body).mode; return json(200, { auth }); }
  if (url.pathname === '/__last') return json(200, last);
  if (url.pathname.startsWith('/tiles/')) { res.writeHead(200, { 'content-type': 'image/png', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' }); return res.end(TILE); }
  if (url.pathname === '/nominatim/reverse') {
    if (!req.headers['user-agent']?.includes('RoadPulse')) return json(403, { error: 'identify yourself' });
    if (geo === 'fail') return json(500, {});
    if (geo === 'nowhere') return json(200, { display_name: 'Boring Road, Patna, Bihar, India', address: { road: 'Boring Road', city: 'Patna', state_district: 'Patna', state: 'Bihar', country: 'India', country_code: 'in' } });
    return json(200, { display_name: 'Delhi Road, Shastri Nagar, Meerut, Uttar Pradesh, 250004, India', address: { road: 'Delhi Road', suburb: 'Shastri Nagar', city: 'Meerut', state_district: 'Meerut', state: 'Uttar Pradesh', postcode: '250004', country: 'India', country_code: 'in' } });
  }
  if (url.pathname === '/authority/api' && req.method === 'POST') {
    const b = JSON.parse(body);
    last = { headers: { key: req.headers['x-api-key'] ?? null }, reportId: b.reportId, latitude: b.latitude, longitude: b.longitude, severity: b.severity, aiConfirmed: b.aiConfirmed, hasImage: typeof b.imageJpegBase64 === 'string' && b.imageJpegBase64.length > 1000, description: b.description };
    if (auth === 'reject') return json(503, { error: 'maintenance' });
    return json(201, { referenceId: `MMC-2026-${++n}` });
  }
  res.writeHead(404); res.end();
}).listen(4012, '127.0.0.1', () => console.log('fake services on 4012'));
