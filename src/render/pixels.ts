import type { Look, Stage, Variant } from '../engine/state';
import type { Breed, Palette, Pattern, SpeciesDef, Sprite } from '../species/types';
import { sleepSprite } from './sleepers';

export type ColorMap = Record<string, string>;

/** Auflösung: 1 Spiel-Einheit = RES Bildpixel (echtes Pixelraster, scharf skaliert) */
export const RES = 2;

function hexToRgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(c: string, f: number): string {
  const [r, g, b] = hexToRgb(c);
  const m = (v: number) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
  return `#${((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1)}`;
}

/** Scale2x: verdoppelt die Pixel und rundet Treppen an Schrägen ab */
function scale2x(src: string[][]): string[][] {
  const h = src.length;
  const w = src[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : src[y][x]);
  const out: string[][] = Array.from({ length: h * 2 }, () => Array(w * 2).fill('.'));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = src[y][x];
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);
      out[y * 2][x * 2] = C === A && C !== D && A !== B ? A : P;
      out[y * 2][x * 2 + 1] = A === B && A !== C && B !== D ? B : P;
      out[y * 2 + 1][x * 2] = D === C && D !== B && C !== A ? C : P;
      out[y * 2 + 1][x * 2 + 1] = B === D && B !== A && D !== C ? D : P;
    }
  return out;
}

const spriteCache = new Map<string, HTMLCanvasElement>();
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Sprite in doppelter Pixeldichte: Scale2x, 1-Pixel-Umrisse, feine Schattierung */
function spriteBitmap(map: string[], colors: ColorMap, flip: boolean): HTMLCanvasElement {
  const key = `${flip ? 1 : 0}|${map.join('/')}|${Object.entries(colors).map(([k, v]) => k + v).join(',')}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const h0 = map.length;
  const w0 = map[0].length;
  // Zeichen-Raster (unbekannte Zeichen = transparent)
  let g: string[][] = [];
  for (let y = 0; y < h0; y++) {
    const row: string[] = [];
    for (let x = 0; x < w0; x++) {
      const c = map[y][flip ? w0 - 1 - x : x];
      row.push(colors[c] ? c : '.');
    }
    g.push(row);
  }
  g = scale2x(g);
  const h = g.length;
  const w = g[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x]);
  // Umrisse auf 1 Pixel ausdünnen: innere Umriss-Pixel bekommen die Farbe des Inneren
  const thin = g.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (g[y][x] !== 'o') continue;
      if (N4.some(([dx, dy]) => at(x + dx, y + dy) === '.')) continue; // äußerer Rand bleibt
      const touchesOuter = N4.some(([dx, dy]) => at(x + dx, y + dy) === 'o' && N4.some(([ex, ey]) => at(x + dx + ex, y + dy + ey) === '.'));
      if (!touchesOuter) continue; // echte Innenlinie bleibt
      const fill = N4.map(([dx, dy]) => at(x + dx, y + dy)).find((c) => c !== 'o' && c !== '.');
      if (fill) thin[y][x] = fill;
    }
  g = thin;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(w, h);
  const flat = (c: string) => c === 'o' || c === 'E' || c === 'e' || c === 'n';
  const edge = (c: string) => c === '.' || c === 'o';
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = g[y][x];
      if (c === '.') continue;
      let col = colors[c];
      if (!flat(c)) {
        // Licht oben links, Schatten unten rechts (1 Pixel breit)
        const light = edge(at(x - 1, y)) || edge(at(x, y - 1));
        const dark = edge(at(x + 1, y)) || edge(at(x, y + 1));
        if (light && !dark) col = shade(col, 0.18);
        else if (dark && !light) col = shade(col, -0.18);
      }
      const [r, gg, b] = hexToRgb(col);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = gg;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  cx.putImageData(img, 0, 0);
  if (spriteCache.size > 800) spriteCache.clear();
  spriteCache.set(key, cv);
  return cv;
}

/** Zeichnet ein Pixel-Sprite (Koordinaten in Spiel-Pixeln, ctx ist auf RES skaliert) */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: string[],
  colors: ColorMap,
  x: number,
  y: number,
  flip = false,
) {
  const bmp = spriteBitmap(map, colors, flip);
  const snap = (v: number) => Math.round(v * RES) / RES;
  ctx.drawImage(bmp, snap(x), snap(y), map[0].length, map.length);
}

/** Canvas in hoher Auflösung, Koordinaten in Spiel-Pixeln */
export function hiResCanvas(w: number, h: number, cls = ''): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w * RES;
  c.height = h * RES;
  if (cls) c.className = cls;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return c;
}

export function paletteFor(sp: SpeciesDef, variant: Variant, coat?: number, breed?: Breed): Palette {
  const coats = breed?.coats ?? sp.coats;
  const coatColors = coat !== undefined ? (coats?.[coat]?.colors ?? {}) : {};
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
  } else if (pattern === 'spots') {
    // Tupfen (Dalmatiner)
    test = (x, y) => {
      let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2654435761)) >>> 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
      return (n ^ (n >>> 16)) % 6 === 0 ? 'd' : null;
    };
  } else if (pattern === 'saddle') {
    // dunkler Sattel auf dem Rücken (Schäferhund, Beagle)
    test = (_x, y) => (y >= h * 0.55 && y < h * 0.85 ? 'd' : null);
  } else if (pattern === 'points') {
    // helle Abzeichen an den Beinen (Black & Tan)
    test = (_x, y) => (y >= h - 4 ? 'd' : null);
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
  opts: { eyesClosed?: boolean; sleeping?: boolean } = {},
) {
  const look = pet.look ?? null;
  const breed = look?.breed !== undefined ? sp.breeds?.[look.breed] : undefined;
  const sprite = opts.sleeping
    ? sleepSprite(breed?.sleep ?? sp.sleep, pet.stage === 'teen' || pet.stage === 'adult')
    : (breed?.sprites ?? sp.sprites)[pet.stage === 'egg' ? 'baby' : pet.stage];
  return {
    map: petMap(sprite, {
      eyesClosed: opts.eyesClosed,
      brows: pet.variant === 'cheeky',
      pattern: look?.pattern,
      seed: look?.seed,
    }),
    colors: paletteFor(sp, pet.variant, look?.coat, breed) as unknown as ColorMap,
    w: sprite[0].length,
    h: sprite.length,
  };
}

/** Farben fürs Ei; bei zufälligem Fell zeigen die Flecken schon die Fellfarbe */
export function eggColors(sp: SpeciesDef, look?: Look | null): ColorMap {
  const breed = look?.breed !== undefined ? sp.breeds?.[look.breed] : undefined;
  const coat = look ? (breed?.coats ?? sp.coats)?.[look.coat]?.colors : undefined;
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
