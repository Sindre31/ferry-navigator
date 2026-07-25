import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');
await p.locator('div:text-is("Ankomst")').click();
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 10000 });

// the chip you are booked on is the one filled in ferry blue
const getChips = () => p.$$eval('div', els => els.filter(e => e.children.length === 0 && /^\d\d:\d\d( \+1)?$/.test(e.textContent) && e.style.cursor === 'pointer' && e.style.fontSize === '12px')
  .map(e => ({ t: e.textContent, sel: /55, ?194, ?240/.test(e.style.background) })));
const getLeave = () => p.$$eval('div', els => els.find(e => e.style.fontSize === '46px').textContent);
const clickChip = i => p.$$eval('div', (els, i) => { els.filter(e => e.children.length === 0 && /^\d\d:\d\d( \+1)?$/.test(e.textContent) && e.style.cursor === 'pointer' && e.style.fontSize === '12px')[i].click(); }, i);
const toMin = s2 => +s2.slice(0, 2) * 60 + +s2.slice(3, 5);

const chips0 = await getChips(), leave0 = await getLeave();
const sel0 = chips0.findIndex(c => c.sel);
console.log('boarded chip highlighted:', sel0 >= 0 ? 'OK ' + chips0[sel0].t + ' of ' + chips0.map(c => c.t).join(' ') : 'FAIL none marked');

// a later departure moves the home departure by the same amount
const later = chips0.length - 1;
await clickChip(later); await p.waitForTimeout(400);
const chips1 = await getChips(), leave1 = await getLeave();
const shift = toMin(chips0[later].t) - toMin(chips0[sel0].t);
console.log('pick later:', leave0, '→', leave1,
  toMin(leave1) - toMin(leave0) === shift ? `OK leaveBy +${shift} min` : `FAIL expected +${shift} min`);
console.log('chips stable:', JSON.stringify(chips0.map(c => c.t)) === JSON.stringify(chips1.map(c => c.t)) ? 'OK same options' : `FAIL ${chips0.map(c => c.t)} vs ${chips1.map(c => c.t)}`);
console.log('selection follows the pick:', chips1[later]?.sel ? 'OK' : 'FAIL');

// picking the original departure again restores the original plan
await clickChip(sel0); await p.waitForTimeout(400);
const leave2 = await getLeave();
console.log('pick original again:', leave1, '→', leave2, leave2 === leave0 ? 'OK back to ' + leave0 : 'FAIL');
await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
