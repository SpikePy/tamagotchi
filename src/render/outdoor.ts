// Außenszenen für Tiere, die nicht im Haus wohnen:
//  forest = Waldrand mit Fuchsbau, garden = Garten mit Hecke und Laubnest.
import { ICONS, drawMap, type ColorMap } from './pixels';

export type SceneKind = 'room' | 'forest' | 'garden';

const W = 64;
export const GROUND_Y = 33; // Horizont: ab hier beginnt der Boden
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

/** deterministisches "Rauschen" für Texturen */
const hash = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997;

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawSky(ctx: CanvasRenderingContext2D, sky: Sky) {
  const bands = !sky.day
    ? ['#11152f', '#181c40', '#22275a']
    : sky.edge < 0.08
      ? ['#e98f5c', '#f2a872', '#f8c79a']
      : sky.edge < 0.16
        ? ['#9fbcd8', '#b9d0e4', '#d4e2ee']
        : ['#74bcec', '#96d0f3', '#bde3f8'];
  const bh = Math.ceil(GROUND_Y / 3);
  bands.forEach((c, i) => px(ctx, c, 0, i * bh, W, bh));
  if (!sky.day) {
    const STARS = [[3, 3], [11, 7], [19, 2], [27, 9], [34, 4], [42, 11], [50, 3], [58, 8], [7, 14], [23, 16], [46, 17], [61, 15]];
    for (const [x, y] of STARS) px(ctx, '#e8e6c8', x, y);
  }
  const icon = ICONS[sky.day ? 'sun' : 'moon'];
  const x = -5 + Math.round(sky.f * (W + 5));
  const y = GROUND_Y - 8 - Math.round(Math.sin(Math.PI * sky.f) * (GROUND_Y - 12));
  drawMap(ctx, icon.map, icon.colors, x, y);
}

function drawPine(ctx: CanvasRenderingContext2D, cx: number, base: number, h: number, dark = '#2f5a2f', light = '#4c8a3f') {
  px(ctx, '#5a3a22', cx - 1, base - 3, 2, 3);
  const crown = h - 3;
  const step = Math.max(3, Math.ceil(crown / 3));
  for (let r = 0; r < crown; r++) {
    const y = base - 3 - crown + r;
    const half = Math.floor((r % step) * 0.9 + r / step) + 1;
    px(ctx, dark, cx - half, y, half * 2, 1);
    px(ctx, light, cx - half, y, Math.max(1, Math.floor(half / 2)), 1);
  }
}

function drawForest(ctx: CanvasRenderingContext2D) {
  // zwei Hügelketten
  for (let x = 0; x < W; x++) {
    const far = 24 + Math.round(Math.sin(x / 9) * 2 + Math.sin(x / 4.3));
    px(ctx, '#6f9a58', x, far, 1, GROUND_Y - far);
    const near = 28 + Math.round(Math.sin(x / 6 + 1) * 1.5);
    px(ctx, '#557f45', x, near, 1, GROUND_Y - near);
  }
  // Tannen: weit hinten klein, vorne links groß
  drawPine(ctx, 28, 30, 9, '#3f6a3a', '#5a8a4a');
  drawPine(ctx, 33, 31, 7, '#3f6a3a', '#5a8a4a');
  drawPine(ctx, 12, 35, 24);
  drawPine(ctx, 4, 36, 31);
  // Wiese
  px(ctx, '#86c25a', 0, GROUND_Y, W, 1);
  px(ctx, '#6fae4a', 0, GROUND_Y + 1, W, 48 - GROUND_Y);
  for (let y = GROUND_Y + 2; y < 48; y++)
    for (let x = 0; x < W; x++) if (hash(x, y) % 23 === 0) px(ctx, '#5e9a3e', x, y);
}

function drawGarden(ctx: CanvasRenderingContext2D) {
  // Hecke
  for (let x = 0; x < W; x++) {
    const top = 11 + Math.round(Math.sin(x / 3) * 1.2 + Math.sin(x / 7) * 1.5);
    for (let y = top; y < GROUND_Y; y++) {
      const n = hash(x, y);
      px(ctx, n % 5 === 0 ? '#4f8a3c' : n % 11 === 0 ? '#2d5524' : '#3d6b30', x, y);
    }
  }
  // Holzzaun vor der Hecke
  for (let x = 1; x < W; x += 6) {
    px(ctx, '#7a5a34', x, 21, 5, GROUND_Y - 20);
    px(ctx, '#c9a26a', x + 1, 22, 3, GROUND_Y - 21);
    px(ctx, '#c9a26a', x + 2, 21, 1, 1);
  }
  px(ctx, '#7a5a34', 0, 25, W, 2);
  px(ctx, '#b08850', 0, 25, W, 1);
  px(ctx, '#7a5a34', 0, 30, W, 2);
  px(ctx, '#b08850', 0, 30, W, 1);
  // Rasen
  px(ctx, '#8fbe5c', 0, GROUND_Y, W, 1);
  px(ctx, '#79a64a', 0, GROUND_Y + 1, W, 48 - GROUND_Y);
  for (let y = GROUND_Y + 2; y < 48; y++)
    for (let x = 0; x < W; x++) if (hash(x, y) % 19 === 0) px(ctx, '#6a9640', x, y);
  // Busch mit Beeren links
  for (let y = 22; y <= 40; y++)
    for (let x = 0; x <= 13; x++) {
      if (((x - 6) / 7.5) ** 2 + ((y - 32) / 9) ** 2 > 1) continue;
      const n = hash(x + 100, y);
      px(ctx, n % 4 === 0 ? '#5a9a44' : n % 9 === 0 ? '#2f5a26' : '#43783a', x, y);
    }
  for (const [x, y] of [[3, 27], [8, 29], [5, 33], [10, 35], [2, 36], [9, 25]]) px(ctx, '#d0304a', x, y);
  // Blumen
  for (const [x, c] of [[17, '#f2d64b'], [31, '#e86fa0'], [35, '#ffffff'], [62, '#e86fa0']] as [number, string][]) {
    px(ctx, '#3f7a30', x, GROUND_Y - 2, 1, 3);
    px(ctx, c, x - 1, GROUND_Y - 3, 3, 1);
    px(ctx, c, x, GROUND_Y - 4, 1, 3);
    px(ctx, '#f2a020', x, GROUND_Y - 3);
  }
}

/** Hintergrund draußen. Gibt zurück, ob gerade Tag ist. */
export function drawOutdoor(ctx: CanvasRenderingContext2D, kind: SceneKind, clock: number): boolean {
  const sky = skyState(clock);
  drawSky(ctx, sky);
  if (kind === 'forest') drawForest(ctx);
  else drawGarden(ctx);
  return sky.day;
}

// ---------- Schlafplatz draußen: Baumhöhle (Fuchs) bzw. Laubhaufen (Igel) ----------
// Die Höhlen sind innen hell genug und verdecken nur den unteren Rand,
// damit man das schlafende Tier gut erkennt.

const NEST_CX = 49;
const NEST_BASE = 41;

function inEllipse(x: number, y: number, rx: number, ry: number, cy = NEST_BASE) {
  return ((x - NEST_CX) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

/** halbe Stammbreite je Zeile, unten mit Wurzeln breiter */
const trunkHalf = (y: number) => 11 + (y > 35 ? y - 35 : 0);
const HOLE_RX = 10;
const HOLE_RY = 18;

export function drawNestBack(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  if (kind === 'forest') {
    // dicker Baumstamm
    for (let y = 6; y <= NEST_BASE; y++) {
      const hw = trunkHalf(y);
      for (let x = NEST_CX - hw; x <= NEST_CX + hw; x++) {
        const edge = x === NEST_CX - hw || x === NEST_CX + hw;
        const n = hash(x, y);
        let c = edge ? '#3e2814' : (x + (n % 3 === 0 ? 1 : 0)) % 4 === 0 ? '#5e3d22' : '#7a5230';
        if (inEllipse(x, y, HOLE_RX + 1, HOLE_RY + 1)) c = '#2e1c0e'; // Rand der Höhle
        if (inEllipse(x, y, HOLE_RX, HOLE_RY)) c = y < NEST_BASE - 12 ? '#4e3220' : '#5e3e26'; // Innen
        px(ctx, c, x, y);
      }
    }
    // Baumkrone
    const blobs: [number, number, number, number][] = [[49, 3, 17, 8], [37, 7, 9, 5], [61, 6, 9, 6], [49, 9, 12, 4]];
    for (const [bx, by, rx, ry] of blobs)
      for (let y = by - ry; y <= by + ry; y++)
        for (let x = bx - rx; x <= bx + rx; x++) {
          if (((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2 > 1) continue;
          const n = hash(x + 31, y);
          px(ctx, n % 4 === 0 ? '#5a9a44' : n % 7 === 0 ? '#2f5a26' : '#43783a', x, y);
        }
  } else {
    // Laubhaufen mit Mulde, innen etwas heller
    for (let y = NEST_BASE - 11; y <= NEST_BASE; y++)
      for (let x = NEST_CX - 14; x <= NEST_CX + 14; x++) {
        if (!inEllipse(x, y, 14, 11)) continue;
        const n = hash(x, y);
        let c = ['#a8542a', '#c97a2e', '#8a5a2b', '#d9a03a', '#b8432a'][n % 5];
        if (inEllipse(x, y, 10, 9)) c = n % 4 === 0 ? '#7a4a28' : '#6b4226';
        px(ctx, c, x, y);
      }
  }
}

export function drawNestFront(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  if (kind === 'forest') {
    // Wurzeln vor dem Höhleneingang (nur die untersten Zeilen)
    for (let y = NEST_BASE - 1; y <= NEST_BASE; y++) {
      const hw = trunkHalf(y);
      for (let x = NEST_CX - hw; x <= NEST_CX + hw; x++) {
        const edge = x === NEST_CX - hw || x === NEST_CX + hw || y === NEST_BASE - 1;
        px(ctx, edge ? '#3e2814' : hash(x, y) % 3 === 0 ? '#5e3d22' : '#7a5230', x, y);
      }
    }
  } else {
    // vorderer Laubrand, verdeckt nur die Pfoten
    for (let y = NEST_BASE - 2; y <= NEST_BASE; y++)
      for (let x = NEST_CX - 14; x <= NEST_CX + 14; x++) {
        if (!inEllipse(x, y, 14, 11)) continue;
        px(ctx, ['#e08a3a', '#c95a2a', '#e0b13a', '#b8743e', '#d9772b'][hash(x + 7, y) % 5], x, y);
      }
  }
}

/** Futterstelle: Napf drinnen, flacher Stein im Wald, Tonschale im Garten */
export const PLATE_COLORS: Record<SceneKind, ColorMap> = {
  room: { o: '#2e4a7a', h: '#8fb3e6', b: '#5b86c9' },
  forest: { o: '#4a4a46', h: '#a8a8a0', b: '#7e7e76' },
  garden: { o: '#7a3a1e', h: '#e8946a', b: '#c0623a' },
};
