// Cheat-Codes über URL-Parameter, z. B.
//   ?happy=4&hunger=4&sick=0
//   ?pet=Rudi&stage=erwachsen&form=pracht
//   ?pet=alle&max=1
// Ohne `pet` wirken die Parameter auf das gerade angezeigte Tier.
import { RULES } from './config';
import { addLog, evolve, fallAsleep, makeSick, Rng, wake } from './sim';
import { DAY, MIN } from './config';
import { activePet, type GameState, type Pet, type Stage, type Variant } from './state';

export const URL_PARAMS = [
  'pet',
  'happy',
  'hunger',
  'sick',
  'tired',
  'sleep',
  'weight',
  'discipline',
  'poop',
  'mistakes',
  'stage',
  'form',
  'age',
  'hatch',
  'name',
  'max',
] as const;

const num = (v: string, min: number, max: number) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
};
const yes = (v: string) => ['1', 'true', 'ja', 'an', 'on', 'yes'].includes(v.toLowerCase());
const no = (v: string) => ['0', 'false', 'nein', 'aus', 'off', 'no'].includes(v.toLowerCase());

const STAGES: Record<string, Stage> = {
  baby: 'baby',
  kind: 'child',
  child: 'child',
  teen: 'teen',
  teenager: 'teen',
  erwachsen: 'adult',
  adult: 'adult',
};
const FORMS: Record<string, Variant> = {
  gut: 'good',
  good: 'good',
  schlecht: 'bad',
  bad: 'bad',
  pracht: 'great',
  great: 'great',
  normal: 'normal',
  frech: 'cheeky',
  cheeky: 'cheeky',
};
const ORDER: Stage[] = ['baby', 'child', 'teen', 'adult'];

export function hasUrlParams(q: URLSearchParams): boolean {
  return URL_PARAMS.some((k) => k !== 'pet' && q.has(k));
}

/** Welche Tiere sind gemeint? (pet=Name, pet=Nummer ab 1, pet=alle; sonst das angezeigte) */
function targets(s: GameState, q: URLSearchParams): Pet[] {
  const sel = q.get('pet');
  if (!sel) return activePet(s) ? [activePet(s)!] : [];
  if (['alle', 'all', '*'].includes(sel.toLowerCase())) return [...s.pets];
  const n = Number(sel);
  if (Number.isInteger(n) && n >= 1 && n <= s.pets.length) return [s.pets[n - 1]];
  return s.pets.filter((p) => (p.name ?? '').toLowerCase() === sel.toLowerCase());
}

/** optional: Gramm -> interne Gewichtseinheiten (hängt von der Tierart ab, kommt aus der UI) */
export type GramsToUnits = (p: Pet, grams: number) => number;

/** Wendet die Cheat-Codes an und gibt eine lesbare Liste der Änderungen zurück. */
export function applyUrlParams(s: GameState, q: URLSearchParams, rng: Rng = Math.random, gramsToUnits?: GramsToUnits): string[] {
  if (!hasUrlParams(q)) return [];
  const pets = targets(s, q);
  if (pets.length === 0) return [q.get('pet') ? `Kein Tier „${q.get('pet')}“ gefunden.` : 'Noch kein Tier da.'];
  const all: string[] = [];
  for (const p of pets) {
    const done = applyToPet(s, p, q, rng, gramsToUnits);
    if (done.length) {
      addLog(p, s.clock, `Per URL geändert: ${done.join(', ')}.`);
      all.push(pets.length > 1 || q.get('pet') ? `${p.name ?? 'Tier'}: ${done.join(', ')}` : done.join(' · '));
    }
  }
  return all;
}

function applyToPet(s: GameState, p: Pet, q: URLSearchParams, rng: Rng, gramsToUnits?: GramsToUnits): string[] {
  const done: string[] = [];
  const get = (k: string) => q.get(k);

  // Ei sofort schlüpfen lassen (der Rest wirkt erst danach, beim nächsten Nachrechnen)
  if (get('hatch') !== null && yes(get('hatch')!) && p.stage === 'egg') {
    p.createdAt = s.clock - RULES.eggMinutes * MIN;
    done.push('schlüpft gleich');
  }
  if (p.stage === 'egg') return done.length ? done : ['ist noch ein Ei – erst mit hatch=1 schlüpfen lassen'];

  if (get('max') !== null && yes(get('max')!)) {
    p.hunger = RULES.hearts;
    p.happy = RULES.hearts;
    p.sick = null;
    p.poops = [];
    p.tiredness = 0;
    p.discipline = 100;
    p.weight = RULES.baseWeight[p.stage];
    p.hungerZeroSince = p.happyZeroSince = p.sleepDeficitSince = null;
    p.calls = {};
    done.push('alles perfekt');
  }

  const stageArg = get('stage');
  if (stageArg !== null) {
    const target = STAGES[stageArg.toLowerCase()];
    if (target && target !== p.stage) {
      const formArg = get('form');
      const variant = formArg ? FORMS[formArg.toLowerCase()] : undefined;
      // Schritt für Schritt bis zur Zielstufe (nur vorwärts sinnvoll; rückwärts: direkt setzen)
      if (ORDER.indexOf(target) > ORDER.indexOf(p.stage as Stage)) {
        while (p.stage !== target) evolve(p, ORDER[ORDER.indexOf(p.stage as Stage) + 1], s.clock, [], ORDER.indexOf(p.stage as Stage) + 1 === ORDER.indexOf(target) ? variant : undefined);
      } else {
        p.weight += RULES.baseWeight[target] - RULES.baseWeight[p.stage];
        p.stage = target;
        p.stageStartedAt = s.clock;
        p.variant = variant ?? (target === 'baby' ? 'normal' : target === 'adult' ? 'normal' : 'good');
        if (target !== 'adult') p.adultLifespanDays = null;
      }
      done.push(`Stufe = ${stageArg}`);
    }
  }
  const formArg = get('form');
  if (formArg !== null && !(stageArg && STAGES[stageArg.toLowerCase()])) {
    const v = FORMS[formArg.toLowerCase()];
    if (v) {
      p.variant = v;
      done.push(`Form = ${formArg}`);
    }
  }

  const happy = get('happy');
  if (happy !== null) {
    const v = num(happy, 0, RULES.hearts);
    if (v !== null) {
      p.happy = v;
      p.happyZeroSince = null;
      done.push(`Laune = ${v}`);
    }
  }
  const hunger = get('hunger');
  if (hunger !== null) {
    const v = num(hunger, 0, RULES.hearts);
    if (v !== null) {
      p.hunger = v;
      p.hungerZeroSince = null;
      done.push(`Sättigung = ${v}`);
    }
  }
  const sick = get('sick');
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
  const tired = get('tired');
  if (tired !== null) {
    const v = num(tired, 0, 100);
    if (v !== null) {
      p.tiredness = v;
      done.push(`Müdigkeit = ${v} %`);
    }
  }
  const discipline = get('discipline');
  if (discipline !== null) {
    const v = num(discipline, 0, 100);
    if (v !== null) {
      p.discipline = v;
      done.push(`Disziplin = ${v} %`);
    }
  }
  const weight = get('weight');
  if (weight !== null) {
    const g = num(weight, 1, 200000);
    if (g !== null && gramsToUnits) {
      p.weight = Math.max(1, Math.round(gramsToUnits(p, g)));
      done.push(`Gewicht = ${g} g`);
    }
  }
  const poop = get('poop');
  if (poop !== null) {
    const v = num(poop, 0, 6);
    if (v !== null) {
      p.poops = Array.from({ length: Math.round(v) }, () => s.clock);
      if (v === 0) delete p.calls.poop;
      done.push(v === 0 ? 'sauber' : `${Math.round(v)} Haufen`);
    }
  }
  const mistakes = get('mistakes');
  if (mistakes !== null) {
    const v = num(mistakes, 0, 99);
    if (v !== null) {
      p.careMistakesStage = Math.round(v);
      p.careMistakesTotal = v === 0 ? 0 : Math.max(p.careMistakesTotal, Math.round(v));
      done.push(`Pflegefehler = ${Math.round(v)}`);
    }
  }
  const age = get('age');
  if (age !== null) {
    const v = num(age, 0, 365);
    if (v !== null && p.hatchedAt !== null) {
      p.hatchedAt = s.clock - v * DAY;
      done.push(`Alter = ${v} Tage`);
    }
  }
  const name = get('name');
  if (name !== null && name.trim()) {
    p.name = name.replace(/\s+/g, ' ').trim().slice(0, 14);
    done.push(`Name = ${p.name}`);
  }
  const sleep = get('sleep');
  if (sleep !== null) {
    if (yes(sleep)) {
      if (!p.asleep) fallAsleep(p, true, s.clock, []);
      done.push('schläft (Licht aus)');
    } else if (no(sleep)) {
      if (p.asleep) wake(p, true, s.clock, rng, []);
      done.push('wach');
    }
  }
  return done;
}
