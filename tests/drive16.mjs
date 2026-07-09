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

// depart-at 12:08 (default mode) → departure should be pulled later to match ferry+buffer
await p.locator('input[type=time]').fill('12:08');
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
const getLeave = () => p.$$eval('div', els => els.find(e => e.style.fontSize === '46px').textContent);
const leave = await getLeave();
console.log('depart adjusted to ferry+buffer:', leave, leave !== '12:08' ? 'OK (pulled later than 12:08)' : 'FAIL still 12:08');

// tab bar visible on results, back button gone
const planTab = await p.locator('div:text-is("Plan")').count();
const backBtn = await p.locator('div:text-is("‹")').count();
console.log('results: tab bar', planTab >= 1 ? 'OK visible' : 'FAIL', '| back button', backBtn === 0 ? 'OK removed' : 'FAIL still there');

// tight: pick an earlier ferry #1 chip reachable from requested time with <buffer slack
await p.$$eval('div', els => { const c = els.filter(e => e.children.length === 0 && /^\d\d:\d\d( \+1)?$/.test(e.textContent) && e.style.cursor === 'pointer' && e.style.fontSize === '12px'); c[1].click(); });
await p.waitForTimeout(400);
const tight = await p.locator('text=Dårlig tid').count();
const lateW = await p.locator('text=etter denne avgangen').count();
console.log('tight/late marking after earlier pick:', tight >= 1 ? 'OK tight shown' : (lateW >= 1 ? 'OK late warning shown' : 'FAIL neither'));
await p.screenshot({ path: SHOT + '/23-tight.png' });
await ctx.close();

// iPad layout
const ctx2 = await browser.newContext({ viewport: { width: 820, height: 1180 } });
const p2 = await ctx2.newPage();
await p2.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p2.waitForSelector('input[type=text]');
const dims = await p2.evaluate(() => {
  const el = document.querySelector('#root > div > div');
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height };
});
console.log('iPad layout:', JSON.stringify(dims), dims.w === 560 && dims.h === 1180 ? 'OK full-height 560px column' : 'FAIL');
await p2.screenshot({ path: SHOT + '/24-ipad.png' });
await ctx2.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
