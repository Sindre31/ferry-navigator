import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:8741/index.html';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({
  viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true,
  geolocation: { latitude: 60.39, longitude: 5.32 },
  permissions: ['geolocation', 'clipboard-write', 'clipboard-read'],
});
const p = await ctx.newPage();
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
await p.goto(BASE, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]', { timeout: 10000 });

// 1. My location
await p.locator('[title="Bruk min posisjon"]').click();
await p.waitForFunction(() => document.querySelector('input[type=text]').value === 'Testveien 1, Bergen', null, { timeout: 8000 });
console.log('my location: OK "Testveien 1, Bergen"');

// 2. Via point
await p.locator('input[type=text]').nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=+ Legg til via-punkt').click();
await p.locator('input[type=text]').nth(1).fill('Førde'); // via input is now index 1 (between from and to)
await p.locator('text=Førde, Sunnfjord').first().click();
await p.screenshot({ path: SHOT + '/9-plan-via.png' });
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });
console.log('via route planned: OK');

// 3. Real fare estimate (5 km crossing → 60+5*20=160)
const fare = await p.locator('text=≈160 kr').count();
console.log('fare estimate:', fare >= 1 ? 'OK ≈160 kr' : 'FAIL');
const estLabel = await p.locator('text=Fergetakst · estimat').count();
console.log('fare label:', estLabel >= 1 ? 'OK' : 'FAIL');

// 4. Alert shown on ferry step
const alert = await p.locator('text=Redusert kapasitet').count();
console.log('disruption alert:', alert >= 1 ? 'OK shown' : 'FAIL');
await p.screenshot({ path: SHOT + '/10-results-alert.png' });

// 5. Share URL includes via
await p.locator('text=Del').click();
await p.waitForSelector('text=✓ Kopiert', { timeout: 5000 });
const clip = await p.evaluate(() => navigator.clipboard.readText());
console.log('share url via:', clip.includes('via=') && clip.includes('via_p=') ? 'OK' : 'FAIL', '|', decodeURIComponent(clip.split('?')[1].slice(0, 80)) + '…');

// 6. Timetable: cancelled + alert box
await p.locator('text=Rutetider').click();
await p.waitForSelector('text=Kryssing', { timeout: 5000 });
const cancelled = await p.locator('text=INNSTILT').count();
const ttAlert = await p.locator('text=Redusert kapasitet').count();
console.log('timetable: cancelled', cancelled >= 1 ? 'OK' : 'FAIL', '| alert box', ttAlert >= 1 ? 'OK' : 'FAIL');
await p.screenshot({ path: SHOT + '/11-timetable-cancelled.png' });

// 7. Recents: back to plan, row should exist; toggle favorite
await p.locator('div:text-is("‹")').first().click(); // back to results
await p.waitForSelector('text=Avreise senest', { timeout: 5000 });
await p.locator('div:text-is("‹")').first().click(); // back to plan
await p.waitForSelector('text=Finn rute', { timeout: 5000 });
const recentRow = await p.locator('text=Testveien 1 → Ålesund').count();
const recentVia = await p.locator('text=via Førde').count();
console.log('recents row:', recentRow >= 1 && recentVia >= 1 ? 'OK with via' : `FAIL (row=${recentRow}, via=${recentVia})`);
await p.locator('div:text-is("☆")').first().click();
const starred = await p.locator('div:text-is("★")').count();
console.log('favorite toggle:', starred >= 1 ? 'OK' : 'FAIL');
await p.screenshot({ path: SHOT + '/12-recents.png' });

// 8. Persist across reload + tap recent = auto plan
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute', { timeout: 10000 });
const persisted = await p.locator('div:text-is("★")').count();
console.log('recents persist reload:', persisted >= 1 ? 'OK still favorite' : 'FAIL');
await p.locator('text=Testveien 1 → Ålesund').first().click();
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });
console.log('tap recent → auto plan: OK');

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
