import { describe, expect, it } from 'vitest';
import { DAY, HOUR, MIN } from './config';
import { activePet, newGame } from './state';
import { advance, tirednessAtHatch } from './sim';
import { clean, feedMeal, finishGame, giveMedicine, lightButton, scold, startEgg } from './actions';

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

  it('höchstens 4 Tiere', () => {
    const s = game();
    for (let i = 0; i < 3; i++) expect(startEgg(s, 'fox')).toBe(true);
    expect(startEgg(s, 'fox')).toBe(false);
    expect(s.pets).toHaveLength(4);
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
