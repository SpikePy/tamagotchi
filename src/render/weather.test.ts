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
