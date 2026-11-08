import { RULES } from './config';
import { GameState, Pet, hearts, newPet } from './state';
import { Rng, SimEvent, addLog, fallAsleep, wake } from './sim';

export interface ActionResult {
  ok: boolean;
  msg: string;
  events?: SimEvent[];
}

const no = (msg: string): ActionResult => ({ ok: false, msg });
const yes = (msg: string, events?: SimEvent[]): ActionResult => ({ ok: true, msg, events });

function hatchedPet(s: GameState): Pet | null {
  const p = s.pet;
  return p && p.stage !== 'egg' ? p : null;
}

export function startEgg(s: GameState, species: string) {
  s.pet = newPet(species, s.clock);
  s.ending = null;
}

export function canAct(s: GameState) {
  const p = hatchedPet(s);
  return {
    feed: !!p && !p.asleep,
    light: !!p,
    play: !!p && !p.asleep,
    medicine: !!p && !p.asleep,
    clean: !!p && p.poops.length > 0,
    scold: !!p && !p.asleep,
    status: !!s.pet,
  };
}

export function feedMeal(s: GameState, rng: Rng = Math.random): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no('Es schläft.');
  if (p.calls.fake) return no('Es dreht trotzig den Kopf weg.');
  if (hearts(p.hunger) >= RULES.hearts) return no('Es ist satt.');
  if (p.sick && rng() < 0.5) return no('Es hat keinen Appetit.');
  p.hunger = Math.min(RULES.hearts, Math.floor(p.hunger + 1 + 1e-9));
  p.weight += 1;
  return yes('Mampf! Lecker.');
}

export function feedSnack(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no('Es schläft.');
  if (p.calls.fake) return no('Es dreht trotzig den Kopf weg.');
  p.happy = Math.min(RULES.hearts, Math.floor(p.happy + 1 + 1e-9));
  p.weight += 2;
  p.snacksToday++;
  if (p.snacksToday > RULES.snackLimitPerDay) return yes('Mmh! Aber das sind zu viele Snacks heute …');
  return yes('Mmh, ein Snack!');
}

/** Licht-Knopf: wach -> schlafen schicken; schläft mit Licht -> Licht aus. */
export function lightButton(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (!p.asleep) {
    if (p.tiredness < RULES.minTirednessToSleep) return no('Es ist noch nicht müde.');
    fallAsleep(p, true, s.clock, []);
    return yes('Licht aus. Gute Nacht!');
  }
  if (p.lightOn) {
    p.lightOn = false;
    delete p.calls.light;
    return yes('Licht aus. Schlaf gut!');
  }
  return no('Es schläft schon.');
}

export function wakeUp(s: GameState, rng: Rng = Math.random): ActionResult {
  const p = hatchedPet(s);
  if (!p || !p.asleep) return no('Es ist wach.');
  const events: SimEvent[] = [];
  wake(p, false, s.clock, rng, events);
  return yes('Aufgeweckt. Es ist grummelig.', events);
}

export function giveMedicine(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no('Es schläft.');
  if (!p.sick) return no('Es ist gesund und will keine Medizin.');
  p.sick.doses--;
  if (p.sick.doses > 0) return yes('Bäh! Noch eine Dosis nötig.');
  p.sick = null;
  delete p.calls.sick;
  addLog(p, s.clock, 'Wieder gesund.');
  return yes('Wieder gesund!');
}

export function clean(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.poops.length === 0) return no('Schon alles sauber.');
  p.poops = [];
  delete p.calls.poop;
  return yes('Blitzblank!');
}

export function scold(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no('Es schläft.');
  if (p.calls.fake) {
    delete p.calls.fake;
    p.discipline = Math.min(100, p.discipline + RULES.disciplinePerScold);
    return yes('Es schaut betreten. Disziplin +25 %.');
  }
  p.happy = Math.max(0, p.happy - 1);
  return no('Es hat doch nichts gemacht! Es ist traurig.');
}

/** Prüft, ob gespielt werden darf. */
export function canPlay(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no('Es schläft.');
  if (p.sick) return no('Es ist krank und mag nicht spielen.');
  if (p.calls.fake) return no('Es hat keine Lust (trotzig).');
  return yes('');
}

export function finishGame(s: GameState, won: boolean): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('');
  p.weight = Math.max(Math.ceil(RULES.baseWeight[p.stage] * 0.5), p.weight - 1);
  p.tiredness = Math.min(100, p.tiredness + 3);
  if (won) p.happy = Math.min(RULES.hearts, Math.floor(p.happy + 1 + 1e-9));
  return yes(won ? 'Gewonnen! Es freut sich.' : 'Verloren … aber es hatte Spaß.');
}
