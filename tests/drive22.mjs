import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, permissions: ['clipboard-write', 'clipboard-read'] });
const p = await ctx.newPage();
// the two failures below are triggered on purpose — everything else is a bug
const EXPECTED = /reading 'boom'|testavvisning|postetfeil|skalikkesendes/;
const errors = [];
p.on('pageerror', e => { if (!EXPECTED.test(e.message)) errors.push(e.message); });
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// 1. nothing logged yet → no diagnostics line
console.log('quiet when nothing failed:', (await p.locator('text=feil registrert').count()) === 0 ? 'OK' : 'FAIL');

// 2. an uncaught error and a rejected promise both land in the log
await p.evaluate(() => { setTimeout(() => { null.boom; }, 0); });
await p.evaluate(() => { Promise.reject(new Error('testavvisning')); });
await p.waitForTimeout(400);
await p.locator('text=feil registrert').first().waitFor({ timeout: 5000 });
const line = await p.locator('text=feil registrert').first().textContent();
console.log('errors captured:', /2 feil registrert/.test(line) ? 'OK ' + line.trim() : 'FAIL ' + line);

// 3. the list opens and names what failed
await p.locator('text=feil registrert').first().click();
await p.waitForTimeout(200);
const shown = await p.locator('text=testavvisning').count();
console.log('list shows the failure:', shown >= 1 ? 'OK' : 'FAIL');

// 4. copy puts a report on the clipboard
await p.locator('div:text-is("Kopier")').click();
await p.waitForTimeout(300);
const clip = await p.evaluate(() => navigator.clipboard.readText());
console.log('copy to clipboard:', clip.includes('Ferry Navigator') && clip.includes('testavvisning') ? 'OK' : 'FAIL ' + clip.slice(0, 80));

// 5. survives a reload — a user can find it again after the app recovers
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute');
const kept = await p.locator('text=feil registrert').count();
console.log('kept across reload:', kept >= 1 ? 'OK' : 'FAIL');

// 6. clearing empties it for good
await p.locator('text=feil registrert').first().click();
await p.waitForTimeout(200);
await p.locator('div:text-is("Tøm")').click();
await p.waitForTimeout(200);
const gone = await p.locator('text=feil registrert').count();
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('text=Finn rute');
const stillGone = await p.locator('text=feil registrert').count();
console.log('clearing sticks:', gone === 0 && stillGone === 0 ? 'OK' : `FAIL (${gone}/${stillGone})`);

// 7. a failing API is logged rather than swallowed (the page's own fetch is
// mocked, so break it there rather than at the network layer)
await p.evaluate(() => {
  const f = window.fetch;
  window.fetch = (u, o) => String(u).includes('project-osrm') ? Promise.reject(new Error('nettverksfeil')) : f(u, o);
});
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=feil registrert', { timeout: 20000 });
await p.locator('text=feil registrert').first().click();
await p.waitForTimeout(200);
const osrm = await p.locator('text=ruting (OSRM)').count();
console.log('failing API logged:', osrm >= 1 ? 'OK' : 'FAIL');

// 8. errors are posted to the deployment's own /api/log by default
const posted = [];
const ctx3 = await browser.newContext({ viewport: { width: 390, height: 780 } });
await ctx3.route('**/api/log', route => {
  posted.push(route.request().postData() || '');
  route.fulfill({ status: 204, body: '' });
});
const p3 = await ctx3.newPage();
p3.on('pageerror', () => {});
await p3.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p3.evaluate(() => localStorage.clear());
await p3.reload({ waitUntil: 'domcontentloaded' });
await p3.waitForSelector('input[type=text]');
await p3.evaluate(() => { Promise.reject(new Error('postetfeil')); });
await p3.waitForTimeout(600);
const body = posted[0] ? JSON.parse(posted[0]) : null;
console.log('posts to /api/log by default:',
  body && body.msg.includes('postetfeil') && body.app === 'ferry-navigator' && body.ua
    ? 'OK ' + body.where + ' · ' + body.msg : 'FAIL ' + JSON.stringify(posted));

// 9. ?logurl=off keeps everything on the device
await p3.goto('http://127.0.0.1:8741/index.html?logurl=off', { waitUntil: 'domcontentloaded' });
await p3.waitForSelector('input[type=text]');
posted.length = 0;
await p3.evaluate(() => { Promise.reject(new Error('skalikkesendes')); });
await p3.waitForTimeout(600);
const stillLogged = await p3.locator('text=feil registrert').count();
console.log('?logurl=off stops sending:', posted.length === 0 && stillLogged >= 1 ? 'OK still logged locally' : `FAIL (sent ${posted.length}, local ${stillLogged})`);

console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
await ctx.close(); await ctx3.close(); await browser.close();
