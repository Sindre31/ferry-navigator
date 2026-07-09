import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:8741/index.html';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
await p.goto(BASE, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]', { timeout: 10000 });

// buffer presets 0/5/10, default 5
for (const v of ['0','5','10']) {
  const c = await p.locator(`div:text-is("${v}")`).count();
  if (c < 1) console.log(`FAIL preset ${v} missing`);
}
const defMargin = await p.locator('text=5 min').first().textContent();
console.log('default buffer:', defMargin.trim() === '5 min' ? 'OK 5 min' : 'FAIL ' + defMargin);

const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });

await p.locator('text=Rutetider').click();
await p.waitForSelector('text=Kryssing', { timeout: 5000 });
const rows = await p.locator('span:has-text("→")').count();
const tomorrow = await p.locator('text=I MORGEN').count();
console.log('timetable rows:', rows, '| next-day rows:', tomorrow, tomorrow > 0 ? 'OK 24h window crosses midnight' : 'FAIL no next-day departures');
await p.locator('.scroll-hide').first().evaluate(el => el.scrollTop = el.scrollHeight);
await p.screenshot({ path: SHOT + '/8-timetable-24h.png' });

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
