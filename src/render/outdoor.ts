// Außenszenen, nativ im Bildpixel-Raster (256 × 192) gemalt:
//  forest = Waldrand mit Fuchsbau, garden = Garten mit Hecke und Laubnest, farm = Hühnerhof mit Stall.
import { RES, type ColorMap } from './pixels';
import { Painter, PW, PH, dither, fbm, gradient, hash, mix, vnoise } from './paint';
import type { Season } from './season';

export type SceneKind = 'room' | 'forest' | 'garden' | 'farm';

const W = 64;
export const GROUND_Y = 33; // Horizont: ab hier beginnt der Boden (Spiel-Einheiten)
const GY = GROUND_Y * RES; // in Bildpixeln
const SUNRISE = 7;
const SUNSET = 20;

export interface Sky {
  day: boolean;
  f: number; // Fortschritt 0..1 über Tag bzw. Nacht
  edge: number; // Nähe zu Morgen/Abend (0 = Sonnenauf-/untergang)
}

export function skyState(clock: number): Sky {
  const d = new Date(clock);
  const h = d.getHours() + d.getMinutes() / 60;
  const day = h >= SUNRISE && h < SUNSET;
  const f = day ? (h - SUNRISE) / (SUNSET - SUNRISE) : ((h - SUNSET + 24) % 24) / (24 - SUNSET + SUNRISE);
  return { day, f, edge: Math.min(f, 1 - f) };
}

// ---------------------------------------------------------------- Himmel

export function skyStops(sky: Sky): string[] {
  if (!sky.day) return ['#090d28', '#161e4a', '#2a3466'];
  if (sky.edge < 0.08) return ['#46559a', '#d27c6c', '#f6c48e'];
  if (sky.edge < 0.16) return ['#6a98c8', '#b4cce2', '#ecefe6'];
  return ['#3684d6', '#74b4ea', '#c6e4f8'];
}

/** Sonne bzw. Mond mit Lichthof (Mittelpunkt in Bildpixeln) */
export function sunMoon(p: Painter, cx: number, cy: number, day: boolean, clip?: { x: number; y: number; w: number; h: number }) {
  const inClip = (x: number, y: number) => !clip || (x >= clip.x && y >= clip.y && x < clip.x + clip.w && y < clip.y + clip.h);
  const R = day ? 8 : 7;
  const halo = day ? 20 : 15;
  for (let y = Math.floor(cy - halo); y <= cy + halo; y++)
    for (let x = Math.floor(cx - halo); x <= cx + halo; x++) {
      if (!inClip(x, y)) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > halo) continue;
      if (d > R) {
        // Lichthof in drei Stufen
        const k = 1 - (d - R) / (halo - R);
        const step = k > 0.66 ? 0.22 : k > 0.33 ? 0.13 : 0.06;
        p.px(x, y, day ? `rgba(255,244,190,${step})` : `rgba(200,206,245,${step * 0.8})`);
        continue;
      }
      let c: string;
      if (day) {
        c = '#ffd84a';
        if (d > R - 1.2) c = '#f2b02c';
        else if (dx + dy < -5) c = '#fff8d4';
        else if (dx + dy < -2) c = '#ffe98a';
        else if (dx + dy > 6) c = '#f8c43a';
      } else {
        c = '#f2eed6';
        if (d > R - 1.2) c = dx + dy > 0 ? '#bdb89a' : '#e0dcc0';
        else if (dx + dy > 4) c = '#d8d3b4';
        for (const [kx, ky, kr] of [[-2, -2, 1.6], [2.5, 1, 1.3], [-1, 3, 1]] as [number, number, number][])
          if (Math.hypot(dx - kx, dy - ky) < kr) c = '#cfc9a8'; // Krater
      }
      p.px(x, y, c);
    }
}

export function drawOutdoorSky(ctx: CanvasRenderingContext2D, clock: number): boolean {
  const sky = skyState(clock);
  const p = new Painter(ctx);
  const g = gradient(skyStops(sky), 14);
  for (let y = 0; y < GY + 4; y++) for (let x = 0; x < PW; x++) p.px(x, y, g(x, y, y / (GY + 3)));
  if (!sky.day) {
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(hash(i, 1, 5) * PW);
      const y = Math.floor(hash(i, 2, 5) * (GY - 30));
      const b = hash(i, 3, 5);
      p.px(x, y, b > 0.85 ? '#ffffff' : b > 0.5 ? '#e4e2c4' : '#8c94c4');
      if (b > 0.93) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, '#7a84b8');
    }
  }
  const cx = (-5 + sky.f * (W + 5) + 2.5) * RES;
  const cy = (GROUND_Y - 8 - Math.sin(Math.PI * sky.f) * (GROUND_Y - 12) + 2.5) * RES;
  sunMoon(p, cx, cy, sky.day);
  p.commit(ctx);
  return sky.day;
}

// ---------------------------------------------------------------- Bausteine

type Pal5 = [string, string, string, string, string]; // Umriss, Schatten, Mitte, Licht, Glanz

const PINE_NEAR: Pal5 = ['#122a18', '#1c4026', '#2a5a32', '#3a7440', '#56924c'];
const PINE_FAR: Pal5 = ['#38584a', '#43664f', '#52785c', '#62896a', '#78a07c'];

/** Tanne: gestufte, hängende Astetagen, Licht links, dunkle Unterseiten, Nadelstruktur */
function pine(p: Painter, cx: number, base: number, h: number, pal: Pal5, seed: number) {
  const top = base - h;
  const trunkH = Math.max(3, Math.round(h * 0.07));
  const tw = Math.max(2, Math.round(h / 22));
  p.rect(cx - tw, base - trunkH, tw * 2 + 1, trunkH, '#4a2e18');
  p.rect(cx - tw, base - trunkH, 1, trunkH, '#6e4a2c');
  const tiers = Math.max(3, Math.round(h / 15));
  const maxHalf = h * 0.3;
  const bottom = base - trunkH;
  for (let y = Math.max(0, Math.floor(top)); y < bottom; y++) {
    const t = (y - top) / (bottom - top);
    const tp = (t * tiers) % 1;
    const half = maxHalf * (0.1 + 0.9 * t) * (0.38 + 0.62 * tp) + 0.6 + (hash(y, 0, seed) - 0.5) * 1.6;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const rel = (x - cx) / half;
      const n = hash(x, y, seed + 5);
      let c = pal[2];
      if (rel < -0.3) c = n < 0.55 ? pal[3] : pal[2];
      if (rel < -0.55 && n < 0.25) c = pal[4];
      if (rel > 0.35) c = n < 0.7 ? pal[1] : pal[2];
      if (tp > 0.8) c = pal[1];
      if (tp > 0.9 || (rel > 0.75 && tp > 0.6)) c = pal[0];
      if (n > 0.94) c = pal[1]; // Nadelbüschel
      if (Math.abs(rel) > 0.9) c = pal[0];
      p.px(x, y, c);
    }
  }
}

/** Laub-Volumen (Busch, Baumkrone, Hecke): Klumpen-Schattierung, Licht oben links */
function foliage(p: Painter, blobs: [number, number, number, number][], pal: Pal5, seed: number, ground = PH, blossom?: string) {
  const x0 = Math.floor(Math.min(...blobs.map(([x, , rx]) => x - rx - 3)));
  const x1 = Math.ceil(Math.max(...blobs.map(([x, , rx]) => x + rx + 3)));
  const y0 = Math.floor(Math.min(...blobs.map(([, y, , ry]) => y - ry - 3)));
  const y1 = Math.min(ground, Math.ceil(Math.max(...blobs.map(([, y, , ry]) => y + ry + 3))));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = (y1 - y0) / 2;
  const inside = (x: number, y: number) => {
    if (y > ground) return false;
    let d = 9;
    for (const [bx, by, brx, bry] of blobs) d = Math.min(d, ((x - bx) / brx) ** 2 + ((y - by) / bry) ** 2);
    return d <= 1 + (vnoise(x / 2.2, y / 2.2, seed) - 0.5) * 0.45;
  };
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || (y < ground && !inside(x, y + 1));
      if (edge) {
        p.px(x, y, pal[0]);
        continue;
      }
      const l = (x - cx) / rx + (y - cy) / ry;
      const bump = vnoise(x / 3.3, y / 3.3, seed + 1);
      const v = -l * 0.42 + (bump - 0.5) * 1.15;
      let c = pal[2];
      if (v > 0.5) c = pal[4];
      else if (v > 0.18) c = pal[3];
      else if (v < -0.55) c = pal[0];
      else if (v < -0.2) c = pal[1];
      if (hash(x, y, seed + 2) > 0.95) c = pal[1]; // Blattlücken
      if (blossom && hash(x, y, seed + 3) > 0.965 && v > -0.2) c = blossom;
      p.px(x, y, c);
    }
}

/** Grasboden: Verlauf, Wuchsflecken, einzelne Halme (hinten kurz, vorne länger) */
function meadow(p: Painter, season: Season, y0 = GY, seed = 1) {
  const stops: Record<Season, string[]> = {
    spring: ['#9ccd6a', '#6aa846'],
    summer: ['#8cc05c', '#5c983a'],
    autumn: ['#a8b45a', '#7c8a3c'],
    winter: ['#eef3f8', '#d4e0ec'],
  };
  const blades: Record<Season, string[]> = {
    spring: ['#5a9a38', '#b4e07a', '#78b84c'],
    summer: ['#4c8a30', '#a6d470', '#6aa844'],
    autumn: ['#6a7a30', '#c4c472', '#8a9a44'],
    winter: ['#c4d2e0', '#ffffff', '#b0c4d4'],
  };
  const g = gradient(stops[season], 8);
  const dark = season === 'winter' ? '#dbe5ef' : mix(stops[season][1], '#2a4a1a', 0.18);
  for (let y = y0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      let c = g(x, y, (y - y0) / (PH - y0));
      if (fbm(x / 16, y / 6, seed) > 0.6 && dither(x, y, 0.6)) c = dark;
      p.px(x, y, c);
    }
  const bc = blades[season];
  for (let y = y0 + 1; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      const prob = 0.04 + ((y - y0) / (PH - y0)) * 0.12;
      const n = hash(x, y, seed + 9);
      if (n >= prob) continue;
      const h = 1 + Math.floor((n / prob) * 2 + (y - y0) / 20);
      const c = bc[Math.floor(hash(x, y, seed + 3) * bc.length)];
      const lean = hash(x, y, seed + 4) > 0.5 ? 1 : -1;
      for (let k = 0; k < h; k++) p.px(x + (k === h - 1 && h > 2 ? lean : 0), y - k, c);
    }
}

/** Blümchen in der Wiese */
function flowers(p: Painter, season: Season, n: number, yMin: number, yMax: number, seed: number) {
  if (season === 'winter') return;
  const cols = season === 'autumn' ? ['#e8b040', '#c8603a'] : ['#f6f6ee', '#f2d04a', '#c890e0', '#f6f6ee'];
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i, 1, seed) * PW);
    const y = Math.floor(yMin + hash(i, 2, seed) * (yMax - yMin));
    const c = cols[i % cols.length];
    p.px(x, y + 1, '#4a8a30');
    p.px(x - 1, y, c);
    p.px(x + 1, y, c);
    p.px(x, y - 1, c);
    p.px(x, y, c === '#f6f6ee' ? '#f2c040' : '#fff4c0');
  }
}

/** Kieselstein */
function pebble(p: Painter, x: number, y: number, w: number) {
  const h = Math.max(2, Math.round(w * 0.55));
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w - 0.5;
      const v = (j + 0.5) / h - 0.5;
      if (u * u + v * v > 0.25) continue;
      const edge = u * u + v * v > 0.16;
      p.px(x + i, y + j, edge ? '#5a5a54' : u + v < -0.2 ? '#c8c8bc' : u + v > 0.25 ? '#80807a' : '#a2a29a');
    }
  p.rect(x + 1, y + h, w - 2, 1, 'rgba(0,0,0,0.18)');
}

const AUTUMN_LEAF = [
  { l: '#f6c46a', g: '#e08a3a', d: '#a8542a' },
  { l: '#f08a6a', g: '#c95a2a', d: '#8a3a1a' },
  { l: '#f6e07a', g: '#e0b13a', d: '#a8802a' },
  { l: '#d8a060', g: '#b8743e', d: '#7a4a24' },
];
const LEAF_PX = [
  ['..ll...', '.lggg..', 'dgdddgd', '..ggd..'],
  ['...lg..', '.lgggg.', 'dddgdd.', '..dg...'],
  ['.lg....', 'lgggd..', '.gdddgd', '...ggd.'],
];
/** einzelnes Blatt (7 × 4 Bildpixel) mit Mittelrippe */
function leafPx(p: Painter, x: number, y: number, n: number, flip = false) {
  const c = AUTUMN_LEAF[n % AUTUMN_LEAF.length];
  let rows = LEAF_PX[n % LEAF_PX.length];
  if (flip) rows = rows.map((r) => [...r].reverse().join(''));
  p.map(rows, c, Math.round(x), Math.round(y));
}

// ---------------------------------------------------------------- Wald

function ridgeFn(peaks: [number, number, number][], seed: number, rough: number) {
  return (x: number) =>
    Math.min(...peaks.map(([c, h, k]) => h + Math.abs(x - c) * k)) + (vnoise(x / 4, 1, seed) - 0.5) * rough + (vnoise(x / 12, 2, seed + 1) - 0.5) * rough * 1.6;
}

function forestFar(p: Painter, season: Season) {
  // ferne Bergkette mit Schnee, Felsrippen und Dunst
  const rA = ridgeFn([[18, 40, 0.8], [68, 28, 0.72], [120, 46, 0.84], [172, 30, 0.74], [228, 40, 0.8], [270, 30, 0.7]], 3, 3);
  const snowBase = season === 'winter' ? 104 : season === 'summer' ? 56 : 66;
  const hazeA = '#c6d6e8';
  for (let x = 0; x < PW; x++) {
    const top = Math.round(rA(x));
    const lit = rA(x + 2) - rA(x - 2) < -0.2;
    const snowLine = snowBase + (vnoise(x / 6, 5, 7) - 0.5) * 16;
    for (let y = top; y < 124; y++) {
      const streak = vnoise((x + (lit ? y : -y) * 0.55) / 3, y / 16, 9);
      let c = lit ? '#aebfd9' : '#8696ba';
      if (streak > 0.66) c = lit ? '#98aacb' : '#7484a8';
      const snowy = y < snowLine - 3 || (y < snowLine + 3 && dither(x, y, (snowLine + 3 - y) / 6));
      if (snowy) c = lit ? (streak > 0.7 ? '#dde7f3' : '#f6f9fd') : streak > 0.7 ? '#b2c0d8' : '#c8d4e8';
      if (y === top) c = snowy ? (lit ? '#ffffff' : '#dce4f0') : lit ? '#c4d2e6' : '#9aa8c8';
      const hz = Math.max(0, Math.min(1, (y - 58) / 64));
      const v = hz * 3;
      const k = Math.floor(v) + (dither(x, y, v - Math.floor(v)) ? 1 : 0);
      p.px(x, y, mix(c, hazeA, (k / 3) * 0.75));
    }
  }
  // nähere, bewaldete Bergkette
  const rB = ridgeFn([[30, 76, 0.5], [100, 68, 0.48], [156, 80, 0.55], [222, 70, 0.5]], 11, 2.5);
  for (let x = 0; x < PW; x++) {
    const top = Math.round(rB(x));
    const lit = rB(x + 2) - rB(x - 2) < -0.2;
    for (let y = top; y < 126; y++) {
      let c = lit ? '#7c98a6' : '#62798e';
      if (season === 'winter') c = lit ? '#c2d0de' : '#a4b4c8';
      if (hash(x, y, 13) > 0.82 && y > top + 1) c = season === 'winter' ? '#8494a8' : '#546a7c'; // Baumspitzen
      if (y === top) c = lit ? '#94aebc' : '#7088a0';
      const hz = Math.max(0, Math.min(1, (y - top) / 40));
      p.px(x, y, mix(c, '#b2c6d2', (Math.floor(hz * 3) / 3) * 0.55));
    }
  }
  // Waldsaum in zwei Tiefen: viele kleine Tannen-Silhouetten
  const band = (base: number, minH: number, maxH: number, col: string, lit: string, seed: number) => {
    for (let x = -4; x < PW + 4; ) {
      const h = minH + Math.floor(hash(x, 0, seed) * (maxH - minH));
      for (let r = 0; r <= h; r++) {
        const half = Math.floor(r * 0.42 + (r % 4 === 3 ? 1 : 0));
        for (let dx = -half; dx <= half; dx++) p.px(x + dx, base - h + r, dx < 0 && r % 4 !== 3 ? lit : col);
      }
      x += 3 + Math.floor(hash(x, 1, seed) * 4);
    }
    p.rect(0, base, PW, GY - base, col);
  };
  const wf = season === 'winter';
  band(118, 8, 16, wf ? '#8ea4ae' : '#5c8272', wf ? '#a8bcc4' : '#6c9282', 21);
  band(124, 9, 19, wf ? '#7a929a' : '#4b6f5e', wf ? '#94aab2' : '#5a7f6c', 22);
  // Hügel mit kleinen Tannen
  const hillCols: Record<Season, [string, string, string]> = {
    spring: ['#a6d07e', '#8cbe64', '#c0e098'],
    summer: ['#98c26e', '#7eae58', '#b4d68c'],
    autumn: ['#bcae66', '#a0924e', '#d2c682'],
    winter: ['#e6edf4', '#cfdbe8', '#f8fbfe'],
  };
  const hill = (topF: (x: number) => number, cols: [string, string, string], seed: number) => {
    for (let x = 0; x < PW; x++) {
      const top = Math.round(topF(x));
      for (let y = top; y < GY + 2; y++) {
        let c = cols[0];
        if (fbm(x / 18, y / 7, seed) > 0.58 && dither(x, y, 0.55)) c = cols[1];
        if (y === top) c = cols[2];
        p.px(x, y, c);
      }
    }
  };
  const hc = hillCols[season];
  const h1 = (x: number) => 110 + 5 * Math.sin(x / 34 + 1) + 3 * Math.sin(x / 13);
  hill(h1, [mix(hc[0], '#9ab4c0', 0.25), mix(hc[1], '#9ab4c0', 0.25), hc[2]], 31);
  for (const [x, h] of [[78, 18], [90, 14], [150, 20], [162, 15], [230, 17]] as [number, number][]) pine(p, x, h1(x) + 3, h, PINE_FAR, x);
  hill((x) => 120 + 4 * Math.sin(x / 22 + 2) + 2 * Math.sin(x / 9), hc, 33);
  for (const [x, h] of [[116, 34], [134, 26]] as [number, number][]) pine(p, x, 125, h, PINE_FAR, x + 7);
}

const BUSH: Record<Season, Pal5> = {
  spring: ['#1c3818', '#2e5a26', '#427a34', '#5c9a44', '#7cbc5a'],
  summer: ['#1a3416', '#2a5222', '#3c6e30', '#56903e', '#78b252'],
  autumn: ['#3a1a0e', '#7a3216', '#b45420', '#dc8a34', '#f2b856'],
  winter: ['#1c2e20', '#2a4030', '#36523c', '#46644a', '#5a7a5c'],
};

function berryBush(p: Painter, cx: number, cy: number, rx: number, ry: number, berry: string, season: Season, seed: number) {
  foliage(
    p,
    [
      [cx, cy, rx, ry],
      [cx - rx * 0.5, cy - ry * 0.55, rx * 0.55, ry * 0.62],
      [cx + rx * 0.3, cy - ry * 0.8, rx * 0.55, ry * 0.58],
      [cx + rx * 0.78, cy - ry * 0.1, rx * 0.45, ry * 0.58],
      [cx - rx * 0.88, cy + ry * 0.08, rx * 0.4, ry * 0.58],
    ],
    BUSH[season],
    seed,
    164,
    season === 'spring' ? '#f8c8dc' : undefined,
  );
  if (season === 'spring' || season === 'winter') return;
  for (let i = 0; i < 9; i++) {
    const bx = Math.round(cx + (hash(i, 1, seed) - 0.5) * rx * 1.5);
    const by = Math.round(cy + (hash(i, 2, seed) - 0.6) * ry * 1.3);
    if (!p.filled(bx, by)) continue;
    p.map(['.b.', 'bbb', '.bd'], { b: berry, d: mix(berry, '#000000', 0.35) }, bx - 1, by - 1);
    p.px(bx, by - 1, '#ffffff');
  }
}

function forestNear(p: Painter, season: Season) {
  meadow(p, season, GY, 3);
  // ausgetretene Erde vor dem Bau
  for (let y = 156; y < 172; y++)
    for (let x = 150; x < 246; x++) {
      const d = ((x - 198) / 46) ** 2 + ((y - 165) / 7) ** 2;
      if (d > 1) continue;
      if (d > 0.7 && !dither(x, y, (1 - d) / 0.3)) continue;
      p.px(x, y, season === 'winter' ? '#d0d8e0' : hash(x, y, 4) > 0.85 ? '#7a5a38' : '#98764c');
    }
  flowers(p, season, 26, GY + 3, 158, 7);
  pine(p, 16, 146, 128, PINE_NEAR, 1);
  pine(p, 50, 142, 100, PINE_NEAR, 2);
  berryBush(p, 28, 144, 28, 22, '#6a2a8a', season, 41);
  pebble(p, 232, 154, 7);
  pebble(p, 241, 156, 4);
  if (season === 'autumn') fallenLeaves(p, season, 18, 29);
}

// ---------------------------------------------------------------- Garten & Hof

const TREE: Record<Season, Pal5> = {
  spring: ['#2a4a20', '#3c6a2c', '#58903e', '#7ab456', '#a2d47a'],
  summer: ['#1e3c18', '#2c5624', '#3e7432', '#5a9844', '#80bc5c'],
  autumn: ['#5a2412', '#94401a', '#c8682a', '#e89a3c', '#f8c862'],
  winter: ['#2e3a2a', '#3a4a36', '#4a5c44', '#5a6e52', '#6e8264'],
};
const HEDGE: Record<Season, Pal5> = {
  spring: ['#1a3a18', '#2a5626', '#3c7434', '#549244', '#74b25a'],
  summer: ['#16321a', '#244e22', '#346a2e', '#4a883c', '#68a650'],
  autumn: ['#24321a', '#3e5222', '#5a6e2c', '#7a8a3a', '#a2a84c'],
  winter: ['#162a1c', '#203826', '#2a4630', '#36563a', '#466648'],
};

/** Ast (für kahle Winterbäume): Linie mit Abzweigungen */
function branch(p: Painter, x: number, y: number, ang: number, len: number, w: number, depth: number, seed: number) {
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  for (let k = 0; k < w; k++) p.line(x + k, y, x2 + k, y2, k === 0 ? '#6a5040' : '#4a3628');
  if (depth <= 0) return;
  for (const s of [-1, 1]) branch(p, x2, y2, ang + s * (0.35 + hash(depth, s, seed) * 0.4), len * 0.68, Math.max(1, w - 1), depth - 1, seed + s * 7 + depth);
}

function gardenTree(p: Painter, cx: number, cy: number, r: number, season: Season, seed: number) {
  for (let y = Math.round(cy); y < GY; y++)
    for (let x = cx - 3; x <= cx + 3; x++) p.px(x, y, x === cx - 3 ? '#7a5a3a' : x >= cx + 2 ? '#3e2a1a' : hash(x, y, seed) > 0.8 ? '#4a3220' : '#5a4028');
  if (season === 'winter') {
    for (const [a, l] of [[-1.9, r * 0.75], [-1.2, r * 0.7], [-2.5, r * 0.6], [-1.55, r * 0.9]] as [number, number][]) branch(p, cx, cy + 4, a, l, 3, 3, seed + Math.round(l));
    return;
  }
  foliage(
    p,
    [
      [cx, cy, r, r * 0.82],
      [cx - r * 0.62, cy + r * 0.32, r * 0.58, r * 0.48],
      [cx + r * 0.64, cy + r * 0.28, r * 0.55, r * 0.46],
      [cx - r * 0.2, cy - r * 0.55, r * 0.55, r * 0.45],
    ],
    TREE[season],
    seed,
    PH,
    season === 'spring' ? '#fbe0ec' : undefined,
  );
}

function hedge(p: Painter, season: Season, top: number) {
  const pal = HEDGE[season];
  p.rect(0, top + 8, PW, GY - top - 8, pal[0]);
  const blobs: [number, number, number, number][] = [];
  for (let i = 0, x = -6; x < PW + 10; i++) {
    const r = 15 + hash(i, 0, 51) * 7;
    blobs.push([x + r * 0.8, top + 2 + hash(i, 1, 51) * 8, r, r * 0.86]);
    x += r * 1.35;
  }
  for (const [i, b] of blobs.entries()) foliage(p, [b, [b[0], b[1] + 16, b[2] * 1.05, b[3]]], pal, 60 + i, GY, season === 'spring' ? '#ffffff' : undefined);
}

/** Lattenzaun mit Spitzen, zwei Querriegeln und Nägeln */
function picketFence(p: Painter) {
  const top = 80;
  for (let x0 = 4; x0 < PW; x0 += 24) {
    const w = 16;
    for (let y = top; y < GY; y++) {
      const r = y - top;
      const half = r < 8 ? r + 1 : w / 2;
      for (let x = x0 + w / 2 - half; x < x0 + w / 2 + half; x++) {
        const i = x - x0;
        let c = '#c9a26a';
        if (vnoise(x / 1.3, y / 10, 3) > 0.68) c = '#b48c56'; // Maserung
        if (i < 2) c = '#e2be86';
        if (i >= w - 2) c = '#9a7444';
        if (r < 8 && (x === x0 + w / 2 - half || x === x0 + w / 2 + half - 1)) c = '#5a3e20';
        else if (i === 0 || i === w - 1) c = '#5a3e20';
        p.px(x, y, c);
      }
      if (hash(x0, 0, 9) > 0.5 && y === top + 34) p.map(['.k.', 'kkk', '.k.'], { k: '#8a6236' }, x0 + 6, y); // Astloch
    }
    p.rect(x0 + w, top + 4, 3, GY - top - 4, 'rgba(0,0,0,0.12)'); // Schatten auf der Hecke
  }
  for (const ry of [96, 116]) {
    p.rect(0, ry, PW, 7, '#b08850');
    p.rect(0, ry, PW, 1, '#5a3e20');
    p.rect(0, ry + 1, PW, 1, '#d6ae70');
    p.rect(0, ry + 6, PW, 1, '#6a4a28');
    for (let x = 0; x < PW; x++) if (vnoise(x / 9, ry, 5) > 0.7) p.px(x, ry + 3, '#9a7444');
    p.rect(0, ry + 7, PW, 2, 'rgba(0,0,0,0.2)');
    for (let x0 = 4; x0 < PW; x0 += 24) {
      p.px(x0 + 5, ry + 3, '#3a2a1a');
      p.px(x0 + 10, ry + 3, '#3a2a1a');
      p.px(x0 + 5, ry + 2, '#e8d0a0');
    }
  }
}

function gardenFar(p: Painter, season: Season) {
  gardenTree(p, 36, 42, 30, season, 71);
  gardenTree(p, 132, 34, 36, season, 72);
  gardenTree(p, 222, 46, 28, season, 73);
  hedge(p, season, 74);
  picketFence(p);
}

/** Tulpe: Stiel mit Blättern, Kelch-Blüte (Mittelpunkt x, Boden y) */
function tulip(p: Painter, x: number, y: number, color: string, light: string, season: Season) {
  if (season === 'winter' || season === 'autumn') return;
  p.rect(x, y - 12, 1, 12, '#3f7a30');
  p.map(['l....', 'll...', '.ll..', '..l..'], { l: '#4f9a3a' }, x - 3, y - 7);
  p.map(['....l', '...ll', '..ll.', '..l..'], { l: '#5aa840' }, x - 1, y - 5);
  p.map(['c.c.c', 'clccc', 'clccc', 'ccccd', '.cdd.'], { c: color, l: light, d: mix(color, '#000000', 0.25) }, x - 2, y - 17);
}

function gardenNear(p: Painter, season: Season) {
  meadow(p, season, GY, 5);
  // Mähstreifen
  if (season !== 'winter')
    for (let y = GY; y < PH; y++)
      for (let x = 0; x < PW; x++) if (Math.floor((x * 0.6 + (y - GY) * 1.4) / 22) % 2 === 0 && dither(x, y, 0.25)) p.px(x, y, 'rgba(255,255,255,0.10)');
  flowers(p, season, 18, GY + 4, 156, 9);
  tulip(p, 66, GY + 1, '#f2c63b', '#fff0a0', season);
  tulip(p, 122, GY + 1, '#e86fa0', '#ffc0d8', season);
  tulip(p, 138, GY + 2, '#f4f4f4', '#ffffff', season);
  tulip(p, 246, GY + 1, '#e2384d', '#ff9aa6', season);
  berryBush(p, 26, 142, 26, 23, '#d0304a', season, 43);
  pebble(p, 100, 150, 6);
  fallenLeaves(p, season, season === 'autumn' ? 70 : season === 'winter' ? 0 : 22, 27);
}

const LEAF_SMALL = [['.lg', 'gd.'], ['lg.', '.gd'], ['.l.', 'gdg']];
/** Laub auf der Wiese: hinten klein, vorne groß */
function fallenLeaves(p: Painter, season: Season, n: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const y = GY + 3 + Math.floor(hash(i, 2, seed) ** 0.8 * (PH - GY - 6));
    const x = Math.floor(hash(i, 1, seed) * PW);
    const k = Math.floor(hash(i, 3, seed) * 12);
    if (y < 150) p.map(LEAF_SMALL[k % 3], AUTUMN_LEAF[k % AUTUMN_LEAF.length], x, y);
    else leafPx(p, x, y, k, hash(i, 4, seed) > 0.5);
  }
  void season;
}

/** ferne Felder mit Hecken, Bäumen und einer kleinen Scheune, davor ein Koppelzaun */
function farmFar(p: Painter, season: Season) {
  const fields: Record<Season, string[]> = {
    spring: ['#9ad070', '#b8dc84', '#7cb858', '#c8e4a0'],
    summer: ['#d6c25a', '#8ab858', '#e4d27a', '#a8c868'],
    autumn: ['#b48a52', '#c8a464', '#9a7448', '#d0b070'],
    winter: ['#eef3f8', '#e2eaf2', '#f6f9fc', '#dae4ee'],
  };
  const fc = fields[season];
  const top = (x: number) => 76 + 6 * Math.sin(x / 40 + 0.5) + 3 * Math.sin(x / 17);
  for (let x = 0; x < PW; x++) {
    const t0 = Math.round(top(x));
    for (let y = t0; y < GY; y++) {
      // Feld-Flickenteppich: schräge Grenzen (Perspektive), nach unten breitere Reihen
      const row = y < 88 ? 0 : y < 100 ? 1 : 2;
      const skew = x + (y - 76) * (row - 1) * 1.6;
      const band = Math.floor((skew + row * 23) / 52);
      const fi = (((band * 2 + row * 3) % fc.length) + fc.length) % fc.length;
      let c = mix(fc[fi], '#a8c0d0', Math.max(0, 0.22 - (y - 76) / 120));
      if ((y - t0) % (row + 2) === 0 && season !== 'winter') c = mix(c, '#3a2a10', 0.12); // Furchen / Saatreihen
      const edgeX = (((skew + row * 23) % 52) + 52) % 52;
      const hedgeRow = y === 88 || y === 100;
      if ((edgeX < 1.2 || hedgeRow) && hash(x, y, 7) > 0.2) c = season === 'winter' ? '#b4c4d0' : hash(x, y, 8) > 0.5 ? '#4e7a3a' : '#3c6430'; // Hecken zwischen den Feldern
      if (y === t0) c = mix(c, '#ffffff', 0.25);
      p.px(x, y, c);
    }
  }
  // kleine Scheune und Bäumchen in der Ferne
  const bx = 104;
  const by = 72;
  for (let r = 0; r < 6; r++) p.rect(bx - r, by + r, 18 + r * 2, 1, r === 0 ? '#5a2a20' : '#6a3428');
  p.rect(bx - 5, by + 6, 28, 10, '#a83a2a');
  p.rect(bx - 5, by + 6, 28, 1, '#c85a42');
  p.rect(bx + 6, by + 9, 6, 7, '#5a1e16');
  p.line(bx + 6, by + 9, bx + 11, by + 15, '#e8dcc8');
  p.line(bx + 11, by + 9, bx + 6, by + 15, '#e8dcc8');
  for (const [tx, ty, tr] of [[52, 76, 7], [62, 78, 5], [188, 74, 8], [200, 77, 5], [150, 90, 6]] as [number, number, number][]) {
    p.rect(tx, ty + tr - 2, 2, 6, '#4a3424');
    foliage(p, [[tx + 1, ty, tr, tr * 0.85]], season === 'winter' ? HEDGE.winter : TREE[season], tx, PH);
  }
  // Koppelzaun aus Pfosten und zwei leicht durchhängenden Querbalken
  const wood = (x: number, y: number) => (hash(x, y, 2) > 0.8 ? '#7a6448' : '#9a8262');
  for (const ry of [106, 120]) {
    for (let x = 0; x < PW; x++) {
      const sag = Math.round(Math.sin((((x - 10) % 40) / 40) * Math.PI) * 1.5);
      for (let k = 0; k < 4; k++) p.px(x, ry + sag + k, k === 0 ? '#5a4632' : k === 1 ? '#c0a884' : k === 3 ? '#5a4632' : wood(x, ry + k));
      p.px(x, ry + sag + 4, 'rgba(0,0,0,0.18)');
    }
  }
  for (let x0 = 10; x0 < PW; x0 += 40) {
    for (let y = 100; y < GY + 2; y++)
      for (let x = x0; x < x0 + 6; x++) p.px(x, y, x === x0 ? '#c4ac8a' : x === x0 + 5 ? '#4a3a28' : y === 100 ? '#d4bc98' : wood(x, y));
    p.rect(x0 + 6, 104, 2, GY - 104, 'rgba(0,0,0,0.12)');
  }
}

/** Hühnerhof: Boden aus Erde, komplett mit Stroh ausgelegt */
function farmNear(p: Painter, season: Season) {
  const g = gradient(season === 'winter' ? ['#eef2f6', '#d8e0e8'] : ['#dcb862', '#b48e3a'], 8);
  for (let y = GY; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      let c = g(x, y, (y - GY) / (PH - GY));
      if (fbm(x / 14, y / 6, 8) > 0.62 && dither(x, y, 0.6)) c = season === 'winter' ? '#cdd6e0' : '#a8844a'; // Erde schaut durch
      p.px(x, y, c);
    }
  p.rect(0, GY, PW, 2, 'rgba(60,40,10,0.25)'); // Schatten am Zaun
  const straw = season === 'winter' ? ['#e8d498', '#d4b870'] : ['#f6e094', '#ecc86a', '#cca444', '#a88030', '#f2d270'];
  const count = season === 'winter' ? 120 : 700;
  for (let i = 0; i < count; i++) {
    const x = hash(i, 1, 13) * PW;
    const y = GY + 2 + hash(i, 2, 13) * (PH - GY - 2);
    const len = 3 + hash(i, 3, 13) * (4 + (y - GY) / 12);
    const a = (hash(i, 4, 13) - 0.5) * 1.3;
    p.line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.6, straw[i % straw.length]);
  }
  pebble(p, 104, 152, 5);
  pebble(p, 6, 158, 6);
}

// ---------------------------------------------------------------- Schlafplätze

const NEST_CX = 49;
// Hühnerstall: hohe Tür mit Sitzstange
const COOP_DOOR_HALF = 6;
const COOP_DOOR_TOP = 25;
export const COOP_PERCH_Y = 36.5;
const NEST_BASE = 41;

// Höhle im Baumstamm: Torbogen mit rundem Dach (Spiel-Einheiten)
const HOLE_HALF = 5;
const HOLE_TOP = 30;
const inHole = (x: number, y: number, grow = 0) => {
  const r = HOLE_HALF + grow;
  const archY = HOLE_TOP - grow + r;
  if (y > NEST_BASE) return false;
  if (y >= archY) return Math.abs(x - NEST_CX) <= r;
  return (x - NEST_CX) ** 2 + (y - archY) ** 2 <= r * r;
};
const inDoor = (x: number, y: number, grow = 0) => {
  const r = COOP_DOOR_HALF + grow;
  const archY = COOP_DOOR_TOP - grow + r;
  if (y > NEST_BASE) return false;
  if (y >= archY) return Math.abs(x - NEST_CX) <= r;
  return (x - NEST_CX) ** 2 + (y - archY) ** 2 <= r * r;
};
const U = (v: number) => (v + 0.5) / RES; // Bildpixel -> Spiel-Einheiten (Pixelmitte)

const CX = NEST_CX * RES;
const BASE = NEST_BASE * RES;
const trunkHalf = (y: number) => (y < 146 ? 28 : 28 + Math.round((y - 146) * 1.6));

function denTree(p: Painter, season: Season) {
  for (let y = 0; y <= BASE; y++) {
    const hw = trunkHalf(y);
    const left = CX - hw;
    for (let x = left; x <= CX + hw; x++) {
      const rel = (x - left) / (hw * 2);
      const plate = ((x - left) / 8 + 0.3 * Math.sin(y / 13 + (x - left) / 9) + 10) % 1;
      let c = rel < 0.14 ? '#a27448' : rel < 0.45 ? '#8a5e38' : rel < 0.8 ? '#72502e' : '#5a3c22';
      if (plate < 0.14) c = '#3a2412';
      else if (plate < 0.24) c = rel < 0.5 ? '#5e3e22' : '#4a3018';
      else if (plate > 0.9 && rel < 0.6) c = '#b08250';
      if (y % 11 === 0 && hash(Math.floor((x - left) / 8), Math.floor(y / 11), 3) > 0.75 && plate > 0.24) c = '#3a2412'; // Querrisse
      if (hash(x, y, 4) > 0.93) c = mix(c, '#000000', 0.15);
      if (season !== 'winter' && y > 134 && rel < 0.42 && fbm(x / 4, y / 4, 6) > 0.56) c = hash(x, y, 5) > 0.5 ? '#5f8a3a' : '#7aa84a'; // Moos
      if (x === left || x === CX + hw) c = '#24160a';
      p.px(x, y, c);
    }
  }
  // Aststummel links mit Schnittfläche
  for (let y = 46; y < 60; y++)
    for (let x = CX - 50; x < CX - 27; x++) {
      const v = (y - 46) / 14;
      let c = v < 0.2 ? '#a07448' : v < 0.6 ? '#7a5230' : '#5a3a20';
      if (y === 46 || y === 59) c = '#24160a';
      p.px(x, y, c);
    }
  for (let y = 46; y < 60; y++)
    for (let x = CX - 54; x < CX - 47; x++) {
      const d = ((x - (CX - 50.5)) / 3.5) ** 2 + ((y - 52.5) / 7) ** 2;
      if (d > 1) continue;
      p.px(x, y, d > 0.75 ? '#24160a' : d > 0.45 ? '#c89a68' : d > 0.2 ? '#b0845a' : '#c89a68');
    }
  // Astknoten
  for (const [kx, ky] of [[CX + 12, 22], [CX - 12, 88]] as [number, number][])
    for (let y = ky - 6; y <= ky + 6; y++)
      for (let x = kx - 5; x <= kx + 5; x++) {
        const d = ((x - kx) / 5) ** 2 + ((y - ky) / 6) ** 2;
        if (d > 1) continue;
        p.px(x, y, d > 0.7 ? '#3a2412' : d > 0.35 ? '#6a4428' : d > 0.12 ? '#4a2e18' : '#24160a');
      }
  // Eingang: dunkler Rand mit heller Lippe oben, Inneres mit Tiefe, Laubpolster
  const inner = gradient(['#160c06', '#2a180c', '#46301a'], 6);
  for (let y = 112; y <= BASE; y++)
    for (let x = CX - 26; x <= CX + 26; x++) {
      const u = U(x);
      const v = U(y);
      if (!inHole(u, v, 0.9)) continue;
      let c: string;
      if (inHole(u, v)) {
        c = inner(x, y, (y - 120) / 44);
        if (Math.abs(x - CX) > 15 && dither(x, y, 0.5)) c = '#1a0e06';
      } else if (inHole(u, v, 0.45)) c = '#1e1008';
      else c = v < HOLE_TOP + 3 && u < NEST_CX ? '#b08250' : '#3a2412';
      p.px(x, y, c);
    }
  for (let i = 0; i < 7; i++) leafPx(p, CX - 16 + i * 5, BASE - 4 + (i % 2), i, i % 3 === 0);
}

function denFront(p: Painter) {
  // Wurzeln links und rechts vom Eingang, die über den Boden kriechen
  for (let y = BASE - 3; y <= BASE + 3; y++) {
    const hw = trunkHalf(y) + (y > BASE ? (y - BASE) * 3 : 0);
    for (let x = CX - hw; x <= CX + hw; x++) {
      if (Math.abs(x - CX) <= 18) continue;
      const top = y === BASE - 3 || x === CX - hw || x === CX + hw;
      p.px(x, y, top ? '#24160a' : y < BASE ? '#7a5230' : hash(x, y, 2) > 0.5 ? '#5a3c22' : '#6a4628');
    }
  }
  for (const [x0, dir] of [[CX - 30, -1], [CX + 30, 1]] as [number, number][]) {
    p.line(x0, BASE + 1, x0 + dir * 16, BASE + 6, '#5a3c22');
    p.line(x0, BASE + 2, x0 + dir * 15, BASE + 7, '#3a2412');
    p.line(x0, BASE, x0 + dir * 16, BASE + 5, '#7a5230');
  }
}

function leafPile(p: Painter) {
  const cy = BASE;
  for (let y = cy - 46; y <= cy; y++)
    for (let x = CX - 58; x <= CX + 58; x++) {
      const d = ((x - CX) / 56) ** 2 + ((y - cy) / 44) ** 2;
      if (d > 1) continue;
      const hollow = ((x - CX) / 38) ** 2 + ((y - cy) / 32) ** 2;
      p.px(x, y, hollow < 1 ? (hollow < 0.6 ? '#3a2412' : '#4a2e18') : '#6a4024');
    }
  for (let i = 0; i < 420; i++) {
    const a = hash(i, 1, 21) * Math.PI;
    const rr = 0.55 + hash(i, 2, 21) * 0.5;
    const x = CX + Math.cos(a) * 56 * rr - 3;
    const y = cy - Math.sin(a) * 44 * rr - 2;
    const hollow = ((x + 3 - CX) / 36) ** 2 + ((y - cy) / 30) ** 2;
    if (hollow < 1 && y > cy - 26) continue;
    leafPx(p, x, y, Math.floor(hash(i, 3, 21) * 12), hash(i, 4, 21) > 0.5);
  }
}

function leafPileFront(p: Painter) {
  for (let i = 0; i < 40; i++) {
    const x = CX - 54 + (i / 40) * 106 + hash(i, 1, 23) * 4;
    const y = BASE - 5 + hash(i, 2, 23) * 6;
    leafPx(p, x, y, i + 1, i % 2 === 0);
  }
}

function coop(p: Painter) {
  const x0 = CX - 40;
  const x1 = CX + 40;
  const top = 96;
  // Wände aus senkrechten Brettern
  for (let x = x0; x < x1; x++) {
    const plank = Math.floor((x - x0) / 12);
    const i = (x - x0) % 12;
    for (let y = top; y <= BASE; y++) {
      let c = plank % 2 ? '#b07a44' : '#bc8650';
      if (vnoise(x / 1.4, y / 8, plank) > 0.7) c = '#9a6a3a';
      if (i === 1) c = '#d09c62';
      if (i === 0) c = '#5a3a1e';
      if (i === 11) c = '#8a5a30';
      if ((y === top + 5 || y === BASE - 6) && i === 6) c = '#3a2a1a'; // Nägel
      p.px(x, y, c);
    }
  }
  for (const px0 of [x0 - 5, x1]) {
    p.rect(px0, top - 2, 5, BASE - top + 3, '#6a4424');
    p.rect(px0, top - 2, 1, BASE - top + 3, '#8e6238');
    p.rect(px0 + 4, top - 2, 1, BASE - top + 3, '#3a2412');
  }
  // Dach: Ziegelreihen mit Lichtkante, Schatten und Firstkappe
  const apex = 58;
  const eave = 101;
  for (let y = apex; y < eave; y++) {
    const half = 4 + ((y - apex) / (eave - apex)) * 50;
    const row = Math.floor((y - apex) / 6);
    const ry = (y - apex) % 6;
    for (let x = Math.floor(CX - half); x <= CX + half; x++) {
      const sx = x - CX + 60 + (row % 2) * 6;
      const tile = Math.floor(sx / 12);
      const tx = sx % 12;
      let c = hash(tile, row, 3) > 0.7 ? '#b03e28' : hash(tile, row, 4) > 0.8 ? '#cc5236' : '#c0462e';
      if (ry === 0) c = '#e0745a';
      if (ry === 5) c = '#6a1e14';
      if (tx === 0) c = '#7a2418';
      if (x <= CX - half + 1 || x >= CX + half - 1) c = '#4a140e';
      p.px(x, y, c);
    }
  }
  p.rect(CX - 55, eave, 110, 3, '#e4d8bc');
  p.rect(CX - 55, eave + 3, 110, 1, '#8a7a5c');
  p.rect(CX - 55, eave + 4, 110, 3, 'rgba(0,0,0,0.25)');
  p.rect(CX - 5, apex - 2, 10, 4, '#5a1a12');
  // hohe Tür (Bogen) mit heller Einfassung, dunklem Inneren und Stroh am Boden
  const inner = gradient(['#1e1208', '#3a2414'], 5);
  for (let y = 92; y <= BASE; y++)
    for (let x = CX - 30; x <= CX + 30; x++) {
      const u = U(x);
      const v = U(y);
      if (!inDoor(u, v, 0.9)) continue;
      let c: string;
      if (inDoor(u, v)) {
        c = inner(x, y, (y - 100) / 50);
        if (v > NEST_BASE - 2.5) c = hash(x, y, 7) > 0.5 ? '#e8c860' : hash(x, y, 8) > 0.5 ? '#c8a040' : '#a88030';
      } else c = inDoor(u, v, 0.4) ? '#e8dcc0' : '#8a7a5c';
      p.px(x, y, c);
    }
  // Sitzstange auf zwei Stützen
  const perch = COOP_PERCH_Y * RES;
  for (const sx of [CX - 21, CX + 17]) {
    p.rect(sx, perch + 4, 4, BASE - perch - 4, '#5a3a1a');
    p.rect(sx, perch + 4, 1, BASE - perch - 4, '#7a5430');
  }
  p.rect(CX - 24, perch - 2, 48, 6, '#3a2414');
  p.rect(CX - 23, perch - 1, 46, 1, '#b08050');
  p.rect(CX - 23, perch, 46, 2, '#8a5a30');
  // kleines Fenster mit warmem Licht
  p.rect(CX + 26, top + 6, 12, 12, '#e8dcc0');
  p.rect(CX + 27, top + 7, 10, 10, '#f4d878');
  p.rect(CX + 27, top + 7, 4, 4, '#fbeaa8');
  p.rect(CX + 31, top + 7, 2, 10, '#5a3a1e');
  p.rect(CX + 27, top + 11, 10, 2, '#5a3a1e');
}

function coopFront(p: Painter) {
  p.rect(CX - 28, BASE - 1, 57, 2, '#4a2e18');
  p.rect(CX - 28, BASE + 1, 57, 2, '#8a5a2e');
  p.rect(CX - 28, BASE + 1, 57, 1, '#a87444');
}

// ---------------------------------------------------------------- Ebenen (Schnittstelle zur Szene)

/** Fern-Ebene draußen (liegt über Himmel, Wolken und Vögeln) */
export function drawOutdoorFar(ctx: CanvasRenderingContext2D, kind: SceneKind, season: Season) {
  const p = new Painter(ctx);
  if (kind === 'forest') forestFar(p, season);
  else if (kind === 'farm') farmFar(p, season);
  else gardenFar(p, season);
  p.commit(ctx);
}

/** Nah-Ebene draußen (liegt über Reh & Co. im Hintergrund) */
export function drawOutdoorNear(ctx: CanvasRenderingContext2D, kind: SceneKind, season: Season) {
  const p = new Painter(ctx);
  if (kind === 'forest') forestNear(p, season);
  else if (kind === 'farm') farmNear(p, season);
  else gardenNear(p, season);
  p.commit(ctx);
}

export function drawNestBack(ctx: CanvasRenderingContext2D, kind: SceneKind, season: Season = 'summer') {
  const p = new Painter(ctx);
  if (kind === 'farm') coop(p);
  else if (kind === 'forest') denTree(p, season);
  else leafPile(p);
  p.commit(ctx);
}

const frontCache = new Map<SceneKind, HTMLCanvasElement>();
export function drawNestFront(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  let cv = frontCache.get(kind);
  if (!cv) {
    const p = new Painter();
    if (kind === 'farm') coopFront(p);
    else if (kind === 'forest') denFront(p);
    else leafPileFront(p);
    cv = p.toCanvas();
    frontCache.set(kind, cv);
  }
  ctx.drawImage(cv, 0, 0, W, 48);
}

/** Clip auf die Öffnung der Baumhöhle: was darin liegt, ist nur durch das Loch zu sehen */
export function clipToDen(ctx: CanvasRenderingContext2D) {
  const P = 1 / RES;
  ctx.beginPath();
  for (let y = HOLE_TOP; y <= NEST_BASE; y += P)
    for (let x = NEST_CX - HOLE_HALF; x <= NEST_CX + HOLE_HALF; x += P) if (inHole(x + P / 2, y + P / 2)) ctx.rect(x, y, P, P);
  ctx.clip();
}
export const DEN = { cx: NEST_CX, half: HOLE_HALF, top: HOLE_TOP, base: NEST_BASE };

/** Futterstelle: Napf drinnen, flacher Stein im Wald, Tonschale im Garten */
export const PLATE_COLORS: Record<SceneKind, ColorMap> = {
  room: { o: '#2e4a7a', h: '#8fb3e6', b: '#5b86c9' },
  forest: { o: '#4a4a46', h: '#a8a8a0', b: '#7e7e76' },
  garden: { o: '#7a3a1e', h: '#e8946a', b: '#c0623a' },
  farm: { o: '#4a5058', h: '#c8d0d8', b: '#8a949e' }, // Futtertrog aus Blech
};
