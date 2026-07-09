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
await p.locator('input[type=time]').fill('12:00'); // depart-at (default mode)
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });

const badgesBefore = await p.evaluate(() => (window.__badges || []).filter(h => h.includes('border-radius:20px')).slice(-3));
// pick a later ferry departure (2nd chip)
await p.$$eval('div', els => { const c = els.filter(e => e.children.length === 0 && /^\d\d:\d\d( \+1)?$/.test(e.textContent) && e.style.cursor === 'pointer' && e.style.fontSize === '12px'); c[1].click(); });
await p.waitForTimeout(500);
const badgesAfter = await p.evaluate(() => (window.__badges || []).filter(h => h.includes('border-radius:20px')).slice(-3));
const selBefore = badgesBefore.find(b => b.includes('#2BD9D0') && b.includes('background:#2BD9D0'));
const selAfter = badgesAfter.find(b => b.includes('background:#2BD9D0'));
const t = h => (h.match(/>([^<]+)<\/div>$/) || [])[1];
console.log('selected badge before:', t(selBefore || ''), '| after:', t(selAfter || ''));
console.log('map badge updates on ferry change:', selBefore && selAfter && t(selBefore) !== t(selAfter) ? 'OK' : 'FAIL');
await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
