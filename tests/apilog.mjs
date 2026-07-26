// Unit test for the /api/log serverless function — no browser, no Vercel.
// Calls the handler with fake req/res objects the way Vercel would.
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
const handler = createRequire(import.meta.url)('../api/log.js');

const lines = [];
const realError = console.error;
console.error = (...a) => lines.push(a.join(' '));

function res() {
  const r = { code: 0, headers: {}, ended: false };
  r.status = c => { r.code = c; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = () => { r.ended = true; return r; };
  return r;
}
const req = (method, body, parsed) => {
  const s = Readable.from(body === undefined ? [] : [body]);
  s.method = method;
  if (parsed !== undefined) s.body = parsed;
  return s;
};
const entry = { t: '12:20', where: 'rutetider', msg: 'Failed to fetch', info: 'Lavik', app: 'ferry-navigator', host: 'ferry-navigator.vercel.app', ua: 'Mozilla/5.0 (iPhone)' };

// 1. a normal POST is accepted and written as one line
let r = res();
await handler(req('POST', JSON.stringify(entry)), r);
const line = lines.at(-1) || '';
console.log('accepts a POST:', r.code === 204 && r.ended ? 'OK 204' : 'FAIL ' + r.code);
console.log('logs one readable line:',
  /^\[ferrynav\]/.test(line) && line.includes('rutetider') && line.includes('Failed to fetch') && line.includes('Lavik')
    ? 'OK ' + line.slice(0, 90) + '…' : 'FAIL ' + line);

// 2. Vercel may hand the body over already parsed
r = res();
await handler(req('POST', undefined, entry), r);
console.log('handles a pre-parsed body:', r.code === 204 && (lines.at(-1) || '').includes('rutetider') ? 'OK' : 'FAIL ' + r.code);

// 3. GET is not a log
r = res();
await handler(req('GET'), r);
console.log('rejects GET:', r.code === 405 && r.headers.Allow === 'POST' ? 'OK 405' : 'FAIL ' + r.code);

// 4. the endpoint is public, so oversized and junk payloads are refused
r = res();
await handler(req('POST', 'x'.repeat(5000)), r);
console.log('refuses an oversized body:', r.code === 413 ? 'OK 413' : 'FAIL ' + r.code);
r = res();
await handler(req('POST', JSON.stringify(['nope'])), r);
console.log('refuses a non-object:', r.code === 400 ? 'OK 400' : 'FAIL ' + r.code);

// 5. unknown fields are dropped and long ones cut
r = res();
await handler(req('POST', JSON.stringify({ ...entry, msg: 'm'.repeat(600), secret: 'do-not-log-me' })), r);
const cut = lines.at(-1) || '';
console.log('drops unknown fields:', !cut.includes('do-not-log-me') ? 'OK' : 'FAIL');
console.log('caps field length:', cut.length < 700 ? 'OK ' + cut.length + ' chars' : 'FAIL ' + cut.length);

// 6. a dead webhook must not fail the request
process.env.LOG_WEBHOOK = 'http://127.0.0.1:9/nowhere';
r = res();
await handler(req('POST', JSON.stringify(entry)), r);
delete process.env.LOG_WEBHOOK;
console.log('survives a dead webhook:', r.code === 204 ? 'OK 204' : 'FAIL ' + r.code);

console.error = realError;
