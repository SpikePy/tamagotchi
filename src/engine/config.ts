// Alle Balancing-Werte an einer Stelle. Zeiten in Minuten Spielzeit.

export const MIN = 60_000; // ms pro Minute
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const RULES = {
  eggTaps: 20, // so oft auf das Ei tippen, dann schlüpft es
  stageDays: { baby: 1, child: 5, teen: 5 },
  adultLifespanDays: { max: 25, min: 10 }, // je Pflegefehler kürzer, siehe DIFFICULTIES

  hearts: 4,
  // Minuten pro verlorenem Herz (nur im Wachzustand)
  hungerMinPerHeart: { baby: 120, other: 320 }, // 3 Mahlzeiten / 16 h wach
  happyMinPerHeart: { baby: 120, other: 240 },
  hungryAfterWake: 1, // max. Herzen nach dem Ausschlafen
  sleepHungerFactor: 0.25, // im Schlaf sinkt die Sättigung mit 1/4 des Wach-Tempos
  sleepHappyGainPerNight: 1, // im Schlaf erholt sich die Laune: +1 Herz (25 %) über eine volle Nacht
  wokenEarlyHappyLoss: 2, // zu früh geweckt: so viele Herzen Laune weniger

  snackLimitPerDay: 3,
  overweightFactor: 1.6, // Gewicht > Basis * Faktor = übergewichtig
  overweightSickChancePerMin: 0.03 / 60,
  // Hungern: bei leerer Sättigung (wach) nimmt es ab, zu dünn macht krank
  starveWeightLossPerHour: 0.1, // Anteil vom Normalgewicht der Lebensphase pro Stunde
  minWeightFactor: 0.5, // dünner wird es nie
  underweightFactor: 0.75, // Gewicht < Basis * Faktor = zu dünn
  underweightSickChancePerMin: 1 / 60, // zu dünn: im Schnitt nach etwa einer Stunde krank
  underweightMealGain: 2, // unter dem Normalgewicht bringt jede Mahlzeit so viel zurück (bis zum Normalgewicht)

  sleepNeedMin: 8 * 60, // nach 8 h Schlaf (insgesamt) wacht es auf
  dayStartHour: 7, // beim Schlüpfen: Müdigkeit so, als wäre es um 7 Uhr aufgewacht
  awakeMinUntilTired: 16 * 60,
  minTirednessToSleep: 30,
  sleepyCallAt: 80,
  sleepDeficitMin: 6 * 60, // weniger als 6 h in 24 h = Schlafmangel
  sleepDeficitSickAfterMin: 24 * 60,

  // Häufchen nach festem Tagesplan (in Wach-Minuten seit dem Aufwachen):
  // morgens innerhalb einer Stunde, abends; das Baby zusätzlich zweimal zu zufälligen Zeiten
  morningPoopMin: [5, 60] as [number, number],
  eveningPoopMin: [11 * 60, 14 * 60] as [number, number], // nach 7 Uhr Aufstehen: 18–21 Uhr
  youngExtraPoops: 2,
  youngExtraPoopMin: [90, 15 * 60] as [number, number],
  poopSickAfterMin: 4 * 60,

  hungerSickAfterMin: 2 * 60,
  medicineDoses: [1, 2] as [number, number], // so viele Dosen braucht ein krankes Tier (zufällig eine davon)

  // Form bei der Entwicklung: höchstens so viele Pflegefehler in der Phase davor
  variantMaxMistakes: { childGood: 2, teenGood: 3, adultGreat: 2, adultNormal: 6 },

  strokeHappy: 1, // +25 % Laune beim Streicheln (in Viertel-Einheiten: 1 = ein Viertel der Leiste)

  baseWeight: { egg: 0, baby: 5, child: 10, teen: 20, adult: 30, gone: 0 } as Record<string, number>,
} as const;

/** Schwierigkeitsgrad, beim Anlegen des Eis gewählt und für das ganze Leben des Tiers fest */
export type Difficulty = 'cozy' | 'easy' | 'normal' | 'hard';

export interface DifficultyRules {
  label: string;
  emoji: string;
  desc: string;
  graceMin: number; // so lange darf ein Ruf offen sein, bevor er ein Pflegefehler ist
  poopGraceMin: number; // dasselbe für Häufchen
  // Grob vernachlässigt -> die Tierpflegestation holt das Tier ab (Wort „sterben“ gibt es nicht); null = nie
  awayMistakes: number | null; // so viele Pflegefehler in einer Lebensphase
  hungerAwayMin: number | null; // so lange Sättigung 0 (wach)
  sickAwayMin: number | null; // so lange krank ohne Medizin
  lifespanPerMistake: number; // Tage weniger Lebenszeit als Erwachsener je Pflegefehler
  endless: boolean; // true: zieht nie in den Wald, bleibt für immer
}

export const DIFFICULTY_ORDER: Difficulty[] = ['cozy', 'easy', 'normal', 'hard'];

export const DIFFICULTIES: Record<Difficulty, DifficultyRules> = {
  cozy: {
    label: 'Cozy',
    emoji: '🧸',
    desc: 'Dein Tier bleibt für immer bei dir. Für jeden Ruf hast du eine Stunde Zeit, für Häufchen vier.',
    graceMin: 60,
    poopGraceMin: 4 * 60,
    awayMistakes: null,
    hungerAwayMin: null,
    sickAwayMin: null,
    lifespanPerMistake: 0,
    endless: true,
  },
  easy: {
    label: 'Leicht',
    emoji: '🌱',
    desc: '30 Minuten Zeit für jeden Ruf, 3 Stunden für Häufchen. Die Tierpflegestation kommt erst nach 30 Pflegefehlern in einer Phase.',
    graceMin: 30,
    poopGraceMin: 3 * 60,
    awayMistakes: 30,
    hungerAwayMin: 24 * 60,
    sickAwayMin: 24 * 60,
    lifespanPerMistake: 0.25,
    endless: false,
  },
  normal: {
    label: 'Normal',
    emoji: '🌳',
    desc: '15 Minuten Zeit für jeden Ruf, 2 Stunden für Häufchen. Nach 20 Pflegefehlern in einer Phase holt die Tierpflegestation das Tier ab.',
    graceMin: 15,
    poopGraceMin: 2 * 60,
    awayMistakes: 20,
    hungerAwayMin: 12 * 60,
    sickAwayMin: 12 * 60,
    lifespanPerMistake: 0.5,
    endless: false,
  },
  hard: {
    label: 'Schwer',
    emoji: '🔥',
    desc: 'Nur 5 Minuten Zeit für jeden Ruf, 1 Stunde für Häufchen. Schon nach 10 Pflegefehlern in einer Phase holt die Tierpflegestation das Tier ab, und jeder Fehler kostet einen ganzen Lebenstag.',
    graceMin: 5,
    poopGraceMin: 60,
    awayMistakes: 10,
    hungerAwayMin: 6 * 60,
    sickAwayMin: 6 * 60,
    lifespanPerMistake: 1,
    endless: false,
  },
};

/** Regeln für ein Tier (alte Spielstände ohne Angabe: normal) */
export const rulesFor = (p: { difficulty?: Difficulty }) => DIFFICULTIES[p.difficulty ?? 'normal'];
