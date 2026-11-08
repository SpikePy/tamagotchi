import { DAY, HOUR, MIN, RULES } from './config';
import { CallType, GameState, Pet, Stage, Variant, dayKeyOf, hearts } from './state';

export type Rng = () => number;

export type SimEvent =
  | { kind: 'hatched' }
  | { kind: 'evolved'; stage: Stage; variant: Variant }
  | { kind: 'pooped' }
  | { kind: 'sick'; cause: string }
  | { kind: 'call'; call: CallType }
  | { kind: 'fellAsleep' }
  | { kind: 'woke' }
  | { kind: 'ended' };

const MAX_CATCHUP_MIN = 60 * 24 * 60; // 60 Tage

/** Rechnet die Spielzeit bis `realNow` nach, Minute für Minute. */
export function advance(s: GameState, realNow: number, rng: Rng = Math.random): SimEvent[] {
  const events: SimEvent[] = [];
  const target = s.clock + Math.max(0, realNow - s.lastReal);

  let n = 0;
  while (s.clock + MIN <= target) {
    if (!s.pet || n >= MAX_CATCHUP_MIN) {
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
  delete p.calls.fake;
  addLog(p, clock, 'Eingeschlafen.');
  events.push({ kind: 'fellAsleep' });
}

/** natural = ausgeschlafen (8 h insgesamt) -> gilt als "morgens". */
export function wake(p: Pet, natural: boolean, clock: number, rng: Rng, events: SimEvent[]) {
  p.asleep = false;
  p.lightOn = true;
  delete p.calls.light;
  p.hunger = Math.min(p.hunger, RULES.hungryAfterWake);
  if (natural) {
    p.sleptInCycleMin = 0;
    p.poopInMin = randBetween(rng, RULES.morningPoopMin);
    addLog(p, clock, 'Ausgeschlafen aufgewacht.');
  } else {
    p.happy = Math.max(0, p.happy - 1);
    addLog(p, clock, 'Geweckt worden (schlecht gelaunt).');
  }
  events.push({ kind: 'woke' });
}

export function endLife(s: GameState, reason: 'forest' | 'death', cause: string, events: SimEvent[]) {
  const p = s.pet!;
  const ending = { at: s.clock, reason, cause, ageDays: ageDays(p, s.clock) };
  addLog(p, s.clock, reason === 'forest' ? 'In den Wald zurückgezogen.' : `Gestorben (${cause}).`);
  s.memorials.unshift({ species: p.species, name: p.name, look: p.look, stage: p.stage, variant: p.variant, ending, log: p.log });
  if (s.memorials.length > 20) s.memorials.length = 20;
  s.ending = ending;
  s.pet = null;
  events.push({ kind: 'ended' });
}

const STAGE_DE: Record<Stage, string> = { egg: 'Ei', baby: 'Baby', child: 'Kind', teen: 'Teenager', adult: 'Erwachsen' };
const VARIANT_DE: Record<Variant, string> = { normal: 'normal', good: 'gut gepflegt', bad: 'vernachlässigt', great: 'prächtig', cheeky: 'frech' };

const NEXT_STAGE: Partial<Record<Stage, Stage>> = { baby: 'child', child: 'teen', teen: 'adult' };

export function chooseVariant(p: Pet, next: Stage): Variant {
  const m = p.careMistakesStage;
  if (next === 'child') return m <= 2 ? 'good' : 'bad';
  if (next === 'teen') return m <= 3 && p.discipline >= 50 ? 'good' : 'bad';
  if (m <= 2 && p.discipline >= 75) return 'great';
  if (m <= 6) return 'normal';
  return 'cheeky';
}

function evolve(p: Pet, next: Stage, clock: number, events: SimEvent[]) {
  const variant = chooseVariant(p, next);
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

function hatch(p: Pet, clock: number, rng: Rng, events: SimEvent[]) {
  p.stage = 'baby';
  p.variant = 'normal';
  p.hatchedAt = clock;
  p.stageStartedAt = clock;
  p.weight = RULES.baseWeight.baby;
  p.hunger = 2;
  p.happy = 2;
  p.poopInMin = poopInterval(p, rng);
  addLog(p, clock, 'Geschlüpft!');
  events.push({ kind: 'hatched' });
}

function callConditions(p: Pet): Record<Exclude<CallType, 'fake'>, boolean> {
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
  const fake = p.calls.fake;
  if (fake && clock - fake.since >= RULES.callGraceMin * MIN) {
    careMistake(p);
    delete p.calls.fake;
  }
}

export function step(s: GameState, rng: Rng, events: SimEvent[]) {
  const p = s.pet;
  if (!p) return;
  const now = s.clock;

  const dk = dayKeyOf(now);
  if (dk !== p.dayKey) {
    p.dayKey = dk;
    p.snacksToday = 0;
    p.fakeCallsToday = 0;
  }

  if (p.stage === 'egg') {
    if (now - p.createdAt >= RULES.eggMinutes * MIN) hatch(p, now, rng, events);
    return;
  }

  const rateKey = p.stage === 'baby' ? 'baby' : 'other';
  const deficit = p.sleepDeficitSince !== null;

  if (p.asleep) {
    p.tiredness = Math.max(0, p.tiredness - 100 / RULES.sleepNeedMin);
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

    const fakeChance = RULES.fakeCallChancePerMin[p.stage] ?? 0;
    if (
      fakeChance > 0 &&
      !p.sick &&
      !p.calls.fake &&
      p.fakeCallsToday < RULES.fakeCallMaxPerDay &&
      rng() < fakeChance
    ) {
      p.calls.fake = { since: now, penalized: false };
      p.fakeCallsToday++;
      events.push({ kind: 'call', call: 'fake' });
    }

    if (p.tiredness >= 100) fallAsleep(p, false, now, events);
  }

  p.hungerZeroSince = p.hunger <= 0 ? (p.hungerZeroSince ?? now) : null;
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
    return endLife(s, 'death', 'Krankheit', events);
  }
  if (p.hungerZeroSince !== null && now - p.hungerZeroSince >= RULES.hungerDeathAfterMin * MIN) {
    return endLife(s, 'death', 'Hunger', events);
  }
  if (p.careMistakesStage >= RULES.careMistakesDeathPerStage) {
    return endLife(s, 'death', 'Vernachlässigung', events);
  }

  updateCalls(p, now, events);

  const next = NEXT_STAGE[p.stage];
  if (next) {
    const days = RULES.stageDays[p.stage as keyof typeof RULES.stageDays];
    if (now - p.stageStartedAt >= days * DAY) evolve(p, next, now, events);
  } else if (p.adultLifespanDays !== null && now - p.stageStartedAt >= p.adultLifespanDays * DAY) {
    endLife(s, 'forest', 'Lebensende', events);
  }
}
