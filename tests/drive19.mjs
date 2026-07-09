import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 780 },
  geolocation: { latitude: 60.39, longitude: 5.32 },
  permissions: ['geolocation'],
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');
await p.locator('text=Ankomst kl.').click();
await p.locator('input[type=time]').fill('17:30');
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });

// 1. live vessel marker on results map (mock returns one WATER vehicle)
await p.waitForTimeout(600);
const vessel = await p.evaluate(() => (window.__badges || []).some(h => h.includes('data-vessel')));
console.log('live vessel on results map:', vessel ? 'OK drawn' : 'FAIL');

// 2. offline persistence: reload → plan restored without replanning
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute', { timeout: 10000 });
const ruteTab = await p.locator('div:text-is("Rute")').count();
console.log('plan restored after reload:', ruteTab >= 1 ? 'OK Rute tab present' : 'FAIL');
await p.locator('div:text-is("Rute")').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 5000 });
console.log('restored results screen: OK');

// 3. reroute in navigation: go far off route twice
await p.locator('text=▶ Start').click();
await p.waitForSelector('text=til fergekaia', { timeout: 10000 });
await ctx.setGeolocation({ latitude: 60.90, longitude: 7.00 });
await p.waitForTimeout(1300);
await ctx.setGeolocation({ latitude: 60.91, longitude: 7.01 });
await p.waitForTimeout(2500);
const body = await p.locator('body').innerText();
const rerouted = !errors.length && (body.includes('til mål') || body.includes('til fergekaia'));
console.log('reroute survived:', rerouted ? 'OK nav still live after off-route replan' : 'FAIL');
const stillNav = await p.locator('div:text-is("✕")').count();
console.log('still in nav mode:', stillNav === 1 ? 'OK' : 'FAIL');

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
