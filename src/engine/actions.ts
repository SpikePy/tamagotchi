import { RULES } from './config';
import { GameState, Look, MAX_PETS, Pet, activePet, hearts, newPet } from './state';
import { Rng, SimEvent, addLog, careMistake, fallAsleep, wake } from './sim';

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
  return yes('Aufgeweckt. Es ist richtig schlecht gelaunt!', events);
}

export function giveMedicine(s: GameState): ActionResult {
  const p = hatchedPet(s);
  if (!p) return no('Da ist noch niemand.');
  if (p.asleep) return no('Es schläft.');
  if (!p.sick) {
    // unnötige Medizin: Pflegefehler und schlechte Laune
    careMistake(p);
    p.happy = Math.max(0, p.happy - 1);
    addLog(p, s.clock, 'Unnötig Medizin bekommen.');
    return no('Bäh! Es war doch gar nicht krank. Pflegefehler!');
  }
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
  // Spielen macht immer Spaß: +1 Laune, egal ob gewonnen oder verloren
  p.happy = Math.min(RULES.hearts, Math.floor(p.happy + 1 + 1e-9));
  return yes(won ? 'Gewonnen! Das hat Spaß gemacht.' : 'Verloren … aber es hatte trotzdem Spaß.');
}
