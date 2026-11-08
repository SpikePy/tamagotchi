import type { Stage, Variant } from '../engine/state';

/**
 * Pixel-Sprite als Zeilen. Zeichen:
 *  .  transparent      o  Umriss
 *  a  Hauptfarbe       b  hell (Bauch/Gesicht)
 *  c  Akzent           n  Nase
 *  E  Auge (oben)      e  Auge (unten)  -> beim Blinzeln/Schlafen wird E zur Hauptfarbe
 *  p  Wangen           w  Glanzlicht
 */
export type Sprite = string[];

export type PaletteKey = 'o' | 'a' | 'b' | 'c' | 'n' | 'E' | 'e' | 'p' | 'w';
export type Palette = Record<PaletteKey, string>;

export interface GameTheme {
  title: string;
  description: string;
}

export interface SpeciesDef {
  id: string;
  name: string; // "Fuchs"
  article: string; // "der"
  homeName: string; // "Fuchsbau"
  colors: { floor: string; wall: string; wallDark: string };
  palette: Palette;
  variantPalettes: Partial<Record<Variant, Partial<Palette>>>;
  sprites: Record<Exclude<Stage, 'egg'>, Sprite>;
  egg: { shell: string; spots: string };
  stageNames: Record<Stage, Partial<Record<Variant, string>>>;
  games: {
    timing: GameTheme & { target: string; hit: string };
    guess: GameTheme & { hideout: string };
    catch: GameTheme & { good: string; bad: string };
    throw: GameTheme & { thing: string };
    memory: GameTheme;
  };
}
