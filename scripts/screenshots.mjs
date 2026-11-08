import puppeteer from 'puppeteer-core';
const out = process.argv[2] ?? 'docs/screenshots';
// Vorher: npm run build && npm run preview
const URL = process.env.URL ?? 'http://localhost:4173/';
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const VP = { width: 390, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// Uhrzeit für den Screenshot festlegen (Tag/Nacht im Fenster)
function at(hour) { const d = new Date(); d.setHours(hour, 0, 0, 0); return d.getTime(); }

async function page(state, hour) {
  const p = await b.newPage();
  await p.setViewport(VP);
  await p.evaluateOnNewDocument((st, t0) => {
    const real = Date.now.bind(Date); const start = real();
    Date.now = () => t0 + (real() - start);
    if (st) { st.clock = t0; st.lastReal = t0; localStorage.setItem('tamagotchi.v1', JSON.stringify(st)); }
  }, state, at(hour));
  await p.goto(URL, { waitUntil: 'networkidle0' });
  await w(700);
  return p;
}

function pet(species, stage, variant, extra = {}) {
  const t = at(12);
  return {
    version: 1, clock: t, lastReal: t, ending: null, memorials: [],
    settings: { sound: false, notifications: false },
    pet: {
      species, stage, variant, createdAt: t - 9 * 864e5, hatchedAt: t - 9 * 864e5, stageStartedAt: t - 3600e3,
      hunger: 3, happy: 4, tiredness: 40, weight: 32, discipline: 75, sick: null, poops: [], poopInMin: 999,
      asleep: false, lightOn: true, sleptInCycleMin: 0, sleepBuckets: [], sleepDeficitSince: null,
      hungerZeroSince: null, happyZeroSince: null, calls: {}, fakeCallsToday: 0, snacksToday: 1,
      dayKey: '', careMistakesStage: 1, careMistakesTotal: 3, adultLifespanDays: 22,
      log: [{ at: t - 9 * 864e5, text: 'Ein Ei ist da.' }, { at: t - 9 * 864e5 + 6e4, text: 'Geschlüpft!' }, { at: t - 3600e3, text: 'Entwickelt zum Erwachsen (prächtig).' }],
      ...extra,
    },
  };
}
const device = async (p, name) => { const el = await p.$('.device'); await el.screenshot({ path: `${out}/${name}.png` }); };
const sheet = async (p, name) => { await w(400); const el = await p.$('dialog'); await el.screenshot({ path: `${out}/${name}.png` }); };

let p;
if (process.argv[3] !== "sick") { // "sick" = nur den letzten Screenshot
// 1) Tierauswahl
p = await page(null, 12);
await sheet(p, 'choose'); await p.close();

// 2) Erwachsener Prachtfuchs am Tag, mit Haufen
p = await page(pet('fox', 'adult', 'great', { name: 'Rudi', poops: [at(11)] }), 12);
await p.evaluate(() => {}); await device(p, 'fox-day'); 
// 3) Statusbildschirm
await p.click('[data-id=status]'); await sheet(p, 'status');
await p.keyboard.press('Escape'); await w(300);
// 4) Spieleliste
await p.click('[data-id=play]'); await sheet(p, 'games');
// 5) Beeren fangen
const btns = await p.$$('.game-list .choice'); await btns[2].click(); await w(2600);
await sheet(p, 'game-catch'); await p.close();

// 6) Igel-Teenager schläft nachts, Licht aus
p = await page(pet('hedgehog', 'teen', 'good', { name: 'Pieks', weight: 22, asleep: true, lightOn: false, sleptInCycleMin: 200, tiredness: 50 }), 23);
await device(p, 'hedgehog-night'); await p.close();

}
// Katze, grau getigert
p = await page(pet('cat', 'teen', 'good', { name: 'Minka', weight: 21, look: { coat: 1, pattern: 'tabby', seed: 3 } }), 10);
await device(p, 'cat-day'); await p.close();
// 7) Igelbaby ist krank und ruft
p = await page(pet('hedgehog', 'baby', 'normal', { name: 'Krümel', weight: 6, hunger: 1, happy: 1, hatchedAt: at(2), stageStartedAt: at(2), sick: { since: at(14), doses: 2 }, poops: [at(10), at(14)], calls: { sick: { since: at(14), penalized: false }, poop: { since: at(14), penalized: false } } }), 15);
await device(p, 'hedgehog-sick'); await p.close();

await b.close();
