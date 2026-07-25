import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8741/index.html';
const SHOT = process.env.SHOT_DIR || '/tmp/ferrynav-shots';
mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({
  viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true,
  permissions: ['clipboard-write', 'clipboard-read'],
});
const p = await ctx.newPage();
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
await p.evaluate(() => localStorage.clear()).catch(() => {});
await p.goto(BASE, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]', { timeout: 10000 });

// 1. Depart-at mode: click "Kl." → time field + Nå shortcut appear
await p.locator('div:text-is("Kl.")').click();
const timeFields = await p.locator('input[type=time]').count();
const nowBtn = await p.locator('div:text-is("Nå")').count();
console.log('depart-at mode:', timeFields === 1 && nowBtn === 2 ? 'OK time field + Nå button' : 'FAIL');
await p.locator('div:text-is("Ankomst")').click(); // back to arrive mode for the rest

// 2. Language toggle → EN
await p.locator('div:text-is("EN")').first().click();
await p.waitForSelector('text=Plan trip', { timeout: 5000 });
const findBtn = await p.locator('text=Find route').count();
console.log('language EN:', findBtn === 1 ? 'OK "Plan trip"/"Find route"' : 'FAIL');
await p.screenshot({ path: SHOT + '/13-english.png' });
await p.locator('div:text-is("NO")').first().click();
await p.waitForSelector('text=Plan tur', { timeout: 5000 });
console.log('language back to NO: OK');

// 3. Plan a route (Norwegian)
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 10000 });

// 4. Departure picker chips on the ferry step (12px mono cursor divs)
const chips = await p.$$eval('div', els => els.filter(e => e.children.length === 0 && /^\d\d:\d\d( \+1)?$/.test(e.textContent) && e.style.cursor === 'pointer' && e.style.fontSize === '12px').map(e => e.textContent));
console.log('dep chips:', chips.length > 1 ? 'OK ' + chips.join(' ') : 'FAIL');
const leaveBefore = await p.$$eval('div', els => els.find(e => e.style.fontSize === '46px').textContent);
await p.$$eval('div', els => { const c = els.filter(e => e.children.length === 0 && /^\d\d:\d\d( \+1)?$/.test(e.textContent) && e.style.cursor === 'pointer' && e.style.fontSize === '12px'); c[1].click(); });
await p.waitForTimeout(400);
const leaveAfter = await p.$$eval('div', els => els.find(e => e.style.fontSize === '46px').textContent);
console.log('pick another departure:', leaveAfter !== leaveBefore ? `OK leaveBy ${leaveBefore} → ${leaveAfter}` : 'FAIL unchanged');
await p.screenshot({ path: SHOT + '/14-pick-departure.png' });

// 5. Next ferry screen via tab
await p.locator('div:text-is("Plan")').click(); // tab bar → plan
await p.waitForSelector('text=Finn rute', { timeout: 5000 });
await p.locator('div:text-is("Neste")').click();
await p.waitForSelector('text=Neste ferge', { timeout: 5000 });
await p.locator('input[type=text]').fill('Lavik');
await p.locator('text=Lavik ferjekai').first().click();
await p.waitForSelector('text=om ', { timeout: 8000 });
const rows = await p.locator('span:text-is("INNSTILT")').count();
const alertBox = await p.locator('text=Redusert kapasitet').count();
console.log('next ferry screen: OK | cancelled row', rows >= 1 ? 'OK' : 'FAIL', '| alert', alertBox >= 1 ? 'OK' : 'FAIL');
await p.screenshot({ path: SHOT + '/15-next-ferry.png' });

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
