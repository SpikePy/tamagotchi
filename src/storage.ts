import { GameState, newGame } from './engine/state';

const KEY = 'tamagotchi.v1';

export function load(now: number): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = migrate(JSON.parse(raw));
      if (s) {
        s.settings = { ...newGame(now).settings, ...s.settings };
        return s;
      }
    }
  } catch {
    // kaputter oder blockierter Speicher -> neues Spiel
  }
  return newGame(now);
}

// Nach dem Löschen nichts mehr speichern, sonst schreibt das
// visibilitychange beim Neuladen den alten Stand sofort zurück.
let wiped = false;

/** Alte Spielstände übernehmen (v1: genau ein Tier in "pet") */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): GameState | null {
  if (raw?.version === 1) {
    const pet = raw.pet ? { id: 'p1', ...raw.pet } : null;
    delete raw.pet;
    return { ...raw, version: 2, pets: pet ? [pet] : [], activeId: pet?.id ?? null };
  }
  return raw?.version === 2 ? raw : null;
}

export function save(s: GameState) {
  if (wiped) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Speicher voll oder blockiert – nichts zu tun
  }
}

export function wipe() {
  wiped = true;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* egal */
  }
}
