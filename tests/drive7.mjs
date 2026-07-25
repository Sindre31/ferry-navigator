import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
const SHOT = process.env.SHOT_DIR || '/tmp/ferrynav-shots';
mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, permissions: ['clipboard-write','clipboard-read'] });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// the vehicle picker lives behind the fare in the results footer
const openPicker = async () => {
  await p.locator('div:has-text("Fergetakst · estimat")').last().click();
  await p.waitForSelector('text=⚡ El-bil', { timeout: 5000 });
};
const plan = async () => {
  await p.locator('text=Finn rute').click();
  await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
};

const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await plan();

// default car fare (5 km crossing → 60+5*20 = 160)
const carFare = await p.locator('text=≈160 kr').count();
console.log('default car fare:', carFare >= 1 ? 'OK ≈160 kr' : 'FAIL');

// all four vehicle types offered behind the fare
await openPicker();
const vehChips = await p.locator('text=🚗 Bil').count() + await p.locator('text=⚡ El-bil').count()
  + await p.locator('text=🏍 MC').count() + await p.locator('text=🚐 Over 6 m').count();
console.log('vehicle chips:', vehChips === 4 ? 'OK all 4' : 'FAIL ' + vehChips);

// EV → half fare, recomputed without replanning
await p.locator('text=⚡ El-bil').click();
await p.waitForTimeout(300);
const evFare = await p.locator('text=≈80 kr').count();
console.log('EV fare:', evFare >= 1 ? 'OK ≈80 kr (half of 160)' : 'FAIL');
await p.screenshot({ path: SHOT + '/16-vehicle.png' });

// share URL carries the vehicle
await p.locator('text=Del').click();
await p.waitForSelector('text=✓ Kopiert', { timeout: 5000 });
const clip = await p.evaluate(() => navigator.clipboard.readText());
console.log('share vehicle param:', clip.includes('kjt=ev') ? 'OK kjt=ev' : 'FAIL ' + clip);

// back to car → full fare again
await openPicker();
await p.locator('text=🚗 Bil').click();
await p.waitForTimeout(300);
const backToCar = await p.locator('text=≈160 kr').count();
console.log('car fare again:', backToCar >= 1 ? 'OK ≈160 kr' : 'FAIL');

// choice persists across a reload (plan is restored from localStorage)
await openPicker();
await p.locator('text=🚐 Over 6 m').click();
await p.waitForTimeout(300);
const longFare = await p.locator('text=≈288 kr').count();
console.log('over 6 m fare:', longFare >= 1 ? 'OK ≈288 kr (1.8×)' : 'FAIL');
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute', { timeout: 10000 });
await p.locator('div:text-is("Rute")').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 10000 });
const persistedFare = await p.locator('text=≈288 kr').count();
console.log('vehicle persists:', persistedFare >= 1 ? 'OK still over 6 m' : 'FAIL');

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
