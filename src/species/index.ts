import { fox } from './fox';
import { hedgehog } from './hedgehog';
import type { SpeciesDef } from './types';

// Neue Tierart: Datei mit einer SpeciesDef anlegen und hier eintragen.
export const SPECIES: Record<string, SpeciesDef> = { fox, hedgehog };

export function species(id: string): SpeciesDef {
  return SPECIES[id] ?? fox;
}
