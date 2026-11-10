import { DAY, HOUR, MIN, RULES } from './config';
import { CallType, GameState, Pet, Stage, Variant, dayKeyOf, hearts } from './state';

export type Rng = () => number;

export type SimEvent = (
  | { kind: 'hatched' }
  | { kind: 'evolved'; stage: Stage; variant: Variant }
  | { kind: 'pooped' }
  | { kind: 'sick'; cause: string }
  | { kind: 'call'; call: CallType }
  | { kind: 'fellAsleep' }
  | { kind: 'woke' }
  | { kind: 'ended'; name: string | null }
) & { petId?: string };

const MAX_CATCHUP_MIN = 60 * 24 * 60; // 60 Tage

/** Rechnet die Spielzeit bis `realNow` nach, Minute für Minute. */
export function advance(s: GameState, realNow: number, rng: Rng = Math.random): SimEvent[] {
  const events: SimEvent[] = [];
  const target = s.clock + Math.max(0, realNow - s.lastReal);

  let n = 0;
  while (s.clock + MIN <= target) {
    if (s.pets.length === 0 || n >= MAX_CATCHUP_MIN) {
      s.clock = target;
      break;
    }
    s.clock += MIN;
    step(s, rng, events);
    n++;
  }
  // Rest (unter einer Minute) für die nächste Berechnung aufheben
  s.lastReal = realNow - (target - s.clock);
  return events;
}

export function randBetween(rng: Rng, [a, b]: readonly [number, number]): number {
  return Math.round(a + rng() * (b - a));
}

export function poopInterval(p: Pet, rng: Rng): number {
  return randBetween(rng, RULES.poopIntervalMin[p.stage === 'baby' ? 'baby' : 'other']);
}

export function addLog(p: Pet, at: number, text: string) {
  p.log.push({ at, text });
  if (p.log.length > 60) p.log.splice(0, p.log.length - 60);
}

export function careMistake(p: Pet) {
  p.careMistakesStage++;
  p.careMistakesTotal++;
}

export function ageDays(p: Pet, clock: number): number {
  return p.hatchedAt === null ? 0 : (clock - p.hatchedAt) / DAY;
}

export function isOverweight(p: Pet): boolean {
  return p.weight > RULES.baseWeight[p.stage] * RULES.overweightFactor;
}

export function sleptLast24h(p: Pet, clock: number): number {
  const from = clock - DAY;
  return p.sleepBuckets.reduce((sum, [h, m]) => (h + HOUR > from ? sum + m : sum), 0);
}

export function makeSick(p: Pet, clock: number, cause: string, rng: Rng, events: SimEvent[]) {
  if (p.sick) return;
  p.sick = { since: clock, doses: rng() < 0.5 ? 1 : 2 };
  addLog(p, clock, `Krank geworden (${cause}).`);
  events.push({ kind: 'sick', cause });
}

export function fallAsleep(p: Pet, lightOff: boolean, clock: number, events: SimEvent[]) {
  p.asleep = true;
  p.lightOn = !lightOff;
  delete p.calls.sleepy;
  addLog(p, clock, 'Eingeschlafen.');
  events.push({ kind: 'fellAsleep' });
}

/** Huhn: eine erwachsene, gesunde, nicht hungrige Henne legt einmal pro Tag morgens ein Ei (max. 3 im Nest) */
export function layEgg(p: Pet, clock: number) {
  if (p.species !== 'chicken' || p.stage !== 'adult' || p.look?.sex !== 'f' || p.sick || p.hunger < 1) return;
  const day = dayKeyOf(clock);
  if (p.lastEggDay === day) return;
  p.lastEggDay = day;
  if ((p.eggsInNest ?? 0) >= 3) return;
  p.eggsInNest = (p.eggsInNest ?? 0) + 1;
  addLog(p, clock, 'Ein Ei gelegt. 🥚');
}

/** natural = ausgeschlafen (8 h insgesamt) -> gilt als "morgens". */
export function wake(p: Pet, natural: boolean, clock: number, rng: Rng, events: SimEvent[]) {
  p.asleep = false;
  p.lightOn = true;
  delete p.calls.light;
  if (natural) {
    // ausgeschlafen: hat Hunger
    p.hunger = Math.min(p.hunger, RULES.hungryAfterWake);
    p.sleptInCycleMin = 0;
    p.poopInMin = randBetween(rng, RULES.morningPoopMin);
    addLog(p, clock, 'Ausgeschlafen aufgewacht.');
    layEgg(p, clock);
  } else {
    // zu früh geweckt: Hunger bleibt, aber richtig schlechte Laune
    p.happy = Math.max(0, p.happy - RULES.wokenEarlyHappyLoss);
    addLog(p, clock, 'Zu früh geweckt (richtig schlecht gelaunt).');
  }
  events.push({ kind: 'woke' });
}

export function endLife(s: GameState, p: Pet, reason: 'forest' | 'death', cause: string, events: SimEvent[]) {
  const ending = { at: s.clock, reason, cause, ageDays: ageDays(p, s.clock) };
  addLog(p, s.clock, reason === 'forest' ? 'In den Wald zurückgezogen.' : `Gestorben (${cause}).`);
  s.memorials.unshift({ species: p.species, name: p.name, look: p.look, stage: p.stage, variant: p.variant, ending, log: p.log });
  if (s.memorials.length > 20) s.memorials.length = 20;
  s.ending = ending;
  s.pets = s.pets.filter((x) => x.id !== p.id);
  if (s.activeId === p.id) s.activeId = s.pets[0]?.id ?? null;
  events.push({ kind: 'ended', name: p.name });
}

const STAGE_DE: Record<Stage, string> = { egg: 'Ei', baby: 'Baby', child: 'Kind', teen: 'Teenager', adult: 'Erwachsen' };
const VARIANT_DE: Record<Variant, string> = { normal: 'normal', good: 'gut gepflegt', bad: 'vernachlässigt', great: 'prächtig', cheeky: 'frech' };

const NEXT_STAGE: Partial<Record<Stage, Stage>> = { baby: 'child', child: 'teen', teen: 'adult' };

export function chooseVariant(p: Pet, next: Stage): Variant {
  const m = p.careMistakesStage;
  if (next === 'child') return m <= 2 ? 'good' : 'bad';
  if (next === 'teen') return m <= 3 ? 'good' : 'bad';
  if (m <= 2) return 'great';
  if (m <= 6) return 'normal';
  return 'cheeky';
}

export function evolve(p: Pet, next: Stage, clock: number, events: SimEvent[], variant?: Variant) {
  variant ??= chooseVariant(p, next);
  p.weight += RULES.baseWeight[next] - RULES.baseWeight[p.stage];
  p.stage = next;
  p.variant = variant;
  p.stageStartedAt = clock;
  p.careMistakesStage = 0;
  if (next === 'adult') {
    const l = RULES.adultLifespanDays;
    p.adultLifespanDays = Math.max(l.min, Math.min(l.max, l.max - p.careMistakesTotal * l.perCareMistake));
  }
  addLog(p, clock, `Entwickelt zum ${STAGE_DE[next]} (${VARIANT_DE[variant]}).`);
  events.push({ kind: 'evolved', stage: next, variant });
}

/** Müdigkeit beim Schlüpfen passend zur Uhrzeit (als wäre es morgens aufgewacht). */
export function tirednessAtHatch(clock: number): number {
  const d = new Date(clock);
  const hours = (d.getHours() + d.getMinutes() / 60 - RULES.dayStartHour + 24) % 24;
  return Math.min(100, (hours * 60 * 100) / RULES.awakeMinUntilTired);
}

export function hatch(p: Pet, clock: number, rng: Rng, events: SimEvent[]) {
  p.stage = 'baby';
  delete p.eggTaps;
  p.variant = 'normal';
  p.hatchedAt = clock;
  p.stageStartedAt = clock;
  p.weight = RULES.baseWeight.baby;
  p.hunger = 2;
  p.happy = 2;
  p.tiredness = tirednessAtHatch(clock);
  p.poopInMin = poopInterval(p, rng);
  addLog(p, clock, 'Geschlüpft!');
  events.push({ kind: 'hatched' });
}

function callConditions(p: Pet): Record<CallType, boolean> {
  const awake = !p.asleep;
  return {
    hunger: awake && hearts(p.hunger) === 0,
    happy: awake && hearts(p.happy) === 0,
    poop: awake && p.poops.length > 0,
    sick: awake && p.sick !== null,
    sleepy: awake && p.tiredness >= RULES.sleepyCallAt,
    light: p.asleep && p.lightOn,
  };
}

function updateCalls(p: Pet, clock: number, events: SimEvent[]) {
  const cond = callConditions(p);
  for (const type of Object.keys(cond) as (keyof typeof cond)[]) {
    const call = p.calls[type];
    if (!cond[type]) {
      delete p.calls[type];
    } else if (!call) {
      p.calls[type] = { since: clock, penalized: false };
      events.push({ kind: 'call', call: type });
    } else if (!call.penalized && clock - call.since >= RULES.callGraceMin * MIN) {
      call.penalized = true;
      careMistake(p);
    }
  }
}

/** Eine Minute für alle Tiere. Ereignisse bekommen die petId angehängt. */
export function step(s: GameState, rng: Rng, events: SimEvent[]) {
  for (const p of [...s.pets]) {
    const local: SimEvent[] = [];
    stepPet(s, p, rng, local);
    for (const e of local) events.push({ ...e, petId: p.id });
  }
}

function stepPet(s: GameState, p: Pet, rng: Rng, events: SimEvent[]) {
  const now = s.clock;

  const dk = dayKeyOf(now);
  if (dk !== p.dayKey) {
    p.dayKey = dk;
    p.snacksToday = 0;
  }

  // Eier schlüpfen nicht von selbst, sondern erst nach RULES.eggTaps-mal Tippen (siehe tapEgg)
  if (p.stage === 'egg') return;

  const rateKey = p.stage === 'baby' ? 'baby' : 'other';
  const deficit = p.sleepDeficitSince !== null;

  if (p.asleep) {
    p.tiredness = Math.max(0, p.tiredness - 100 / RULES.sleepNeedMin);
    // im Schlaf: langsamer hungrig, Laune erholt sich langsam
    p.hunger = Math.max(0, p.hunger - RULES.sleepHungerFactor / RULES.hungerMinPerHeart[rateKey]);
    p.happy = Math.min(RULES.hearts, p.happy + RULES.sleepHappyGainPerNight / RULES.sleepNeedMin);
    p.sleptInCycleMin++;
    const hour = Math.floor(now / HOUR) * HOUR;
    const last = p.sleepBuckets[p.sleepBuckets.length - 1];
    if (last && last[0] === hour) last[1]++;
    else p.sleepBuckets.push([hour, 1]);
    p.sleepBuckets = p.sleepBuckets.filter(([h]) => h + HOUR > now - DAY);
    if (p.sleptInCycleMin >= RULES.sleepNeedMin) wake(p, true, now, rng, events);
  } else {
    p.tiredness = Math.min(100, p.tiredness + 100 / RULES.awakeMinUntilTired);
    p.hunger = Math.max(0, p.hunger - 1 / RULES.hungerMinPerHeart[rateKey]);
    p.happy = Math.max(0, p.happy - (deficit ? 2 : 1) / RULES.happyMinPerHeart[rateKey]);

    p.poopInMin--;
    if (p.poopInMin <= 0) {
      p.poops.push(now);
      p.poopInMin = poopInterval(p, rng);
      events.push({ kind: 'pooped' });
    }

    if (p.tiredness >= 100) fallAsleep(p, false, now, events);
  }

  // Hunger auf 0 zählt nur im Wachzustand (schlafend wird es davon nicht krank)
  if (p.asleep && p.hungerZeroSince !== null) p.hungerZeroSince += MIN;
  p.hungerZeroSince = p.hunger <= 0 ? (p.hungerZeroSince ?? (p.asleep ? null : now)) : null;
  p.happyZeroSince = p.happy <= 0 ? (p.happyZeroSince ?? now) : null;

  if (p.hatchedAt !== null && now - p.hatchedAt >= DAY) {
    const enough = sleptLast24h(p, now) >= RULES.sleepDeficitMin;
    p.sleepDeficitSince = enough ? null : (p.sleepDeficitSince ?? now);
  }

  if (!p.sick) {
    if (p.hungerZeroSince !== null && now - p.hungerZeroSince >= RULES.hungerSickAfterMin * MIN) {
      makeSick(p, now, 'Hunger', rng, events);
    } else if (p.poops.some((t) => now - t >= RULES.poopSickAfterMin * MIN)) {
      makeSick(p, now, 'Dreck', rng, events);
    } else if (p.sleepDeficitSince !== null && now - p.sleepDeficitSince >= RULES.sleepDeficitSickAfterMin * MIN) {
      makeSick(p, now, 'Schlafmangel', rng, events);
    } else if (isOverweight(p) && rng() < RULES.overweightSickChancePerMin) {
      makeSick(p, now, 'Übergewicht', rng, events);
    }
  }

  if (p.sick && now - p.sick.since >= RULES.sickDeathAfterMin * MIN) {
    return endLife(s, p, 'death', 'Krankheit', events);
  }
  if (p.hungerZeroSince !== null && now - p.hungerZeroSince >= RULES.hungerDeathAfterMin * MIN) {
    return endLife(s, p, 'death', 'Hunger', events);
  }
  if (p.careMistakesStage >= RULES.careMistakesDeathPerStage) {
    return endLife(s, p, 'death', 'Vernachlässigung', events);
  }

  updateCalls(p, now, events);

  const next = NEXT_STAGE[p.stage];
  if (next) {
    const days = RULES.stageDays[p.stage as keyof typeof RULES.stageDays];
    if (now - p.stageStartedAt >= days * DAY) evolve(p, next, now, events);
  } else if (p.adultLifespanDays !== null && now - p.stageStartedAt >= p.adultLifespanDays * DAY) {
    endLife(s, p, 'forest', 'Lebensende', events);
  }
}
