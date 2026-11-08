import type { Variant } from '../engine/state';
import type { Palette, SpeciesDef, Sprite } from '../species/types';

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

export function paletteFor(sp: SpeciesDef, variant: Variant): Palette {
  return { ...sp.palette, ...(sp.variantPalettes[variant] ?? {}) };
}

export interface PetLook {
  eyesClosed?: boolean;
  brows?: boolean; // freche Variante: Augenbrauen
}

/** Sprite inkl. Varianten-Details (geschlossene Augen, Augenbrauen). */
export function petMap(sprite: Sprite, look: PetLook): string[] {
  let rows = sprite.map((r) => (look.eyesClosed ? r.replaceAll('E', 'a') : r));
  if (look.brows) {
    rows = rows.map((r, y) => {
      const below = sprite[y + 1];
      if (!below) return r;
      return [...r].map((ch, x) => (below[x] === 'E' && below[x + 1] !== 'E' ? 'o' : ch)).join('');
    });
  }
  return rows;
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
