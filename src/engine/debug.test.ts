import { describe, expect, it } from 'vitest';
import { MIN } from './config';
import { advance } from './sim';
import { activePet, newGame } from './state';
import { startEgg } from './actions';
import { applyUrlParams, hasUrlParams } from './debug';

function hatched() {
  const s = newGame(new Date(2026, 0, 1, 10).getTime());
  startEgg(s, 'fox');
  advance(s, s.lastReal + MIN + 1000, () => 0.9);
  return s;
}
const q = (x: string) => new URLSearchParams(x);

describe('URL-Parameter', () => {
  it('setzt Laune, Hunger, Müdigkeit (mit Begrenzung)', () => {
    const s = hatched();
    const r = applyUrlParams(s, q('?happy=9&hunger=0&tired=55'));
    expect(activePet(s)!.happy).toBe(4);
    expect(activePet(s)!.hunger).toBe(0);
    expect(activePet(s)!.tiredness).toBe(55);
    expect(r).toHaveLength(3);
  });
  it('macht krank und gesund', () => {
    const s = hatched();
    applyUrlParams(s, q('sick=1'));
    expect(activePet(s)!.sick).not.toBeNull();
    applyUrlParams(s, q('sick=0'));
    expect(activePet(s)!.sick).toBeNull();
  });
  it('schickt schlafen und weckt', () => {
    const s = hatched();
    applyUrlParams(s, q('sleep=1'));
    expect(activePet(s)!.asleep).toBe(true);
    expect(activePet(s)!.lightOn).toBe(false);
    applyUrlParams(s, q('sleep=0'));
    expect(activePet(s)!.asleep).toBe(false);
  });
  it('ignoriert fremde Parameter und Eier', () => {
    expect(hasUrlParams(q('foo=1'))).toBe(false);
    const s = newGame(Date.now());
    startEgg(s, 'fox');
    expect(applyUrlParams(s, q('happy=4'))[0]).toMatch(/ignoriert/);
  });
});
