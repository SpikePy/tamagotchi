// Zimmer (Katze, Hund), nativ im Bildpixel-Raster gemalt: Tapete, Wandvertäfelung, Dielen, Fenster mit Vorhängen.
import { RES } from './pixels';
import { Painter, PW, PH, gradient, hash, mix, vnoise } from './paint';
import { type Sky, skyStops, sunMoon } from './outdoor';
import type { Season } from './season';

export interface RoomColors {
  wall: string;
  wallDark: string;
  floor: string;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FLOOR = 40 * RES; // Bodenkante in Bildpixeln
const RAIL = 122; // Stuhlleiste
const BASEBOARD = FLOOR - 7;

const lighten = (c: string, k: number) => mix(c, '#ffffff', k);
const darken = (c: string, k: number) => mix(c, '#000000', k);

/** Vorhangfarbe je Tierart */
const CURTAIN: Record<string, string> = { cat: '#b8604c', dog: '#4f7aa8' };

function wall(p: Painter, c: RoomColors) {
  const g = gradient([darken(c.wall, 0.05), c.wall, lighten(c.wall, 0.04)], 6);
  for (let y = 0; y < RAIL; y++) for (let x = 0; x < PW; x++) p.px(x, y, g(x, y, y / RAIL));
  // Streifentapete: Doppellinie alle 32 Pixel
  const stripe = mix(c.wall, c.wallDark, 0.6);
  for (let x0 = 0; x0 < PW; x0 += 32) {
    p.rect(x0, 0, 1, RAIL, stripe);
    p.rect(x0 + 3, 0, 1, RAIL, stripe);
    p.rect(x0 + 1, 0, 2, RAIL, lighten(c.wall, 0.2));
  }
  // Ornamente zwischen den Streifen, versetzt
  const MOTIF = ['...d...', '..dld..', '.d.l.d.', 'd.lll.d', '.d.l.d.', '..dld..', '...d...', '...d...', '..d.d..'];
  const col = { d: mix(c.wall, c.wallDark, 0.75), l: lighten(c.wall, 0.35) };
  for (let row = 0, y = 8; y < RAIL - 10; y += 22, row++) for (let x = 14 + (row % 2) * 16; x < PW; x += 32) p.map(MOTIF, col, x - 3, y);
  // Stuhlleiste
  p.rect(0, RAIL, PW, 1, darken(c.wallDark, 0.35));
  p.rect(0, RAIL + 1, PW, 1, lighten(c.wallDark, 0.45));
  p.rect(0, RAIL + 2, PW, 2, lighten(c.wallDark, 0.15));
  p.rect(0, RAIL + 4, PW, 1, darken(c.wallDark, 0.3));
  p.rect(0, RAIL + 5, PW, 1, 'rgba(0,0,0,0.12)');
  // Wandvertäfelung mit Füllungen
  const panel = mix(c.wallDark, c.wall, 0.35);
  p.rect(0, RAIL + 5, PW, BASEBOARD - RAIL - 5, panel);
  for (let x0 = 4; x0 < PW; x0 += 42) {
    const x1 = x0 + 34;
    const y0 = RAIL + 9;
    const y1 = BASEBOARD - 4;
    p.rect(x0, y0, x1 - x0, 1, darken(panel, 0.18));
    p.rect(x0, y0, 1, y1 - y0, darken(panel, 0.18));
    p.rect(x0, y1, x1 - x0 + 1, 1, lighten(panel, 0.35));
    p.rect(x1, y0, 1, y1 - y0, lighten(panel, 0.35));
    p.rect(x0 + 2, y0 + 2, x1 - x0 - 3, y1 - y0 - 3, lighten(panel, 0.06));
  }
  // Fußleiste
  const bb = darken(c.wallDark, 0.28);
  p.rect(0, BASEBOARD, PW, FLOOR - BASEBOARD, bb);
  p.rect(0, BASEBOARD, PW, 1, lighten(bb, 0.45));
  p.rect(0, BASEBOARD + 1, PW, 1, lighten(bb, 0.2));
  p.rect(0, FLOOR - 1, PW, 1, darken(bb, 0.35));
}

function floor(p: Painter, c: RoomColors) {
  const heights = [6, 7, 8, 9];
  let y0 = FLOOR;
  heights.forEach((h, row) => {
    let x = -Math.floor(hash(row, 0, 3) * 60);
    let plank = 0;
    while (x < PW) {
      const len = 52 + Math.floor(hash(row, plank, 4) * 50);
      const tint = (hash(row, plank, 5) - 0.5) * 0.14;
      const base = tint > 0 ? lighten(c.floor, tint) : darken(c.floor, -tint);
      const depth = 0.12 - row * 0.03; // hinten etwas dunkler
      for (let yy = y0; yy < y0 + h && yy < PH; yy++)
        for (let xx = Math.max(0, x); xx < Math.min(PW, x + len); xx++) {
          let col = darken(base, Math.max(0, depth));
          const gr = vnoise(xx / 16, (yy - y0) / 2.4 + row * 7 + plank * 3, 8);
          if (gr > 0.72) col = darken(col, 0.12);
          else if (gr < 0.22) col = lighten(col, 0.07);
          if (yy === y0) col = darken(c.floor, 0.45); // Fuge
          else if (yy === y0 + 1) col = lighten(col, 0.16); // Lichtkante
          if (xx === x) col = darken(c.floor, 0.4); // Stoßfuge
          else if (xx === x + 1) col = lighten(col, 0.1);
          p.px(xx, yy, col);
        }
      // Astloch
      if (hash(row, plank, 6) > 0.55) {
        const kx = x + 8 + Math.floor(hash(row, plank, 7) * (len - 16));
        const ky = y0 + 2 + Math.floor(h / 2) - 1;
        p.map(['.oo.', 'okko', '.oo.'], { o: darken(base, 0.25), k: darken(base, 0.45) }, kx, ky);
      }
      x += len;
      plank++;
    }
    y0 += h;
  });
  // Schatten unter der Fußleiste
  p.rect(0, FLOOR, PW, 1, 'rgba(0,0,0,0.25)');
}

/** Fensterrahmen, Ausblick (Himmel, Hügel, Bäume) und Vorhänge – im Hintergrund-Cache */
function windowBack(p: Painter, win: Rect, sky: Sky, season: Season, curtain: string, clock: number) {
  const { x, y, w, h } = win;
  // äußerer Rahmen mit Profil
  const fr = '#6a4e34';
  p.rect(x - 6, y - 6, w + 12, h + 12, darken(fr, 0.3));
  p.rect(x - 5, y - 5, w + 10, h + 10, fr);
  p.rect(x - 5, y - 5, w + 10, 1, lighten(fr, 0.35));
  p.rect(x - 5, y - 5, 1, h + 10, lighten(fr, 0.25));
  p.rect(x - 2, y - 2, w + 4, h + 4, darken(fr, 0.15));
  p.rect(x - 1, y - 1, w + 2, h + 2, darken(fr, 0.45));
  // Himmel
  const g = gradient(skyStops(sky), 10);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) p.px(xx, yy, g(xx, yy, (yy - y) / h));
  if (!sky.day)
    for (let i = 0; i < 18; i++) p.px(x + Math.floor(hash(i, 1, 8) * w), y + Math.floor(hash(i, 2, 8) * h * 0.7), hash(i, 3, 8) > 0.6 ? '#ffffff' : '#c8c8e0');
  const sx = x - 20 + sky.f * (w + 40);
  const sy = y + h - Math.sin(Math.PI * sky.f) * (h - 6) - 4;
  sunMoon(p, sx, sy, sky.day, win);
  // Ausblick: Hügel und Baumkronen unten im Fenster
  const night = !sky.day;
  const hillC = season === 'winter' ? '#e4ecf4' : season === 'autumn' ? '#b8a860' : '#86b866';
  const treeC = season === 'winter' ? '#9aaab4' : season === 'autumn' ? '#c8742c' : '#4e8a42';
  for (let xx = x; xx < x + w; xx++) {
    const top = Math.round(y + h - 10 + Math.sin(xx / 13) * 3 + Math.sin(xx / 5) * 1);
    for (let yy = top; yy < y + h; yy++) p.px(xx, yy, night ? '#2a3448' : yy === top ? lighten(hillC, 0.2) : hillC);
  }
  for (const [tx, r] of [[x + 14, 7], [x + 24, 5], [x + w - 16, 8]] as [number, number][]) {
    const ty = y + h - 13;
    for (let yy = ty - r; yy <= ty + r; yy++)
      for (let xx = tx - r; xx <= tx + r; xx++) {
        const d = ((xx - tx) / r) ** 2 + ((yy - ty) / (r * 0.9)) ** 2;
        if (d > 1 + (vnoise(xx / 2, yy / 2, tx) - 0.5) * 0.5) continue;
        const lit = xx - tx + (yy - ty) < -r * 0.3;
        p.px(xx, yy, night ? '#1e2638' : lit ? lighten(treeC, 0.18) : d > 0.7 ? darken(treeC, 0.2) : treeC);
      }
    for (let yy = ty + r - 1; yy < y + h - 2; yy++) p.px(tx, yy, night ? '#1a2030' : '#5a4030');
  }
  void clock;
  // Vorhangstange mit Endknäufen
  const rodY = y - 12;
  p.rect(x - 22, rodY, w + 44, 3, '#5a3e26');
  p.rect(x - 22, rodY, w + 44, 1, '#a07a50');
  for (const kx of [x - 25, x + w + 22]) p.map(['.kk.', 'kllk', 'kkkk', '.kk.'], { k: '#5a3e26', l: '#c49a68' }, kx - 1, rodY - 1);
  // Vorhänge links und rechts, mit Falten und Raffhalter
  const sill = y + h + 4;
  const drawCurtain = (x0: number, side: -1 | 1) => {
    for (let yy = rodY + 3; yy < sill; yy++) {
      const tie = y + h * 0.55;
      const narrow = yy < tie ? 1 - ((yy - rodY) / (tie - rodY)) * 0.42 : 0.58 + ((yy - tie) / (sill - tie)) * 0.32;
      const wd = Math.round(18 * narrow);
      for (let k = 0; k < wd; k++) {
        const xx = side < 0 ? x0 + 18 - wd + k : x0 + k;
        const fold = Math.sin((k / wd) * Math.PI * 3.2 + (side < 0 ? 0 : 1));
        let col = curtain;
        if (fold > 0.55) col = lighten(curtain, 0.18);
        else if (fold < -0.55) col = darken(curtain, 0.25);
        else if (fold < -0.1) col = darken(curtain, 0.1);
        if (k === 0 || k === wd - 1) col = darken(curtain, 0.42);
        if (yy === sill - 1) col = darken(curtain, 0.35);
        p.px(xx, yy, col);
      }
      if (Math.abs(yy - tie) < 2) for (let k = 0; k < wd; k++) p.px(side < 0 ? x0 + 18 - wd + k : x0 + k, yy, yy < tie ? '#e8c860' : '#b89030');
    }
    // Ringe an der Stange
    for (let k = 2; k < 18; k += 5) p.px(x0 + k, rodY + 3, '#3a2a1a');
  };
  drawCurtain(x - 24, -1);
  drawCurtain(x + w + 6, 1);
}

/** Glas-Spiegelung, Fensterkreuz und Fensterbrett (liegen über Wolken, Vogel und Regen) */
function windowFront(p: Painter, win: Rect) {
  const { x, y, w, h } = win;
  for (const [off, wd] of [[10, 5], [19, 2]] as [number, number][])
    for (let k = 0; k < h; k++)
      for (let j = 0; j < wd; j++) {
        const xx = x + off + Math.floor((h - k) / 2) + j;
        if (xx < x + w) p.px(xx, y + k, 'rgba(255,255,255,0.16)');
      }
  const m = '#6a4e34';
  const cxm = x + w / 2;
  const cym = y + h / 2;
  p.rect(cxm - 2, y, 4, h, m);
  p.rect(cxm - 2, y, 1, h, lighten(m, 0.3));
  p.rect(cxm + 1, y, 1, h, darken(m, 0.3));
  p.rect(x, cym - 2, w, 4, m);
  p.rect(x, cym - 2, w, 1, lighten(m, 0.3));
  p.rect(x, cym + 1, w, 1, darken(m, 0.3));
  // Fensterbrett
  const sy = y + h + 4;
  const sx = x - 12;
  const sw = w + 24;
  p.rect(sx, sy, sw, 8, '#8a6a46');
  p.rect(sx, sy, sw, 1, '#c8a47a');
  p.rect(sx, sy + 1, sw, 2, '#a8865c');
  p.rect(sx, sy + 6, sw, 1, '#5e4630');
  p.rect(sx, sy + 7, sw, 1, '#4a3622');
  p.rect(sx + 4, sy + 8, sw - 8, 2, 'rgba(0,0,0,0.18)');
  for (let xx = sx; xx < sx + sw; xx++) if (vnoise(xx / 10, 1, 3) > 0.7) p.px(xx, sy + 4, '#7a5c3c');
  p.rect(x - 4, y + h, w + 8, 4, darken(m, 0.2));
  p.rect(x - 4, y + h, w + 8, 1, lighten(m, 0.2));
}

/** Zimmer-Hintergrund (Wand, Boden, Fenster mit Ausblick und Vorhängen) */
export function drawRoomBack(ctx: CanvasRenderingContext2D, c: RoomColors, win: Rect, sky: Sky, season: Season, species: string, clock: number) {
  const p = new Painter(ctx);
  wall(p, c);
  floor(p, c);
  const W4 = { x: win.x * RES, y: win.y * RES, w: win.w * RES, h: win.h * RES };
  windowBack(p, W4, sky, season, CURTAIN[species] ?? '#8a6aa8', clock);
  p.commit(ctx);
}

const frontCache = new Map<string, HTMLCanvasElement>();
export function drawRoomWindowFront(ctx: CanvasRenderingContext2D, win: Rect) {
  const key = `${win.x},${win.y},${win.w},${win.h}`;
  let cv = frontCache.get(key);
  if (!cv) {
    const p = new Painter();
    windowFront(p, { x: win.x * RES, y: win.y * RES, w: win.w * RES, h: win.h * RES });
    cv = p.toCanvas();
    frontCache.set(key, cv);
  }
  ctx.drawImage(cv, 0, 0, PW / RES, PH / RES);
}

