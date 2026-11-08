// Deko-Objekte je Gehege, im feinen Pixelraster (1 Zeichen = 1 Bildpixel = 0,5 Spiel-Einheiten).
// Statisches landet im Hintergrund-Cache, Bewegtes (Bach-Glitzern, Schnecke) wird pro Bild gezeichnet.
import { drawPixels, type ColorMap } from './pixels';
import { pixelCircle } from './fx';
import type { SceneKind } from './outdoor';

const P = 0.5;
const GROUND_Y = 33;

const put = (ctx: CanvasRenderingContext2D, rows: string[], c: ColorMap, x: number, y: number) =>
  drawPixels(ctx, rows, c, Math.round(x * 2) / 2, Math.round(y * 2) / 2);
const rect = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h);
};

// ---------- Pixel-Grafiken ----------
const MUSH_RED = ['..oooo..', '.orwrro.', 'orrrrwro', 'oooooooo', '...ss...', '...ss...'];
const MUSH_BROWN = ['.oooo.', 'obbwbo', 'oooooo', '..ss..', '..ss..'];
const MUSH_C: ColorMap = { o: '#4a1a10', r: '#d8343a', w: '#ffffff', b: '#a8743e', s: '#efe4cc' };
const FERN = [
  '.....g.....',
  '..g..g..g..',
  '...g.G.g...',
  '.g..gGg..g.',
  '..g.gGg.g..',
  '...gGGGg...',
  '.....G.....',
];
const FERN_C: ColorMap = { g: '#5fa84a', G: '#3f7432' };
const FEATHER = ['.......ww', '....wwwg.', '..wwwwg..', '.wwgg....', 'og.......'];
const FEATHER_C: ColorMap = { w: '#f4f0e6', g: '#b8b0a4', o: '#5a4a3a' };
const LOG = [
  '.ooooooooooooooo...',
  'oMmMMmMMbbbMMmMbo..',
  'obbbbbbbbbbbbbbbrro',
  'oBbbbBbbbbBbbbbbrRo',
  '.ooooooooooooooooo.',
];
const LOG_C: ColorMap = { o: '#3a2414', b: '#8a5a32', B: '#6a4426', r: '#c8945a', R: '#a07040', M: '#5f8a3a', m: '#7aa84a' };

const HEDGEHOG_HOUSE = [
  '.....oooo.....',
  '...ooMMMMoo...',
  '.ooMMmMMmMMoo.',
  'oMMmMMMMMMmMMo',
  'oooooooooooooo',
  '.owwWwwwwWwwo.',
  '.owwooooowwwo.',
  '.owoKKKKKoWwo.',
  '.oWoKKKKKowwo.',
  '.owoKKKKKowWo.',
  '.oooooooooooo.',
];
const HOUSE_C: ColorMap = { o: '#3a2414', M: '#4f8a3c', m: '#7cc45a', w: '#b07a44', W: '#8a5a32', K: '#2a180c' };
const CAN = ['...oooo...', '..o....o..', 'oogggggo.o', 'oglggggooo', 'oggggggo..', '.oooooo...'];
const CAN_C: ColorMap = { o: '#2a4a3a', g: '#4f9a7a', l: '#8fd0b0' };
const GNOME = [
  '...o...',
  '..oro..',
  '..orro.',
  '.orrrro',
  '.orrrro',
  '.ooooo.',
  '.ofpfo.',
  '.owwwo.',
  '.owwwo.',
  'obbwbbo',
  'obbbbbo',
  '.oo.oo.',
];
const GNOME_C: ColorMap = { o: '#2a1a14', r: '#d8343a', f: '#f2c8a0', p: '#e07a7a', w: '#ffffff', b: '#4a6ad8' };
const APPLE = ['..g..', '.ogo.', 'orrro', 'orwro', 'orrro', '.ooo.'];
const APPLE_C: ColorMap = { o: '#5a1a10', r: '#d8343a', w: '#ff9a9a', g: '#4f8a3c' };
const SNAIL = [
  '..oooo...',
  '.obsbbo..',
  '.obbsbo.e',
  'oobbbbooy',
  'yyyyyyyy.',
];
const SNAIL_C: ColorMap = { o: '#5a3a1a', b: '#c8944a', s: '#8a5a2a', y: '#d8c8a0', e: '#2a2a2a' };

// Zimmer
const CUSHION = ['.oooooooooooo.', 'oppPppPppPpppo', 'opPppPppPppPpo', 'oooooooooooooo'];
const CUSHION_C: ColorMap = { o: '#7a2a3a', p: '#e86a8a', P: '#f4a8c0' };
const CATGRASS = ['.g..g.g..', '..g.gg.g.', '.g.gggg..', '..ggggg..', '.ooooooo.', '.ottttto.', '..ottto..', '..ooooo..'];
const CATGRASS_C: ColorMap = { g: '#6ac04a', o: '#6a3a1a', t: '#c0623a' };
const WOOL = ['.ooo.', 'obwbo', 'obbwo', 'owbbo', '.ooo.'];
const WOOL_C: ColorMap = { o: '#4a2a6a', b: '#9a6ad8', w: '#c8a8f0' };
const MOUSE_PORTRAIT = [
  '..oo........oo..',
  '.oppo......oppo.',
  '.oppooooooooppo.',
  '..oggggggggggo..',
  '.ogggegggeggggo.',
  '.oggggggggggggo.',
  '..oggggnngggo...',
  '...oogggggoo....',
  '.....ooooo......',
  '................',
];
const MOUSE_PORTRAIT_C: ColorMap = { o: '#4a4248', g: '#9a929a', p: '#f2a6b2', e: '#111111', n: '#e07a8a' };
const TOYMOUSE = ['...pp..', '.ooggo.', 'oggggen', 't.oooo.'];
const TOYMOUSE_C: ColorMap = { o: '#4a4248', g: '#9a929a', p: '#f2a6b2', e: '#111111', n: '#e07a8a', t: '#c89aa0' };
const WATERBOWL = ['.ooooooo.', 'olllllllo', '.obbbbbo.', '..ooooo..'];
const WATER_C: ColorMap = { o: '#5a6a7a', l: '#7ac0f0', b: '#9aa8b8' };
const HARNESS = ['...oo...', '..o..o..', '.obbbbo.', 'ob.oo.bo', 'ob.oo.bo', '.obbbbo.', '..oyyo..', '...oo...'];
const HARNESS_C: ColorMap = { o: '#1a3a6a', b: '#3a6ad8', y: '#c8c8c8' };
const COLLAR = ['..oo..', '.o..o.', 'og..go', 'og..go', '.oggo.', '..yy..', '.yYYy.', '..yy..'];
const COLLAR_C: ColorMap = { o: '#1e5a2a', g: '#3aa04a', y: '#c89a2a', Y: '#f4d24a' };
const MAT = ['oooooooooooooooooooooo', 'obbbbbbbbbbbbbbbbbbbbo', 'obyybyybyybyybyybyybbo', 'obbbbbbbbbbbbbbbbbbbbo', 'oooooooooooooooooooooo'];
const MAT_C: ColorMap = { o: '#5a3a1a', b: '#a8743e', y: '#e8c870' };
const PAW = [
  '..oo....oo..',
  '.ohoo..ohoo.',
  '.oooo..oooo.',
  '..oo....oo..',
  'oo........oo',
  'hoo.oooo.hoo',
  'oo.ohoooo.oo',
  '..ohooooooo.',
  '.oooooooooo.',
  '.oooooooooo.',
  '..oooooooo..',
  '...oooooo...',
];

// Hühnerhof
const TROUGH_WATER = ['...oo...', '..oWWo..', '.oooooo.', 'ollllllo', 'ommmmmmo', '.oooooo.'];
const TROUGH_C: ColorMap = { o: '#4a5058', W: '#c8d0d8', l: '#7ac0f0', m: '#8a949e' };

// ---------- Platzierungen ----------
export interface DecorTarget {
  x: number; // wo das Tier hinläuft (Mitte)
  kind: 'sniff' | 'nudge' | 'drink' | 'dustbath' | 'sill';
}

/** Interaktionspunkte je Tierart */
export function decorTargets(species: string): DecorTarget[] {
  switch (species) {
    case 'fox':
      return [{ x: 38, kind: 'sniff' }];
    case 'hedgehog':
      return [{ x: 20, kind: 'sniff' }];
    case 'cat':
      return [{ x: 49.5, kind: 'nudge' }, { x: 43, kind: 'sill' }];
    case 'dog':
      return [{ x: 27, kind: 'drink' }];
    case 'chicken':
      return [{ x: 8, kind: 'dustbath' }];
  }
  return [];
}

/** Ferne Ebene (Wald: Bach mit umgestürztem Baumstamm als Brücke) */
export function drawDecorFar(ctx: CanvasRenderingContext2D, scene: SceneKind) {
  if (scene !== 'forest') return;
  for (let x = 14; x < 41; x += P) {
    const y = 31 + Math.round(Math.sin(x / 5) * 1) / 2;
    rect(ctx, '#3a6a8a', x, y - P, P, P);
    rect(ctx, '#5aa6d6', x, y, P, 1);
    rect(ctx, '#8ccaf0', x, y, P, P);
    rect(ctx, '#4a7a3a', x, y + 1, P, P);
  }
  put(ctx, LOG, LOG_C, 23, 29.5);
}

let sunflowersOff = false;

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
function sunflower(ctx: CanvasRenderingContext2D, x: number, top: number, sunX: number) {
  if (sunflowersOff) return; // im Winter keine Sonnenblumen
  rect(ctx, '#3f7a30', x, top + 2, P, GROUND_Y - top - 2);
  for (const [ly, dir] of [[top + 6, -1], [top + 9, 1], [top + 12, -1]] as [number, number][]) {
    rect(ctx, '#4f9a3a', x + dir * P, ly, P, P);
    rect(ctx, '#4f9a3a', x + dir * 1, ly + P, P, P);
  }
  const lean = sunX < x - 8 ? -1 : sunX > x + 8 ? 1 : 0;
  const hx = x + 0.25 + lean * 0.5;
  pixelCircle(ctx, hx, top + 1.5, 2.2, '#f2c63b');
  pixelCircle(ctx, hx, top + 1.5, 1.6, '#e8a020');
  pixelCircle(ctx, hx, top + 1.5, 1.1, '#6a3a1a');
  rect(ctx, '#8a5a2a', hx - 0.5, top + 1, P, P);
}

/** Nahe Ebene + Zimmer: statische Deko (liegt im Hintergrund-Cache) */
export function drawDecorNear(ctx: CanvasRenderingContext2D, species: string, sunX: number, winter = false) {
  sunflowersOff = winter;
  switch (species) {
    case 'fox':
      put(ctx, FERN, FERN_C, 13.5, 35.5);
      put(ctx, MUSH_RED, MUSH_C, 17, 38);
      put(ctx, MUSH_BROWN, MUSH_C, 20, 38.5);
      put(ctx, MUSH_BROWN, MUSH_C, 15.5, 39.5);
      put(ctx, FEATHER, FEATHER_C, 36, 41.5);
      break;
    case 'hedgehog':
      put(ctx, HEDGEHOG_HOUSE, HOUSE_C, 55, 22.5);
      sunflower(ctx, 18, 16, sunX);
      sunflower(ctx, 22, 18, sunX);
      put(ctx, GNOME, GNOME_C, 26, 27);
      put(ctx, CAN, CAN_C, 29.5, 30.5);
      put(ctx, APPLE, APPLE_C, 19, 43);
      break;
    case 'cat': {
      // Wandregal mit Büchern und Katzenfigur über dem Kratzbaum
      shelf(ctx, 4, 9, ['#c0462e', '#3a6ab0', '#e8b030', '#4f8a3c', '#8a4ab0']);
      put(ctx, ['.o.o.', 'ooooo', 'okkko', '.okko', '.ooo.'], { o: '#2a2a2e', k: '#4a4a52' }, 13, 6.5);
      // Bild einer Maus statt der Landschaft
      rect(ctx, '#6a4a28', 21, 8, 11, 8);
      rect(ctx, '#a07a4a', 21, 8, 11, P);
      rect(ctx, '#f4ead8', 22, 9, 9, 6);
      put(ctx, MOUSE_PORTRAIT, MOUSE_PORTRAIT_C, 22.5, 9.5);
      // Spielzeug vor dem Körbchen, mit Abstand zum rechten Rand
      put(ctx, WOOL, WOOL_C, 43, 43.5);
      for (let i = 0; i < 6; i++) rect(ctx, '#9a6ad8', 45.5 + i * 0.5, 45 + (i % 2) * 0.5, P, P);
      put(ctx, TOYMOUSE, TOYMOUSE_C, 48.5, 44.5);
      break;
    }
    case 'dog':
      // Bücherregal mit kleinem Knochen
      shelf(ctx, 4, 9, ['#3a6ab0', '#c0462e', '#4f8a3c', '#e8b030', '#6a4a8a']);
      put(ctx, ['oo..oo', 'owoowo', '.owwo.', 'owoowo', 'oo..oo'].map((r) => r), { o: '#8a7a5e', w: '#f4ecd8' }, 12.5, 6.5);
      // Pfotenbild: Goldrahmen, Passepartout, große Pfote
      rect(ctx, 'rgba(0,0,0,0.15)', 21.5, 8.5, 11, 9);
      rect(ctx, '#8a6a2a', 21, 8, 11, 9);
      rect(ctx, '#d8b058', 21, 8, 11, P);
      rect(ctx, '#d8b058', 21, 8, P, 9);
      rect(ctx, '#f6efe0', 22, 9, 9, 7);
      rect(ctx, '#e8dcc4', 22.5, 9.5, 8, 6);
      put(ctx, PAW, { o: '#7a4a24', h: '#a8703a' }, 23.5, 9.75);
      // Hakenleiste unter dem Regal: Leine, Geschirr, Halsband mit Marke
      rect(ctx, '#6a4424', 4, 12.5, 13, 1);
      rect(ctx, '#8e6238', 4, 12.5, 13, P);
      for (const hx of [5.5, 10, 14.5]) rect(ctx, '#7a7a7a', hx, 13.5, P, 1);
      for (let i = 0; i < 12; i++) rect(ctx, '#d8343a', 5.5, 14.5 + i * 0.5, P, P);
      put(ctx, ['.ooo.', 'o...o', 'o...o', '.ooo.'], { o: '#d8343a' }, 4.5, 20.5);
      put(ctx, HARNESS, HARNESS_C, 8.25, 14.5);
      put(ctx, COLLAR, COLLAR_C, 13, 14.5);
      put(ctx, WATERBOWL, WATER_C, 24.5, 42.5);
      break;
    case 'chicken': {
      // Sonnenblumen am Zaun, Sandbad-Kuhle, Tränke, Leiter, Nistkasten
      sunflower(ctx, 3, 16, sunX);
      sunflower(ctx, 7.5, 18.5, sunX);
      for (let y = 43; y < 47; y += P)
        for (let x = 3; x < 14; x += P) {
          const d = ((x - 8.5) / 5.5) ** 2 + ((y - 45) / 2) ** 2;
          if (d < 1) rect(ctx, d < 0.5 ? '#b8923a' : '#c8a24a', x, y, P, P);
        }
      put(ctx, TROUGH_WATER, TROUGH_C, 26, 41.5);
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

/** Wetterhahn auf dem Stalldach; zeigt in Windrichtung */
export function drawWeathervane(ctx: CanvasRenderingContext2D, wind: number) {
  const x = 49;
  rect(ctx, '#3a3a3a', x, 9.5, P, 6);
  rect(ctx, '#3a3a3a', x - 2, 11, 4.5, P);
  const ROOSTER = ['.cc...dd', 'oooo.ddd', '.ooooood', '..oooo..', '...o....'];
  const rows = wind < 0 ? ROOSTER : ROOSTER.map((r) => [...r].reverse().join(''));
  put(ctx, rows, { o: '#2a2a2a', c: '#d8343a', d: '#2a2a2a' }, x - 1.75, 6.5);
  // Pfeil zeigt dorthin, wohin der Wind weht
  rect(ctx, '#2a2a2a', wind > 0 ? x + 2 : x - 2.5, 10.5, 1, 1.5);
}

/** Bewegte Deko pro Bild */
export function drawDecorAnim(ctx: CanvasRenderingContext2D, species: string, t: number) {
  if (species === 'fox') {
    // Lichtreflexe auf dem Bach
    for (let i = 0; i < 4; i++) {
      const x = 14 + ((t / 90 + i * 7) % 26);
      if (Math.floor(t / 300 + i) % 3) continue;
      const y = 31 + Math.round(Math.sin(x / 5) * 1) / 2;
      rect(ctx, '#ffffff', Math.round(x * 2) / 2, y, P, P);
    }
  }
  if (species === 'hedgehog') {
    // Schnecke kriecht ganz langsam hin und her
    const span = 16;
    const k = (t / 1000 / 40) % 2;
    const pos = k < 1 ? k : 2 - k;
    const flip = k >= 1;
    const rows = flip ? SNAIL.map((r) => [...r].reverse().join('')) : SNAIL;
    put(ctx, rows, SNAIL_C, 12 + pos * span, 45);
  }
}

/** Fensterbank-Deko (über dem Fensterbrett gezeichnet) */
export function drawSillDecor(ctx: CanvasRenderingContext2D, species: string, sill: { x: number; y: number; w: number }) {
  if (species !== 'cat') return;
  put(ctx, CUSHION, CUSHION_C, sill.x + 2, sill.y - 1.5);
  put(ctx, CATGRASS, CATGRASS_C, sill.x + sill.w - 5.5, sill.y - 4);
}

/** Vordergrund-Deko (vor dem Schlafplatz) */
export function drawFrontDecorFor(ctx: CanvasRenderingContext2D, species: string) {
  if (species === 'dog') put(ctx, MAT, MAT_C, 36.5, 45.5);
}

/** Eier im Nistkasten (Huhn) */
export function drawNestEggs(ctx: CanvasRenderingContext2D, n: number) {
  for (let i = 0; i < Math.min(3, n); i++) put(ctx, ['.oo.', 'owwo', '.oo.'], { o: '#c8b090', w: '#fbf6ee' }, 60.5 + i, 31.5 - (i % 2) * 0.5);
}
export const NEST_BOX = { x: 59.5, y: 28.5, w: 4.5, h: 5.5 };
