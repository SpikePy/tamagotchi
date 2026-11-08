export type Stage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';
export type Variant = 'normal' | 'good' | 'bad' | 'great' | 'cheeky';
export type CallType = 'hunger' | 'happy' | 'poop' | 'sick' | 'sleepy' | 'light' | 'fake';

export interface Call {
  since: number;
  penalized: boolean;
}

export interface LogEntry {
  at: number;
  text: string;
}

export interface Pet {
  species: string;
  name: string | null; // wird nach dem Schlüpfen vergeben
  stage: Stage;
  variant: Variant;
  createdAt: number;
  hatchedAt: number | null;
  stageStartedAt: number;

  hunger: number; // 0..4 (Kommazahl, Anzeige gerundet)
  happy: number; // 0..4
  tiredness: number; // 0..100
  weight: number;
  discipline: number; // 0..100

  sick: { since: number; doses: number } | null;
  poops: number[]; // Zeitpunkte
  poopInMin: number; // Wach-Minuten bis zum nächsten Haufen

  asleep: boolean;
  lightOn: boolean;
  sleptInCycleMin: number; // Schlaf seit dem letzten "Ausgeschlafen"
  sleepBuckets: [number, number][]; // [Stundenbeginn, geschlafene Minuten] der letzten 24 h
  sleepDeficitSince: number | null;

  hungerZeroSince: number | null;
  happyZeroSince: number | null;

  calls: Partial<Record<CallType, Call>>;
  fakeCallsToday: number;
  snacksToday: number;
  dayKey: string;

  careMistakesStage: number;
  careMistakesTotal: number;
  adultLifespanDays: number | null;

  log: LogEntry[];
}

export interface Ending {
  at: number;
  reason: 'forest' | 'death';
  cause: string;
  ageDays: number;
}

export interface Memorial {
  species: string;
  name?: string | null;
  stage: Stage;
  variant: Variant;
  ending: Ending;
  log: LogEntry[];
}

export interface Settings {
  sound: boolean;
  notifications: boolean;
}

export interface GameState {
  version: 1;
  clock: number; // Spielzeit (ms) = echte Zeit, minutengenau nachgerechnet
  lastReal: number; // echte Zeit der letzten Berechnung
  pet: Pet | null;
  ending: Ending | null; // gesetzt, solange der Abschiedsbildschirm gezeigt wird
  memorials: Memorial[];
  settings: Settings;
}

export function dayKeyOf(clock: number): string {
  const d = new Date(clock);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function newGame(now: number): GameState {
  return {
    version: 1,
    clock: now,
    lastReal: now,
    pet: null,
    ending: null,
    memorials: [],
    settings: { sound: true, notifications: false },
  };
}

export function newPet(species: string, clock: number): Pet {
  return {
    species,
    name: null,
    stage: 'egg',
    variant: 'normal',
    createdAt: clock,
    hatchedAt: null,
    stageStartedAt: clock,
    hunger: 4,
    happy: 4,
    tiredness: 0,
    weight: 0,
    discipline: 0,
    sick: null,
    poops: [],
    poopInMin: 0,
    asleep: false,
    lightOn: true,
    sleptInCycleMin: 0,
    sleepBuckets: [],
    sleepDeficitSince: null,
    hungerZeroSince: null,
    happyZeroSince: null,
    calls: {},
    fakeCallsToday: 0,
    snacksToday: 0,
    dayKey: dayKeyOf(clock),
    careMistakesStage: 0,
    careMistakesTotal: 0,
    adultLifespanDays: null,
    log: [{ at: clock, text: 'Ein Ei ist da.' }],
  };
}

export const hearts = (v: number) => Math.max(0, Math.min(4, Math.ceil(v - 1e-9)));
