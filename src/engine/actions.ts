import { RULES } from './config';
import { GameState, Look, MAX_PETS, Pet, activePet, newPet } from './state';
import { Rng, SimEvent, addLog, careMistake, fallAsleep, wake } from './sim';
import { T, pick, pickFor } from './texts';

export interface ActionResult {
  ok: boolean;
  msg: string;
  events?: SimEvent[];
}

const no = (msg: string): ActionResult => ({ ok: false, msg });
const yes = (msg: string, events?: SimEvent[]): ActionResult => ({ ok: true, msg, events });

function hatchedPet(s: GameState): Pet | null {
  const p = activePet(s);
  return p && p.stage !== 'egg' ? p : null;
}

/** Legt ein neues Ei an und zeigt es an. false, wenn schon MAX_PETS Tiere da sind. */
export function startEgg(s: GameState, species: string, look: Look | null = null): boolean {
  if (s.pets.length >= MAX_PETS) return false;
  const p = newPet(species, s.clock, look);
  s.pets.push(p);
  s.activeId = p.id;
  s.ending = null;
  return true;
}

export function switchPet(s: GameState, id: string) {
  if (s.pets.some((p) => p.id === id)) s.activeId = id;
}

export const NAME_MAX = 14;

export function renamePet(s: GameState, raw: string): ActionResult {
  const p = activePet(s);
  if (!p) return no('Da ist noch niemand.');
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!name) return no('Bitte gib einen Namen ein.');
  const first = p.name === null;
  p.name = name;
  addLog(p, s.clock, first ? `Bekommt den Namen ${name}.` : `Heißt jetzt ${name}.`);
  return yes(`Hallo, ${name}!`);
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
    status: !!activePet(s),
  };
}

/** so knapp unter „voll“ gilt eine Leiste als voll */
const FULL_EPS = 0.05;

export function feedMeal(s: GameState, rng: Rng = Math.random): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no(pick(T.asleep));
  if (p.calls.fake) return no(pick(T.defiant));
  // satt erst, wenn die Leiste (fast) voll ist – die Leiste ist stufenlos
  if (p.hunger >= RULES.hearts - FULL_EPS) return no(pick(T.full));
  if (p.sick && rng() < 0.5) return no(pick(T.noAppetite));
  p.hunger = Math.min(RULES.hearts, p.hunger + 1);
  p.weight += 1;
  return yes(pickFor(p.species, T.mealBy, T.meal));
}

export function feedSnack(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no(pick(T.asleep));
  if (p.calls.fake) return no(pick(T.defiant));
  p.happy = Math.min(RULES.hearts, p.happy + 1);
  p.weight += 2;
  p.snacksToday++;
  if (p.snacksToday > RULES.snackLimitPerDay) return yes(pick(T.snackTooMany));
  return yes(pick(T.snack));
}

/** Licht-Knopf: wach -> schlafen schicken; schläft mit Licht -> Licht aus. */
export function lightButton(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (!p.asleep) {
    if (p.tiredness < RULES.minTirednessToSleep) return no(pick(T.notTired));
    fallAsleep(p, true, s.clock, []);
    return yes(pick(T.sleep));
  }
  if (p.lightOn) {
    p.lightOn = false;
    delete p.calls.light;
    return yes(pick(T.lightOff));
  }
  return no('{n} schläft schon.');
}

export function wakeUp(s: GameState, rng: Rng = Math.random): ActionResult {
  const p = hatchedPet(s);
  if (!p || !p.asleep) return no('{n} ist doch wach.');
  const events: SimEvent[] = [];
  wake(p, false, s.clock, rng, events);
  return yes('Aufgeweckt – {n} ist richtig schlecht gelaunt!', events);
}

export function giveMedicine(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no(pick(T.asleep));
  if (!p.sick) {
    // unnötige Medizin: Pflegefehler und schlechte Laune
    careMistake(p);
    p.happy = Math.max(0, p.happy - 1);
    addLog(p, s.clock, 'Unnötig Medizin bekommen.');
    return no(pick(T.medNeedless));
  }
  p.sick.doses--;
  if (p.sick.doses > 0) return yes(pick(T.medDose));
  p.sick = null;
  delete p.calls.sick;
  addLog(p, s.clock, 'Wieder gesund.');
  return yes(pick(T.healed));
}

export function clean(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.poops.length === 0) return no(pick(T.alreadyClean));
  p.poops = [];
  delete p.calls.poop;
  return yes(pick(T.clean));
}

export function scold(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no(pick(T.asleep));
  if (p.calls.fake) {
    delete p.calls.fake;
    p.discipline = Math.min(100, p.discipline + RULES.disciplinePerScold);
    return yes(pick(T.scoldOk));
  }
  p.happy = Math.max(0, p.happy - 1);
  return no(pick(T.scoldWrong));
}

/** Prüft, ob gespielt werden darf. */
export function canPlay(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no(pick(T.asleep));
  if (p.sick) return no('{n} ist krank und mag nicht spielen.');
  if (p.calls.fake) return no('{n} hat gerade keine Lust (trotzig).');
  return yes('');
}

export function finishGame(s: GameState, won: boolean): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('');
  p.weight = Math.max(Math.ceil(RULES.baseWeight[p.stage] * 0.5), p.weight - 1);
  p.tiredness = Math.min(100, p.tiredness + 3);
  // Spielen macht immer Spaß: +1 Laune, egal ob gewonnen oder verloren
  p.happy = Math.min(RULES.hearts, p.happy + 1);
  return yes(pick(won ? T.won : T.lost));
}

/** Streicheln: Laune +25 %, höchstens einmal pro Spielminute; schlafende Tiere nicht */
export function stroke(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('');
  if (p.asleep) return no('Psst … {n} schläft.');
  const gain = p.lastStrokedAt !== s.clock;
  p.lastStrokedAt = s.clock;
  if (gain) {
    p.happy = Math.min(RULES.hearts, p.happy + RULES.strokeHappy);
    addLog(p, s.clock, 'Gestreichelt worden.');
  }
  return yes(gain ? 'stroked' : 'stroked-again');
}

/** Eier aus dem Nistkasten einsammeln (Huhn) */
export function collectEggs(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('');
  const n = p.eggsInNest ?? 0;
  if (n === 0) return no('Der Nistkasten ist leer.');
  p.eggsInNest = 0;
  p.eggsCollected = (p.eggsCollected ?? 0) + n;
  p.happy = Math.min(RULES.hearts, p.happy + 0.5);
  addLog(p, s.clock, `${n} ${n === 1 ? 'Ei' : 'Eier'} eingesammelt.`);
  return yes(`🥚 ${n} ${n === 1 ? 'Ei' : 'Eier'} eingesammelt! (insgesamt ${p.eggsCollected})`);
}

/** Reihenfolge der Tiere ändern (Drag & Drop in der Leiste) */
export function movePet(s: GameState, from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= s.pets.length || to >= s.pets.length) return;
  const [p] = s.pets.splice(from, 1);
  s.pets.splice(to, 0, p);
}
