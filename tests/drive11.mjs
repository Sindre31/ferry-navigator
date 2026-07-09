import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('fn_gmaps_key', 'mock-key'); });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');
await p.locator('text=Ankomst kl.').click();
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 15000 });

const one = await p.locator('text=1 ferge ·').count();
const two = await p.locator('text=2 ferger ·').count();
const none = await p.locator('text=Uten ferge ·').count();
console.log('google alternatives:', one >= 1 && two >= 1 && none >= 1 ? 'OK inland + coastal(2 ferries) + no-ferry' : `FAIL 1f=${one} 2f=${two} none=${none}`);

// pick the coastal 2-ferry alternative → timeline has two ferry steps
await p.locator('text=2 ferger ·').first().click();
await p.waitForTimeout(500);
const f1 = await p.locator('text=Ferge · Lavik – Oppedal').count();
const f2 = await p.locator('text=Ferge · Oppedal – Lavik').count();
console.log('coastal timeline:', f1 >= 1 && f2 >= 1 ? 'OK two distinct ferry steps' : `FAIL f1=${f1} f2=${f2}`);
await p.screenshot({ path: SHOT + '/18-google-coastal.png' });

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
