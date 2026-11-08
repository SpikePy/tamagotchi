import type { Stage, Variant } from '../engine/state';
import type { SleepShape } from '../render/sleepers';

/**
 * Pixel-Sprite als Zeilen. Zeichen:
 *  .  transparent      o  Umriss
 *  a  Hauptfarbe       b  hell (Bauch/Gesicht)
 *  c  Akzent           n  Nase
 *  E  Auge (oben)      e  Auge (unten)  -> beim Blinzeln/Schlafen wird E zur Hauptfarbe
 *  p  Wangen           w  Glanzlicht/Schnurrhaare
 *  d  Musterfarbe (wird vom Fellmuster aus 'a' erzeugt)
 */
export type Sprite = string[];

export type PaletteKey = 'o' | 'a' | 'b' | 'c' | 'n' | 'E' | 'e' | 'p' | 'w' | 'd';
export type Palette = Record<Exclude<PaletteKey, 'd'>, string> & { d?: string };

/** Fellmuster, die der Renderer auf die Hauptfarbe 'a' anwendet */
export type Pattern = 'solid' | 'tabby' | 'patches' | 'socks' | 'spots' | 'saddle' | 'points' | 'laced';

export interface Coat {
  name: string; // z. B. "Rot"
  colors: Partial<Palette>; // überschreibt die Grundpalette, 'd' = Musterfarbe
  patterns?: Pattern[]; // nur diese Muster passen zu dieser Farbe (sonst die der Art/Rasse)
}

/** Rasse: eigenes Aussehen, eigene Fellfarben/Muster und eigenes Gewicht */
export interface Breed {
  name: string;
  sprites: Record<Exclude<Stage, 'egg'>, Sprite>;
  /** Aussehen der Männchen ab Teenager (z. B. Hahn) */
  maleSprites?: { teen: Sprite; adult: Sprite };
  coats: Coat[];
  patterns?: Pattern[];
  adultGrams: number;
  sleep: SleepShape;
  /** Sprite schaut nach links (Seitenansicht), z. B. Dackel */
  facesLeft?: boolean;
  /** eigene Namen der Entwicklungsstufen (z. B. Hahn statt Huhn) */
  stageNames?: Partial<Record<Stage, Partial<Record<Variant, string>>>>;
}

export interface GameTheme {
  title: string;
  description: string;
}

export interface SpeciesDef {
  id: string;
  name: string; // "Fuchs"
  article: string; // "der"
  homeName: string; // "Fuchsbau"
  nameIdeas: string[]; // Vorschläge beim Benennen
  colors: { floor: string; wall: string; wallDark: string };
  palette: Palette;
  variantPalettes: Partial<Record<Variant, Partial<Palette>>>;
  sprites: Record<Exclude<Stage, 'egg'>, Sprite>;
  egg: { shell: string; spots: string };
  /** realistisches Gewicht in Gramm bei Normalgewicht je Stufe (Anzeige) */
  weightGrams: Record<Exclude<Stage, 'egg'>, number>;
  /** Schlafpose (eingerollt) */
  sleep: SleepShape;
  /** Deko im Raum passend zur Art */
  room?: { scene?: 'room' | 'forest' | 'garden' | 'farm'; floor?: 'grass' | 'leaves'; scratchingPost?: boolean; ball?: boolean; bone?: boolean; socks?: boolean };
  /** optional: zufällige Fellfarbe + Muster pro Tier */
  coats?: Coat[];
  patterns?: Pattern[];
  /** Männchen/Weibchen zufällig (z. B. Henne/Hahn) */
  sexes?: boolean;
  maleStageNames?: Partial<Record<Stage, Partial<Record<Variant, string>>>>;
  /** optional: zufällige Rasse pro Tier (überschreibt sprites/coats/patterns) */
  breeds?: Breed[];
  stageNames: Record<Stage, Partial<Record<Variant, string>>>;
  games: {
    timing: GameTheme & { target: string; hit: string };
    guess: GameTheme & { hideout: string; hideEmoji: string; petEmoji: string };
    catch: GameTheme & { good: string; bad: string };
    throw: GameTheme & { thing: string; emoji: string; water: string };
    memory: GameTheme;
  };
}
