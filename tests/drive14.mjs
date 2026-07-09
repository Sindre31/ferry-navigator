import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 780 },
  geolocation: { latitude: 60.39, longitude: 5.32 }, // Bergen (route start)
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
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });

// 1. start navigation
await p.locator('text=▶ Start').click();
await p.waitForSelector('text=til fergekaia', { timeout: 10000 });
const pill = await p.locator('div').filter({ hasText: /^⛴ .+til fergekaia$/ }).first().textContent();
console.log('nav started, ferry distance:', pill.trim());
const catches = await p.locator('text=Rekker ').count();
console.log('catch status:', catches >= 1 ? 'OK shown' : 'FAIL');
const dest = await p.locator('text=til mål').count();
console.log('dest distance + eta:', dest >= 1 ? 'OK' : 'FAIL');
await p.screenshot({ path: SHOT + '/20-nav-driving.png' });

// 2. move close to the ferry quay → distance shrinks
await ctx.setGeolocation({ latitude: 61.10, longitude: 5.52 });
await p.waitForTimeout(1200);
const pill2 = await p.locator('div').filter({ hasText: /^⛴ .+til fergekaia$/ }).first().textContent().catch(() => '');
console.log('near quay:', pill2.trim() || '(changed state)');

// 3. jump to destination → arrived
await ctx.setGeolocation({ latitude: 62.47, longitude: 6.15 });
await p.waitForSelector('text=Fremme! 🎉', { timeout: 8000 });
console.log('arrived: OK "Fremme! 🎉"');
await p.screenshot({ path: SHOT + '/21-nav-arrived.png' });

// 4. exit nav → back to results
await p.locator('div:text-is("✕")').click();
await p.waitForSelector('text=Avreise senest', { timeout: 5000 });
console.log('exit nav: OK back to results');

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
