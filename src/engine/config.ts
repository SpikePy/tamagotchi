// Alle Balancing-Werte an einer Stelle. Zeiten in Minuten Spielzeit.

export const MIN = 60_000; // ms pro Minute
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const RULES = {
  eggMinutes: 1,
  stageDays: { baby: 1, child: 5, teen: 5 },
  adultLifespanDays: { max: 25, min: 10, perCareMistake: 0.5 },

  hearts: 4,
  // Minuten pro verlorenem Herz (nur im Wachzustand)
  hungerMinPerHeart: { baby: 120, other: 320 }, // 3 Mahlzeiten / 16 h wach
  happyMinPerHeart: { baby: 120, other: 240 },
  hungryAfterWake: 1, // max. Herzen nach dem Ausschlafen
  wokenEarlyHappyLoss: 2, // zu früh geweckt: so viele Herzen Laune weniger

  snackLimitPerDay: 3,
  overweightFactor: 1.6, // Gewicht > Basis * Faktor = übergewichtig
  overweightSickChancePerMin: 0.03 / 60,

  sleepNeedMin: 8 * 60, // nach 8 h Schlaf (insgesamt) wacht es auf
  dayStartHour: 7, // beim Schlüpfen: Müdigkeit so, als wäre es um 7 Uhr aufgewacht
  awakeMinUntilTired: 16 * 60,
  minTirednessToSleep: 30,
  sleepyCallAt: 80,
  sleepDeficitMin: 6 * 60, // weniger als 6 h in 24 h = Schlafmangel
  sleepDeficitSickAfterMin: 24 * 60,

  poopIntervalMin: { baby: [40, 90], other: [60, 180] } as Record<string, [number, number]>,
  morningPoopMin: [5, 60] as [number, number],
  poopSickAfterMin: 4 * 60,

  hungerSickAfterMin: 2 * 60,
  hungerDeathAfterMin: 12 * 60,
  sickDeathAfterMin: 12 * 60,
  careMistakesDeathPerStage: 20,

  callGraceMin: 15, // nicht reagiert -> Pflegefehler
  fakeCallChancePerMin: { child: 1 / 360, teen: 1 / 300, adult: 1 / 720 } as Record<string, number>,
  fakeCallMaxPerDay: 4,
  disciplinePerScold: 25,

  baseWeight: { egg: 0, baby: 5, child: 10, teen: 20, adult: 30, gone: 0 } as Record<string, number>,
} as const;
