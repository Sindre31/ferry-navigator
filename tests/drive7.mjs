import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, permissions: ['clipboard-write','clipboard-read'] });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// vehicle selector present, default Bil
const vehChips = await p.locator('text=🚗 Bil').count() + await p.locator('text=⚡ El-bil').count() + await p.locator('text=🏍 MC').count() + await p.locator('text=🚐 Over 6 m').count();
console.log('vehicle chips:', vehChips === 4 ? 'OK all 4' : 'FAIL ' + vehChips);

// plan with El-bil → half fare (160 → 80)
await p.locator('text=⚡ El-bil').click();
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });
const evFare = await p.locator('text=≈80 kr').count();
console.log('EV fare:', evFare >= 1 ? 'OK ≈80 kr (half of 160)' : 'FAIL');

// share URL carries vehicle
await p.locator('text=Del').click();
await p.waitForSelector('text=✓ Kopiert', { timeout: 5000 });
const clip = await p.evaluate(() => navigator.clipboard.readText());
console.log('share vehicle param:', clip.includes('kjt=ev') ? 'OK kjt=ev' : 'FAIL ' + clip);

// back, switch to car → full fare
await p.locator('div:text-is("‹")').first().click();
await p.waitForSelector('text=Finn rute', { timeout: 5000 });
await p.locator('text=🚗 Bil').click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });
const carFare = await p.locator('text=≈160 kr').count();
console.log('car fare:', carFare >= 1 ? 'OK ≈160 kr' : 'FAIL');
await p.screenshot({ path: SHOT + '/16-vehicle.png' });

// persistence
await p.locator('div:text-is("‹")').first().click();
await p.locator('text=🚐 Over 6 m').click();
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute', { timeout: 10000 });
const persisted = await p.locator('text=🚐 Over 6 m').first().evaluate(el => el.style.background !== 'rgb(11, 14, 17)');
console.log('vehicle persists:', persisted ? 'OK' : 'FAIL');

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
