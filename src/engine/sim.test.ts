import { describe, expect, it } from 'vitest';
import { DAY, HOUR, MIN } from './config';
import { activePet, newGame } from './state';
import { advance, layEgg, tirednessAtHatch } from './sim';
import { clean, collectEggs, feedMeal, finishGame, giveMedicine, lightButton, scold, startEgg, stroke, wakeUp } from './actions';

const T0 = new Date(2026, 0, 1, 8, 0).getTime();
const rng = () => 0.5;
const never = () => 0.999; // keine Zufallsereignisse

function game() {
  const s = newGame(T0);
  startEgg(s, 'fox');
  return s;
}
const realNow = new WeakMap<object, number>();
const run = (s: ReturnType<typeof newGame>, ms: number, r = never) => {
  const t = (realNow.get(s) ?? T0) + ms;
  realNow.set(s, t);
  return advance(s, t, r);
};

describe('Lebenszyklus', () => {
  it('schlüpft nach 1 Minute', () => {
    const s = game();
    run(s, 30_000);
    expect(activePet(s)!.stage).toBe('egg');
    const ev = run(s, 30_000);
    expect(activePet(s)!.stage).toBe('baby');
    expect(ev.some((e) => e.kind === 'hatched')).toBe(true);
  });

  it('wird nach 1 Tag zum Kind (bei Pflege)', () => {
    const s = game();
    run(s, MIN);
    for (let h = 0; h < 24; h++) {
      run(s, HOUR);
      const p = activePet(s)!;
      while (p.hunger < 3 && !p.asleep && feedMeal(s, rng).ok);
      clean(s);
      if (p.asleep && p.lightOn) lightButton(s);
    }
    expect(activePet(s)!.stage).toBe('child');
  });

  it('rechnet offline verpasste Zeit nach', () => {
    const s = game();
    run(s, 3 * DAY);
    // ohne Pflege nach 3 Tagen tot
    expect(activePet(s)).toBeNull();
    expect(s.ending?.reason).toBe('death');
  });
});

describe('Schlafen', () => {
  it('wacht nach 8 h Schlaf insgesamt auf und kackt innerhalb 1 h', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.tiredness = 90;
    expect(lightButton(s).ok).toBe(true);
    p.sleptInCycleMin = 120; // 2 h Nickerchen schon geschlafen
    run(s, 6 * HOUR - MIN);
    expect(p.asleep).toBe(true);
    run(s, MIN);
    expect(p.asleep).toBe(false);
    expect(p.hunger).toBeLessThanOrEqual(1);
    const before = p.poops.length;
    run(s, HOUR, rng);
    expect(p.poops.length).toBeGreaterThan(before);
  });

  it('Licht anlassen ist nach 15 min ein Pflegefehler', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.tiredness = 99.95;
    run(s, 2 * MIN);
    expect(p.asleep).toBe(true);
    expect(p.lightOn).toBe(true);
    const m = p.careMistakesTotal;
    run(s, 16 * MIN);
    expect(p.careMistakesTotal).toBe(m + 1);
  });
});

describe('Krankheit', () => {
  it('Haufen > 4 h macht krank, Medizin heilt', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.poops = [s.clock];
    p.poopInMin = 99999;
    run(s, 4 * HOUR);
    expect(p.sick).not.toBeNull();
    clean(s);
    while (p.sick) expect(giveMedicine(s).ok).toBe(true);
    const m = p.careMistakesTotal;
    p.happy = 3;
    expect(giveMedicine(s).ok).toBe(false);
    expect(p.careMistakesTotal).toBe(m + 1);
    expect(p.happy).toBe(2);
  });

  it('Hunger > 2 h auf 0 macht krank', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.hunger = 0;
    p.poopInMin = 99999;
    run(s, 2 * HOUR + MIN);
    expect(p.sick).not.toBeNull();
  });
});

describe('Disziplin', () => {
  it('Schimpfen bei Fake-Ruf erhöht Disziplin, sonst sinkt die Laune', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.happy = 3;
    expect(scold(s).ok).toBe(false);
    expect(p.happy).toBe(2);
    p.calls.fake = { since: s.clock, penalized: false };
    expect(scold(s).ok).toBe(true);
    expect(p.discipline).toBe(25);
  });
});

describe('Name', () => {
  it('wird gekürzt, getrimmt und landet im Tagebuch', async () => {
    const { renamePet } = await import('./actions');
    const s = game();
    run(s, MIN);
    expect(renamePet(s, '   ').ok).toBe(false);
    expect(renamePet(s, '  Rudi   der   Fuchs von nebenan ').ok).toBe(true);
    expect(activePet(s)!.name).toBe('Rudi der Fuchs');
    expect(activePet(s)!.log.at(-1)!.text).toContain('Rudi der Fuchs');
  });
});

describe('Spielen', () => {
  it('gibt immer +1 Laune, auch bei Niederlage', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.happy = 1;
    finishGame(s, false);
    expect(p.happy).toBe(2);
    finishGame(s, true);
    expect(p.happy).toBe(3);
  });
});

describe('Müdigkeit beim Schlüpfen', () => {
  const at = (h: number) => new Date(2026, 0, 1, h, 0).getTime();
  it('richtet sich nach der Uhrzeit', () => {
    expect(tirednessAtHatch(at(7))).toBe(0);
    expect(tirednessAtHatch(at(18))).toBeCloseTo(68.75);
    expect(tirednessAtHatch(at(23))).toBe(100);
    expect(tirednessAtHatch(at(2))).toBe(100);
  });
  it('Schlüpfen um 18 Uhr: schläft gegen 23 Uhr von selbst ein', () => {
    const s = newGame(at(18) - MIN);
    startEgg(s, 'fox');
    const p = () => activePet(s)!;
    let t = at(18) - MIN;
    const step = (ms: number) => advance(s, (t += ms), never);
    step(MIN + 1000);
    expect(p().stage).toBe('baby');
    step(4 * HOUR + 50 * MIN);
    expect(p().asleep).toBe(false);
    step(15 * MIN);
    expect(p().asleep).toBe(true);
  });
});

describe('Mehrere Tiere', () => {
  it('laufen gleichzeitig, umschalten wechselt das aktive Tier', async () => {
    const { switchPet } = await import('./actions');
    const s = game();
    const first = activePet(s)!.id;
    expect(startEgg(s, 'cat')).toBe(true);
    const second = activePet(s)!.id;
    expect(second).not.toBe(first);
    run(s, 2 * MIN);
    expect(s.pets.every((p) => p.stage === 'baby')).toBe(true);
    switchPet(s, first);
    expect(activePet(s)!.species).toBe('fox');
  });

  it('höchstens 5 Tiere', () => {
    const s = game();
    for (let i = 0; i < 4; i++) expect(startEgg(s, 'fox')).toBe(true);
    expect(startEgg(s, 'fox')).toBe(false);
    expect(s.pets).toHaveLength(5);
  });

  it('stirbt eins, bleibt das andere aktiv und ein Abschied wird gemeldet', () => {
    const s = game();
    startEgg(s, 'hedgehog');
    run(s, MIN);
    const [a, b] = s.pets;
    a.hunger = 0;
    a.poopInMin = 99999;
    b.hunger = 4;
    s.activeId = a.id;
    // a verhungert (12 h), b wird währenddessen gefüttert
    for (let h = 0; h < 13; h++) {
      run(s, HOUR);
      b.hunger = 4;
      b.happy = 4;
      b.poops = [];
      b.sick = null;
      b.tiredness = 10;
      a.hunger = 0;
    }
    expect(s.pets.map((p) => p.id)).toEqual([b.id]);
    expect(s.activeId).toBe(b.id);
    expect(s.ending?.reason).toBe('death');
  });

  it('übernimmt alte Spielstände mit einem Tier', async () => {
    const { migrate } = await import('../storage');
    const old = { version: 1, clock: 1, lastReal: 1, pet: { species: 'fox', name: 'Rudi' }, ending: null, memorials: [], settings: {} };
    const s = migrate(old)!;
    expect(s.version).toBe(2);
    expect(s.pets).toHaveLength(1);
    expect(s.activeId).toBe(s.pets[0].id);
  });
});

describe('Zu früh wecken', () => {
  it('kostet 2 Laune, aber macht nicht hungrig', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.tiredness = 90;
    lightButton(s);
    run(s, HOUR);
    p.hunger = 4;
    p.happy = 4;
    expect(wakeUp(s).ok).toBe(true);
    expect(p.asleep).toBe(false);
    expect(p.hunger).toBe(4);
    expect(p.happy).toBe(2);
  });
});

describe('Streicheln', () => {
  it('gibt +25 % Laune, höchstens einmal pro Minute, nicht im Schlaf', () => {
    const s = game();
    run(s, MIN);
    const p = activePet(s)!;
    p.happy = 2;
    expect(stroke(s).ok).toBe(true);
    expect(p.happy).toBe(3);
    stroke(s);
    expect(p.happy).toBe(3);
    run(s, MIN);
    const before = p.happy;
    stroke(s);
    expect(p.happy).toBeCloseTo(Math.min(4, before + 1));
    p.asleep = true;
    expect(stroke(s).ok).toBe(false);
  });
});

describe('Eier', () => {
  it('Henne legt einmal pro Tag, max. 3, Hahn nicht; einsammeln', () => {
    const s = newGame(T0);
    startEgg(s, 'chicken', { breed: 0, coat: 0, pattern: 'solid', seed: 1, sex: 'f' });
    const p = activePet(s)!;
    p.stage = 'adult';
    p.hunger = 3;
    const day = (d: number) => T0 + d * DAY;
    layEgg(p, day(0));
    layEgg(p, day(0));
    expect(p.eggsInNest).toBe(1);
    for (let d = 1; d < 5; d++) layEgg(p, day(d));
    expect(p.eggsInNest).toBe(3);
    expect(collectEggs(s).ok).toBe(true);
    expect(p.eggsCollected).toBe(3);
    expect(collectEggs(s).ok).toBe(false);
    const roo = { ...p, look: { ...p.look!, sex: 'm' as const }, eggsInNest: 0, lastEggDay: undefined };
    layEgg(roo, day(9));
    expect(roo.eggsInNest).toBe(0);
  });
});

describe('Umsortieren', () => {
  it('verschiebt Tiere in der Liste', async () => {
    const { movePet } = await import('./actions');
    const s = game();
    startEgg(s, 'cat');
    startEgg(s, 'dog');
    const ids = s.pets.map((p) => p.species);
    movePet(s, 0, 2);
    expect(s.pets.map((p) => p.species)).toEqual([ids[1], ids[2], ids[0]]);
    movePet(s, 2, 0);
    expect(s.pets.map((p) => p.species)).toEqual(ids);
  });

  it('Füttern klappt, solange die Leiste nicht voll ist (stufenlos)', () => {
    const s = newGame(0);
    startEgg(s, 'fox');
    const p = s.pets[0];
    p.stage = 'adult';
    p.asleep = false;
    p.calls = {};
    p.sick = null;
    p.hunger = 3.2; // Leiste bei 80 %
    expect(feedMeal(s).ok).toBe(true);
    expect(p.hunger).toBe(4);
    expect(feedMeal(s).ok).toBe(false); // jetzt satt
    p.hunger = 2.5;
    feedMeal(s);
    expect(p.hunger).toBeCloseTo(3.5);
  });
});
