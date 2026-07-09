import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:8741/index.html';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const errors = [];

// ── 1. Mobile: full-screen layout + full planning flow ──────────────────────
const mctx = await browser.newContext({
  viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true,
  permissions: ['clipboard-write', 'clipboard-read'],
});
const m = await mctx.newPage();
m.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
await m.goto(BASE, { waitUntil: 'domcontentloaded' });
await m.waitForSelector('input[type=text]', { timeout: 10000 });

// full-screen check: app container should span the whole viewport width
const w = await m.evaluate(() => {
  const el = document.querySelector('#root > div');
  return { width: el.getBoundingClientRect().width, pos: getComputedStyle(el).position };
});
console.log('mobile shell:', JSON.stringify(w), w.width === 390 && w.pos === 'fixed' ? 'OK full-screen' : 'FAIL — frame still present');

// plan a route
const inputs = m.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await m.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await m.locator('text=Ålesund, Møre og Romsdal').first().click();
// suggestion boxes should be gone (guard against re-open bug)
await m.waitForTimeout(600);
const sugCount = await m.locator('text=Bergen, Vestland').count();
console.log('suggestions after select:', sugCount <= 1 ? 'OK closed' : 'FAIL still open (' + sugCount + ')');
await m.screenshot({ path: SHOT + '/1-mobile-plan.png' });
await m.locator('text=Finn rute').click();
await m.waitForSelector('text=Avreise senest', { timeout: 10000 });
console.log('route planned: OK');

// share button → clipboard
await m.locator('text=Del').click();
await m.waitForSelector('text=✓ Kopiert', { timeout: 5000 });
const clip = await m.evaluate(() => navigator.clipboard.readText());
console.log('share url:', clip);
await m.screenshot({ path: SHOT + '/2-mobile-results.png' });

// ── 2. Shared link opens straight to results ────────────────────────────────
const m2 = await mctx.newPage();
m2.on('pageerror', e => errors.push('share pageerror: ' + e.message));
await m2.goto(clip.replace(/^https?:\/\/[^/]+\//, 'http://127.0.0.1:8741/'), { waitUntil: 'domcontentloaded' });
await m2.waitForSelector('text=Avreise senest', { timeout: 10000 });
console.log('shared link → results screen: OK');
await m2.screenshot({ path: SHOT + '/3-shared-link.png' });
await mctx.close();

// ── 3. Desktop: phone frame present ─────────────────────────────────────────
const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const d = await dctx.newPage();
d.on('pageerror', e => errors.push('desktop pageerror: ' + e.message));
await d.goto(BASE, { waitUntil: 'domcontentloaded' });
await d.waitForSelector('input[type=text]', { timeout: 10000 });
const fw = await d.evaluate(() => {
  const el = document.querySelector('#root > div > div');
  return el ? el.getBoundingClientRect().width : 0;
});
console.log('desktop frame width:', fw, fw === 390 ? 'OK phone frame' : 'FAIL');
await d.screenshot({ path: SHOT + '/4-desktop.png' });
await dctx.close();

// ── 4. Service worker + manifest reachable ──────────────────────────────────
const sctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const s = await sctx.newPage();
await s.goto(BASE, { waitUntil: 'load' });
const swState = await s.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.ready;
  return reg.active ? reg.active.state : 'none';
});
const manifestOk = await s.evaluate(async () => (await fetch('manifest.json')).ok);
console.log('service worker:', swState, '| manifest:', manifestOk ? 'OK' : 'FAIL');
await sctx.close();

await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
