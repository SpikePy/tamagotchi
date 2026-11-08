import { RULES } from '../engine/config';
import type { Look, Pet } from '../engine/state';
import { cat } from './cat';
import { dog } from './dog';
import { chicken } from './chicken';
import { fox } from './fox';
import { hedgehog } from './hedgehog';
import type { SpeciesDef } from './types';

// Neue Tierart: Datei mit einer SpeciesDef anlegen und hier eintragen.
export const SPECIES: Record<string, SpeciesDef> = { fox, hedgehog, cat, dog, chicken };

export function species(id: string): SpeciesDef {
  return SPECIES[id] ?? fox;
}

/** Zufälliges Aussehen für Arten mit Rassen bzw. mehreren Fellfarben/Mustern, sonst null */
export function randomLook(sp: SpeciesDef, rng: () => number = Math.random): Look | null {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
  if (sp.breeds?.length) {
    const breed = Math.floor(rng() * sp.breeds.length);
    const b = sp.breeds[breed];
    const coat = Math.floor(rng() * b.coats.length);
    const patterns = b.coats[coat].patterns ?? b.patterns ?? ['solid'];
    const look: Look = { breed, coat, pattern: pick(patterns), seed: Math.floor(rng() * 2 ** 31) };
    if (sp.sexes) look.sex = rng() < 0.5 ? 'f' : 'm';
    return look;
  }
  if (!sp.coats?.length) return null;
  const coat = Math.floor(rng() * sp.coats.length);
  const patterns = sp.coats[coat].patterns ?? (sp.patterns?.length ? sp.patterns : ['solid']);
  return { coat, pattern: pick(patterns), seed: Math.floor(rng() * 2 ** 31) };
}

/**
 * Anzeige-Gewicht: Intern zählt das Spiel in Einheiten (Basis je Stufe in RULES.baseWeight,
 * Mahlzeit +1, Snack +2). Für die Anzeige wird das auf das echte Gewicht der Art umgerechnet.
 */
type WeightInput = { stage: Pet['stage']; weight: number; look?: Look | null };

/** Rassen: Welpe ~1,5 %, Junghund ~20 %, Halbstarker ~65 % des Erwachsenengewichts */
const BREED_STAGE_FACTOR = { baby: 0.015, child: 0.2, teen: 0.65, adult: 1 } as const;

export function weightGrams(sp: SpeciesDef, p: WeightInput): number {
  if (p.stage === 'egg') return 0;
  const base = RULES.baseWeight[p.stage];
  const breed = p.look?.breed !== undefined ? sp.breeds?.[p.look.breed] : undefined;
  const male = p.look?.sex === 'm' && (p.stage === 'teen' || p.stage === 'adult') ? 1.3 : 1; // Hähne sind schwerer
  const normal = (breed ? breed.adultGrams * BREED_STAGE_FACTOR[p.stage] : sp.weightGrams[p.stage]) * male;
  return Math.round((normal * p.weight) / base);
}

export function weightLabel(sp: SpeciesDef, p: WeightInput): string {
  const g = weightGrams(sp, p);
  return g < 1000 ? `${g} g` : `${(g / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg`;
}

const PATTERN_DE: Record<string, string> = {
  solid: 'einfarbig',
  tabby: 'getigert',
  patches: 'gefleckt',
  socks: 'mit weißen Pfoten',
  spots: 'getupft',
  saddle: 'mit Sattel',
  points: 'mit Abzeichen',
  laced: 'gesäumt',
};

/** z. B. "Grau, getigert" oder "Beagle, Dreifarbig, mit Sattel" */
export function lookName(sp: SpeciesDef, look: Look | null | undefined): string | null {
  if (!look) return null;
  const breed = look.breed !== undefined ? sp.breeds?.[look.breed] : undefined;
  const coats = breed?.coats ?? sp.coats;
  if (!coats) return null;
  const parts = [coats[look.coat]?.name ?? '?'];
  // Muster nur nennen, wenn es nicht schon in der Farbe steckt (z. B. „Silber getupft“)
  const fixed = coats[look.coat]?.patterns?.length === 1;
  if (!fixed && (!breed || look.pattern !== 'solid')) parts.push(PATTERN_DE[look.pattern] ?? look.pattern);
  if (breed) parts.unshift(look.sex ? `${breed.name} (${look.sex === 'm' ? 'Hahn' : 'Henne'})` : breed.name);
  return parts.join(', ');
}

/** Rassename (falls vorhanden) */
export function breedName(sp: SpeciesDef, look: Look | null | undefined): string | null {
  return look?.breed !== undefined ? (sp.breeds?.[look.breed]?.name ?? null) : null;
}
