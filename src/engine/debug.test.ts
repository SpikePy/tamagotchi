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
    expect(r.join()).toMatch(/Laune = 4.*Sättigung = 0.*Müdigkeit = 55/);
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
    expect(applyUrlParams(s, q('happy=4'))[0]).toMatch(/Ei/);
  });

  it('wählt Tiere per Name, Nummer oder alle', () => {
    const s = hatched();
    startEgg(s, 'cat');
    advance(s, s.lastReal + MIN + 1000, () => 0.9);
    s.pets[0].name = 'Rudi';
    s.pets[1].name = 'Minka';
    applyUrlParams(s, q('pet=rudi&happy=0'));
    expect(s.pets[0].happy).toBe(0);
    expect(s.pets[1].happy).not.toBe(0);
    applyUrlParams(s, q('pet=2&hunger=0'));
    expect(s.pets[1].hunger).toBe(0);
    applyUrlParams(s, q('pet=alle&max=1'));
    expect(s.pets.every((p) => p.happy === 4 && p.hunger === 4 && p.discipline === 100)).toBe(true);
    expect(applyUrlParams(s, q('pet=Bello&happy=1'))[0]).toMatch(/Kein Tier/);
  });
  it('setzt Stufe, Form, Haufen, Pflegefehler, Alter und Name', () => {
    const s = hatched();
    applyUrlParams(s, q('stage=erwachsen&form=pracht&poop=3&mistakes=0&age=12&name=Super'));
    const p = activePet(s)!;
    expect(p.stage).toBe('adult');
    expect(p.variant).toBe('great');
    expect(p.adultLifespanDays).not.toBeNull();
    expect(p.poops).toHaveLength(3);
    expect(p.careMistakesTotal).toBe(0);
    expect(p.name).toBe('Super');
    applyUrlParams(s, q('poop=0&form=frech'));
    expect(p.poops).toHaveLength(0);
    expect(p.variant).toBe('cheeky');
  });
  it('lässt ein Ei sofort schlüpfen', () => {
    const s = newGame(new Date(2026, 0, 1, 10).getTime());
    startEgg(s, 'fox');
    applyUrlParams(s, q('hatch=1'));
    advance(s, s.lastReal + 1000 * 61, () => 0.9);
    expect(activePet(s)!.stage).toBe('baby');
  });
  it('setzt Gewicht über Umrechnung', () => {
    const s = hatched();
    applyUrlParams(s, q('weight=200'), () => 0.5, (_p, g) => g / 20);
    expect(activePet(s)!.weight).toBe(10);
  });
});
