// URL-Parameter zum Testen/Beeinflussen des Tiers, z. B.
//   ?happy=4&hunger=0&sick=1&tired=90&sleep=1
import { RULES } from './config';
import { addLog, fallAsleep, makeSick, Rng, wake } from './sim';
import { activePet, type GameState } from './state';

export const URL_PARAMS = ['happy', 'hunger', 'sick', 'tired', 'sleep'] as const;

const num = (v: string, max: number) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : null;
};
const yes = (v: string) => ['1', 'true', 'ja', 'an', 'on', 'yes'].includes(v.toLowerCase());
const no = (v: string) => ['0', 'false', 'nein', 'aus', 'off', 'no'].includes(v.toLowerCase());

export function hasUrlParams(q: URLSearchParams): boolean {
  return URL_PARAMS.some((k) => q.has(k));
}

/** Wendet die URL-Parameter an und gibt eine lesbare Liste der Änderungen zurück. */
export function applyUrlParams(s: GameState, q: URLSearchParams, rng: Rng = Math.random): string[] {
  const p = activePet(s);
  if (!p || p.stage === 'egg') return hasUrlParams(q) ? ['Noch kein geschlüpftes Tier – URL-Parameter ignoriert.'] : [];
  const done: string[] = [];

  const happy = q.get('happy');
  if (happy !== null) {
    const v = num(happy, RULES.hearts);
    if (v !== null) {
      p.happy = v;
      p.happyZeroSince = null;
      done.push(`Laune = ${v}`);
    }
  }
  const hunger = q.get('hunger');
  if (hunger !== null) {
    const v = num(hunger, RULES.hearts);
    if (v !== null) {
      p.hunger = v;
      p.hungerZeroSince = null;
      done.push(`Hunger = ${v}`);
    }
  }
  const sick = q.get('sick');
  if (sick !== null) {
    if (yes(sick)) {
      if (!p.sick) makeSick(p, s.clock, 'per URL', rng, []);
      done.push('krank');
    } else if (no(sick)) {
      p.sick = null;
      delete p.calls.sick;
      done.push('gesund');
    }
  }
  const tired = q.get('tired');
  if (tired !== null) {
    const v = num(tired, 100);
    if (v !== null) {
      p.tiredness = v;
      done.push(`Müdigkeit = ${v} %`);
    }
  }
  const sleep = q.get('sleep');
  if (sleep !== null) {
    if (yes(sleep)) {
      if (!p.asleep) fallAsleep(p, true, s.clock, []);
      done.push('schläft (Licht aus)');
    } else if (no(sleep)) {
      if (p.asleep) wake(p, true, s.clock, rng, []);
      done.push('wach');
    }
  }
  if (done.length) addLog(p, s.clock, `Per URL geändert: ${done.join(', ')}.`);
  return done;
}
