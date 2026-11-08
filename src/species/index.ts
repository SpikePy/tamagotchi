import type { Look } from '../engine/state';
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
