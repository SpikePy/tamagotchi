// Deko-Gegenstände, von Grund auf in voller Rasterdichte gezeichnet (4 Bildpixel je Spiel-Einheit).
// Gleiche Maße wie die alten Pixel-Grafiken, damit Positionen und Interaktionen gleich bleiben.
import { RES, drawMap, markHires, withShades, type ColorMap } from './pixels';
import { Raster, type Shape, ell, hash, inter, line2, output, poly, tube, union } from './rig';

export interface Prop {
  map: string[];
  colors: ColorMap;
  w: number;
  h: number;
}

const rect = (x0: number, y0: number, x1: number, y1: number): Shape => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const minus = (a: Shape, b: Shape): Shape => ({ ins: (x, y) => a.ins(x, y) && !b.ins(x, y), box: a.box });

function make(wU: number, hU: number, colors: ColorMap, build: (r: Raster, W: number, H: number) => void): Prop {
  const r = new Raster(Math.round(wU * RES), Math.round(hU * RES));
  build(r, r.w, r.h);
  return { map: markHires(output(r, false)), colors: withShades(colors), w: wU, h: hU };
}
const cache = new Map<string, Prop>();
function prop(key: string, f: () => Prop): Prop {
  let p = cache.get(key);
  if (!p) {
    p = f();
    cache.set(key, p);
  }
  return p;
}

export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, x: number, y: number, flip = false) {
  drawMap(ctx, p.map, p.colors, x, y, flip);
}

// ------------------------------------------------------------------ Wald

export const mushRed = () =>
  prop('mushRed', () =>
    make(4, 3, { o: '#4a1a10', a: '#d8343a', b: '#efe4cc', c: '#c8b8a0', k: '#ffffff' }, (r) => {
      r.fill(ell(8, 9, 2.6, 3.2), 'b');
      const cap = inter(ell(8, 6.5, 7.6, 6), rect(0, 0, 16, 7.5));
      r.fill(cap, 'a');
      r.seg(2, 7, 14, 7, 'c');
      for (const [x, y, s] of [[5, 3, 1.4], [10, 2.5, 1.1], [12, 5, 1], [7, 5.5, 0.9]] as [number, number, number][]) r.fill(ell(x, y, s, s * 0.8), 'k', { line: false, flat: true });
    }),
  );
export const mushBrown = () =>
  prop('mushBrown', () =>
    make(3, 2.5, { o: '#3a2010', a: '#a8743e', b: '#efe4cc', k: '#e8d0a0' }, (r) => {
      r.fill(ell(6, 7.5, 2, 2.6), 'b');
      r.fill(inter(ell(6, 5.5, 5.6, 5), rect(0, 0, 12, 6)), 'a');
      r.dot(4, 2, 'k');
      r.dot(5, 2, 'k');
    }),
  );
export const fern = () =>
  prop('fern', () =>
    make(5.5, 3.5, { o: '#1e3a18', a: '#3f7432', b: '#5fa84a', c: '#86c262' }, (r, W, H) => {
      const base: [number, number] = [W / 2, H - 0.5];
      for (const [ex, ey, i] of [[1, 5, 0], [4, 1, 1], [W / 2, 0, 2], [W - 4, 1, 3], [W - 1, 5, 4]] as [number, number, number][]) {
        const mx = (base[0] + ex) / 2 + (ex < base[0] ? -1 : ex > base[0] ? 1 : 0);
        const my = (base[1] + ey) / 2 - 2;
        for (let k = 0; k <= 14; k++) {
          const t = k / 14;
          const x = (1 - t) * (1 - t) * base[0] + 2 * (1 - t) * t * mx + t * t * ex;
          const y = (1 - t) * (1 - t) * base[1] + 2 * (1 - t) * t * my + t * t * ey;
          r.dot(x, y, 'a');
          if (k % 2 === 0 && k > 1) {
            const len = 2.2 * (1 - t) + 0.6;
            r.seg(x, y, x - len, y - len * 0.6, i % 2 ? 'b' : 'c');
            r.seg(x, y, x + len, y - len * 0.6, 'b');
          }
        }
      }
    }),
  );
export const feather = () =>
  prop('feather', () =>
    make(4.5, 2.5, { o: '#6a5a4a', a: '#f4f0e6', b: '#c8c0b4', c: '#8a7a6a' }, (r) => {
      const v = tube([2, 9], [7, 7], [12, 3], [17, 0.8], (t) => (t < 0.12 ? 0.3 : 0.6 + Math.sin(Math.PI * Math.min(1, (t - 0.1) / 0.9)) * 2.6));
      r.fill(v, 'a');
      for (let i = 3; i < 15; i += 2) r.seg(i, 9 - (i - 2) * 0.55, i + 1.5, 9 - (i - 2) * 0.55 - 2.2, 'b');
      r.seg(1, 9.5, 16, 1.5, 'c');
    }),
  );
export const log = () =>
  prop('log', () =>
    make(9.5, 2.5, { o: '#2e1c0e', a: '#7a5030', b: '#5f8a3a', c: '#4a3018', d: '#c8945a', p: '#9a6a40' }, (r, W, H) => {
      r.fill(union(rect(3, 1, W - 5, H - 1), ell(3, H / 2, 2.5, H / 2 - 1)), 'a');
      for (let x = 5; x < W - 6; x += 3) r.seg(x, 3 + (x % 2), x + 2, 3 + (x % 2), 'c');
      for (let x = 4; x < W - 6; x++) if (hash(x, 0, 3) > 0.35) r.dot(x, 1 + (hash(x, 1, 3) > 0.6 ? 1 : 0), 'b'); // Moos
      r.fill(ell(W - 5, H / 2, 3.2, H / 2 - 0.5), 'd');
      r.fill(ell(W - 5, H / 2, 1.6, 2), 'p', { line: false });
      r.dot(W - 5, H / 2, 'c');
    }),
  );

// ------------------------------------------------------------------ Garten

export const hedgehogHouse = () =>
  prop('hhouse', () =>
    make(7, 5.5, { o: '#2a180c', a: '#b07a44', b: '#4f8a3c', c: '#8a5a32', d: '#7cc45a', k: '#1e1208' }, (r, W, H) => {
      r.fill(rect(3, 8, W - 3, H - 1), 'a');
      for (let x = 7; x < W - 4; x += 4) r.seg(x, 9, x, H - 2, 'c');
      r.fill(inter(ell(W / 2, H - 1, 5.5, 9), rect(0, 0, W, H - 1)), 'k');
      r.fill(inter(ell(W / 2, 8.5, W / 2, 8), rect(0, 0, W, 9.5)), 'b');
      for (let x = 2; x < W - 2; x += 2) if (hash(x, 2, 5) > 0.3) r.seg(x, 9 - (hash(x, 3, 5) > 0.5 ? 1 : 0) - Math.round((1 - ((x - W / 2) / (W / 2)) ** 2) * 7), x + 1, 7 - Math.round((1 - ((x - W / 2) / (W / 2)) ** 2) * 7), 'd');
    }),
  );
export const wateringCan = () =>
  prop('can', () =>
    make(5, 3, { o: '#1e3a2e', a: '#4f9a7a', b: '#8fd0b0', c: '#3a7a5e' }, (r, W, H) => {
      r.fill(tube([4, 5], [3, 0], [11, 0], [11, 4], () => 1), 'c');
      r.fill(line2(12, H - 4, W - 2, 2, 1.1), 'a');
      r.fill(ell(W - 1.5, 2, 1.3, 1.6), 'a');
      r.fill(union(rect(3, 4, 13, H - 1), ell(8, 4, 5, 1.5)), 'a');
      r.fill(ell(8, 4, 3.5, 1), 'c', { line: false });
      r.seg(4, 6, 4, H - 2, 'b');
    }),
  );
export const gnome = () =>
  prop('gnome', () =>
    make(3.5, 6, { o: '#2a1a14', a: '#d8343a', b: '#f2c8a0', c: '#ffffff', d: '#4a6ad8', p: '#e07a7a', E: '#2a1a14', k: '#5a3a20' }, (r, W, H) => {
      r.fill(union(ell(W / 2 - 2.5, H - 2, 2.4, 1.6), ell(W / 2 + 2.5, H - 2, 2.4, 1.6)), 'k');
      r.fill(ell(W / 2, H - 6.5, 5.6, 4.5), 'd');
      r.fill(poly([[2, 9], [W - 2, 9], [W / 2, 18.5]]), 'c');
      r.fill(ell(W / 2, 10.5, 4, 2.6), 'b');
      r.fill(poly([[W / 2, 0], [W - 1.5, 9], [1.5, 9]]), 'a');
      r.dot(W / 2 - 2, 10, 'E');
      r.dot(W / 2 + 1, 10, 'E');
      r.fill(ell(W / 2, 11.5, 1.2, 1), 'p', { line: false, flat: true });
    }),
  );
export const apple = () =>
  prop('apple', () =>
    make(2.5, 3, { o: '#5a1a10', a: '#d8343a', b: '#4f8a3c', k: '#5a3a20' }, (r, W) => {
      r.fill(union(ell(W / 2 - 1.2, 7, 3.6, 4.4), ell(W / 2 + 1.2, 7, 3.6, 4.4)), 'a');
      r.seg(W / 2, 1, W / 2, 3, 'k');
      r.fill(ell(W / 2 + 2, 2, 1.8, 1), 'b', { line: false });
      r.dot(W / 2 - 2, 5, 'h');
    }),
  );
export const snail = () =>
  prop('snail', () =>
    make(4.5, 2.5, { o: '#4a2a10', a: '#c8944a', b: '#d8c8a0', c: '#8a5a2a', k: '#2a2a2a' }, (r, W, H) => {
      r.fill(line2(2, H - 1.8, W - 2, H - 1.8, 1.4), 'b');
      r.seg(W - 3, H - 3, W - 3.5, 2, 'k');
      r.seg(W - 2, H - 3, W - 1.2, 3, 'k');
      r.fill(ell(7.5, 4.5, 4.6, 4.2), 'a');
      for (let a = 0; a < Math.PI * 3.4; a += 0.2) {
        const rr = 0.4 + a * 0.33;
        r.dot(7.5 + Math.cos(a) * rr, 4.5 + Math.sin(a) * rr * 0.9, 'c');
      }
    }),
  );

// ------------------------------------------------------------------ Zimmer

export const cushion = () =>
  prop('cushion', () =>
    make(7, 2, { o: '#6a2232', a: '#e86a8a', b: '#f4a8c0' }, (r, W, H) => {
      r.fill(union(ell(4, H / 2, 4, H / 2 - 0.3), ell(W - 4, H / 2, 4, H / 2 - 0.3), rect(4, 0.4, W - 4, H - 0.4)), (x) => (Math.floor(x / 4) % 2 ? 'b' : 'a'));
      r.dot(W / 2, H / 2, 'o');
    }),
  );
export const catgrass = () =>
  prop('catgrass', () =>
    make(4.5, 4, { o: '#5a2a12', a: '#c0623a', b: '#d8805a', c: '#5ab83a', d: '#3f8a2a' }, (r, W, H) => {
      for (let i = 0; i < 14; i++) {
        const x0 = 5 + (i % 7) * 1.3;
        const lean = (hash(i, 1, 2) - 0.5) * 6;
        r.seg(x0, 9, x0 + lean, 1 + hash(i, 2, 2) * 4, i % 2 ? 'c' : 'd');
      }
      r.fill(poly([[4, 9], [W - 4, 9], [W - 6, H - 0.5], [6, H - 0.5]]), 'a');
      r.fill(rect(3, 8, W - 3, 10.5), 'b');
    }),
  );
export const wool = () =>
  prop('wool', () =>
    make(2.5, 2.5, { o: '#3a1e5a', a: '#9a6ad8', b: '#c8a8f0' }, (r, W, H) => {
      r.fill(ell(W / 2, H / 2, W / 2 - 0.3, H / 2 - 0.3), 'a');
      for (const k of [-2, 0, 2]) r.seg(W / 2 - 3 + k, 2 + Math.abs(k) * 0.5, W / 2 + 2 + k, H - 2, 'b');
    }),
  );
export const mousePortrait = () =>
  prop('mport', () =>
    make(8, 5, { o: '#4a4248', a: '#9a929a', p: '#f2a6b2', E: '#111111', n: '#e07a8a', c: '#6a626a' }, (r, W) => {
      for (const s of [-1, 1]) {
        r.fill(ell(W / 2 + s * 9, 6, 5, 5), 'a');
        r.fill(ell(W / 2 + s * 9, 6.5, 3, 3), 'p', { line: false });
      }
      r.fill(ell(W / 2, 12, 9.5, 6.5), 'a');
      for (const s of [-1, 1]) {
        r.fill(ell(W / 2 + s * 4, 11, 1.4, 1.8), 'E', { line: false, flat: true });
        r.dot(W / 2 + s * 4 - 0.5, 10, 'h');
        r.seg(W / 2 + s * 3, 15, W / 2 + s * 10, 14, 'c');
        r.seg(W / 2 + s * 3, 16, W / 2 + s * 10, 17, 'c');
      }
      r.fill(ell(W / 2, 15, 1.6, 1.2), 'n', { line: false, flat: true });
    }),
  );
export const toyMouse = () =>
  prop('toymouse', () =>
    make(3.5, 2, { o: '#4a4248', a: '#9a929a', p: '#f2a6b2', E: '#111111', n: '#e07a8a', c: '#c89aa0' }, (r, W, H) => {
      r.fill(tube([4, H - 2], [1, H - 1], [0.5, H - 4], [2, H - 5], () => 0.6), 'c', { line: false });
      r.fill(ell(W / 2 + 0.5, H - 3, 5, 3), 'a');
      r.fill(ell(W / 2 + 2.5, 2.5, 1.8, 1.8), 'p');
      r.dot(W / 2 + 3.5, H - 4, 'E');
      r.dot(W - 1, H - 3, 'n');
    }),
  );
const ring = (cx: number, cy: number, rx: number, ry: number, th: number) => minus(ell(cx, cy, rx, ry), ell(cx, cy, rx - th, ry - th));
export const harness = () =>
  prop('harness', () =>
    make(4, 4, { o: '#12305a', a: '#3a6ad8', b: '#c8c8c8', c: '#2a4aa8' }, (r, W, H) => {
      r.fill(ring(W / 2, 5, 4, 4, 1.6), 'a');
      r.fill(ring(W / 2, H - 5, 6.5, 4.5, 1.8), 'a');
      r.fill(rect(W / 2 - 1.2, 8, W / 2 + 1.2, H - 8), 'c');
      r.fill(rect(W / 2 - 2, H - 3, W / 2 + 2, H - 0.5), 'b');
    }),
  );
export const collar = () =>
  prop('collar', () =>
    make(3, 4, { o: '#164a20', a: '#3aa04a', b: '#e8b830', c: '#a8a8a8' }, (r, W) => {
      r.fill(ring(W / 2, 5.5, 5, 5, 1.8), 'a');
      for (let x = 2; x < W - 1; x += 3) r.dot(x, 5.5 + (x > W / 2 ? 0 : 0) - 4.5 + Math.abs(x - W / 2) * 0.4, 'c');
      r.seg(W / 2, 10, W / 2, 11, 'c');
      r.fill(ell(W / 2, 13.5, 2.6, 2.4), 'b');
      r.dot(W / 2 - 1, 12.5, 'h');
    }),
  );
export const doormat = () =>
  prop('mat', () =>
    make(11, 2.5, { o: '#4a2e14', a: '#a8743e', b: '#c8945a', c: '#6a4422' }, (r, W, H) => {
      r.fill(rect(0.5, 0.5, W - 0.5, H - 0.5), (x, y) => ((Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'b' : 'a'));
      r.fill(minus(rect(2, 2, W - 2, H - 2), rect(3, 3, W - 3, H - 3)), 'c', { line: false });
      for (const px of [W * 0.35, W * 0.65]) {
        r.fill(ell(px, H / 2 + 0.5, 1.6, 1.2), 'c', { line: false });
        for (const dx of [-1.6, 0, 1.6]) r.dot(px + dx, H / 2 - 1.8, 'c');
      }
    }),
  );
export const pawPrint = () =>
  prop('paw', () =>
    make(6, 6, { o: '#5a3418', a: '#7a4a24', b: '#a8703a' }, (r, W) => {
      r.fill(union(ell(W / 2, 16, 6.5, 5.2), ell(W / 2 - 3, 18, 3.5, 3), ell(W / 2 + 3, 18, 3.5, 3)), 'a');
      for (const [x, y] of [[4.5, 9], [9, 4.5], [15, 4.5], [19.5, 9]] as [number, number][]) r.fill(ell(x, y, 2.6, 3.2), 'a');
    }),
  );
export const catFigure = () =>
  prop('catfig', () =>
    make(2.5, 2.5, { o: '#1a1a1e', a: '#3a3a42', k: '#e8c040' }, (r, W, H) => {
      r.fill(ell(W / 2, H - 3, 3.6, 3), 'a');
      r.fill(poly([[2, 4], [3, 0.5], [5, 3]]), 'a');
      r.fill(poly([[W - 2, 4], [W - 3, 0.5], [W - 5, 3]]), 'a');
      r.fill(ell(W / 2, 4, 3, 2.6), 'a');
      r.dot(W / 2 - 1.5, 4, 'k');
      r.dot(W / 2 + 1, 4, 'k');
    }),
  );
const boneShape = (W: number, H: number) => union(line2(4, H / 2, W - 4, H / 2, H * 0.2), ell(3, H / 2 - H * 0.2, H * 0.22, H * 0.22), ell(3, H / 2 + H * 0.2, H * 0.22, H * 0.22), ell(W - 3, H / 2 - H * 0.2, H * 0.22, H * 0.22), ell(W - 3, H / 2 + H * 0.2, H * 0.22, H * 0.22));
export const shelfBone = () =>
  prop('shelfbone', () =>
    make(3, 2.5, { o: '#8a7a5e', a: '#f4ecd8' }, (r, W, H) => r.fill(boneShape(W, H), 'a')),
  );
export const chewBone = () =>
  prop('chewbone', () =>
    make(6, 3, { o: '#7a6a4e', a: '#f4ecd8' }, (r, W, H) => r.fill(boneShape(W, H), 'a')),
  );

/** flach liegende Socke (Bündchen links, Spitze rechts) */
export const sock = (red: boolean) =>
  prop(`sock${red}`, () =>
    make(8.5, 3, red
      ? { o: '#5a1a22', a: '#d8404a', b: '#f6f2ea', c: '#f6f2ea', d: '#f6f2ea' }
      : { o: '#1a2a5a', a: '#4a6ad8', b: '#f6f2ea', c: '#f4d24a', d: '#f4d24a' }, (r, W) => {
      const leg = line2(3, 5, 21, 5.5, 4);
      const foot = tube([20, 5.5], [25, 5.5], [29, 7], [W - 3, 8], () => 3.6);
      r.fill(union(leg, foot), (x) => (x < 7 ? 'b' : x > W - 6 ? 'd' : Math.floor((x - 7) / 3) % 3 === 1 ? 'c' : 'a'));
      for (let x = 2; x < 7; x += 2) r.seg(x, 2, x, 9, 'o');
      r.fill(ell(21, 8.5, 2.8, 2.2), 'd', { line: false });
    }),
  );

// ------------------------------------------------------------------ Hof

export const trough = () =>
  prop('trough', () =>
    make(4, 3, { o: '#3a4048', a: '#a8b0b8', b: '#d8e0e8', c: '#7ac0f0', d: '#8a949e' }, (r, W, H) => {
      r.fill(ell(W / 2, H - 2.5, W / 2 - 0.5, 2.3), 'd');
      r.fill(ell(W / 2, H - 3, W / 2 - 2, 1.3), 'c', { line: false });
      r.fill(union(rect(4, 3, W - 4, H - 3), ell(W / 2, 3, 4, 2)), 'a');
      for (const y of [5, 8]) r.seg(4, y, W - 4, y, 'd');
      r.fill(ell(W / 2, 1, 1.5, 1), 'b');
      r.seg(5, 4, 5, H - 4, 'b');
    }),
  );
export const nestEgg = () =>
  prop('negg', () =>
    make(2, 1.5, { o: '#b0987a', a: '#fbf6ee' }, (r, W, H) => {
      r.fill(ell(W / 2, H / 2, W / 2 - 0.3, H / 2 - 0.2), 'a');
      r.dot(W / 2 - 1.5, 1.5, 'h');
    }),
  );
/** Wetterhahn-Figur (schaut nach links) */
export const vaneRooster = () =>
  prop('vane', () =>
    make(4, 2.5, { o: '#141414', a: '#2a2a2a', c: '#d8343a', p: '#c89a2a' }, (r, W, H) => {
      r.fill(tube([10, 6], [13, 2], [16, 1], [W - 0.5, 0.5], (t) => 2.2 - t * 1.4), 'a');
      r.fill(ell(8, 6.5, 4.5, 2.8), 'a');
      r.fill(line2(4, 6, 3, 2.5, 1.4), 'a');
      r.fill(ell(3, 2.2, 1.8, 1.8), 'a');
      r.fill(union(ell(2.5, 0.6, 0.9, 0.8), ell(4, 0.4, 0.9, 0.9)), 'c', { line: false, flat: true });
      r.fill(poly([[1.2, 2], [0, 2.8], [1.3, 3.2]]), 'p', { line: false, flat: true });
      r.seg(8, 9, 8, H - 0.5, 'o');
    }),
  );

// ------------------------------------------------------------------ Zimmer-Möbel & Näpfe

export const BASKET_C: ColorMap = { o: '#4a2f17', a: '#c48f55', b: '#e0b57a', c: '#a8743e', d: '#8a5a2b', p: '#6c8fd1', k: '#4a2a14' };
/** Rückseite des Körbchens (24 × 2): Rand hinten und Kissen */
export const basketBack = () =>
  prop('bback', () =>
    make(24, 2, BASKET_C, (r, W, H) => {
      r.fill(inter(ell(W / 2, H + 2, W / 2 - 1, 10), rect(0, 0, W, H)), 'b');
      r.fill(inter(ell(W / 2, H + 2, W / 2 - 5, 7), rect(0, 0, W, H)), 'p');
      r.fill(inter(ell(W / 2, H + 2, W / 2 - 5, 7.5), minus(rect(0, 0, W, H), ell(W / 2, H + 2.5, W / 2 - 6, 7))), 'k', { line: false });
    }),
  );
/** Vorderseite (24 × 4): geflochtener Korb mit geflochtenem Rand */
export const basketFront = () =>
  prop('bfront', () =>
    make(24, 4, BASKET_C, (r, W, H) => {
      const body = union(rect(4, 2, W - 4, H - 3), ell(5, H / 2, 5, H / 2 - 1), ell(W - 5, H / 2, 5, H / 2 - 1), rect(8, H - 4, W - 8, H - 0.5));
      // Flechtwerk: versetzte Bänder über senkrechten Weidenstäben
      r.fill(body, (x, y) => {
        const row = Math.floor((y - 4) / 3);
        const col = Math.floor((x + (row % 2) * 3) / 6);
        const inBand = (x + (row % 2) * 3) % 6;
        return inBand === 0 ? 'd' : col % 2 ? 'a' : 'b';
      });
      for (let y = 7; y < H - 2; y += 3) r.seg(5, y, W - 5, y, 'c');
      // geflochtener Rand oben
      r.fill(union(line2(3, 2.5, W - 3, 2.5, 2.2)), (x) => (Math.floor(x / 3) % 2 ? 'b' : 'c'));
    }),
  );

/** Futternapf (9 × 4) in den Farben der Futterstelle */
export const bowl = (pc: ColorMap) =>
  prop(`bowl${pc.o}${pc.b}${pc.h}`, () =>
    make(9, 4, { o: pc.o, a: pc.b, b: pc.h, c: pc.o }, (r, W, H) => {
      // runde Schüssel: bauchiger Körper, breiter heller Rand, dunkles Inneres, kleiner Fuß
      r.fill(rect(W / 2 - 8, H - 3, W / 2 + 8, H - 0.5), 'a');
      r.fill(inter(ell(W / 2, 4, W / 2 - 1, H - 4.5), rect(0, 4, W, H)), 'a');
      r.fill(ell(W / 2, 4, W / 2 - 0.5, 3.6), 'b');
      r.fill(ell(W / 2, 4.4, W / 2 - 3.5, 2.2), 'c', { line: false });
      for (let i = 0; i < 4; i++) r.dot(6 + i * 0.6, 8.5 + i, 'h');
    }),
  );
/** flacher Stein als Futterstelle im Wald (9 × 4) */
export const stonePlate = () =>
  prop('stoneplate', () =>
    make(9, 4, { o: '#3a3a36', a: '#8a8a82', b: '#b4b4ac', c: '#6a6a64' }, (r, W, H) => {
      r.fill(ell(W / 2, H - 5, W / 2 - 0.5, 4.5), 'a');
      r.fill(ell(W / 2 - 1, H - 7, W / 2 - 4, 2.6), 'b', { line: false });
      for (let i = 0; i < 6; i++) r.dot(6 + hash(i, 1, 4) * (W - 12), H - 6 + hash(i, 2, 4) * 3, 'c');
    }),
  );
/** flache Schale (9 × 2): Blech (Hof) bzw. Keramik (Garten) */
export const flatDish = (pc: ColorMap) =>
  prop(`flat${pc.o}${pc.b}`, () =>
    make(9, 2, { o: pc.o, a: pc.b, b: pc.h, c: pc.o }, (r, W, H) => {
      r.fill(union(rect(1, 2.5, W - 1, H - 1.5), ell(W / 2, H - 2, W / 2 - 2, 1.5)), 'a');
      r.fill(ell(W / 2, 2.6, W / 2 - 0.5, 2.3), 'b');
      r.fill(ell(W / 2, 2.8, W / 2 - 3, 1.2), 'a', { line: false });
    }),
  );
/** Futterhaufen in Stufen 1..3: Körner (Hof/Garten) oder Futter/Snack im Napf */
export const foodHeap = (level: number, colors: { g: string; k: string }, wide: boolean) =>
  prop(`heap${level}${colors.g}${colors.k}${wide}`, () =>
    make(wide ? 7 : 7, wide ? 2 : 2, { o: mixDark(colors.g), a: colors.g, b: colors.k }, (r, W, H) => {
      const hgt = [0, 2.5, 4.5, 6.5][level];
      const half = [0, 8, 10.5, 12.5][level];
      const mound = inter(ell(W / 2, H, half, hgt + 0.8), rect(0, 0, W, H));
      r.fill(mound, (x, y) => (hash(Math.floor(x), Math.floor(y), 7) > 0.55 ? 'b' : 'a'));
    }),
  );
function mixDark(c: string) {
  const n = parseInt(c.slice(1, 7), 16);
  const f = (v: number) => Math.round(v * 0.45);
  return `#${((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1)}`;
}

/** Kratzbaum (11 × 21): Plattform mit Teppich, Sisalstamm, Sockel */
export const POST_C: ColorMap = { o: '#3e2e24', a: '#c8b294', b: '#d8c08e', c: '#a88a5a', d: '#9a8468' };
export const scratchPost = () =>
  prop('post', () =>
    make(11, 21, POST_C, (r, W, H) => {
      r.fill(union(rect(4, H - 12, W - 4, H - 4), ell(W / 2, H - 4, W / 2 - 0.5, 3.5)), 'd');
      r.fill(ell(W / 2, H - 12, W / 2 - 0.5, 3.5), 'a');
      const col = rect(13, 10, W - 13, H - 12);
      r.fill(col, (_x, y) => (Math.floor(y) % 3 === 0 ? 'c' : 'b'));
      r.fill(union(rect(1, 6, W - 1, 12), ell(W / 2, 12, W / 2 - 1, 3)), 'd');
      r.fill(ell(W / 2, 6, W / 2 - 1, 4.5), 'a');
      for (let i = 0; i < 40; i++) r.dot(3 + hash(i, 1, 6) * (W - 6), 3 + hash(i, 2, 6) * 6, hash(i, 3, 6) > 0.5 ? 'A' : '1');
    }),
  );
export const toyBall = () =>
  prop('toyball', () =>
    make(4, 4, { o: '#8a1a28', a: '#e2384d', b: '#ffd0d6' }, (r, W, H) => {
      r.fill(ell(W / 2, H / 2, W / 2 - 0.5, H / 2 - 0.5), 'a');
      r.fill(ell(W / 2 - 2.5, H / 2 - 2.5, 2, 1.6), 'b', { line: false });
    }),
  );
export const tennisBall = () =>
  prop('tball', () =>
    make(5, 5, { o: '#4a5a14', a: '#d8e84a', k: '#f6f6e4' }, (r, W, H) => {
      r.fill(ell(W / 2, H / 2, W / 2 - 0.5, H / 2 - 0.5), 'a');
      for (let a = -1.2; a <= 1.2; a += 0.08) {
        r.dot(W / 2 - 6 + Math.cos(a) * 5, H / 2 + Math.sin(a) * 7, 'k');
        r.dot(W / 2 + 6 - Math.cos(a) * 5, H / 2 + Math.sin(a) * 7, 'k');
      }
    }),
  );
/** Kackhaufen (6 × 5) */
export const poop = () =>
  prop('poop', () =>
    make(6, 5, { o: '#2a180a', a: '#7a4a1e', b: '#9a6430' }, (r, W, H) => {
      r.fill(ell(W / 2, H - 4, W / 2 - 1, 3.5), 'a');
      r.fill(ell(W / 2, H - 9, W / 2 - 4.5, 3.2), 'a');
      r.fill(ell(W / 2 + 0.5, H - 13.5, W / 2 - 8, 2.6), 'a');
      r.fill(tube([W / 2 + 1, 4], [W / 2 + 2, 1], [W / 2 + 4, 1], [W / 2 + 4, 2.5], () => 1), 'a');
      r.dot(W / 2 - 4, H - 6, 'b');
      r.dot(W / 2 - 2, H - 11, 'b');
    }),
  );
