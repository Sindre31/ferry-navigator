import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// 1. default mode = Avreise kl. with Nå button visible
const nowBtn = await p.locator('div:text-is("Nå")').count();
const depSel = await p.locator('text=Avreise kl.').evaluate(el => el.style.background);
console.log('default depart-at:', nowBtn === 1 && depSel.includes('43') ? 'OK selected with Nå' : 'FAIL');

// 2. plan with via → results in leave mode
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await p.locator('text=+ Legg til via-punkt').click();
await p.locator('input[type=text]').nth(1).fill('Førde');
await p.locator('text=Førde, Sunnfjord').first().click();
await p.locator('input[type=text]').nth(2).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Ankomst kl.').click();
await p.locator('input[type=time]').fill('17:30');
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=ankomst ', { timeout: 10000 });
// select the ferry alternative (late at night the no-ferry route sorts first)
if (await p.locator('text=Ferge · Lavik – Oppedal').count() === 0) {
  await p.locator('text=1 ferge ·').first().click();
  await p.waitForSelector('text=Ferge · Lavik – Oppedal', { timeout: 5000 });
}

// 3. quay arrival estimate shown on the ferry step
const quay = await p.locator('text=Ved kai ca.').count();
console.log('quay arrival estimate:', quay >= 1 ? 'OK "Ved kai ca." shown' : 'FAIL');

// 4. favorites are from/to only: back → recent row has no via line
await p.locator('div:text-is("Plan")').click();
await p.waitForSelector('text=Finn rute', { timeout: 5000 });
const row = await p.locator('text=Bergen → Ålesund').count();
const viaLine = await p.locator('text=via Førde').count();
console.log('recent from/to only:', row >= 1 && viaLine === 0 ? 'OK no via in recents' : `FAIL row=${row} via=${viaLine}`);

// 5. tapping recent clears via and plans from→to directly
await p.locator('text=Bergen → Ålesund').first().click();
await p.waitForTimeout(300);

const filled = await p.locator('input[type=text]').nth(0).inputValue();
console.log('recent fills fields only:', filled.includes('Bergen') ? 'OK' : 'FAIL ' + filled);
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=ankomst ', { timeout: 10000 });
console.log('plan via Finn rute after recent: OK');
await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
