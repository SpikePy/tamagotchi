import { RULES } from '../engine/config';
import type { Look, Pet } from '../engine/state';
import { cat } from './cat';
import { fox } from './fox';
import { hedgehog } from './hedgehog';
import type { SpeciesDef } from './types';

// Neue Tierart: Datei mit einer SpeciesDef anlegen und hier eintragen.
export const SPECIES: Record<string, SpeciesDef> = { fox, hedgehog, cat };

export function species(id: string): SpeciesDef {
  return SPECIES[id] ?? fox;
}

/** Zufälliges Aussehen für Arten mit mehreren Fellfarben/Mustern, sonst null */
export function randomLook(sp: SpeciesDef, rng: () => number = Math.random): Look | null {
  if (!sp.coats?.length) return null;
  const patterns = sp.patterns?.length ? sp.patterns : ['solid'];
  return {
    coat: Math.floor(rng() * sp.coats.length),
    pattern: patterns[Math.floor(rng() * patterns.length)],
    seed: Math.floor(rng() * 2 ** 31),
  };
}

/**
 * Anzeige-Gewicht: Intern zählt das Spiel in Einheiten (Basis je Stufe in RULES.baseWeight,
 * Mahlzeit +1, Snack +2). Für die Anzeige wird das auf das echte Gewicht der Art umgerechnet.
 */
export function weightGrams(sp: SpeciesDef, p: { stage: Pet['stage']; weight: number }): number {
  if (p.stage === 'egg') return 0;
  const base = RULES.baseWeight[p.stage];
  return Math.round((sp.weightGrams[p.stage] * p.weight) / base);
}

export function weightLabel(sp: SpeciesDef, p: { stage: Pet['stage']; weight: number }): string {
  const g = weightGrams(sp, p);
  return g < 1000 ? `${g} g` : `${(g / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg`;
}

const PATTERN_DE: Record<string, string> = {
  solid: 'einfarbig',
  tabby: 'getigert',
  patches: 'gefleckt',
  socks: 'mit weißen Pfoten',
};

/** z. B. "Grau, getigert" */
export function lookName(sp: SpeciesDef, look: Look | null | undefined): string | null {
  if (!look || !sp.coats) return null;
  return `${sp.coats[look.coat]?.name ?? '?'}, ${PATTERN_DE[look.pattern] ?? look.pattern}`;
}
