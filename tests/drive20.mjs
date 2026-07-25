import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://127.0.0.1:8741/index.html', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=text]');

const big = () => p.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(e => e.style.fontSize === '46px');
  return el ? el.textContent : null;
});
const arrival = () => p.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(e => /^ankomst \d\d:\d\d/.test(e.textContent));
  return el ? el.textContent.replace('ankomst ', '').slice(0, 5) : null;
});
const toMin = s => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const nowMin = await p.evaluate(() => {
  const t = [...document.querySelectorAll('span')].find(e => /^\d\d:\d\d$/.test(e.textContent)).textContent;
  return +t.slice(0, 2) * 60 + +t.slice(3, 5);
});

async function plan(){
  await p.locator('text=Finn rute').click();
  await p.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.style.fontSize === '46px'), null, { timeout: 15000 });
  await p.waitForTimeout(200);
}
async function backToPlan(){ await p.locator('div:text-is("Plan")').click(); await p.waitForSelector('text=Finn rute'); }

// 0. light theme is the default, "Nå" is the default mode
const theme = await p.evaluate(() => document.documentElement.dataset.theme);
console.log('default theme:', theme === 'light' ? 'OK light' : 'FAIL ' + theme);
const nowSel = await p.locator('div:text-is("Nå")').first().evaluate(el => el.style.background);
console.log('default mode:', nowSel.includes('acc') ? 'OK Nå selected' : 'FAIL ' + nowSel);
console.log('no time field in Nå mode:', (await p.locator('input[type=time]').count()) === 0 ? 'OK' : 'FAIL');

const inputs = p.locator('input[type=text]');
await inputs.nth(0).fill('Bergen');
await p.locator('text=Bergen, Vestland').first().click();
await inputs.nth(1).fill('Ålesund');
await p.locator('text=Ålesund, Møre og Romsdal').first().click();

// 1. Nå → leaves this minute
await plan();
const nowDep = await big();
console.log('mode Nå departs now:', Math.abs(toMin(nowDep) - nowMin) <= 1 ? 'OK ' + nowDep : 'FAIL ' + nowDep + ' vs now ' + String(nowMin));
const nowArr = await arrival();

// 2. Avreise kl. → leaves exactly at the chosen time, even with a ferry later
await backToPlan();
await p.locator('div:text-is("Kl.")').click();
await p.locator('input[type=time]').fill('11:07');
await plan();
const atDep = await big();
console.log('mode Kl. departs exactly:', atDep === '11:07' ? 'OK 11:07' : 'FAIL ' + atDep);

// 3. Innen → best departure between now and the deadline
await backToPlan();
await p.locator('div:text-is("Innen")').click();
await p.locator('input[type=time]').fill('14:00');
await plan();
const byDep = await big(), byArr = await arrival();
const inWindow = toMin(byDep) >= nowMin - 1 && toMin(byDep) <= 14 * 60;
console.log('mode Innen inside window:', inWindow ? 'OK ' + byDep + ' → ' + byArr : 'FAIL ' + byDep);
console.log('mode Innen beats Nå (less waiting, same arrival):',
  byArr === nowArr && toMin(byDep) > toMin(nowDep) ? 'OK ' + nowDep + '→' + byDep : 'FAIL ' + nowDep + '/' + nowArr + ' vs ' + byDep + '/' + byArr);

// 4. Ankomst → arrive by the chosen time
await backToPlan();
await p.locator('div:text-is("Ankomst")').click();
await p.locator('input[type=time]').fill('19:00');
await plan();
const arrDep = await big(), arrArr = await arrival();
console.log('mode Ankomst arrives in time:', toMin(arrArr) <= 19 * 60 ? 'OK ' + arrDep + ' → ' + arrArr : 'FAIL ' + arrArr);
console.log('mode Ankomst leaves late:', toMin(arrDep) > toMin(byDep) ? 'OK ' + arrDep : 'FAIL ' + arrDep);
const label = await p.evaluate(() => [...document.querySelectorAll('div')].some(e => e.textContent === 'Avreise senest'));
console.log('arrive-by label:', label ? 'OK' : 'FAIL');

// 5. mode survives a share link round trip
const url = await p.evaluate(async () => {
  let copied = null;
  navigator.clipboard.writeText = t => { copied = t; return Promise.resolve(); };
  [...document.querySelectorAll('div')].find(e => e.textContent === 'Del').click();
  await new Promise(r => setTimeout(r, 300));
  return copied;
});
console.log('share url keeps mode:', url && url.includes('modus=arrive') ? 'OK' : 'FAIL ' + url);

console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
await ctx.close(); await browser.close();
