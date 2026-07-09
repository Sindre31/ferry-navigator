import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, colorScheme: 'dark' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// dark by default (colorScheme dark)
const bg1 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log('default dark bg:', bg1, bg1 === 'rgb(5, 7, 10)' ? 'OK' : 'FAIL');

// toggle to light
await p.locator('[title="Tema"]').click();
await p.waitForTimeout(300);
const bg2 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
const txt = await p.evaluate(() => getComputedStyle([...document.querySelectorAll('div')].find(e => e.textContent === 'Plan tur')).color);
console.log('light mode: bg', bg2, '| heading', txt, bg2 === 'rgb(233, 237, 242)' && txt === 'rgb(23, 34, 43)' ? 'OK' : 'FAIL');
await p.screenshot({ path: SHOT + '/26-light-plan.png' });

// plan a route in light mode
await p.locator('text=Ankomst kl.').click();
await p.locator('input[type=time]').fill('17:30');
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
await p.screenshot({ path: SHOT + '/27-light-results.png' });
console.log('light results screen: OK rendered');

// persists after reload
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');
const bg3 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log('light persists:', bg3 === 'rgb(233, 237, 242)' ? 'OK' : 'FAIL ' + bg3);

// back to dark
await p.locator('[title="Tema"]').click();
await p.waitForTimeout(300);
const bg4 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log('toggle back to dark:', bg4 === 'rgb(5, 7, 10)' ? 'OK' : 'FAIL');

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
