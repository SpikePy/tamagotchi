import type { Look, Stage, Variant } from '../engine/state';
import type { Palette, Pattern, SpeciesDef, Sprite } from '../species/types';

export type ColorMap = Record<string, string>;

export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: string[],
  colors: ColorMap,
  x: number,
  y: number,
  flip = false,
) {
  const w = map[0].length;
  for (let row = 0; row < map.length; row++) {
    const line = map[row];
    for (let col = 0; col < w; col++) {
      const ch = line[col];
      const color = colors[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + (flip ? w - 1 - col : col)), Math.round(y + row), 1, 1);
    }
  }
}

export function paletteFor(sp: SpeciesDef, variant: Variant, coat?: number): Palette {
  const coatColors = coat !== undefined ? (sp.coats?.[coat]?.colors ?? {}) : {};
  return { ...sp.palette, ...(sp.variantPalettes[variant] ?? {}), ...coatColors } as Palette;
}

export interface PetLook {
  eyesClosed?: boolean;
  brows?: boolean; // freche Variante: Augenbrauen
  pattern?: Pattern | string;
  seed?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wendet ein Fellmuster auf die Hauptfarbe 'a' an. */
export function applyPattern(rows: string[], pattern: string, seed: number): string[] {
  if (pattern === 'solid' || !pattern) return rows;
  const h = rows.length;
  const w = rows[0].length;
  let test: (x: number, y: number) => string | null;
  if (pattern === 'tabby') {
    // Streifen: quer über den Körper, auf der Stirn ein "M"
    test = (x, y) => (y % 3 === 0 && (x + y) % 5 !== 0 ? 'd' : null);
  } else if (pattern === 'patches') {
    const rnd = mulberry32(seed);
    const blobs = [0, 1, 2, 3].map(() => [rnd(), 0.15 + rnd() * 0.8, 0.12 + rnd() * 0.1]);
    test = (x, y) => {
      const u = (x + 0.5) / w;
      const v = (y + 0.5) / h;
      return blobs.some(([bx, by, r]) => (u - bx) ** 2 + (v - by) ** 2 < r * r) ? 'd' : null;
    };
  } else if (pattern === 'socks') {
    // weiße Pfoten/Beine und weißes Kinn
    test = (_x, y) => (y >= h - 5 ? 'b' : null);
  } else return rows;
  return rows.map((r, y) => [...r].map((ch, x) => (ch === 'a' ? (test(x, y) ?? ch) : ch)).join(''));
}

/** Sprite inkl. Varianten-Details (geschlossene Augen, Augenbrauen, Fellmuster). */
export function petMap(sprite: Sprite, look: PetLook): string[] {
  let rows = look.pattern ? applyPattern(sprite, look.pattern, look.seed ?? 1) : sprite;
  rows = rows.map((r) => (look.eyesClosed ? r.replaceAll('E', 'a') : r));
  if (look.brows) {
    rows = rows.map((r, y) => {
      const below = sprite[y + 1];
      if (!below) return r;
      return [...r].map((ch, x) => (below[x] === 'E' && below[x + 1] !== 'E' ? 'o' : ch)).join('');
    });
  }
  return rows;
}

/** Fertiges Bild eines Tiers: Pixelzeilen + Farben (Variante, Fell, Muster) */
export function petSprite(
  sp: SpeciesDef,
  pet: { stage: Stage; variant: Variant; look?: Look | null },
  opts: { eyesClosed?: boolean } = {},
) {
  const sprite = sp.sprites[pet.stage === 'egg' ? 'baby' : pet.stage];
  const look = pet.look ?? null;
  return {
    map: petMap(sprite, {
      eyesClosed: opts.eyesClosed,
      brows: pet.variant === 'cheeky',
      pattern: look?.pattern,
      seed: look?.seed,
    }),
    colors: paletteFor(sp, pet.variant, look?.coat) as unknown as ColorMap,
    w: sprite[0].length,
    h: sprite.length,
  };
}

/** Farben fürs Ei; bei zufälligem Fell zeigen die Flecken schon die Fellfarbe */
export function eggColors(sp: SpeciesDef, look?: Look | null): ColorMap {
  const coat = look ? sp.coats?.[look.coat]?.colors : undefined;
  return { o: '#3a2a1a', s: sp.egg.shell, x: coat?.a ?? sp.egg.spots };
}

export const ICONS: Record<string, { map: string[]; colors: ColorMap }> = {
  poop: {
    map: ['..o...', '.oco..', '.occo.', 'occcco', 'oooooo'],
    colors: { o: '#3a2410', c: '#7a4a1e' },
  },
  heart: {
    map: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
    colors: { r: '#e2384d' },
  },
  heartEmpty: {
    map: ['.r.r.', 'r.r.r', 'r...r', '.r.r.', '..r..'],
    colors: { r: '#7a6a5a' },
  },
  skull: {
    map: ['.www.', 'wwwww', 'w.w.w', 'wwwww', '.w.w.'],
    colors: { w: '#f4f4f4' },
  },
  skullDark: {
    map: ['.kkk.', 'kkkkk', 'k.k.k', 'kkkkk', '.k.k.'],
    colors: { k: '#222' },
  },
  bang: {
    map: ['rr', 'rr', 'rr', '..', 'rr'],
    colors: { r: '#e2384d' },
  },
  z: {
    map: ['www', '..w', '.w.', 'w..', 'www'],
    colors: { w: '#c9d4ff' },
  },
  food: {
    map: ['..gg.', '.oooo', 'oyyyo', 'oyyyo', '.ooo.'],
    colors: { o: '#7a4a1e', y: '#f2c14e', g: '#4d9a3a' },
  },
  candy: {
    map: ['p...p', 'ppppp', 'pwppp', 'ppppp', 'p...p'],
    colors: { p: '#e46fb1', w: '#fff' },
  },
  pill: {
    map: ['..rr', '.rrw', 'wwr.', 'ww..'],
    colors: { r: '#d94040', w: '#f4f4f4' },
  },
  sparkle: {
    map: ['..y..', '..y..', 'yyyyy', '..y..', '..y..'],
    colors: { y: '#fff3a0' },
  },
  angry: {
    map: ['r.r', '.r.', 'r.r'],
    colors: { r: '#e2384d' },
  },
  sun: {
    map: ['.yyy.', 'yyyyy', 'yyyyy', 'yyyyy', '.yyy.'],
    colors: { y: '#ffd34d' },
  },
  moon: {
    map: ['.yy..', 'yy...', 'yy...', 'yy...', '.yy..'],
    colors: { y: '#f3f0c8' },
  },
};

export function eggMap(): string[] {
  return [
    '....oooo....',
    '...osssso...',
    '..ossxssso..',
    '.ossssssxso.',
    '.osxsssssso.',
    'ossssssxssso',
    'osssxsssssso',
    'osssssssxsso',
    'osxssssssxso',
    '.osssxsssso.',
    '.ossssssxso.',
    '..osssssso..',
    '...oooooo...',
  ];
}
