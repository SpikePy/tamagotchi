import { describe, expect, it } from 'vitest';
import { weatherAt } from './weather';

describe('Wetter', () => {
  it('bleibt in einem moderaten Rahmen und wechselt mit der Zeit', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const w = weatherAt(i * 45 * 60_000);
      expect(w.clouds).toBeGreaterThanOrEqual(1);
      expect(w.clouds).toBeLessThanOrEqual(5);
      expect(Math.abs(w.wind)).toBeGreaterThanOrEqual(0.4);
      expect(Math.abs(w.wind)).toBeLessThanOrEqual(1.8);
      seen.add(`${w.clouds}`);
    }
    expect(seen.size).toBeGreaterThan(3);
  });
  it('ist innerhalb eines Zeitraums stabil', () => {
    expect(weatherAt(1000)).toEqual(weatherAt(20 * 60_000));
  });
});

import { seasonOf } from './season';
describe('Jahreszeiten', () => {
  it('richten sich nach dem Monat', () => {
    const at = (m: number) => new Date(2026, m, 15).getTime();
    expect(seasonOf(at(0))).toBe('winter');
    expect(seasonOf(at(2))).toBe('spring');
    expect(seasonOf(at(6))).toBe('summer');
    expect(seasonOf(at(10))).toBe('autumn');
    expect(seasonOf(at(11))).toBe('winter');
  });
});

describe('Niederschlag', () => {
  it('Schnee nur im Winter, Regen nur außerhalb, beides kommt vor', () => {
    const seen = { rain: 0, snow: 0 };
    for (let i = 0; i < 400; i++) {
      const summer = weatherAt(new Date(2026, 6, 1).getTime() + i * 45 * 60_000);
      const winter = weatherAt(new Date(2026, 0, 1).getTime() + i * 45 * 60_000);
      expect(summer.precip).not.toBe('snow');
      expect(winter.precip).not.toBe('rain');
      if (summer.precip === 'rain') seen.rain++;
      if (winter.precip === 'snow') seen.snow++;
      if (summer.precip !== 'none') expect(summer.clouds).toBeGreaterThanOrEqual(4);
    }
    expect(seen.rain).toBeGreaterThan(20);
    expect(seen.snow).toBeGreaterThan(40);
  });
});
