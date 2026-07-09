import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// 1. slider gone, presets 0/5/10/15
const slider = await p.locator('input[type=range]').count();
const preset15 = await p.locator('div:text-is("15")').count();
console.log('slider removed:', slider === 0 ? 'OK' : 'FAIL', '| preset 15:', preset15 >= 1 ? 'OK' : 'FAIL');

// 2. native time input
const timeInput = await p.locator('input[type=time]').count();
await p.locator('input[type=time]').fill('17:30');
const timeVal = await p.locator('input[type=time]').inputValue();
console.log('time input:', timeInput === 1 && timeVal === '17:30' ? 'OK set 17:30' : 'FAIL');

// 3. plan route
await p.locator('text=Ankomst kl.').click();
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });
const arr = await p.locator('text=ankomst 17:10').count(); // latest feasible arrival before requested 17:30
console.log('arrive-by uses time input:', arr >= 1 ? 'OK arrives 17:10 ≤ requested 17:30' : 'FAIL');

// 4. price tap → vehicle picker → EV halves price
await p.locator('text=≈160 kr').click();
await p.waitForSelector('text=⚡ El-bil', { timeout: 5000 });
await p.locator('text=⚡ El-bil').click();
await p.waitForTimeout(300);
const evFare = await p.locator('text=≈80 kr').count();
console.log('price → vehicle picker:', evFare >= 1 ? 'OK ≈80 kr after EV' : 'FAIL');
await p.screenshot({ path: SHOT + '/17-price-vehicle.png' });

// 5. favorites-only persistence: not starred → gone after reload
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute', { timeout: 10000 });
const gone = await p.locator('text=Bergen → Ålesund').count();
console.log('unstarred recent forgotten:', gone === 0 ? 'OK' : 'FAIL still there');

// plan again, star it, reload → present
await p.locator('input[type=text]').nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await p.locator('input[type=text]').nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=ankomst ', { timeout: 10000 });
await p.locator('div:text-is("Plan")').click();
await p.waitForSelector('text=Finn rute', { timeout: 5000 });
await p.locator('div:text-is("☆")').first().click();
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute', { timeout: 10000 });
const kept = await p.locator('div:text-is("★")').count();
console.log('starred recent kept:', kept >= 1 ? 'OK' : 'FAIL');

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
