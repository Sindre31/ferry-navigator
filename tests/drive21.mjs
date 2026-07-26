import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [], warnings = [];
p.on('pageerror', e => errors.push(e.message));
p.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('fn_gmaps_key', 'mock-key'); });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// a key that is not valid for this domain: the SDK answers REQUEST_DENIED
await p.evaluate(() => {
  window.google.maps.DirectionsService = function () {
    this.route = (req, cb) => setTimeout(() => cb(null, 'REQUEST_DENIED'), 5);
  };
});

const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();

// 1. the trip still plans — OSRM takes over
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
console.log('fallback still plans the trip: OK');

// 2. the plan screen explains why routing changed
await p.locator('div:text-is("Plan")').click();
await p.waitForSelector('text=Finn rute');
const warn = await p.locator('text=gjelder ikke for dette domenet').count();
console.log('key notice shown:', warn >= 1 ? 'OK' : 'FAIL');

// 3. the console tells the owner how to fix it
const hint = warnings.find(w => w.includes('Ferry Navigator') && w.includes('referrers'));
console.log('console hint for the owner:', hint ? 'OK' : 'FAIL ' + JSON.stringify(warnings.slice(0, 2)));

// 4. dismissable, and it stays dismissed
await p.locator('text=gjelder ikke for dette domenet').click();
await p.waitForTimeout(200);
const gone = await p.locator('text=gjelder ikke for dette domenet').count();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
await p.locator('div:text-is("Plan")').click();
await p.waitForSelector('text=Finn rute');
const stillGone = await p.locator('text=gjelder ikke for dette domenet').count();
console.log('dismissable:', gone === 0 && stillGone === 0 ? 'OK stays dismissed' : `FAIL (${gone}/${stillGone})`);

// 5. no notice when Google answers normally
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p2 = await ctx2.newPage();
await p2.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p2.evaluate(() => { localStorage.clear(); localStorage.setItem('fn_gmaps_key', 'mock-key'); });
await p2.reload({ waitUntil: 'domcontentloaded' });
await p2.waitForSelector('input[type=text]');
const i2 = p2.locator('input[type=text]');
await i2.nth(0).fill('Bergen');
await p2.locator('text=Bergen, Vestland').first().click();
await i2.nth(1).fill('Ålesund');
await p2.locator('text=Ålesund, Møre og Romsdal').first().click();
await p2.locator('text=Finn rute').click();
await p2.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
await p2.locator('div:text-is("Plan")').click();
await p2.waitForSelector('text=Finn rute');
const quiet = await p2.locator('text=Ruting bruker reserveløsningen').count();
console.log('silent when the key works:', quiet === 0 ? 'OK' : 'FAIL');

console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
await ctx.close(); await ctx2.close(); await browser.close();
