import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('fn_gmaps_key', 'mock-key'); });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

// arrive-by 06:00 → impossible → red arrival
await p.locator('text=Ankomst kl.').click();
await p.locator('input[type=time]').fill('06:00');
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 15000 });

// 1. sorted fastest first: first chip should have the smallest duration
const chipTexts = await p.$$eval('div', els => els.filter(e => /^\d+h( \d+m)?$|^\d+m$/.test(e.textContent) && e.style.fontSize === '15px').map(e => e.textContent));
console.log('chips order:', chipTexts.join(' | '));
const mins = t => { const m = /(?:(\d+)h)?\s*(?:(\d+)m)?/.exec(t); return (+(m[1]||0))*60+(+(m[2]||0)); };
const sorted = chipTexts.every((t, i, a) => i === 0 || mins(a[i-1]) <= mins(t));
console.log('sorted fastest→slowest:', sorted ? 'OK' : 'FAIL');

// 2. red arrival (requested 06:00, actual later)
const red = await p.$$eval('span', els => els.some(e => e.textContent.startsWith('ankomst') && e.style.color === 'var(--red)'));
console.log('late arrival red:', red ? 'OK' : 'FAIL');
await p.screenshot({ path: SHOT + '/19-late-red.png' });

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
