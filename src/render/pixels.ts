import type { Look, Stage, Variant } from '../engine/state';
import type { Breed, Palette, Pattern, SpeciesDef, Sprite } from '../species/types';
import { sleepSprite, stretchSprite } from './sleepers';
import { SHADE_KEYS, renderRig, type RigOpts } from './rig';

export type ColorMap = Record<string, string>;

/** Auflösung: 1 Spiel-Einheit = RES Bildpixel (echtes Pixelraster, scharf skaliert) */
export const RES = 4;
/** Größe eines Bildpixels in Spiel-Einheiten */
export const PX = 1 / RES;
/** auf das Bildpixel-Raster runden */
export const snapPx = (v: number) => Math.round(v * RES) / RES;

function hexToRgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(c: string, f: number): string {
  const [r, g, b] = hexToRgb(c);
  const m = (v: number) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
  return `#${((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1)}`;
}

function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const m = (u: number, v: number) => Math.round(u + (v - u) * t);
  return `#${((1 << 24) | (m(r1, r2) << 16) | (m(g1, g2) << 8) | m(b1, b2)).toString(16).slice(1)}`;
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

/** Umriss ('o') auf 1 Pixel ausdünnen: Umriss-Pixel, die nicht an Transparenz grenzen, aber an einem Außenrand-Pixel liegen, bekommen die Innenfarbe */
function thinOutline(g: string[][]): string[][] {
  const h = g.length;
  const w = g[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x]);
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
  return thin;
}

/** Innenlinien (4 Pixel dick) auf 2 Pixel halbieren: rechte/untere Hälfte bekommt die Nachbarfarbe */
function thinInner(g: string[][]): string[][] {
  const h = g.length;
  const w = g[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x]);
  const out = g.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (g[y][x] !== 'o' || N4.some(([dx, dy]) => at(x + dx, y + dy) === '.')) continue;
      // senkrechte Linie: links 2 Pixel Umriss davor, rechts Farbe → dieses Pixel einfärben
      if (at(x - 1, y) === 'o' && at(x - 2, y) === 'o' && at(x + 1, y) !== 'o' && at(x + 1, y) !== '.') out[y][x] = at(x + 1, y);
      else if (at(x, y - 1) === 'o' && at(x, y - 2) === 'o' && at(x, y + 1) !== 'o' && at(x, y + 1) !== '.') out[y][x] = at(x, y + 1);
    }
  return out;
}

/** Sprite in vierfacher Pixeldichte: 2× Scale2x, 1-Pixel-Umrisse, feine Schattierung */
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
  // zweimal Scale2x (4-fache Dichte): Rundungen werden weich, danach Umrisse jeweils auf 1 Pixel ausdünnen
  g = thinOutline(scale2x(g));
  g = thinOutline(scale2x(g));
  g = thinInner(g);
  const h = g.length;
  const w = g[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x]);
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
        // Licht oben links, Schatten unten rechts: 2 Pixel breit, nach innen schwächer
        const l1 = edge(at(x - 1, y)) || edge(at(x, y - 1));
        const d1 = edge(at(x + 1, y)) || edge(at(x, y + 1));
        const l2 = edge(at(x - 2, y)) || edge(at(x, y - 2));
        const d2 = edge(at(x + 2, y)) || edge(at(x, y + 2));
        if (l1 && !d1) col = shade(col, 0.2);
        else if (d1 && !l1) col = shade(col, -0.2);
        else if (l2 && !d2) col = shade(col, 0.09);
        else if (d2 && !l2) col = shade(col, -0.1);
        else if (c === 'a' || c === 'd' || c === 'c') {
          // feine Fell-/Federstruktur: kurze schräge Striche (2 Pixel), etwas dunkler bzw. heller
          const n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
          const m = (((x - 1) * 73856093) ^ ((y - 1) * 19349663)) >>> 0;
          if (n % 13 === 0 || m % 13 === 0) col = shade(col, -0.1);
          else if (n % 31 === 0) col = shade(col, 0.08);
        }
      } else if (c === 'E' && !'E'.includes(at(x - 1, y)) && !'E'.includes(at(x, y - 1)) && at(x + 1, y) === 'E' && at(x, y + 1) === 'E') {
        col = '#ffffff'; // Glanzpunkt im Auge
      }
      if (c === 'o' && N4.some(([dx, dy]) => at(x + dx, y + dy) === '.')) {
        // Außenumriss in der (abgedunkelten) Farbe des angrenzenden Fells – oben links etwas heller
        let fill: string | undefined;
        for (let r = 1; r <= 2 && !fill; r++)
          fill = [[0, r], [0, -r], [r, 0], [-r, 0]].map(([dx, dy]) => at(x + dx, y + dy)).find((n) => n !== 'o' && n !== '.' && !flat(n));
        if (fill) {
          const lit = edge(at(x - 1, y)) || edge(at(x, y - 1));
          col = mixHex(shade(colors[fill], lit ? -0.5 : -0.62), colors.o, 0.35);
        }
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

/** Grafiken, die schon in voller Rasterdichte vorliegen (1 Zeichen = 1 Bildpixel) */
const HIRES = new WeakSet<string[]>();
const hiresCache = new Map<string, HTMLCanvasElement>();
function hiresBitmap(map: string[], colors: ColorMap, flip: boolean): HTMLCanvasElement {
  const key = `${flip ? 1 : 0}|${map.join('/')}|${Object.entries(colors).map(([k, v]) => k + v).join(',')}`;
  const hit = hiresCache.get(key);
  if (hit) return hit;
  const h = map.length;
  const w = map[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : map[y][flip ? w - 1 - x : x]);
  const flat = (c: string) => c === 'o' || c === 'E' || c === 'e' || c === 'n' || c === 'h' || c === '.';
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (c === '.' || !colors[c]) continue;
      let col = colors[c];
      if (c === 'o' && N4.some(([dx, dy]) => at(x + dx, y + dy) === '.')) {
        // Außenumriss in abgedunkelter Farbe des angrenzenden Fells, oben links etwas heller
        let fill: string | undefined;
        for (let r = 1; r <= 2 && !fill; r++) fill = [[0, r], [0, -r], [r, 0], [-r, 0]].map(([dx, dy]) => at(x + dx, y + dy)).find((n) => !flat(n) && colors[n]);
        if (fill) {
          const lit = at(x - 1, y) === '.' || at(x, y - 1) === '.';
          col = mixHex(shade(colors[fill], lit ? -0.5 : -0.62), colors.o, 0.35);
        }
      }
      const [r, g, b] = hexToRgb(col);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  cx.putImageData(img, 0, 0);
  if (hiresCache.size > 600) hiresCache.clear();
  hiresCache.set(key, cv);
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
  const snap = (v: number) => Math.round(v * RES) / RES;
  if (HIRES.has(map)) {
    const bmp = hiresBitmap(map, colors, flip);
    ctx.drawImage(bmp, snap(x), snap(y), map[0].length / RES, map.length / RES);
    return;
  }
  const bmp = spriteBitmap(map, colors, flip);
  ctx.drawImage(bmp, snap(x), snap(y), map[0].length, map.length);
}

const pixCache = new Map<string, HTMLCanvasElement>();
/**
 * Zeichnet eine feine Pixel-Grafik (1 Zeichen = 0,5 Spiel-Einheiten). Sie wird per Scale2x
 * auf die volle Rasterdichte verfeinert (Schrägen und Rundungen werden glatter).
 * Farben werden über ctx.fillStyle aufgelöst, damit Umfärbungen (Jahreszeiten) greifen.
 */
export function drawPixels(ctx: CanvasRenderingContext2D, map: string[], colors: ColorMap, x: number, y: number) {
  const resolved: ColorMap = {};
  for (const [k, v] of Object.entries(colors)) {
    ctx.fillStyle = v;
    resolved[k] = String(ctx.fillStyle);
  }
  const key = `${map.join('/')}|${Object.entries(resolved).map(([k, v]) => k + v).join(',')}`;
  let bmp = pixCache.get(key);
  if (!bmp) {
    const mw = Math.max(...map.map((r) => r.length));
    const g = scale2x(map.map((r) => [...r.padEnd(mw, '.')].map((c) => (resolved[c] ? c : '.'))));
    bmp = document.createElement('canvas');
    bmp.width = g[0]?.length ?? 1;
    bmp.height = g.length || 1;
    const cx = bmp.getContext('2d')!;
    for (let r = 0; r < g.length; r++)
      for (let c = 0; c < g[r].length; c++) {
        const col = resolved[g[r][c]];
        if (!col) continue;
        cx.fillStyle = col;
        cx.fillRect(c, r, 1, 1);
      }
    if (pixCache.size > 1500) pixCache.clear();
    pixCache.set(key, bmp);
  }
  ctx.drawImage(bmp, snapPx(x), snapPx(y), bmp.width / RES, bmp.height / RES);
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
  gaze?: number; // -1 = Augen nach links, 1 = nach rechts (im Sprite)
}

/** Blickrichtung: Augen-Pixel um eine Spalte verschieben (nur über Fell/Gesicht) */
function shiftEyes(rows: string[], d: number): string[] {
  return rows.map((row) => {
    const a = [...row];
    const idx = a.map((c, i) => (c === 'E' || c === 'e' ? i : -1)).filter((i) => i >= 0);
    if (d > 0) idx.reverse();
    for (const i of idx) {
      const j = i + d;
      if (j >= 0 && j < a.length && 'abcd'.includes(a[j])) [a[i], a[j]] = [a[j], a[i]];
    }
    return a.join('');
  });
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
  } else if (pattern === 'laced') {
    // gesäumtes Gefieder: dunkle Federränder als Schuppenmuster
    test = (x, y) => (y % 2 === 0 ? (x % 2 === 0 ? 'd' : null) : (x + 1) % 4 === 0 ? 'd' : null);
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
  let rows = look.gaze ? shiftEyes(sprite, Math.sign(look.gaze)) : sprite;
  rows = look.pattern ? applyPattern(rows, look.pattern, look.seed ?? 1) : rows;
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
  opts: { eyesClosed?: boolean; sleeping?: boolean; sleepSmall?: boolean; gaze?: number; stretch?: 0 | 1; pose?: 'scratch0' | 'scratch1' | 'bat0' | 'bat1' | 'leap' } = {},
) {
  const look = pet.look ?? null;
  const breed = look?.breed !== undefined ? sp.breeds?.[look.breed] : undefined;
  const rig = breed?.rig ?? sp.rig;
  if (rig) return rigSprite(sp, pet, opts, rig, breed);
  const sprite = opts.stretch !== undefined
    ? stretchSprite(breed?.sleep ?? sp.sleep, opts.stretch)
    : opts.sleeping
    ? sleepSprite(breed?.sleep ?? sp.sleep, !opts.sleepSmall && (pet.stage === 'teen' || pet.stage === 'adult'))
    : look?.sex === 'm' && breed?.maleSprites && (pet.stage === 'teen' || pet.stage === 'adult')
      ? breed.maleSprites[pet.stage]
      : (breed?.sprites ?? sp.sprites)[pet.stage === 'egg' ? 'baby' : pet.stage];
  return {
    map: petMap(sprite, {
      eyesClosed: opts.eyesClosed,
      gaze: opts.sleeping ? 0 : opts.gaze,
      brows: pet.variant === 'cheeky',
      pattern: look?.pattern,
      seed: look?.seed,
    }),
    colors: paletteFor(sp, pet.variant, look?.coat, breed) as unknown as ColorMap,
    w: sprite[0].length,
    h: sprite.length,
    facesLeft: opts.stretch !== undefined || (!opts.sleeping && !!breed?.facesLeft),
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

const POSE_SIZE: Record<string, [number, number]> = { scratch0: [14, 22], scratch1: [14, 22], bat0: [20, 14], bat1: [20, 14], leap: [24, 13] };
const STAGE_SCALE: Record<string, number> = { baby: 0.7, child: 0.8, teen: 0.9, adult: 1, egg: 0.7 };

/** neues Aussehen: in voller Rasterdichte aus dem Bauplan gezeichnet (gleiche Maße wie die alten Sprites) */
function rigSprite(
  sp: SpeciesDef,
  pet: { stage: Stage; variant: Variant; look?: Look | null },
  opts: Parameters<typeof petSprite>[2] & object,
  rig: NonNullable<SpeciesDef['rig']>,
  breed?: Breed,
) {
  const look = pet.look ?? null;
  const stage = pet.stage === 'egg' ? 'baby' : pet.stage;
  const grown = stage === 'teen' || stage === 'adult';
  const male = look?.sex === 'm' && grown;
  let size: string[];
  let pose: RigOpts['pose'] = 'stand';
  let w: number;
  let h: number;
  if (opts.pose) {
    const [pw, ph] = POSE_SIZE[opts.pose];
    w = Math.round(pw * STAGE_SCALE[stage]);
    h = Math.round(ph * STAGE_SCALE[stage]);
    pose = opts.pose;
  } else {
    if (opts.stretch !== undefined) {
      size = stretchSprite(breed?.sleep ?? sp.sleep, opts.stretch);
      pose = opts.stretch ? 'stretch1' : 'stretch0';
    } else if (opts.sleeping) {
      size = sleepSprite(breed?.sleep ?? sp.sleep, !opts.sleepSmall && grown);
      pose = 'sleep';
    } else size = male && breed?.maleSprites ? breed.maleSprites[stage as 'teen' | 'adult'] : (breed?.sprites ?? sp.sprites)[stage];
    w = size[0].length;
    h = size.length;
  }
  const map = renderRig(rig, stage, w, h, {
    eyesClosed: opts.eyesClosed,
    brows: pet.variant === 'cheeky',
    gaze: opts.sleeping ? 0 : (opts.gaze ?? 0) * 2,
    pose,
    male,
    pattern: look?.pattern,
    seed: look?.seed,
  }, RES);
  HIRES.add(map);
  const colors = paletteFor(sp, pet.variant, look?.coat, breed) as unknown as ColorMap;
  const full: ColorMap = { ...colors, h: '#ffffff' };
  for (const [k, base, f] of SHADE_KEYS) if (colors[base]) full[k] = shade(colors[base], f);
  return {
    map,
    colors: full,
    w,
    h,
    facesLeft: opts.stretch !== undefined || !!opts.pose || (!opts.sleeping && !!breed?.facesLeft),
  };
}
