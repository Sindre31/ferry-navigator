import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:8741/index.html';
const SHOT = '/tmp/claude-0/-home-claude/3db2e60f-bf31-5e12-b82c-8381565e61b0/scratchpad/test';
const browser = await chromium.launch();
const errors = [];

const ctx = await browser.newContext({
  viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true,
});
const p = await ctx.newPage();
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
await p.goto(BASE, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]', { timeout: 10000 });

await p.locator('text=Ankomst kl.').click();
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 10000 });

// Alternative chips present?
const ferryChip = await p.locator('text=1 ferge ·').count();
const noFerryChip = await p.locator('text=Uten ferge ·').count();
console.log('chips:', ferryChip >= 1 && noFerryChip >= 1 ? 'OK both alternatives shown' : `FAIL (ferry=${ferryChip}, none=${noFerryChip})`);

// Ferry named from–to?
const ferryStep = await p.locator('text=Ferge · Lavik – Oppedal').count();
console.log('ferry from–to name:', ferryStep === 1 ? 'OK "Lavik – Oppedal"' : 'FAIL (' + ferryStep + ')');
await p.screenshot({ path: SHOT + '/5-alternatives.png' });

// Switch to the no-ferry alternative
await p.locator('text=Uten ferge ·').first().click();
await p.waitForTimeout(400);
const badge = await p.locator('text=Ingen ferge').count();
const noFerryTimeline = await p.locator('text=Ferge · Lavik – Oppedal').count();
console.log('switch to no-ferry:', badge >= 1 && noFerryTimeline === 0 ? 'OK timeline + badge updated' : `FAIL (badge=${badge}, ferrystep=${noFerryTimeline})`);
await p.screenshot({ path: SHOT + '/6-no-ferry-selected.png' });

// Switch back
await p.locator('text=1 ferge ·').first().click();
await p.waitForTimeout(400);
console.log('switch back to ferry:', (await p.locator('text=Ferge · Lavik – Oppedal').count()) === 1 ? 'OK' : 'FAIL');

// Timetable shows the from–to name
await p.locator('text=Rutetider').click();
await p.waitForSelector('text=Kryssing', { timeout: 5000 });
const ttHasName = await p.locator('text=DIN FERGE').count();
console.log('timetable:', ttHasName >= 1 ? 'OK boarded ferry highlighted' : 'FAIL');
await p.screenshot({ path: SHOT + '/7-timetable.png' });

await ctx.close();
await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
