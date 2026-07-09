import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('fn_gmaps_key', 'mock-key'); });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');
await p.locator('input[type=time]').fill('10:00');
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
// select the coastal 2-ferry route (varying connections)
await p.locator('text=2 ferger ·').first().click();
await p.waitForTimeout(400);

// open best times
await p.locator('text=☀ Beste avreisetider').click();
await p.waitForSelector('text=korresponderer best', { timeout: 5000 });
const rows = await p.$$eval('span', els => {
  const best = els.filter(e => e.textContent === 'BEST').length;
  return best;
});
const totalRows = await p.$$eval('div', els => els.filter(e => e.style.justifyContent === 'space-between' && e.style.cursor === 'pointer' && /\d\d:\d\d/.test(e.textContent) && e.textContent.includes('→')).length);
console.log('best-times panel:', totalRows, 'rows,', rows, 'marked BEST', totalRows > 2 && rows >= 1 && rows < totalRows ? '→ OK varying totals' : '→ FAIL');
await p.screenshot({ path: SHOT + '/25-best-times.png' });

// click a BEST row → leaveBy jumps to that time
const getLeave = () => p.$$eval('div', els => els.find(e => e.style.fontSize === '46px').textContent);
const before = await getLeave();
const bestLeave = await p.$$eval('div', els => {
  const row = els.find(e => e.style.justifyContent === 'space-between' && e.style.cursor === 'pointer' && [...e.querySelectorAll('span')].some(s => s.textContent === 'BEST'));
  const t = row.querySelector('span').textContent;
  row.click();
  return t;
});
await p.waitForTimeout(400);
const after = await getLeave();
console.log('pick BEST row:', before, '→', after, after === bestLeave ? 'OK leaveBy = best time' : `FAIL (expected ${bestLeave})`);

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
