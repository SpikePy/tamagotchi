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

export function save(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Speicher voll oder blockiert – nichts zu tun
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* egal */
  }
}
