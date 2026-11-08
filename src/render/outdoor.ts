// Außenszenen für Tiere, die nicht im Haus wohnen:
//  forest = Waldrand mit Fuchsbau, garden = Garten mit Hecke und Laubnest.
import { ICONS, drawMap, type ColorMap } from './pixels';
import { bands, cloud, glow } from './fx';

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

function drawSky(ctx: CanvasRenderingContext2D, sky: Sky, clock: number) {
  const [top, bottom] = !sky.day
    ? ['#0b0f2a', '#262c5c']
    : sky.edge < 0.08
      ? ['#d97a50', '#f8c79a']
      : sky.edge < 0.16
        ? ['#8fb0d0', '#e4ecf2']
        : ['#5fb0e8', '#cdeafa'];
  bands(ctx, 0, 0, W, GROUND_Y, top, bottom, 7);
  if (!sky.day) {
    const STARS = [[3, 3], [11, 7], [19, 2], [27, 9], [34, 4], [42, 11], [50, 3], [58, 8], [7, 14], [23, 16], [46, 17], [61, 15], [15, 11], [38, 7], [55, 13]];
    ctx.fillStyle = '#e8e6c8';
    for (const [x, y] of STARS) ctx.fillRect(x, y, 0.5, 0.5);
  } else {
    // Wolken ziehen langsam (eine Position pro Minute)
    const drift = (clock / 60000 / 4) % 90;
    cloud(ctx, ((10 + drift) % 90) - 13, 6, 1.2);
    cloud(ctx, ((55 + drift * 0.7) % 90) - 13, 12, 0.8);
  }
  const icon = ICONS[sky.day ? 'sun' : 'moon'];
  const x = -5 + sky.f * (W + 5);
  const y = GROUND_Y - 8 - Math.sin(Math.PI * sky.f) * (GROUND_Y - 12);
  glow(ctx, x + 2.5, y + 2.5, sky.day ? 7 : 5, sky.day ? '#fff3b0' : '#c8ccf0');
  drawMap(ctx, icon.map, icon.colors, x, y);
}

/** feine Grashalme auf der Wiese */
function grassBlades(ctx: CanvasRenderingContext2D, colors: string[]) {
  for (let y = GROUND_Y + 1; y < 48; y += 1.5)
    for (let x = 0; x < W; x += 1) {
      const n = hash(Math.round(x * 4), Math.round(y * 4));
      if (n % 3) continue;
      ctx.fillStyle = colors[n % colors.length];
      ctx.fillRect(x + (n % 2) * 0.5, y, 0.5, 0.5 + (n % 3) * 0.5);
    }
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
  // Wiese mit Verlauf und Grashalmen
  bands(ctx, 0, GROUND_Y, W, 48 - GROUND_Y, '#8cc65e', '#5e9a3e', 4);
  grassBlades(ctx, ['#4f8a34', '#9ad46a', '#6aa84a']);
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
    // Holzmaserung
    ctx.fillStyle = 'rgba(122,90,52,0.45)';
    ctx.fillRect(x + 2, 23, 0.5, GROUND_Y - 24);
    ctx.fillRect(x + 3, 26, 0.5, GROUND_Y - 28);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 1, 22, 0.5, GROUND_Y - 22);
  }
  px(ctx, '#7a5a34', 0, 25, W, 2);
  px(ctx, '#b08850', 0, 25, W, 1);
  px(ctx, '#7a5a34', 0, 30, W, 2);
  px(ctx, '#b08850', 0, 30, W, 1);
  // Rasen mit Verlauf und Grashalmen
  bands(ctx, 0, GROUND_Y, W, 48 - GROUND_Y, '#94c262', '#6a9640', 4);
  grassBlades(ctx, ['#5a8a38', '#a6d070', '#7aa84a']);
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
  drawSky(ctx, sky, clock);
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
const trunkHalf = (y: number) => (y < 37 ? 7 : 7 + Math.round((y - 36) * 1.5));
const TRUNK_TOP = 0; // Stamm reicht über den oberen Bildrand hinaus, Krone nicht sichtbar
// Höhle: Torbogen mit rundem Dach
const HOLE_HALF = 4;
const HOLE_TOP = 31;
const inHole = (x: number, y: number, grow = 0) => {
  const r = HOLE_HALF + grow;
  const archY = HOLE_TOP - grow + r; // Mittelpunkt des runden Dachs
  if (y > NEST_BASE) return false;
  if (y >= archY) return Math.abs(x - NEST_CX) <= r;
  return (x - NEST_CX) ** 2 + (y - archY) ** 2 <= r * r;
};

export function drawNestBack(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  if (kind === 'forest') {
    // Stamm mit Licht links, Schatten rechts und Rindenrillen
    for (let y = TRUNK_TOP; y <= NEST_BASE; y++) {
      const hw = trunkHalf(y);
      for (let x = NEST_CX - hw; x <= NEST_CX + hw; x++) {
        const rel = x - (NEST_CX - hw);
        let c = '#7a5230';
        if (rel <= 1) c = '#946640';
        else if (x >= NEST_CX + hw - 2) c = '#5e3d22';
        else if ((x - NEST_CX + 20) % 3 === 0 && hash(x, y) % 5 !== 0) c = '#64422a';
        if (x === NEST_CX - hw || x === NEST_CX + hw) c = '#3e2814';
        px(ctx, c, x, y);
      }
    }
    // Aststummel links
    px(ctx, '#3e2814', NEST_CX - 11, 12, 5, 3);
    px(ctx, '#7a5230', NEST_CX - 10, 13, 4, 1);
    // Astloch weiter oben
    px(ctx, '#3e2814', NEST_CX + 2, 6, 3, 2);
    // Höhle: dunkler Rand, warmes Inneres, Laubpolster am Boden
    for (let y = HOLE_TOP - 1; y <= NEST_BASE; y++)
      for (let x = NEST_CX - HOLE_HALF - 1; x <= NEST_CX + HOLE_HALF + 1; x++) {
        if (!inHole(x, y, 1)) continue;
        let c = '#2e1c0e';
        if (inHole(x, y)) c = y < HOLE_TOP + 5 ? '#45291a' : '#583922';
        if (inHole(x, y) && y >= NEST_BASE - 2) c = ['#a8743e', '#c48a3e', '#8a5a2b'][hash(x, y) % 3];
        px(ctx, c, x, y);
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
    // Wurzeln vor dem Höhleneingang (nur die unterste Zeile)
    const y = NEST_BASE;
    const hw = trunkHalf(y);
    for (let x = NEST_CX - hw; x <= NEST_CX + hw; x++) {
      const inner = Math.abs(x - NEST_CX) <= HOLE_HALF - 2;
      if (inner) continue; // in der Mitte liegt das Laubpolster frei
      px(ctx, Math.abs(x - NEST_CX) >= hw - 1 ? '#3e2814' : '#7a5230', x, y);
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
