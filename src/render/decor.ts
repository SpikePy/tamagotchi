// Deko-Objekte je Gehege, im feinen Pixelraster (1 Zeichen = 1 Bildpixel = 0,5 Spiel-Einheiten).
// Statisches landet im Hintergrund-Cache, Bewegtes (Bach-Glitzern, Schnecke) wird pro Bild gezeichnet.
import { PX, drawPixels, snapPx, type ColorMap } from './pixels';
import { pixelCircle } from './fx';
import type { SceneKind } from './outdoor';
import * as PR from './props';

const P = PX;
const GROUND_Y = 33;

const put = (ctx: CanvasRenderingContext2D, rows: string[], c: ColorMap, x: number, y: number) =>
  drawPixels(ctx, rows, c, snapPx(x), snapPx(y));
const rect = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = c;
  ctx.fillRect(snapPx(x), snapPx(y), w, h);
};

// ---------- Platzierungen ----------
export type VisitKind = 'sniff' | 'nudge' | 'drink' | 'dustbath' | 'sill' | 'hop' | 'scratch' | 'play' | 'scrape';
export interface DecorTarget {
  x: number; // wo das Tier hinläuft (Mitte)
  kind: VisitKind;
}

/** Interaktionspunkte je Tierart */
export function decorTargets(species: string): DecorTarget[] {
  switch (species) {
    case 'fox':
      return [{ x: 38, kind: 'sniff' }];
    case 'hedgehog':
      return [{ x: 14, kind: 'sniff' }];
    case 'cat':
      return [{ x: 49.5, kind: 'nudge' }, { x: 43, kind: 'sill' }, { x: 19, kind: 'scratch' }, { x: 22, kind: 'play' }];
    case 'dog':
      return [];
    case 'chicken':
      return [{ x: 8, kind: 'dustbath' }, { x: STRAW_HEAP.cx, kind: 'hop' }];
  }
  return [];
}

/** Ferne Ebene (Wald: Bach mit umgestürztem Baumstamm als Brücke) */
export function drawDecorFar(ctx: CanvasRenderingContext2D, scene: SceneKind) {
  if (scene !== 'forest') return;
  for (let x = 14; x < 41; x += P) {
    const y = 31 + snapPx(Math.sin(x / 5) * 0.5);
    rect(ctx, '#3a6a8a', x, y - P, P, P);
    rect(ctx, '#5aa6d6', x, y, P, 1);
    rect(ctx, '#8ccaf0', x, y, P, P);
    if (Math.round(x * 4) % 7 === 0) rect(ctx, '#b8e2f8', x, y + 2 * P, P, P); // kleine Wellen
    rect(ctx, '#4a7a3a', x, y + 1, P, P);
  }
  PR.drawProp(ctx, PR.log(), 23, 29.5);
}

let sunflowersOff = false;

/** Strohhaufen auf dem Hühnerhof (das Huhn hüpft manchmal hinauf) */
export const STRAW_HEAP = { cx: 30.5, base: 41, rx: 5.5, h: 4.5 };
function strawHeap(ctx: CanvasRenderingContext2D) {
  const { cx, base, rx, h } = STRAW_HEAP;
  for (let y = base - h; y < base; y += P)
    for (let x = cx - rx; x <= cx + rx; x += P) {
      const u = (x + P / 2 - cx) / rx;
      const v = (base - (y + P / 2)) / h;
      if (u * u + v * v > 1) continue;
      const n = (((Math.round(x * 4) * 73856093) ^ (Math.round(y * 4) * 19349663)) >>> 0) % 997;
      const edge = u * u + (v + 0.12) * (v + 0.12) > 0.82;
      let c = n % 4 === 0 ? '#f4dc8a' : n % 3 === 0 ? '#c09a3a' : '#e0b850';
      if (u + (1 - v) * 0.3 > 0.65) c = n % 2 ? '#b88a30' : '#a07a28'; // Schatten rechts
      if (edge && n % 2) c = '#8a6a20';
      rect(ctx, c, x, y, P, P);
    }
  // einzelne abstehende Halme
  for (const [hx, hy, dx] of [[cx - 3, base - h + 0.5, -1], [cx + 1, base - h - 0.5, 1], [cx + 4, base - 2, 1], [cx - 4.5, base - 1.5, -1]] as [number, number, number][])
    for (let k = 0; k < 6; k++) rect(ctx, k % 3 ? '#f0d070' : '#c89a38', hx + dx * k * P, hy - Math.floor(k / 2) * P, P, P);
}

/** Wandregal mit Büchern */
function shelf(ctx: CanvasRenderingContext2D, x: number, y: number, books: string[]) {
  rect(ctx, '#6a4424', x, y, 13, 1);
  rect(ctx, '#8e6238', x, y, 13, P);
  rect(ctx, '#4a2e18', x + 1, y + 1, P, 1.5);
  rect(ctx, '#4a2e18', x + 11.5, y + 1, P, 1.5);
  books.forEach((c, i) => {
    const h = 3 + (i % 3) * 0.5;
    rect(ctx, '#2a1a10', x + 1 + i * 1.5, y - h, 1.5, h);
    rect(ctx, c, x + 1 + i * 1.5 + P, y - h + P, P, h - P);
  });
}

/** Sonnenblume; Kopf neigt sich zur Sonne (sunX = Sonnenposition 0..64) */
function sunflower(ctx: CanvasRenderingContext2D, x0: number, top: number, sunX: number, sway = 0) {
  if (sunflowersOff) return; // im Winter keine Sonnenblumen
  // Stiel biegt sich im Wind: oben stärker als unten
  const bend = (y: number) => sway * ((GROUND_Y - y) / (GROUND_Y - top)) ** 1.6;
  for (let y = top + 2; y < GROUND_Y; y += P) rect(ctx, '#3f7a30', x0 + bend(y), y, P, P);
  for (const [ly, dir] of [[top + 6, -1], [top + 9, 1], [top + 12, -1]] as [number, number][]) {
    // Blatt: schmal am Stiel, breiter zur Spitze, mit hellerer Oberseite (flattert leicht mit)
    const x = x0 + bend(ly);
    const flut = Math.round(sway * 2) * P * 0.5;
    rect(ctx, '#3f7a30', x + (dir > 0 ? P : -P), ly, P, P);
    rect(ctx, '#4f9a3a', x + (dir > 0 ? 2 * P : -3 * P), ly - P + flut, 2 * P, 2 * P);
    rect(ctx, '#6ab84a', x + (dir > 0 ? 3 * P : -3 * P), ly - P + flut, P, P);
    rect(ctx, '#4f9a3a', x + (dir > 0 ? 4 * P : -5 * P), ly - 2 * P + flut, 2 * P, P);
  }
  const lean = sunX < x0 - 8 ? -1 : sunX > x0 + 8 ? 1 : 0;
  const hx = snapPx(x0 + 0.25 + lean * 0.5 + bend(top + 1.5));
  pixelCircle(ctx, hx, top + 1.5, 2.2, '#f2c63b');
  pixelCircle(ctx, hx, top + 1.5, 1.6, '#e8a020');
  pixelCircle(ctx, hx, top + 1.5, 1.1, '#6a3a1a');
  rect(ctx, '#8a5a2a', hx - 0.5, top + 1, P, P);
}

/** Nahe Ebene + Zimmer: statische Deko (liegt im Hintergrund-Cache) */
export function drawDecorNear(ctx: CanvasRenderingContext2D, species: string, _sunX: number, winter = false) {
  sunflowersOff = winter;
  switch (species) {
    case 'fox':
      PR.drawProp(ctx, PR.fern(), 13.5, 35.5);
      PR.drawProp(ctx, PR.mushRed(), 17, 38);
      PR.drawProp(ctx, PR.mushBrown(), 20, 38.5);
      PR.drawProp(ctx, PR.mushBrown(), 15.5, 39.5, true);
      PR.drawProp(ctx, PR.feather(), 36, 40);
      break;
    case 'hedgehog':
      PR.drawProp(ctx, PR.hedgehogHouse(), 55, 22.5);
      PR.drawProp(ctx, PR.gnome(), 26, 27);
      PR.drawProp(ctx, PR.wateringCan(), 29.5, 30.5);
      PR.drawProp(ctx, PR.apple(), 13, 38.5);
      break;
    case 'cat': {
      // Wandregal mit Büchern und Katzenfigur über dem Kratzbaum
      shelf(ctx, 4, 9, ['#c0462e', '#3a6ab0', '#e8b030', '#4f8a3c', '#8a4ab0']);
      PR.drawProp(ctx, PR.catFigure(), 13, 6.5);
      // Bild einer Maus statt der Landschaft
      rect(ctx, '#6a4a28', 21, 8, 11, 8);
      rect(ctx, '#a07a4a', 21, 8, 11, P);
      rect(ctx, '#f4ead8', 22, 9, 9, 6);
      PR.drawProp(ctx, PR.mousePortrait(), 22.5, 9.5);
      // Spielzeug vor dem Körbchen, mit Abstand zum rechten Rand
      PR.drawProp(ctx, PR.wool(), 43, 43.5);
      for (let i = 0; i < 12; i++) rect(ctx, '#9a6ad8', 45.5 + i * P, 45 + Math.round(Math.sin(i / 1.6) * 1.5) * P + P, P, P);
      PR.drawProp(ctx, PR.toyMouse(), 48.5, 44.5);
      break;
    }
    case 'dog':
      // Bücherregal mit kleinem Knochen
      shelf(ctx, 4, 9, ['#3a6ab0', '#c0462e', '#4f8a3c', '#e8b030', '#6a4a8a']);
      PR.drawProp(ctx, PR.shelfBone(), 12.5, 6.5);
      // Pfotenbild: Goldrahmen, Passepartout, große Pfote
      rect(ctx, 'rgba(0,0,0,0.15)', 21.5, 8.5, 11, 9);
      rect(ctx, '#8a6a2a', 21, 8, 11, 9);
      rect(ctx, '#d8b058', 21, 8, 11, P);
      rect(ctx, '#d8b058', 21, 8, P, 9);
      rect(ctx, '#f6efe0', 22, 9, 9, 7);
      rect(ctx, '#e8dcc4', 22.5, 9.5, 8, 6);
      PR.drawProp(ctx, PR.pawPrint(), 23.5, 9.75);
      // Hakenleiste unter dem Regal: Leine, Geschirr, Halsband mit Marke
      rect(ctx, '#6a4424', 4, 12.5, 13, 1);
      rect(ctx, '#8e6238', 4, 12.5, 13, P);
      for (const hx of [5.5, 10, 14.5]) rect(ctx, '#7a7a7a', hx, 13.5, P, 1);
      rect(ctx, '#d8343a', 5.5, 14.5, P * 2, 6);
      rect(ctx, '#f06a6a', 5.5, 14.5, P, 6);
      put(ctx, ['.ooo.', 'o...o', 'o...o', '.ooo.'], { o: '#d8343a' }, 4.5, 20.5);
      PR.drawProp(ctx, PR.harness(), 8.25, 14.5);
      PR.drawProp(ctx, PR.collar(), 13, 14.5);
      break;
    case 'chicken': {
      // Sonnenblumen am Zaun, Sandbad-Kuhle, Tränke, Leiter, Nistkasten
      for (let y = 43; y < 47; y += P)
        for (let x = 3; x < 14; x += P) {
          const d = ((x - 8.5) / 5.5) ** 2 + ((y - 45) / 2) ** 2;
          if (d < 1) rect(ctx, d < 0.5 ? '#b8923a' : '#c8a24a', x, y, P, P);
        }
      strawHeap(ctx);
      PR.drawProp(ctx, PR.trough(), 29, 38.5);
      // Leiter an der linken Stallwand
      for (const lx of [35.5, 37.5]) rect(ctx, '#7a5a34', lx, 30, P, 11);
      for (let ry = 31; ry < 41; ry += 2) rect(ctx, '#a07a4a', 35.5, ry, 2.5, P);
      // Nistkasten rechts am Stall
      rect(ctx, '#4a2e18', 59.5, 29, 4.5, 5);
      rect(ctx, '#b07a44', 60, 29.5, 3.5, 4);
      rect(ctx, '#3a2414', 60.5, 30.5, 3, 2.5);
      rect(ctx, '#e8c860', 60.5, 32.5, 3, 1);
      rect(ctx, '#8a2a1e', 59, 28.5, 5, 1);
      break;
    }
  }
}

/** Sonnenblumen (Garten, Hühnerhof), die sich pro Bild leicht im Wind wiegen */
export function drawSunflowers(ctx: CanvasRenderingContext2D, species: string, sunX: number, t: number, wind: number, winter: boolean) {
  sunflowersOff = winter;
  const gust = 0.35 + Math.min(1, Math.abs(wind)) * 0.4;
  const sway = (ph: number) => (Math.sin(t / 1400 + ph) * 0.7 + Math.sin(t / 530 + ph * 2) * 0.3) * gust + Math.sign(wind) * 0.15;
  if (species === 'hedgehog') {
    sunflower(ctx, 18, 16, sunX, sway(0));
    sunflower(ctx, 22, 18, sunX, sway(1.7));
  } else if (species === 'chicken') {
    sunflower(ctx, 3, 16, sunX, sway(0.4));
    sunflower(ctx, 7.5, 18.5, sunX, sway(2.1));
  }
}

/** Wetterhahn auf dem Stalldach; zeigt in Windrichtung und pendelt leicht hin und her */
export function drawWeathervane(ctx: CanvasRenderingContext2D, wind: number, t = 0) {
  const x = 49;
  rect(ctx, '#3a3a3a', x, 9.5, P, 6);
  // Drehen um die Stange: Querbalken und Hahn werden etwas schmaler/breiter, Hahn wackelt seitlich
  const turn = Math.sin(t / 900) * 0.6 + Math.sin(t / 370) * 0.25;
  const arm = 4.5 - Math.abs(turn) * 1.2;
  rect(ctx, '#3a3a3a', snapPx(x - arm / 2 + 0.25), 11, snapPx(arm), P);
  PR.drawProp(ctx, PR.vaneRooster(), x - 1.75 + turn * 0.5, 6.5, wind >= 0);
  // Pfeil zeigt dorthin, wohin der Wind weht
  rect(ctx, '#2a2a2a', wind > 0 ? x + 2 - Math.abs(turn) * 0.5 : x - 2.5 + Math.abs(turn) * 0.5, 10.5, 1, 1.5);
}

/** Bewegte Deko pro Bild */
export function drawDecorAnim(ctx: CanvasRenderingContext2D, species: string, t: number) {
  if (species === 'fox') {
    // Lichtreflexe auf dem Bach
    for (let i = 0; i < 4; i++) {
      const x = 14 + ((t / 90 + i * 7) % 26);
      if (Math.floor(t / 300 + i) % 3) continue;
      const y = 31 + snapPx(Math.sin(x / 5) * 0.5);
      rect(ctx, '#ffffff', snapPx(x), y + P, 2 * P, P);
    }
  }
  if (species === 'hedgehog') {
    // Schnecke kriecht ganz langsam hin und her
    const span = 16;
    const k = (t / 1000 / 40) % 2;
    const pos = k < 1 ? k : 2 - k;
    const flip = k >= 1;
    PR.drawProp(ctx, PR.snail(), 12 + pos * span, 39.5, flip);
  }
}

/** Fensterbank-Deko (über dem Fensterbrett gezeichnet) */
export function drawSillDecor(ctx: CanvasRenderingContext2D, species: string, sill: { x: number; y: number; w: number }) {
  if (species !== 'cat') return;
  PR.drawProp(ctx, PR.cushion(), sill.x + 2, sill.y - 1.5);
  PR.drawProp(ctx, PR.catgrass(), sill.x + sill.w - 5.5, sill.y - 4);
}

/** Vordergrund-Deko (vor dem Schlafplatz) */
export function drawFrontDecorFor(ctx: CanvasRenderingContext2D, species: string) {
  if (species === 'dog') PR.drawProp(ctx, PR.doormat(), 36.5, 45.5);
}

/** Eier im Nistkasten (Huhn) */
export function drawNestEggs(ctx: CanvasRenderingContext2D, n: number) {
  for (let i = 0; i < Math.min(3, n); i++) PR.drawProp(ctx, PR.nestEgg(), 60.5 + i, 31.5 - (i % 2) * 0.5);
}
export const NEST_BOX = { x: 59.5, y: 28.5, w: 4.5, h: 5.5 };
