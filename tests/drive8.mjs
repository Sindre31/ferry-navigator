import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
const SHOT = process.env.SHOT_DIR || '/tmp/ferrynav-shots';
mkdirSync(SHOT, { recursive: true });
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

// 2. native time input (appears once a clock-based mode is picked)
await p.locator('div:text-is("Kl.")').click();
const timeInput = await p.locator('input[type=time]').count();
await p.locator('input[type=time]').fill('17:30');
const timeVal = await p.locator('input[type=time]').inputValue();
console.log('time input:', timeInput === 1 && timeVal === '17:30' ? 'OK set 17:30' : 'FAIL');

// 3. plan route
await p.locator('div:text-is("Ankomst")').click();
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 10000 });
const arrTxt = await p.evaluate(() => ([...document.querySelectorAll('span')].find(e => /^ankomst \d\d:\d\d/.test(e.textContent)) || {}).textContent);
const arrMin = arrTxt ? +arrTxt.slice(8, 10) * 60 + +arrTxt.slice(11, 13) : 1e9;
console.log('arrive-by uses time input:', arrMin <= 17 * 60 + 30 ? 'OK ' + arrTxt + ' ≤ requested 17:30' : 'FAIL ' + arrTxt);

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
