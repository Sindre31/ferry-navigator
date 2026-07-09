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
await p.locator('text=Ankomst kl.').click();
await p.locator('input[type=time]').fill('17:30');
const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();
await p.locator('text=Finn rute').click();
await p.waitForSelector('text=Avreise senest', { timeout: 15000 });
// select coastal 2-ferry alternative
await p.locator('text=2 ferger ·').first().click();
await p.waitForTimeout(500);

const getLeave = () => p.$$eval('div', els => els.find(e => e.style.fontSize === '46px').textContent);
// ferry step times (15px mono, colored #37C2F0)
const getFerryTimes = () => p.$$eval('div', els => els.filter(e => e.style.fontSize === '15px' && e.style.fontFamily.includes('JetBrains') && /^\d\d:\d\d/.test(e.textContent)).map(e => e.textContent));
// chips grouped per ferry step: rows of 12px mono cursor divs — collect with parent order
const clickChip = (stepIdx, chipIdx) => p.evaluate(([si, ci]) => {
  const rows = [...document.querySelectorAll('div')].filter(e => e.style.display === 'flex' && e.style.marginTop === '7px');
  rows[si].children[ci].click();
}, [stepIdx, chipIdx]);

const leave0 = await getLeave(); const ferries0 = await getFerryTimes();
console.log('base: leaveBy', leave0, '| ferries', ferries0.join(', '));

// 1. change ferry #1 to a later departure → leaveBy must update
await clickChip(0, 4); // later option (after 2 earlier + current)
await p.waitForTimeout(400);
const leave1 = await getLeave(); const ferries1 = await getFerryTimes();
console.log('ferry#1 later:', leave0, '→', leave1, leave1 !== leave0 ? 'OK leaveBy updated' : 'FAIL leaveBy unchanged');

// reset to base ferry #1
await clickChip(0, 2);
await p.waitForTimeout(400);

// 2. change ferry #2 to an EARLIER departure → ferry #1 + leaveBy unchanged, red warning
const leaveA = await getLeave(); const ferriesA = await getFerryTimes();
await clickChip(1, 0); // earliest (amber) option for ferry 2
await p.waitForTimeout(400);
const leaveB = await getLeave(); const ferriesB = await getFerryTimes();
const warn = await p.locator('text=etter denne avgangen').count();
console.log('ferry#2 earlier: leaveBy', leaveA, '→', leaveB, '| ferry1', ferriesA[0], '→', ferriesB[0]);
console.log('  leaveBy unchanged:', leaveB === leaveA ? 'OK' : 'FAIL');
console.log('  ferry#1 unchanged:', ferriesB[0] === ferriesA[0] ? 'OK' : 'FAIL');
console.log('  late warning:', warn >= 1 ? 'OK shown' : 'FAIL');
await p.screenshot({ path: SHOT + '/22-late-ferry2.png', fullPage: false });

await ctx.close(); await browser.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
