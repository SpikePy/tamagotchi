// Außenszenen für Tiere, die nicht im Haus wohnen:
//  forest = Waldrand mit Fuchsbau, garden = Garten mit Hecke und Laubnest.
import { ICONS, drawMap, type ColorMap } from './pixels';
import { bands, glow } from './fx';

export type SceneKind = 'room' | 'forest' | 'garden' | 'farm';

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
  ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h); // auf das 0,5er-Pixelraster
}

function drawSky(ctx: CanvasRenderingContext2D, sky: Sky) {
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

const P = 0.5; // feines Pixelraster

/** Tanne im feinen Raster: gestufte Äste, Licht links, Schatten rechts, dunkle Unterkanten */
function drawPine(ctx: CanvasRenderingContext2D, cx: number, base: number, h: number, far = false) {
  const pal = far
    ? { o: '#3d5e3c', d: '#4c7448', m: '#5c8656', l: '#74a06a' }
    : { o: '#1c3a1e', d: '#2a5230', m: '#36663a', l: '#4f8a46' };
  px(ctx, '#4a2e18', cx - 0.5, base - 2.5, 1.5, 2.5);
  px(ctx, '#6a4428', cx - 0.5, base - 2.5, P, 2.5);
  const top = base - h;
  const bottom = base - 2;
  const tiers = Math.max(3, Math.round(h / 7));
  const maxHalf = h * 0.3;
  for (let y = top; y < bottom; y += P) {
    const t = (y - top) / (bottom - top);
    const tierPos = (t * tiers) % 1;
    const half = maxHalf * (0.18 + 0.82 * t) * (0.5 + 0.5 * tierPos) + 0.5;
    for (let x = cx - half; x <= cx + half; x += P) {
      const rel = (x - cx) / half;
      const n = hash(Math.round(x * 2), Math.round(y * 2));
      const edge = Math.abs(rel) > 0.86 || (n % 7 === 0 && Math.abs(rel) > 0.7);
      let c = pal.m;
      if (rel < -0.35) c = n % 3 ? pal.l : pal.m;
      else if (rel > 0.4) c = pal.d;
      if (tierPos > 0.82) c = pal.d; // Unterkante jeder Astetage
      if (edge) c = pal.o;
      px(ctx, c, x, y, P, P);
    }
  }
}

/** Hügelkette im feinen Raster mit heller Kante und Textur */
function hills(ctx: CanvasRenderingContext2D, yOf: (x: number) => number, body: string, rim: string, dots: string) {
  for (let x = 0; x < W; x += P) {
    const y0 = Math.round(yOf(x) * 2) / 2;
    px(ctx, body, x, y0, P, GROUND_Y - y0);
    px(ctx, rim, x, y0, P, P);
    for (let y = y0 + 1; y < GROUND_Y; y += 1.5) if (hash(Math.round(x * 2), Math.round(y * 2)) % 9 === 0) px(ctx, dots, x, y, P, P);
  }
}

function stone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const rows = ['.oooo.', 'ollmmo', 'olmmmo', '.oooo.'];
  const c: Record<string, string> = { o: '#4a4a46', l: '#b8b8b0', m: '#8a8a84' };
  rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && px(ctx, c[ch], x + i * P, y + j * P, P, P)));
}

function mushroom(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const rows = ['..oooo..', '.orrwro.', 'orwrrrro', 'oooooooo', '...ss...', '...ss...'];
  const c: Record<string, string> = { o: '#5a1a14', r: '#d8343a', w: '#ffffff', s: '#efe4cc' };
  rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && px(ctx, c[ch], x + i * P, y + j * P, P, P)));
}

/** ferne Bergkette mit Schneegipfeln, schattigen Hängen und Dunst */
function mountains(ctx: CanvasRenderingContext2D) {
  const peaks: [number, number, number][] = [
    [6, 13, 0.75],
    [19, 9.5, 0.7],
    [31, 14, 0.8],
    [44, 10.5, 0.65],
    [58, 12.5, 0.75],
  ];
  const ridge = (x: number) => Math.min(...peaks.map(([c, h, k]) => h + Math.abs(x - c) * k));
  const peakOf = (x: number) => peaks.reduce((best, p) => (Math.abs(x - p[0]) < Math.abs(x - best[0]) ? p : best));
  for (let x = 0; x < W; x += P) {
    const top = Math.round(ridge(x + P / 2) * 2) / 2;
    const [c, h] = peakOf(x + P / 2);
    const shadow = x + P / 2 > c; // rechte Hänge im Schatten
    for (let y = top; y < 27; y += P) {
      const depth = y - top;
      let col = shadow ? '#8ea2bc' : '#a8bcd2';
      if (y > 21) col = shadow ? '#9cb0c4' : '#b2c4d6'; // Dunst unten
      if (depth < 1.5 && top < h + 3.5) col = shadow ? '#d4e0ec' : '#f4f8fc'; // Schnee
      else if (depth < 2.5 && top < h + 2.5 && (Math.round(x * 2) + Math.round(y * 2)) % 3 === 0) col = shadow ? '#c0d0e0' : '#e4ecf4';
      px(ctx, col, x, y, P, P);
    }
  }
}

/** dunstiger Waldsaum vor den Bergen */
function hazyForest(ctx: CanvasRenderingContext2D) {
  for (let x = 0; x < W; x += P) {
    const k = Math.round(x * 2);
    const tip = 21.5 + ((k * 7) % 5) * 0.5 - (k % 4 === 0 ? 1 : 0) + Math.sin(x / 5) * 0.8;
    const y0 = Math.round(tip * 2) / 2;
    px(ctx, '#7f9f9a', x, y0, P, 27 - y0);
    px(ctx, '#93b2aa', x, y0, P, P);
  }
}

/** Fern-Ebene: Berge, Waldsaum, Hügel mit kleinen Bäumen */
function drawForestFar(ctx: CanvasRenderingContext2D) {
  mountains(ctx);
  hazyForest(ctx);
  hills(ctx, (x) => 24 + Math.sin(x / 9) * 2 + Math.sin(x / 4.3) + Math.sin(x / 1.7) * 0.3, '#86ad6c', '#a4c886', '#73995c');
  for (const x of [20, 23.5, 38, 41, 57]) drawPine(ctx, x, 27 + Math.sin(x / 9) * 2, 5, true);
  hills(ctx, (x) => 28.5 + Math.sin(x / 6 + 1) * 1.5 + Math.sin(x / 2.3) * 0.4, '#5e8a4a', '#78a45e', '#4f7a3e');
  drawPine(ctx, 29, 31, 9, true);
  drawPine(ctx, 33.5, 31.5, 7, true);
}

/** Nah-Ebene: Wiese, große Tannen, Steine, Pilz, Busch */
function drawForestNear(ctx: CanvasRenderingContext2D) {
  bands(ctx, 0, GROUND_Y, W, 48 - GROUND_Y, '#8cc65e', '#5e9a3e', 4);
  grassBlades(ctx, ['#4f8a34', '#9ad46a', '#6aa84a']);
  drawPine(ctx, 12, 35, 24);
  drawPine(ctx, 4, 36, 31);
  stone(ctx, 27, 44.5);
  stone(ctx, 60, 43);
  mushroom(ctx, 33, 39);
  drawBush(ctx, 7, 36, 7, 5.5, '#5a2a6a');
}

function tulip(ctx: CanvasRenderingContext2D, x: number, color: string, light: string) {
  const y = GROUND_Y - 4;
  px(ctx, '#3f7a30', x + 1, y + 2, P, 3);
  px(ctx, '#4f9a3a', x + 0.5, y + 3.5, P, P);
  px(ctx, '#4f9a3a', x + 1.5, y + 3, P, P);
  // Blüte als kleiner Kelch
  const rows = ['c.c.c', 'clccc', 'ccccc', '.ccc.'];
  rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && px(ctx, ch === 'l' ? light : color, x + i * P, y + j * P, P, P)));
}

function drawGardenFar(ctx: CanvasRenderingContext2D) {
  // Laubbäume hinter der Hecke (heller, weil weiter weg)
  for (const [tx, ty, tr] of [[9, 9, 7], [33, 7, 8.5], [55, 10, 6.5]] as [number, number, number][]) {
    px(ctx, '#5a3a22', tx - 0.5, ty + tr - 2, 1.5, 8);
    shrub(ctx, tx, ty, tr, tr * 0.85, ['#28501f', '#3f7432', '#5fa84a', '#7cc45a'], 900 + tx);
    shrub(ctx, tx - tr * 0.55, ty + tr * 0.35, tr * 0.55, tr * 0.5, ['#28501f', '#3f7432', '#5fa84a', '#7cc45a'], 950 + tx);
    shrub(ctx, tx + tr * 0.6, ty + tr * 0.3, tr * 0.5, tr * 0.45, ['#28501f', '#3f7432', '#5fa84a', '#7cc45a'], 990 + tx);
  }
  // Hecke aus einzelnen runden Sträuchern mit Lücken und Schatten dazwischen
  px(ctx, '#2d5524', 0, 20, W, GROUND_Y - 20);
  const bushes: [number, number, number, number][] = [];
  for (let i = 0, x = -2; x < W + 4; i++) {
    const n = hash(i * 13 + 5, 77);
    const r = 4 + (n % 5) * 0.6;
    bushes.push([x + r * 0.8, 17 + ((n >> 3) % 4) * 0.8, r, r * 0.9]);
    x += r * 1.45;
  }
  for (const [i, [bx, by, rx, ry]] of bushes.entries()) shrub(ctx, bx, by, rx, ry, ['#2d5524', '#43783a', '#4f8a3c', '#6aa850', '#86c262'], i * 31);
  // Holzzaun mit spitzen Latten
  for (let x = 1; x < W; x += 6) {
    const top = 20;
    for (let j = 0; j < 4; j++) px(ctx, '#6a4a28', x + 2 - j * P, top + j * P, (j * 2 + 1) * P, P); // Spitze
    for (let j = 1; j < 4; j++) px(ctx, '#c9a26a', x + 2 - (j - 1) * P, top + j * P, Math.max(P, (j * 2 - 1) * P), P);
    px(ctx, '#6a4a28', x, top + 2, 4.5, GROUND_Y - top - 1.5);
    px(ctx, '#c9a26a', x + P, top + 2, 3.5, GROUND_Y - top - 2);
    px(ctx, '#e0bc84', x + P, top + 2, P, GROUND_Y - top - 2);
    px(ctx, '#9a7444', x + 3.5, top + 2, P, GROUND_Y - top - 2);
    // Maserung mit Lücken
    for (let y = top + 3; y < GROUND_Y - 1; y += P) {
      if (hash(x, Math.round(y * 2)) % 5 === 0) continue;
      if (Math.round(y * 2) % 7 < 5) px(ctx, '#ad8650', x + 1.5, y, P, P);
      if (Math.round(y * 2 + 3) % 9 < 5) px(ctx, '#ad8650', x + 2.5, y, P, P);
    }
  }
  for (const ry of [24.5, 29.5]) {
    px(ctx, '#6a4a28', 0, ry - P, W, 2);
    px(ctx, '#b08850', 0, ry, W, 1);
    px(ctx, '#d0a86a', 0, ry, W, P);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, ry + 1.5, W, P);
    for (let x = 3; x < W; x += 6) px(ctx, '#3a2a1a', x, ry + P, P, P); // Nägel
  }
}

function drawGardenNear(ctx: CanvasRenderingContext2D) {
  // Rasen mit Verlauf und Grashalmen
  bands(ctx, 0, GROUND_Y, W, 48 - GROUND_Y, '#94c262', '#6a9640', 4);
  grassBlades(ctx, ['#5a8a38', '#a6d070', '#7aa84a']);
  // Busch mit roten Beeren links
  drawBush(ctx, 6.5, 35.5, 6.5, 6, '#d0304a');
  // Tulpen
  tulip(ctx, 16, '#f2c63b', '#fff0a0');
  tulip(ctx, 30, '#e86fa0', '#ffc0d8');
  tulip(ctx, 34, '#f4f4f4', '#ffffff');
  tulip(ctx, 61, '#e2384d', '#ff9aa6');
  stone(ctx, 24, 44.5);
}

/** runder Busch im feinen Pixelraster: Umriss, Licht oben links, Schatten unten rechts, Blätter-Textur */
function drawBush(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, berry: string) {
  // mehrere Blätterbüschel ergeben eine unregelmäßige Form
  const blobs: [number, number, number, number][] = [
    [cx, cy, rx, ry],
    [cx - rx * 0.5, cy - ry * 0.6, rx * 0.55, ry * 0.65],
    [cx + rx * 0.3, cy - ry * 0.85, rx * 0.55, ry * 0.6],
    [cx + rx * 0.8, cy - ry * 0.15, rx * 0.45, ry * 0.6],
    [cx - rx * 0.9, cy + ry * 0.05, rx * 0.4, ry * 0.6],
  ];
  const ground = 41; // steht auf dem Boden
  const inside = (x: number, y: number) =>
    y <= ground && blobs.some(([bx, by, brx, bry]) => ((x - bx) / brx) ** 2 + ((y - by) / bry) ** 2 <= 1);
  for (let y = cy - ry * 1.6; y <= ground; y += P)
    for (let x = cx - rx * 1.4; x <= cx + rx * 1.4; x += P) {
      const px0 = x + P / 2;
      const py0 = y + P / 2;
      if (!inside(px0, py0)) continue;
      const edge = !inside(px0 - P, py0) || !inside(px0 + P, py0) || !inside(px0, py0 - P) || (py0 + P <= ground && !inside(px0, py0 + P));
      const n = hash(Math.round(x * 2) + 500, Math.round(y * 2));
      const light = (px0 - cx) / rx + (py0 - cy) / ry;
      let c = n % 5 === 0 ? '#4f8a3c' : n % 7 === 0 ? '#2f5a26' : '#3f7432';
      if (light < -0.7) c = n % 3 === 0 ? '#7cc45a' : '#5fa84a';
      else if (light > 0.6) c = n % 4 === 0 ? '#2f5a26' : '#28501f';
      if (edge) c = '#1f3a18';
      px(ctx, c, x, y, P, P);
    }
  // ein paar Beeren mit Glanzpunkt
  for (const [bx, by] of [[cx - 3, cy - 2], [cx + 2, cy - 4], [cx + 4, cy - 1], [cx - 1, cy - 5], [cx - 4.5, cy + 1], [cx + 1, cy + 0.5]]) {
    px(ctx, berry, bx, by, 1, 1);
    px(ctx, '#ffffff', bx, by, P, P);
  }
}

/** runder Strauch bzw. Baumkrone: dunkler Rand, Licht oben links, Schatten unten rechts, Blattstruktur */
function shrub(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, pal: string[], seed: number) {
  const [outline, shadow, mid, light, highlight] = pal.length === 5 ? pal : [pal[0], pal[0], pal[1], pal[2], pal[3]];
  for (let y = cy - ry; y <= cy + ry; y += P)
    for (let x = cx - rx; x <= cx + rx; x += P) {
      const u = (x + P / 2 - cx) / rx;
      const v = (y + P / 2 - cy) / ry;
      // unregelmäßiger Rand
      const n = hash(Math.round(x * 2) + seed, Math.round(y * 2));
      const d = u * u + v * v;
      if (d > 1 - (n % 4) * 0.05) continue;
      let c = mid;
      const lightness = -(u + v);
      if (d > 0.82) c = outline;
      else if (lightness > 0.75) c = n % 3 === 0 ? highlight : light;
      else if (lightness > 0.2) c = n % 5 === 0 ? highlight : n % 2 ? light : mid;
      else if (lightness < -0.6) c = shadow;
      else if (n % 7 === 0) c = shadow;
      px(ctx, c, x, y, P, P);
    }
}

/** Himmel draußen (ohne Wolken, die ziehen extra). Gibt zurück, ob gerade Tag ist. */
export function drawOutdoorSky(ctx: CanvasRenderingContext2D, clock: number): boolean {
  const sky = skyState(clock);
  drawSky(ctx, sky);
  return sky.day;
}

/** Fern-Ebene draußen (liegt über Himmel, Wolken und Vögeln) */
export function drawOutdoorFar(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  if (kind === 'forest') drawForestFar(ctx);
  else drawGardenFar(ctx); // Garten und Hühnerhof: Hecke und Zaun
}

/** Nah-Ebene draußen (liegt über Reh & Co. im Hintergrund) */
export function drawOutdoorNear(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  if (kind === 'forest') drawForestNear(ctx);
  else if (kind === 'farm') drawFarmNear(ctx);
  else drawGardenNear(ctx);
}

/** Hühnerhof: Boden komplett mit Stroh ausgelegt, Stein */
function drawFarmNear(ctx: CanvasRenderingContext2D) {
  bands(ctx, 0, GROUND_Y, W, 48 - GROUND_Y, '#e4c470', '#b8923a', 4);
  // viele Strohhalme kreuz und quer
  const straw = ['#f4dc8a', '#d8b050', '#c09a3a', '#a07a28', '#f0d070'];
  for (let i = 0; i < 260; i++) {
    const n = hash(i * 31 + 3, i * 17 + 9);
    const x = (n % 128) / 2;
    const y = GROUND_Y + ((n >> 4) % 30) / 2;
    const c = straw[(n >> 2) % straw.length];
    const len = 1 + (n % 4) * 0.5;
    const dir = (n >> 6) % 3; // waagrecht, schräg runter, schräg hoch
    for (let k = 0; k < len * 2; k++) px(ctx, c, x + k * P, y + (dir === 1 ? k * P * 0.5 : dir === 2 ? -k * P * 0.5 : 0), P, P);
  }
  // Kante zur Hecke
  px(ctx, '#a07a28', 0, GROUND_Y, W, P);
  stone(ctx, 26, 44.5);
}

// ---------- Schlafplatz draußen: Baumhöhle (Fuchs) bzw. Laubhaufen (Igel) ----------
// Die Höhlen sind innen hell genug und verdecken nur den unteren Rand,
// damit man das schlafende Tier gut erkennt.

const NEST_CX = 49;
// Hühnerstall: hohe Tür mit Sitzstange
const COOP_DOOR_HALF = 6;
const COOP_DOOR_TOP = 25;
export const COOP_PERCH_Y = 36.5;
const NEST_BASE = 41;

function inEllipse(x: number, y: number, rx: number, ry: number, cy = NEST_BASE) {
  return ((x - NEST_CX) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

/** halbe Stammbreite je Zeile, unten mit Wurzeln breiter */
const trunkHalf = (y: number) => (y < 37 ? 7 : 7 + Math.round((y - 36) * 1.5));
const TRUNK_TOP = 0; // Stamm reicht über den oberen Bildrand hinaus, Krone nicht sichtbar
// Höhle: Torbogen mit rundem Dach
const HOLE_HALF = 5;
const HOLE_TOP = 30;
const inHole = (x: number, y: number, grow = 0) => {
  const r = HOLE_HALF + grow;
  const archY = HOLE_TOP - grow + r; // Mittelpunkt des runden Dachs
  if (y > NEST_BASE) return false;
  if (y >= archY) return Math.abs(x - NEST_CX) <= r;
  return (x - NEST_CX) ** 2 + (y - archY) ** 2 <= r * r;
};

const AUTUMN = [
  { l: '#f6c46a', g: '#e08a3a', d: '#a8542a' },
  { l: '#f08a6a', g: '#c95a2a', d: '#8a3a1a' },
  { l: '#f6e07a', g: '#e0b13a', d: '#a8802a' },
  { l: '#d8a060', g: '#b8743e', d: '#7a4a24' },
];
/** einzelnes Blatt (3×2 Einheiten) mit Mittelrippe */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, n: number) {
  const c = AUTUMN[n % AUTUMN.length];
  const rows = n % 2 ? ['.llg..', 'lgdggd', '.gggd.'] : ['..lgg.', 'lggdgg', '.dggd.'];
  rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && px(ctx, (c as Record<string, string>)[ch], x + i * P, y + j * P, P, P)));
}

/** Hühnerstall: Holzhaus mit rotem Dach, Tür mit Stroh */
function drawCoop(ctx: CanvasRenderingContext2D) {
  const x0 = NEST_CX - 10;
  const x1 = NEST_CX + 10;
  const top = 24;
  // Wände aus senkrechten Brettern
  for (let x = x0; x < x1; x += P) {
    const plank = Math.floor((x - x0) / 3);
    const edge = (x - x0) % 3 === 0;
    for (let y = top; y <= NEST_BASE; y += P) {
      const n = hash(Math.round(x * 2), Math.round(y * 2));
      let c = plank % 2 ? '#b07a44' : '#c08a50';
      if (edge) c = '#6a4424';
      else if (n % 11 === 0) c = '#9a6a3a';
      px(ctx, c, x, y, P, P);
    }
  }
  px(ctx, '#4a2e18', x0 - P, top, P, NEST_BASE - top + 1);
  px(ctx, '#4a2e18', x1, top, P, NEST_BASE - top + 1);
  // Dach (Dreieck mit Ziegelreihen)
  for (let y = 15; y < top + 1; y += P) {
    const half = 12 * ((y - 15) / (top + 1 - 15)) + 1;
    for (let x = NEST_CX - half; x < NEST_CX + half; x += P) {
      const row = Math.round((y - 15) * 2);
      let c = row % 4 === 0 ? '#8a2a1e' : (Math.round(x * 2) + (row >> 2) * 2) % 6 === 0 ? '#9a3424' : '#c0462e';
      if (x < NEST_CX - half + P || x >= NEST_CX + half - P) c = '#5a1a12';
      px(ctx, c, x, y, P, P);
    }
  }
  // hohe Tür (Bogen) mit dunklem Inneren und Stroh am Boden
  const inDoor = (x: number, y: number, grow = 0) => {
    const r = COOP_DOOR_HALF + grow;
    const archY = COOP_DOOR_TOP - grow + r;
    if (y > NEST_BASE) return false;
    if (y >= archY) return Math.abs(x - NEST_CX) <= r;
    return (x - NEST_CX) ** 2 + (y - archY) ** 2 <= r * r;
  };
  for (let y = COOP_DOOR_TOP - 1; y <= NEST_BASE; y += P)
    for (let x = NEST_CX - COOP_DOOR_HALF - 1; x <= NEST_CX + COOP_DOOR_HALF + 1; x += P) {
      const cx0 = x + P / 2;
      const cy0 = y + P / 2;
      if (!inDoor(cx0, cy0, 0.5)) continue;
      let c = '#4a2e18';
      if (inDoor(cx0, cy0)) c = cy0 < COOP_DOOR_TOP + 4 ? '#2e1c0e' : '#3e2616';
      if (inDoor(cx0, cy0) && cy0 > NEST_BASE - 2) c = hash(Math.round(x * 2), Math.round(y * 2)) % 2 ? '#e8c860' : '#c8a040';
      px(ctx, c, x, y, P, P);
    }
  // Sitzstange auf zwei Stützen
  px(ctx, '#5a3a1a', NEST_CX - COOP_DOOR_HALF + 0.5, COOP_PERCH_Y + 1, 1, NEST_BASE - COOP_PERCH_Y - 1);
  px(ctx, '#5a3a1a', NEST_CX + COOP_DOOR_HALF - 1.5, COOP_PERCH_Y + 1, 1, NEST_BASE - COOP_PERCH_Y - 1);
  px(ctx, '#3a2414', NEST_CX - COOP_DOOR_HALF, COOP_PERCH_Y - P, COOP_DOOR_HALF * 2, 1.5);
  px(ctx, '#a07040', NEST_CX - COOP_DOOR_HALF + P, COOP_PERCH_Y, COOP_DOOR_HALF * 2 - 1, P);
  // kleines Fenster
  px(ctx, '#4a2e18', NEST_CX + 7, top + 1.5, 2.5, 2.5);
  px(ctx, '#f4d878', NEST_CX + 7.5, top + 2, 1.5, 1.5);
}

/** Clip auf die Öffnung der Baumhöhle: was darin liegt, ist nur durch das Loch zu sehen */
export function clipToDen(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  for (let y = HOLE_TOP; y <= NEST_BASE; y += P)
    for (let x = NEST_CX - HOLE_HALF; x <= NEST_CX + HOLE_HALF; x += P) if (inHole(x + P / 2, y + P / 2)) ctx.rect(x, y, P, P);
  ctx.clip();
}
export const DEN = { cx: NEST_CX, half: HOLE_HALF, top: HOLE_TOP, base: NEST_BASE };

export function drawNestBack(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  if (kind === 'farm') return drawCoop(ctx);
  if (kind === 'forest') {
    // Stamm im feinen Raster: Rindenfurchen, Licht links, Schatten rechts, Moos unten
    for (let y = TRUNK_TOP; y <= NEST_BASE; y += P) {
      const hw = trunkHalf(Math.floor(y));
      const left = NEST_CX - hw;
      for (let x = left; x <= NEST_CX + hw + 0.5; x += P) {
        const rel = (x - left) / (hw * 2 + 1);
        const n = hash(Math.round(x * 2), Math.round(y * 2));
        const furrow = (((x - left) * 2 + Math.round(Math.sin(y * 0.6 + x) * 1.2)) % 5 + 5) % 5;
        let c = '#7a5230';
        if (furrow === 0 && n % 6) c = '#5a3a20';
        else if (furrow === 1) c = '#8e6238';
        if (rel < 0.08) c = '#a0744a';
        else if (rel > 0.86) c = furrow === 0 ? '#3e2814' : '#553820';
        if (y > 34 && rel < 0.35 && n % 3 === 0) c = n % 2 ? '#5f8a3a' : '#7aa84a'; // Moos
        if (x <= left + 0.25 || x >= NEST_CX + hw + 0.25) c = '#3a2414';
        px(ctx, c, x, y, P, P);
      }
    }
    // Aststummel links
    px(ctx, '#3a2414', NEST_CX - 11.5, 12, 5, 3);
    px(ctx, '#8e6238', NEST_CX - 11, 12.5, 4, 1);
    px(ctx, '#6a4428', NEST_CX - 11, 13.5, 4, 1);
    px(ctx, '#5a3a20', NEST_CX - 11.5, 12.5, 1, 2);
    // Astknoten
    for (const [kx, ky] of [[NEST_CX + 3, 6], [NEST_CX - 3, 22]] as [number, number][]) {
      px(ctx, '#3a2414', kx - 1, ky - 0.5, 2.5, 2);
      px(ctx, '#6a4428', kx - 0.5, ky, 1.5, 1);
      px(ctx, '#2a180c', kx, ky, P, P);
    }
    // Eingang: dunkler Rand, Inneres in Stufen, Laubpolster am Boden
    for (let y = HOLE_TOP - 1; y <= NEST_BASE; y += P)
      for (let x = NEST_CX - HOLE_HALF - 1; x <= NEST_CX + HOLE_HALF + 1; x += P) {
        const cx0 = x + P / 2;
        const cy0 = y + P / 2;
        if (!inHole(cx0, cy0, 0.5)) continue;
        let c = '#2a180c';
        if (inHole(cx0, cy0)) c = cy0 < HOLE_TOP + 2 ? '#3a2212' : cy0 < HOLE_TOP + 5 ? '#4a2c18' : '#5e3e26';
        px(ctx, c, x, y, P, P);
      }
    for (let i = 0; i < 4; i++) leaf(ctx, NEST_CX - 4 + i * 2, NEST_BASE - 1.5 + (i % 2) * 0.5, i);
  } else {
    // Laubhaufen aus vielen einzelnen Blättern, mit Mulde
    for (let y = NEST_BASE - 11; y <= NEST_BASE; y += P)
      for (let x = NEST_CX - 14; x <= NEST_CX + 14; x += P) {
        if (!inEllipse(x + P / 2, y + P / 2, 14, 11)) continue;
        px(ctx, inEllipse(x + P / 2, y + P / 2, 9.5, 8) ? '#5a3820' : '#7a4a24', x, y, P, P);
      }
    for (let i = 0; i < 90; i++) {
      const n = hash(i * 13 + 5, i * 7 + 3);
      const x = NEST_CX - 14 + (n % 27);
      const y = NEST_BASE - 11 + ((n >> 3) % 11);
      if (!inEllipse(x + 1.5, y + 1, 13, 10.5) || inEllipse(x + 1.5, y + 1, 8.5, 7)) continue;
      leaf(ctx, x, y, n);
    }
  }
}

export function drawNestFront(ctx: CanvasRenderingContext2D, kind: SceneKind) {
  if (kind === 'farm') {
    // Schwelle vor der Stalltür
    px(ctx, '#4a2e18', NEST_CX - COOP_DOOR_HALF - 1, NEST_BASE - P, (COOP_DOOR_HALF + 1) * 2 + P, P);
    px(ctx, '#8a5a2e', NEST_CX - COOP_DOOR_HALF - 1, NEST_BASE, (COOP_DOOR_HALF + 1) * 2 + P, P);
    return;
  }
  if (kind === 'forest') {
    // Wurzeln links und rechts vom Eingang
    const y = NEST_BASE - P;
    const hw = trunkHalf(NEST_BASE);
    for (let x = NEST_CX - hw; x <= NEST_CX + hw + 0.5; x += P) {
      if (Math.abs(x - NEST_CX) <= HOLE_HALF - 1) continue; // Mitte frei (Laubpolster)
      const outer = Math.abs(x - NEST_CX) >= hw - 0.5;
      px(ctx, outer ? '#3a2414' : '#3e2814', x, y, P, P);
      px(ctx, outer ? '#3a2414' : '#7a5230', x, y + P, P, P);
    }
  } else {
    // vorderer Laubrand, verdeckt nur die Pfoten
    for (let i = 0; i < 9; i++) leaf(ctx, NEST_CX - 13 + i * 3, NEST_BASE - 1.5 + (i % 2) * 0.5, i + 1);
  }
}

/** Futterstelle: Napf drinnen, flacher Stein im Wald, Tonschale im Garten */
export const PLATE_COLORS: Record<SceneKind, ColorMap> = {
  room: { o: '#2e4a7a', h: '#8fb3e6', b: '#5b86c9' },
  forest: { o: '#4a4a46', h: '#a8a8a0', b: '#7e7e76' },
  garden: { o: '#7a3a1e', h: '#e8946a', b: '#c0623a' },
  farm: { o: '#4a5058', h: '#c8d0d8', b: '#8a949e' }, // Futtertrog aus Blech
};
