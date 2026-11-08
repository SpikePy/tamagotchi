import { GameState, newGame } from './engine/state';

const KEY = 'tamagotchi.v1';

export function load(now: number): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as GameState;
      if (s.version === 1) {
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
