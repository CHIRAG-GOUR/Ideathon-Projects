// Local stand-ins for external services during tests: an SMS provider (Twilio-shaped).
import { createServer } from 'node:http';
const log = { sms: [] };
let n = 0;
createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url.startsWith('/2010-04-01/Accounts/')) {
    const p = Object.fromEntries(new URLSearchParams(body));
    const sid = `SM${++n}`;
    log.sms.push({ sid, to: p.To, body: p.Body, callback: p.StatusCallback ?? null });
    return json(201, { sid, status: 'queued' });
  }
  if (req.url === '/__log') return json(200, log);
  if (req.url === '/__reset') { log.sms = []; return json(200, {}); }
  json(404, {});
}).listen(4013, '127.0.0.1', () => console.log('fake services on :4013'));
