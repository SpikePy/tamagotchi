// Tiere von Grund auf in voller Rasterdichte (4 Bildpixel je Spiel-Einheit):
// jedes Tier wird aus Formen (Kopf, Körper, Ohren, Schnauze, Beine, Schwanz …) zusammengesetzt.
// Ergebnis ist ein Zeichen-Raster mit Paletten-Zeichen (wie bisher a, b, c, d, n, p, w, E, e, o)
// plus Licht-/Schattenstufen (Großbuchstaben = hell, Ziffern = dunkel) und 'h' = Glanzpunkt.
import type { Stage } from '../engine/state';

export type EarType = 'pointy' | 'big' | 'half' | 'small' | 'floppy' | 'floppyLong' | 'fluffy' | 'none';
export type TailType = 'fluffy' | 'thin' | 'straight' | 'curly' | 'tipped' | 'none';

/** sitzender Vierbeiner von vorn (Fuchs, Katze, die meisten Hunde) */
export interface QuadRig {
  kind: 'quad';
  ears: EarType;
  tail: TailType;
  tailTip?: boolean;
  muzzle: 'fox' | 'cat' | 'dog' | 'flat';
  whiskers?: boolean;
  cheeks?: boolean;
  feet?: 'a' | 'b' | 'c';
  tuft?: boolean;
  iris?: boolean; // farbige Iris mit Schlitzpupille (Katze)
  head?: number; // Kopfbreite relativ (1 = normal)
}
export interface DachsRig {
  kind: 'dachs';
}
export interface HogRig {
  kind: 'hog';
}
export interface ChickenRig {
  kind: 'chicken';
  comb?: 'single' | 'big' | 'none';
  crest?: boolean;
  silkie?: boolean;
  featherLegs?: boolean;
  fluffy?: number; // 1 = normal, größer = fülliger
  bantam?: boolean;
}
export type RigDef = QuadRig | DachsRig | HogRig | ChickenRig;

export interface RigOpts {
  eyesClosed?: boolean;
  brows?: boolean;
  gaze?: number;
  pose?: 'stand' | 'sleep' | 'stretch0' | 'stretch1' | 'scratch0' | 'scratch1' | 'bat0' | 'bat1' | 'leap' | 'peck' | 'scrape0' | 'scrape1';
  male?: boolean;
  pattern?: string;
  seed?: number;
}

// ------------------------------------------------------------------ Raster

type Inside = (x: number, y: number) => boolean;
interface Shape {
  ins: Inside;
  box: [number, number, number, number];
}

const ell = (cx: number, cy: number, rx: number, ry: number): Shape => ({
  ins: (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1,
  box: [cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1],
});
const union = (...s: Shape[]): Shape => ({
  ins: (x, y) => s.some((q) => q.ins(x, y)),
  box: [Math.min(...s.map((q) => q.box[0])), Math.min(...s.map((q) => q.box[1])), Math.max(...s.map((q) => q.box[2])), Math.max(...s.map((q) => q.box[3]))],
});
const inter = (a: Shape, b: Shape): Shape => ({ ins: (x, y) => a.ins(x, y) && b.ins(x, y), box: a.box });
function poly(pts: [number, number][]): Shape {
  return {
    ins: (x, y) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    },
    box: [Math.min(...pts.map((p) => p[0])) - 1, Math.min(...pts.map((p) => p[1])) - 1, Math.max(...pts.map((p) => p[0])) + 1, Math.max(...pts.map((p) => p[1])) + 1],
  };
}
/** Schlauch entlang einer Bézierkurve mit veränderlichem Radius */
function tube(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], r: (t: number) => number, n = 24): Shape & { at: (x: number, y: number) => number } {
  const pts: [number, number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      r(t),
      t,
    ]);
  }
  const at = (x: number, y: number) => {
    let best = -1;
    let bd = Infinity;
    for (const [px, py, pr, t] of pts) {
      const d = Math.hypot(x - px, y - py) - pr;
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return bd <= 0 ? best : -1;
  };
  const maxR = Math.max(...pts.map((p) => p[2]));
  return {
    ins: (x, y) => at(x, y) >= 0,
    at,
    box: [Math.min(...pts.map((p) => p[0])) - maxR - 1, Math.min(...pts.map((p) => p[1])) - maxR - 1, Math.max(...pts.map((p) => p[0])) + maxR + 1, Math.max(...pts.map((p) => p[1])) + maxR + 1],
  };
}
const line2 = (x0: number, y0: number, x1: number, y1: number, r: number) => tube([x0, y0], [x0 + (x1 - x0) / 3, y0 + (y1 - y0) / 3], [x0 + ((x1 - x0) * 2) / 3, y0 + ((y1 - y0) * 2) / 3], [x1, y1], () => r, 8);

const hash = (x: number, y: number, s = 0) => {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1013904223)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

class Raster {
  k: string[];
  s: Int8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.k = Array(w * h).fill('.');
    this.s = new Int8Array(w * h);
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? '.' : this.k[y * this.w + x];
  }
  set(x: number, y: number, key: string, shade = 0) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.k[y * this.w + x] = key;
    this.s[y * this.w + x] = shade;
  }
  /** Form füllen; Rand = Umriss ('o'), Licht oben links nach der Form-Mitte */
  fill(sh: Shape, key: string | ((x: number, y: number) => string), o: { line?: boolean; flat?: boolean; lineKey?: string } = {}) {
    const [bx0, by0, bx1, by1] = sh.box;
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    const rx = Math.max(1, (bx1 - bx0) / 2);
    const ry = Math.max(1, (by1 - by0) / 2);
    for (let y = Math.max(0, Math.floor(by0)); y <= Math.min(this.h - 1, Math.ceil(by1)); y++)
      for (let x = Math.max(0, Math.floor(bx0)); x <= Math.min(this.w - 1, Math.ceil(bx1)); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        if (!sh.ins(px, py)) continue;
        const edge = o.line !== false && (!sh.ins(px - 1, py) || !sh.ins(px + 1, py) || !sh.ins(px, py - 1) || !sh.ins(px, py + 1));
        if (edge) {
          this.set(x, y, o.lineKey ?? 'o');
          continue;
        }
        const k = typeof key === 'string' ? key : key(px, py);
        let shade = 0;
        if (!o.flat) {
          const v = -(((px - cx) / rx) * 0.55 + ((py - cy) / ry) * 0.75);
          shade = v > 0.5 ? 1 : v < -0.45 ? -1 : 0;
        }
        this.set(x, y, k, shade);
      }
  }
  dot(x: number, y: number, key: string) {
    this.set(Math.floor(x), Math.floor(y), key);
  }
  seg(x0: number, y0: number, x1: number, y1: number, key: string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.dot(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, key);
  }
}

// ------------------------------------------------------------------ Gesichts-Teile

function eye(r: Raster, cx: number, cy: number, ry: number, o: RigOpts, iris = false, mirror = false) {
  const rx = Math.max(1.5, ry * 0.62);
  const g = Math.round(o.gaze ?? 0);
  cx += g;
  if (o.eyesClosed) {
    // geschlossenes Auge: nach unten gebogener Lidstrich
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const yy = cy + Math.round((1 - (dx / (rx + 0.5)) ** 2) * Math.max(1, ry * 0.35));
      r.dot(cx + dx, yy, 'E');
    }
  } else {
    r.fill(ell(cx, cy, rx, ry), 'E', { line: false, flat: true });
    if (iris) {
      r.fill(ell(cx, cy + ry * 0.15, rx * 0.8, ry * 0.75), 'e', { line: false, flat: true });
      r.fill(ell(cx, cy + ry * 0.1, Math.max(0.6, rx * 0.25), ry * 0.65), 'E', { line: false, flat: true });
    }
    const hs = ry >= 4 ? 2 : 1;
    for (let j = 0; j < hs; j++) for (let i = 0; i < hs; i++) r.dot(cx - rx * 0.35 + i - (mirror ? 0 : 0), cy - ry * 0.45 + j, 'h');
    if (ry >= 5) r.dot(cx + rx * 0.3, cy + ry * 0.35, 'h');
  }
  if (o.brows) {
    const dir = mirror ? -1 : 1;
    r.seg(cx - rx * 1.2 * dir, cy - ry - 3, cx + rx * 0.9 * dir, cy - ry - 1, 'o');
  }
}

// ------------------------------------------------------------------ Vierbeiner von vorn

const STAGE_K: Record<Exclude<Stage, 'egg'>, number> = { baby: 0, child: 0.33, teen: 0.66, adult: 1 };

function quadSit(r: Raster, d: QuadRig, stage: Exclude<Stage, 'egg'>, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const k = STAGE_K[stage];
  const tail = stage === 'baby' ? 'none' : d.tail;
  const cx = tail !== 'none' ? Math.round(W * 0.36) + 0.5 : W / 2;
  const pointy = d.ears === 'pointy' || d.ears === 'big' || d.ears === 'half';
  const earSpace = pointy ? H * (0.16 - 0.03 * k) : d.tuft ? H * 0.06 : H * 0.03;
  const headH = H * (0.56 - 0.18 * k);
  const headW = Math.min(W * 0.78, headH * 1.28 * (d.head ?? 1));
  const headTop = earSpace;
  const headCy = headTop + headH / 2;
  const bodyTop = headTop + headH * 0.72;
  const bottom = H - 1;
  const bodyRy = (bottom - bodyTop) / 2 + 1;
  const bodyCy = (bodyTop + bottom) / 2 + 1;
  const bodyRx = headW * (0.42 + 0.06 * k);
  const legR = Math.max(3, bodyRx * 0.27);

  // Schwanz (hinter dem Körper)
  if (tail !== 'none') {
    const bx = cx + bodyRx * 0.55;
    const by = bottom - 3;
    let t: ReturnType<typeof tube>;
    if (tail === 'fluffy') t = tube([bx, by], [W - 3, by + 1], [W - 2, by - bodyRy * 0.9], [W - 7, by - bodyRy * 1.45], (u) => 2 + Math.sin(Math.PI * (0.15 + u * 0.75)) * W * 0.1);
    else if (tail === 'thin') t = tube([bx, by], [W - 2, by], [W - 1, by - bodyRy * 1.3], [W - 8, by - bodyRy * 1.55], () => Math.max(2, W * 0.035));
    else if (tail === 'curly') {
      const ccx = cx + bodyRx * 1.05;
      const ccy = bodyCy - bodyRy * 0.15;
      const rr = bodyRx * 0.38;
      t = tube([cx + bodyRx * 0.7, bodyCy + 2], [ccx + rr * 1.6, ccy + rr], [ccx + rr * 1.4, ccy - rr * 1.6], [ccx - rr * 0.2, ccy - rr * 0.6], () => Math.max(2, W * 0.04));
    } else t = tube([bx, by], [bx + W * 0.15, by - 2], [W - 4, by - bodyRy * 0.6], [W - 3, by - bodyRy * 1.05], (u) => Math.max(1.6, W * 0.045 * (1 - u * 0.4)));
    const tipped = d.tailTip || tail === 'tipped';
    r.fill(t, (x, y) => (tipped && t.at(x, y) > 0.72 ? 'b' : 'a'));
  }
  // Hinterbacken, Körper, Brust
  for (const s of [-1, 1]) r.fill(ell(cx + s * bodyRx * 0.68, bottom - bodyRy * 0.48, bodyRx * 0.52, bodyRy * 0.55), 'a');
  const body = ell(cx, bodyCy, bodyRx, bodyRy);
  r.fill(body, 'a');
  r.fill(inter(ell(cx, bodyTop + bodyRy * 0.75, bodyRx * 0.42, bodyRy * 0.8), body), 'b', { line: false });
  // Vorderbeine mit Pfoten
  const feet = d.feet ?? 'a';
  for (const s of [-1, 1]) {
    const lx = cx + s * legR * 1.02;
    const leg = line2(lx, bodyCy - bodyRy * 0.15, lx, bottom - legR * 0.6, legR);
    r.fill(leg, (_x, y) => (feet !== 'a' && y > bottom - bodyRy * 0.5 ? feet : 'a'));
    r.fill(ell(lx + s * legR * 0.15, bottom - legR * 0.6, legR * 1.15, legR * 0.7), feet === 'a' ? 'a' : feet);
    // Zehen
    r.seg(lx - legR * 0.35, bottom - legR * 0.5, lx - legR * 0.35, bottom - 1, 'o');
    r.seg(lx + legR * 0.35, bottom - legR * 0.5, lx + legR * 0.35, bottom - 1, 'o');
  }
  // Ohren hinter dem Kopf (Stehohren)
  const earL = (s: number) => {
    const ex = cx + s * headW * 0.3;
    const eh = headH * (d.ears === 'big' ? 0.62 : 0.46);
    const ew = headW * (d.ears === 'big' ? 0.24 : 0.2);
    const outer = poly([
      [ex - s * ew * 1.15, headTop + headH * 0.32],
      [ex + s * ew * 0.95, headTop + headH * 0.18],
      [ex - s * ew * 0.35, headTop + headH * 0.3 - eh],
    ]);
    r.fill(outer, 'a');
    const inner = poly([
      [ex - s * ew * 0.6, headTop + headH * 0.3],
      [ex + s * ew * 0.45, headTop + headH * 0.22],
      [ex - s * ew * 0.3, headTop + headH * 0.36 - eh * 0.75],
    ]);
    r.fill(inner, 'c', { line: false });
    if (d.ears === 'half') r.fill(poly([[ex - s * ew * 0.9, headTop + headH * 0.32 - eh * 0.45], [ex + s * ew * 0.3, headTop + headH * 0.32 - eh * 0.55], [ex - s * ew * 0.1, headTop + headH * 0.32 - eh * 0.15]]), 'c');
  };
  if (pointy) for (const s of [-1, 1]) earL(s);
  // Kopf mit Wangenfell
  const headShape = d.muzzle === 'fox' || d.muzzle === 'cat'
    ? union(ell(cx, headCy, headW / 2, headH / 2), ell(cx - headW * 0.36, headCy + headH * 0.18, headW * 0.2, headH * 0.22), ell(cx + headW * 0.36, headCy + headH * 0.18, headW * 0.2, headH * 0.22))
    : ell(cx, headCy, headW / 2, headH / 2);
  r.fill(headShape, 'a');
  if (d.tuft) r.fill(union(ell(cx, headTop + 1, headW * 0.2, headH * 0.16), ell(cx - headW * 0.17, headTop + 3, headW * 0.15, headH * 0.13), ell(cx + headW * 0.17, headTop + 3, headW * 0.15, headH * 0.13)), 'a');
  // Gesicht
  const eyeY = headCy + headH * (0.02 + 0.06 * (1 - k));
  const eyeRy = headH * (0.1 + 0.05 * (1 - k));
  const noseY = headCy + headH * 0.26;
  if (d.muzzle === 'fox') {
    r.fill(inter(union(ell(cx, headCy + headH * 0.36, headW * 0.44, headH * 0.3), ell(cx, noseY, headW * 0.14, headH * 0.2)), headShape), 'b', { line: false });
  } else if (d.muzzle === 'cat') {
    r.fill(inter(union(ell(cx - headW * 0.09, noseY + 1, headW * 0.12, headH * 0.1), ell(cx + headW * 0.09, noseY + 1, headW * 0.12, headH * 0.1), ell(cx, noseY + headH * 0.12, headW * 0.12, headH * 0.08)), headShape), 'b', { line: false });
  } else if (d.muzzle === 'dog') {
    r.fill(ell(cx, noseY + headH * 0.03, headW * 0.25, headH * 0.2), 'b');
  } else {
    r.fill(ell(cx, noseY + headH * 0.02, headW * 0.3, headH * 0.22), 'c');
    r.seg(cx - headW * 0.12, headTop + headH * 0.22, cx + headW * 0.12, headTop + headH * 0.22, '3');
  }
  // Schlappohren über dem Kopf
  if (d.ears === 'floppy' || d.ears === 'floppyLong' || d.ears === 'fluffy' || d.ears === 'small') {
    for (const s of [-1, 1]) {
      const x0 = cx + s * headW * 0.36;
      const y0 = headTop + headH * 0.14;
      if (d.ears === 'small') {
        r.fill(poly([[x0 - s * headW * 0.08, y0 + 1], [x0 + s * headW * 0.16, y0 - headH * 0.08], [x0 + s * headW * 0.12, y0 + headH * 0.16]]), 'c');
        continue;
      }
      const len = d.ears === 'floppyLong' ? 0.72 : d.ears === 'fluffy' ? 0.62 : 0.5;
      const ear =
        d.ears === 'fluffy'
          ? union(ell(x0 + s * headW * 0.12, y0 + headH * 0.12, headW * 0.15, headH * 0.16), ell(x0 + s * headW * 0.16, y0 + headH * 0.32, headW * 0.15, headH * 0.16), ell(x0 + s * headW * 0.13, y0 + headH * 0.5, headW * 0.13, headH * 0.13))
          : tube([x0, y0], [x0 + s * headW * 0.2, y0 - 1], [x0 + s * headW * 0.24, y0 + headH * len * 0.6], [x0 + s * headW * 0.15, y0 + headH * len], (u) => headW * (0.11 + 0.05 * Math.sin(u * Math.PI)));
      r.fill(ear, d.ears === 'fluffy' ? 'a' : 'c');
    }
  }
  // Augen, Wangen, Nase, Mund
  for (const s of [-1, 1]) eye(r, cx + s * headW * 0.21, eyeY, eyeRy, o, d.iris, s > 0);
  if (d.cheeks) for (const s of [-1, 1]) r.fill(ell(cx + s * headW * 0.32, eyeY + eyeRy * 1.7, headW * 0.07, headH * 0.04 + 0.6), 'p', { line: false, flat: true });
  const nw = Math.max(1.5, headW * (d.muzzle === 'cat' ? 0.06 : 0.085));
  r.fill(ell(cx, noseY - 0.5, nw, nw * 0.7), 'n', { line: false, flat: true });
  if (d.muzzle !== 'cat') r.dot(cx - nw * 0.4, noseY - nw * 0.4, 'h');
  // Mund: kleiner Strich und zwei Bögen
  r.dot(cx, noseY + nw * 0.6 + 1, 'o');
  r.dot(cx - 1, noseY + nw * 0.6 + 2, 'o');
  r.dot(cx + 1, noseY + nw * 0.6 + 2, 'o');
  if (d.whiskers)
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const y0 = noseY + 1 + i * 1.6;
        r.seg(cx + s * headW * 0.3, y0, cx + s * headW * 0.56, y0 - 1.5 + i * 1.5, 'w');
      }
}

// ------------------------------------------------------------------ Dackel (Seitenansicht, Kopf links)

function dachs(r: Raster, stage: Exclude<Stage, 'egg'>, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const k = STAGE_K[stage];
  const legH = H * 0.2;
  const bodyR = H * (0.2 + 0.03 * k);
  const by = H - 1 - legH - bodyR * 0.75;
  const bx0 = W * (0.36 - 0.04 * k);
  const bx1 = W * 0.86;
  // Schwanz
  r.fill(tube([bx1 - 2, by - bodyR * 0.4], [bx1 + 3, by - bodyR * 0.7], [W - 3, by - bodyR * 1.2], [W - 1.5, by - bodyR * 1.7], (u) => 1.8 - u * 0.5), 'a');
  // Beine hinten (entfernt) dann vorn
  for (const [x, back] of [[bx0 + 3, true], [bx1 - 4, true], [bx0 + 6, false], [bx1 - 1, false]] as [number, boolean][]) {
    r.fill(line2(x, by, x - 0.5, H - 3, Math.max(2.5, H * 0.08)), back ? 'c' : 'a');
    r.fill(ell(x - 1.5, H - 2.4, H * 0.12, H * 0.07), back ? 'c' : 'a');
  }
  const body = line2(bx0, by, bx1, by, bodyR);
  r.fill(body, 'a');
  r.fill(inter(ell((bx0 + bx1) / 2 - 2, by + bodyR * 0.8, (bx1 - bx0) * 0.45, bodyR * 0.45), body), 'b', { line: false });
  // Kopf und Schnauze
  const hx = W * (0.22 - 0.02 * k);
  const hy = by - bodyR * (1.1 - 0.15 * k);
  const hr = H * (0.26 - 0.04 * k);
  r.fill(line2(hx + hr * 0.3, hy + hr * 0.3, bx0 + 2, by - 1, hr * 0.62), 'a'); // Hals
  r.fill(ell(hx, hy, hr, hr * 0.9), 'a');
  const snout = ell(hx - hr * 0.85, hy + hr * 0.38, hr * 0.62, hr * 0.38);
  r.fill(snout, 'a');
  r.fill(inter(ell(hx - hr * 0.8, hy + hr * 0.6, hr * 0.6, hr * 0.22), snout), 'b', { line: false });
  r.fill(ell(hx - hr * 1.42, hy + hr * 0.3, 1.8, 1.4), 'n', { line: false, flat: true });
  r.dot(hx - hr * 1.0, hy + hr * 0.68, 'o');
  eye(r, hx - hr * 0.35, hy - hr * 0.08, hr * 0.24, o);
  // langes Schlappohr
  r.fill(tube([hx + hr * 0.15, hy - hr * 0.55], [hx + hr * 0.75, hy - hr * 0.5], [hx + hr * 0.8, hy + hr * 0.6], [hx + hr * 0.45, hy + hr * 1.05], (u) => hr * (0.3 + 0.12 * Math.sin(u * Math.PI))), 'c');
}

// ------------------------------------------------------------------ Igel (von vorn)

function hog(r: Raster, stage: Exclude<Stage, 'egg'>, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const k = STAGE_K[stage];
  const cx = W / 2;
  const cy = H * 0.5;
  const rx = W * 0.47;
  const ry = H * 0.42;
  // Füße
  for (const s of [-1, 1]) r.fill(ell(cx + s * rx * 0.45, cy + ry * 0.92, rx * 0.2, H * 0.07), 'a');
  // Stachelkleid: Ellipse mit Stachelspitzen am Rand
  const n = 14;
  const spikes: [number, number][] = [];
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI * (1.05 + (i / (n * 2)) * 0.9 + 0) - Math.PI * 0.05;
    const rr = i % 2 === 0 ? 1.12 : 0.9;
    spikes.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr * 1.02]);
  }
  const lower: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    lower.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry * 0.95]);
  }
  const coat = union(poly([...spikes, ...lower]), ell(cx, cy, rx * 0.97, ry * 0.95));
  r.fill(coat, 'c');
  // Stacheln: helle und dunkle Striche, nach außen gerichtet
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (r.get(x, y) !== 'c') continue;
      const ang = Math.atan2(y - cy, x - cx);
      const t = Math.round((ang * 9 + Math.hypot(x - cx, y - cy) * 0.0) * 1) + (Math.floor(Math.hypot(x - cx, (y - cy) * 1.1) / 3) % 2);
      const q = hash(Math.round(ang * 14), Math.floor(Math.hypot(x - cx, y - cy) / 2.5), 3);
      if (q > 0.62) r.set(x, y, 'c', 1);
      else if (q < 0.25 || t % 5 === 0) r.set(x, y, 'c', -1);
    }
  // Gesicht
  const fh = H * (0.5 + 0.06 * (1 - k));
  const fw = W * 0.6;
  const fy = cy + ry * 0.2;
  const face = union(ell(cx, fy, fw / 2, fh / 2), ell(cx, fy + fh * 0.25, fw * 0.3, fh * 0.32));
  r.fill(face, 'b');
  for (const s of [-1, 1]) r.fill(ell(cx + s * fw * 0.48, fy - fh * 0.38, 2.4, 2.2), 'b'); // Öhrchen
  const eyeRy = H * (0.07 + 0.03 * (1 - k));
  for (const s of [-1, 1]) eye(r, cx + s * fw * 0.22, fy - fh * 0.05, eyeRy, o, false, s > 0);
  for (const s of [-1, 1]) r.fill(ell(cx + s * fw * 0.36, fy + fh * 0.14, 2.4, 1.3), 'p', { line: false, flat: true });
  r.fill(ell(cx, fy + fh * 0.16, 2.6, 1.8), 'n', { line: false, flat: true });
  r.dot(cx - 1, fy + fh * 0.16 - 1, 'h');
}

// ------------------------------------------------------------------ Huhn (Seitenansicht, Kopf links)

function chicken(r: Raster, d: ChickenRig, stage: Exclude<Stage, 'egg'>, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const chick = stage === 'baby' || stage === 'child' || (d.bantam && stage === 'teen');
  const kick = o.pose === 'scrape1';
  const peck = o.pose === 'peck';
  const legs = (x0: number, x1: number, top: number, feather: boolean) => {
    for (const [i, x] of [x0, x1].entries()) {
      if (kick && i === 1) {
        // Scharren: hinteres Bein kratzt nach hinten
        const fx = x + W * 0.16;
        r.fill(line2(x, top, fx, H - 4, Math.max(1.3, H * 0.025)), 'w');
        r.seg(fx - 1, H - 3.5, fx + 4, H - 2, 'w');
        if (feather) r.fill(ell(x + 1, top + 3, 2.8, 4), 'a');
        continue;
      }
      r.fill(line2(x, top, x - 0.5, H - 3, Math.max(1.3, H * 0.025)), 'w');
      r.seg(x - 3.5, H - 1.5, x + 1.5, H - 1.5, 'w');
      r.dot(x + 2, H - 2, 'w');
      if (feather) r.fill(ell(x, top + 3, 2.8, 4), 'a');
    }
  };
  if (chick) {
    const big = stage !== 'baby';
    const bx = W * 0.58;
    const by = H * 0.56;
    const brx = W * (big ? 0.34 : 0.36);
    const bry = H * 0.3;
    legs(bx - brx * 0.3, bx + brx * 0.15, by + bry * 0.8, false);
    if (big) r.fill(poly([[bx + brx * 0.7, by - bry * 0.3], [bx + brx * 1.25, by - bry * 0.85], [bx + brx * 1.05, by + bry * 0.2]]), 'b');
    r.fill(ell(bx, by, brx, bry), 'b');
    r.fill(ell(bx + brx * 0.12, by + bry * 0.05, brx * 0.48, bry * 0.4), 'a');
    const hx = W * 0.34;
    const hy = H * 0.3;
    const hr = W * 0.22;
    r.fill(ell(hx, hy, hr, hr * 0.92), 'b');
    r.fill(poly([[hx - hr * 0.85, hy - 1], [hx - hr * 1.45, hy + 1], [hx - hr * 0.8, hy + 3]]), 'p');
    eye(r, hx - hr * 0.3, hy - hr * 0.12, hr * 0.26, o);
    // Flaum-Spitzen oben auf dem Kopf
    r.dot(hx - 1, hy - hr - 1, 'o');
    r.dot(hx + 1, hy - hr - 2, 'o');
    return;
  }
  const male = !!o.male;
  const fl = (d.fluffy ?? 1) * (d.silkie ? 1.08 : 1);
  const bx = W * 0.56;
  const by = H * 0.6;
  const brx = W * 0.36 * fl;
  const bry = H * 0.25 * fl;
  legs(bx - brx * 0.3, bx + brx * 0.12, by + bry * 0.75, !!d.featherLegs || !!d.silkie);
  // Schwanz: Henne kurz und aufgestellt, Hahn mit Sichelfedern
  if (male) {
    for (const [dx, h, wdt] of [[0, 1, 2.2], [3, 0.85, 2], [-3, 0.7, 1.8]] as [number, number, number][]) {
      const t = tube([bx + brx * 0.55, by - bry * 0.2], [bx + brx * 0.9 + dx, by - bry * 2.6 * h], [W - 1, by - bry * 2.4 * h], [W - 2 + dx * 0.3, by - bry * 0.3 * h], (u) => wdt * Math.max(1, H * 0.022) * (1 - u * 0.45));
      r.fill(t, 'd');
    }
  } else if (d.silkie) {
    r.fill(ell(bx + brx * 0.85, by - bry * 0.5, brx * 0.42, bry * 0.6), 'a');
  } else {
    const tail = poly([[bx + brx * 0.45, by - bry * 0.55], [bx + brx * 0.95, by - bry * 2.0], [bx + brx * 1.22, by - bry * 1.7], [bx + brx * 1.08, by + bry * 0.1]]);
    r.fill(tail, (_x, y) => (y < by - bry * 1.3 ? 'd' : 'a'));
  }
  // Körper, Brust, Flügel
  const body = d.silkie ? union(ell(bx, by, brx, bry), ell(bx - brx * 0.3, by - bry * 0.4, brx * 0.6, bry * 0.7)) : ell(bx, by, brx, bry);
  r.fill(body, 'a');
  r.fill(inter(ell(bx - brx * 0.45, by + bry * 0.3, brx * 0.55, bry * 0.65), body), 'b', { line: false });
  const wing = ell(bx + brx * 0.12, by - bry * 0.05, brx * 0.55, bry * 0.55);
  r.fill(wing, 'a');
  for (let i = 0; i < 3; i++) {
    const wx = bx + brx * (0.25 + i * 0.13);
    r.seg(wx, by + bry * 0.05, wx + 2, by + bry * 0.4, 'o');
  }
  // Hals und Kopf (beim Picken bis zum Boden gesenkt)
  const hx = peck ? W * 0.13 : W * 0.24;
  const hy = peck ? H * 0.7 : H * 0.26;
  const hr = W * 0.12;
  r.fill(line2(hx + hr * 0.4, hy + hr * 0.6, bx - brx * 0.55, by - bry * 0.35, hr * 0.85), 'a');
  if (male) r.fill(inter(line2(hx + hr * 0.4, hy + hr * 0.7, bx - brx * 0.55, by - bry * 0.4, hr * 0.85), ell(hx + hr, hy + hr * 1.6, hr * 1.6, hr * 1.4)), 'b', { line: false });
  r.fill(ell(hx, hy, hr, hr), 'a');
  // Kamm
  const comb = d.silkie ? 'none' : d.comb ?? 'single';
  if (comb !== 'none') {
    const size = (male ? 1.5 : 1) * (comb === 'big' ? 1.35 : 1);
    const bumps: Shape[] = [];
    for (let i = 0; i < 4; i++) bumps.push(ell(hx - hr * 0.55 + i * hr * 0.42, hy - hr * 0.95 - (i === 1 || i === 2 ? 1.2 : 0) * size, hr * 0.28 * size, hr * 0.32 * size));
    r.fill(union(...bumps), 'c');
  }
  if (d.crest || d.silkie) r.fill(union(ell(hx + hr * 0.2, hy - hr * 0.8, hr * (d.silkie ? 1.05 : 0.75), hr * (d.silkie ? 0.85 : 0.6)), ell(hx - hr * 0.5, hy - hr * 0.9, hr * 0.4, hr * 0.35)), 'a');
  // Schnabel, Kehllappen, Auge
  r.fill(poly([[hx - hr * 0.8, hy - 1], [hx - hr * 1.75, hy + 1], [hx - hr * 0.75, hy + hr * 0.45]]), 'p');
  r.seg(hx - hr * 1.6, hy + 1, hx - hr * 0.8, hy + 1, '5');
  if (!d.silkie) r.fill(ell(hx - hr * 0.6, hy + hr * (male ? 1.0 : 0.85), hr * 0.3, hr * (male ? 0.55 : 0.38)), 'c');
  eye(r, hx - hr * 0.2, hy - hr * 0.15, hr * 0.32, o);
}

// ------------------------------------------------------------------ Schlafposen

function curlSleep(r: Raster, d: QuadRig | DachsRig, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const q: QuadRig = d.kind === 'quad' ? d : { kind: 'quad', ears: 'floppyLong', tail: 'straight', muzzle: 'dog' };
  const bottom = H - 1;
  // Körper als liegendes Oval
  const body = ell(W * 0.56, bottom - H * 0.42, W * 0.42, H * 0.42);
  r.fill(body, 'a');
  // Rücken-Rundung oben heller (Licht)
  // Kopf links auf den Pfoten
  const hx = W * 0.2;
  const hy = bottom - H * 0.38;
  const hr = H * 0.34;
  if (q.ears === 'pointy' || q.ears === 'big' || q.ears === 'half') {
    r.fill(poly([[hx - hr * 0.75, hy - hr * 0.4], [hx - hr * 0.25, hy - hr * 0.75], [hx - hr * 0.8, hy - hr * 1.4]]), 'a');
    r.fill(poly([[hx - hr * 0.6, hy - hr * 0.5], [hx - hr * 0.35, hy - hr * 0.7], [hx - hr * 0.72, hy - hr * 1.15]]), 'c', { line: false });
    r.fill(poly([[hx + hr * 0.1, hy - hr * 0.8], [hx + hr * 0.6, hy - hr * 0.6], [hx + hr * 0.45, hy - hr * 1.35]]), 'a');
  }
  r.fill(ell(hx, hy, hr * 0.95, hr * 0.85), 'a');
  if (q.muzzle === 'fox' || q.muzzle === 'cat') r.fill(inter(ell(hx - hr * 0.3, hy + hr * 0.45, hr * 0.7, hr * 0.45), ell(hx, hy, hr * 0.95, hr * 0.85)), 'b', { line: false });
  else r.fill(ell(hx - hr * 0.55, hy + hr * 0.3, hr * 0.45, hr * 0.35), q.muzzle === 'flat' ? 'c' : 'b');
  r.fill(ell(hx - hr * 0.88, hy + hr * 0.15, 1.6, 1.3), 'n', { line: false, flat: true });
  eye(r, hx - hr * 0.25, hy - hr * 0.05, hr * 0.22, { ...o, eyesClosed: true });
  if (q.ears === 'floppy' || q.ears === 'floppyLong' || q.ears === 'fluffy') r.fill(tube([hx + hr * 0.1, hy - hr * 0.7], [hx + hr * 0.7, hy - hr * 0.6], [hx + hr * 0.75, hy + hr * 0.1], [hx + hr * 0.45, hy + hr * 0.6], () => hr * 0.28), q.ears === 'fluffy' ? 'a' : 'c');
  if (q.ears === 'small') r.fill(ell(hx + hr * 0.4, hy - hr * 0.75, hr * 0.25, hr * 0.18), 'c');
  // Pfoten vor dem Kinn
  r.fill(ell(hx + hr * 0.2, bottom - 2.5, hr * 0.55, 2.6), q.feet ?? 'a');
  // Schwanz vorn herum
  if (q.tail !== 'none') {
    const fluffy = q.tail === 'fluffy';
    const t = tube([W - 4, bottom - H * 0.45], [W, bottom - H * 0.1], [W * 0.75, bottom - H * 0.08], [W * 0.3, bottom - H * 0.12], (u) => (fluffy ? H * 0.08 + Math.sin(u * Math.PI) * H * 0.1 : H * 0.085));
    r.fill(t, (x, y) => ((q.tailTip || q.tail === 'tipped') && t.at(x, y) > 0.75 ? 'b' : 'a'));
  }
}

function ballSleep(r: Raster, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const cx = W * 0.54;
  const cy = H * 0.54;
  const rx = W * 0.44;
  const ry = H * 0.44;
  const pts: [number, number][] = [];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    const rr = i % 2 ? 1.0 : 0.88;
    pts.push([cx + Math.cos(a) * rx * rr, cy + Math.min(Math.sin(a) * ry * rr, ry * 0.85)]);
  }
  r.fill(poly(pts), 'c');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (r.get(x, y) !== 'c') continue;
      const q = hash(Math.round(Math.atan2(y - cy, x - cx) * 14), Math.floor(Math.hypot(x - cx, y - cy) / 2.5), 3);
      if (q > 0.62) r.set(x, y, 'c', 1);
      else if (q < 0.28) r.set(x, y, 'c', -1);
    }
  // Gesichtchen unten links, Augen zu
  const fx = cx - rx * 0.5;
  const fy = cy + ry * 0.38;
  r.fill(ell(fx, fy, rx * 0.36, ry * 0.32), 'b');
  eye(r, fx - 1, fy - 1.5, 2.6, { ...o, eyesClosed: true });
  r.fill(ell(fx - rx * 0.3, fy + 1.5, 1.8, 1.4), 'n', { line: false, flat: true });
  r.fill(ell(fx + 2, fy + 2, 1.6, 1), 'p', { line: false, flat: true });
}

function roostSleep(r: Raster, d: ChickenRig, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const bx = W * 0.55;
  const by = H * 0.58;
  r.fill(poly([[bx + W * 0.2, by - H * 0.2], [W - 1, by - H * 0.55], [W - 2, by + H * 0.05]]), (_x, y) => (y < by - H * 0.3 ? 'd' : 'a'));
  const body = ell(bx, by, W * 0.42, H * 0.4);
  r.fill(body, 'a');
  r.fill(inter(ell(bx - W * 0.2, by + H * 0.2, W * 0.3, H * 0.25), body), 'b', { line: false });
  r.fill(ell(bx + W * 0.08, by, W * 0.24, H * 0.24), 'a');
  // Kopf eingezogen
  const hx = W * 0.3;
  const hy = H * 0.32;
  const hr = H * 0.22;
  r.fill(ell(hx, hy, hr * 1.1, hr), 'a');
  if (!d.silkie && d.comb !== 'none') r.fill(union(ell(hx - hr * 0.3, hy - hr * 0.95, hr * 0.32, hr * 0.32), ell(hx + hr * 0.2, hy - hr * 1.05, hr * 0.32, hr * 0.36)), 'c');
  if (d.crest || d.silkie) r.fill(ell(hx, hy - hr * 0.7, hr * 0.8, hr * 0.5), 'a');
  r.fill(poly([[hx - hr * 0.85, hy], [hx - hr * 1.5, hy + 1.5], [hx - hr * 0.8, hy + 2.5]]), 'p');
  eye(r, hx - hr * 0.25, hy - 0.5, hr * 0.3, { ...o, eyesClosed: true });
}

// ------------------------------------------------------------------ Strecken (Seitenansicht, Kopf links)

function stretch(r: Raster, d: QuadRig | DachsRig, frame: 0 | 1, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const q: QuadRig = d.kind === 'quad' ? d : { kind: 'quad', ears: 'floppyLong', tail: 'straight', muzzle: 'dog' };
  const bottom = H - 1;
  // Frame 0: Vorderkörper unten, Po hoch; Frame 1: Kopf hoch, Hinterbeine lang nach hinten
  const front: [number, number] = frame === 0 ? [W * 0.3, bottom - H * 0.28] : [W * 0.3, bottom - H * 0.42];
  const rear: [number, number] = frame === 0 ? [W * 0.72, bottom - H * 0.55] : [W * 0.74, bottom - H * 0.4];
  const br = H * 0.22;
  // Schwanz
  if (q.tail !== 'none') {
    const t = tube([rear[0] + br * 0.6, rear[1] - br * 0.3], [rear[0] + br * 1.4, rear[1] - br * 1.5], [W - 2, rear[1] - br * 2.6], [W - 3, 2.5], (u) => (q.tail === 'fluffy' ? H * 0.05 + Math.sin(u * Math.PI) * H * 0.1 : Math.max(2, H * 0.05)));
    r.fill(t, (x, y) => ((q.tailTip || q.tail === 'tipped') && t.at(x, y) > 0.75 ? 'b' : 'a'));
  }
  // Beine
  const leg = (x0: number, y0: number, x1: number, key: string) => {
    const lr = Math.max(2.5, H * 0.08);
    r.fill(line2(x0, y0, x1, bottom - lr * 0.7, lr), key);
    r.fill(ell(x1 - lr * 0.6, bottom - lr * 0.6, lr * 1.35, lr * 0.65), key);
  };
  leg(rear[0] - 2, rear[1], frame === 0 ? rear[0] + 1 : rear[0] + 8, 'a');
  leg(front[0] + 2, front[1], frame === 0 ? front[0] - 10 : front[0] - 3, 'a');
  r.fill(line2(front[0], front[1], rear[0], rear[1], br), 'a');
  r.fill(inter(line2(front[0] - 1, front[1] + br * 0.6, rear[0] - 3, rear[1] + br * 0.6, br * 0.45), line2(front[0], front[1], rear[0], rear[1], br)), 'b', { line: false });
  leg(rear[0] + 2, rear[1], frame === 0 ? rear[0] + 3 : rear[0] + 11, 'a');
  leg(front[0] + 4, front[1], frame === 0 ? front[0] - 7 : front[0] - 1, 'a');
  // Kopf
  const hx = front[0] - br * 0.9;
  const hy = front[1] - br * (frame === 0 ? 0.6 : 1.3);
  const hr = H * 0.22;
  if (q.ears === 'pointy' || q.ears === 'big' || q.ears === 'half') {
    r.fill(poly([[hx, hy - hr * 0.6], [hx + hr * 0.6, hy - hr * 0.5], [hx + hr * 0.35, hy - hr * 1.5]]), 'a');
    r.fill(poly([[hx + hr * 0.15, hy - hr * 0.6], [hx + hr * 0.45, hy - hr * 0.6], [hx + hr * 0.33, hy - hr * 1.2]]), 'c', { line: false });
  }
  r.fill(ell(hx, hy, hr, hr * 0.9), 'a');
  r.fill(ell(hx - hr * 0.9, hy + hr * 0.25, hr * 0.55, hr * 0.38), q.muzzle === 'flat' ? 'c' : 'b');
  r.fill(ell(hx - hr * 1.35, hy + hr * 0.1, 1.5, 1.2), 'n', { line: false, flat: true });
  if (frame === 1) r.fill(ell(hx - hr * 0.95, hy + hr * 0.55, hr * 0.28, hr * 0.22), 'p', { line: false, flat: true }); // Gähnen
  eye(r, hx - hr * 0.2, hy - hr * 0.1, hr * 0.24, { ...o, eyesClosed: true });
  if (q.ears === 'floppy' || q.ears === 'floppyLong' || q.ears === 'fluffy') r.fill(tube([hx + hr * 0.1, hy - hr * 0.7], [hx + hr * 0.7, hy - hr * 0.6], [hx + hr * 0.75, hy + hr * 0.2], [hx + hr * 0.45, hy + hr * 0.7], () => hr * 0.28), q.ears === 'fluffy' ? 'a' : 'c');
}

// ------------------------------------------------------------------ Katzen-Extras: Krallen wetzen, mit der Kugel spielen, Sprung

/** Katze steht auf den Hinterbeinen am Kratzbaum (Seitenansicht, schaut nach links), Pfoten wechseln */
function catScratch(r: Raster, d: QuadRig, frame: 0 | 1, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const bottom = H - 1;
  // Schwanz nach rechts unten
  r.fill(tube([W * 0.62, bottom - H * 0.22], [W * 0.85, bottom - H * 0.1], [W * 0.95, bottom - H * 0.35], [W - 3, bottom - H * 0.5], () => Math.max(2, W * 0.05)), 'a');
  // Hinterbein und Po
  r.fill(ell(W * 0.55, bottom - H * 0.2, W * 0.16, H * 0.2), 'a');
  r.fill(ell(W * 0.52, bottom - 2, W * 0.14, 2.4), 'a');
  // Körper schräg aufgerichtet
  const body = line2(W * 0.55, bottom - H * 0.25, W * 0.42, H * 0.32, W * 0.26);
  r.fill(body, 'a');
  r.fill(inter(line2(W * 0.47, bottom - H * 0.25, W * 0.3, H * 0.34, W * 0.07), body), 'b', { line: false });
  // Vorderpfoten am Stamm (links), abwechselnd oben/unten
  const up = frame === 0 ? [H * 0.18, H * 0.36] : [H * 0.3, H * 0.22];
  for (const [i, y] of up.entries()) {
    r.fill(line2(W * 0.36, H * 0.34 + i * 2, W * 0.1, y, Math.max(2.5, W * 0.07)), 'a');
    r.fill(ell(W * 0.09, y, W * 0.09, W * 0.08), d.feet ?? 'a');
    for (let c = 0; c < 3; c++) r.dot(W * 0.07 - 2.5, y - 1.5 + c * 1.5, 'w'); // Krallen
  }
  // Kopf (Profil, schaut zum Stamm)
  const hx = W * 0.36;
  const hy = H * 0.17;
  const hr = H * 0.2;
  r.fill(poly([[hx - hr * 0.2, hy - hr * 0.6], [hx + hr * 0.5, hy - hr * 0.7], [hx + hr * 0.2, hy - hr * 1.55]]), 'a');
  r.fill(poly([[hx, hy - hr * 0.7], [hx + hr * 0.35, hy - hr * 0.7], [hx + hr * 0.18, hy - hr * 1.25]]), 'c', { line: false });
  r.fill(ell(hx, hy, hr, hr * 0.9), 'a');
  r.fill(ell(hx - hr * 0.75, hy + hr * 0.3, hr * 0.4, hr * 0.3), 'b');
  r.fill(ell(hx - hr * 1.05, hy + hr * 0.1, 1.2, 1), 'n', { line: false, flat: true });
  eye(r, hx - hr * 0.3, hy - hr * 0.1, hr * 0.28, { ...o, eyesClosed: frame === 1 }, d.iris);
}

/** Katze duckt sich und schlägt mit der Pfote nach etwas (Seitenansicht, schaut nach links) */
function catBat(r: Raster, d: QuadRig, frame: 0 | 1, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const bottom = H - 1;
  r.fill(tube([W * 0.78, bottom - H * 0.35], [W * 0.95, bottom - H * 0.6], [W * 0.9, bottom - H * 0.95], [W * 0.78, bottom - H * 0.9], () => Math.max(2, H * 0.06)), 'a');
  const body = ell(W * 0.58, bottom - H * 0.32, W * 0.3, H * 0.26);
  for (const x of [W * 0.72, W * 0.48]) {
    r.fill(line2(x, bottom - H * 0.3, x - 1, bottom - 2, Math.max(2.5, H * 0.08)), 'a');
    r.fill(ell(x - 2, bottom - 1.6, 3, 1.6), d.feet ?? 'a');
  }
  r.fill(body, 'a');
  r.fill(inter(ell(W * 0.52, bottom - H * 0.18, W * 0.22, H * 0.12), body), 'b', { line: false });
  const hx = W * 0.27;
  const hy = bottom - H * 0.52;
  const hr = H * 0.25;
  r.fill(poly([[hx - hr * 0.6, hy - hr * 0.55], [hx - hr * 0.05, hy - hr * 0.8], [hx - hr * 0.55, hy - hr * 1.5]]), 'a');
  r.fill(poly([[hx + hr * 0.2, hy - hr * 0.8], [hx + hr * 0.7, hy - hr * 0.55], [hx + hr * 0.55, hy - hr * 1.5]]), 'a');
  r.fill(poly([[hx + hr * 0.3, hy - hr * 0.8], [hx + hr * 0.55, hy - hr * 0.65], [hx + hr * 0.5, hy - hr * 1.2]]), 'c', { line: false });
  r.fill(ell(hx, hy, hr, hr * 0.85), 'a');
  r.fill(ell(hx - hr * 0.55, hy + hr * 0.35, hr * 0.42, hr * 0.3), 'b');
  r.fill(ell(hx - hr * 0.85, hy + hr * 0.15, 1.3, 1), 'n', { line: false, flat: true });
  eye(r, hx - hr * 0.35, hy - hr * 0.05, hr * 0.3, o, d.iris);
  eye(r, hx + hr * 0.2, hy - hr * 0.05, hr * 0.28, o, d.iris, true);
  // Schlag-Pfote vor dem Kopf: vorgestreckt bzw. hoch erhoben
  const px = frame === 0 ? W * 0.1 : W * 0.05;
  const py = frame === 0 ? bottom - H * 0.28 : bottom - H * 0.7;
  r.fill(line2(W * 0.4, bottom - H * 0.3, px + 2, py, Math.max(2.5, H * 0.08)), 'a');
  r.fill(ell(px, py, H * 0.1, H * 0.09), d.feet ?? 'a');
  if (frame === 1) for (let c = 0; c < 3; c++) r.dot(px - H * 0.1 - 1, py - 1.5 + c * 1.5, 'w'); // ausgefahrene Krallen
}

/** Katze im Sprung: langgestreckt, Vorderpfoten vorn, Hinterbeine nach hinten (Seitenansicht, schaut nach links) */
function catLeap(r: Raster, d: QuadRig, o: RigOpts) {
  const W = r.w;
  const H = r.h;
  const cy = H * 0.5;
  r.fill(tube([W * 0.8, cy], [W * 0.92, cy - 2], [W * 0.97, cy - H * 0.2], [W - 2, cy - H * 0.35], () => Math.max(2, H * 0.06)), 'a');
  for (const [x0, x1, y1] of [[W * 0.72, W * 0.95, cy + H * 0.28], [W * 0.68, W * 0.9, cy + H * 0.36]] as [number, number, number][]) r.fill(line2(x0, cy + 2, x1, y1, Math.max(2.5, H * 0.08)), 'a');
  const body = line2(W * 0.3, cy - 1, W * 0.75, cy, H * 0.17);
  r.fill(body, 'a');
  r.fill(inter(line2(W * 0.32, cy + H * 0.1, W * 0.7, cy + H * 0.11, H * 0.07), body), 'b', { line: false });
  for (const [y1, dx] of [[cy + H * 0.12, 0], [cy + H * 0.22, 3]] as [number, number][]) {
    r.fill(line2(W * 0.3, cy + 2, W * 0.07 + dx, y1, Math.max(2.5, H * 0.08)), 'a');
    r.fill(ell(W * 0.07 + dx, y1, H * 0.1, H * 0.08), d.feet ?? 'a');
  }
  const hx = W * 0.22;
  const hy = cy - H * 0.2;
  const hr = H * 0.22;
  r.fill(poly([[hx + hr * 0.1, hy - hr * 0.6], [hx + hr * 0.7, hy - hr * 0.4], [hx + hr * 0.6, hy - hr * 1.5]]), 'a');
  r.fill(poly([[hx + hr * 0.25, hy - hr * 0.6], [hx + hr * 0.55, hy - hr * 0.5], [hx + hr * 0.5, hy - hr * 1.15]]), 'c', { line: false });
  r.fill(ell(hx, hy, hr, hr * 0.85), 'a');
  r.fill(ell(hx - hr * 0.75, hy + hr * 0.3, hr * 0.42, hr * 0.3), 'b');
  r.fill(ell(hx - hr * 1.05, hy + hr * 0.1, 1.3, 1), 'n', { line: false, flat: true });
  eye(r, hx - hr * 0.3, hy - hr * 0.1, hr * 0.3, o, d.iris);
}

// ------------------------------------------------------------------ Muster, Fellstruktur, Ausgabe

function applyRigPattern(r: Raster, pattern: string | undefined, seed: number) {
  if (!pattern || pattern === 'solid') return;
  const { w, h } = r;
  let test: (x: number, y: number) => string | null;
  if (pattern === 'tabby') test = (x, y) => ((y + Math.round(2 * Math.sin(x / 5)) + 40) % 9 < 3 ? 'd' : null);
  else if (pattern === 'patches') {
    let a = seed >>> 0;
    const rnd = () => ((a = (Math.imul(a ^ (a >>> 15), 2246822507) + 0x6d2b79f5) >>> 0), a / 4294967296);
    const blobs = [0, 1, 2, 3].map(() => [rnd(), 0.15 + rnd() * 0.8, 0.12 + rnd() * 0.1]);
    test = (x, y) => (blobs.some(([bx, by, rr]) => ((x + 0.5) / w - bx) ** 2 + ((y + 0.5) / h - by) ** 2 < rr * rr) ? 'd' : null);
  } else if (pattern === 'laced') test = (x, y) => {
    const row = Math.floor(y / 5);
    const xx = x + (row % 2) * 3;
    return y % 5 === 4 || xx % 6 === 0 ? 'd' : null;
  };
  else if (pattern === 'spots') test = (x, y) => {
    const cx = Math.floor(x / 8);
    const cy = Math.floor(y / 8);
    if (hash(cx, cy, seed) < 0.45) return null;
    const sx = cx * 8 + 2 + hash(cx, cy, seed + 1) * 4;
    const sy = cy * 8 + 2 + hash(cx, cy, seed + 2) * 4;
    return (x + 0.5 - sx) ** 2 + (y + 0.5 - sy) ** 2 < 3.2 ? 'd' : null;
  };
  else if (pattern === 'saddle') test = (_x, y) => (y >= h * 0.55 && y < h * 0.85 ? 'd' : null);
  else if (pattern === 'points') test = (_x, y) => (y >= h - 16 ? 'd' : null);
  else if (pattern === 'socks') test = (_x, y) => (y >= h - 20 ? 'b' : null);
  else return;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (r.k[y * w + x] !== 'a') continue;
      const n = test(x, y);
      if (n) r.k[y * w + x] = n;
    }
}

const LIGHT: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D', p: 'P', w: 'W' };
const DARK: Record<string, string> = { a: '1', b: '2', c: '3', d: '4', p: '5', w: '6' };
/** zusätzliche Farbzeichen, die aus der Palette abgeleitet werden: [Zeichen, Basis, Helligkeit] */
export const SHADE_KEYS: [string, string, number][] = [
  ...Object.entries(LIGHT).map(([b, k]) => [k, b, 0.2] as [string, string, number]),
  ...Object.entries(DARK).map(([b, k]) => [k, b, -0.22] as [string, string, number]),
];

function output(r: Raster, furry: boolean): string[] {
  const rows: string[] = [];
  for (let y = 0; y < r.h; y++) {
    let row = '';
    for (let x = 0; x < r.w; x++) {
      const i = y * r.w + x;
      const k = r.k[i];
      let s = r.s[i];
      // feine Fell-/Federstruktur: kurze senkrechte Striche
      if (furry && s === 0 && (k === 'a' || k === 'd') && (hash(x, y >> 1, 7) < 0.07 || hash(x, (y + 1) >> 1, 7) < 0.035)) s = -1;
      if (k.length === 1 && s > 0 && LIGHT[k]) row += LIGHT[k];
      else if (s < 0 && DARK[k]) row += DARK[k];
      else row += k;
    }
    rows.push(row);
  }
  return rows;
}

const cache = new Map<string, string[]>();

/** Tier zeichnen: w/h in Spiel-Einheiten (wie die bisherigen Sprites), Ergebnis in voller Rasterdichte */
export function renderRig(def: RigDef, stage: Exclude<Stage, 'egg'>, wUnits: number, hUnits: number, o: RigOpts, res: number): string[] {
  const key = JSON.stringify([def, stage, wUnits, hUnits, o, res]);
  const hit = cache.get(key);
  if (hit) return hit;
  const r = new Raster(wUnits * res, hUnits * res);
  const pose = o.pose ?? 'stand';
  if (pose === 'sleep') {
    if (def.kind === 'hog') ballSleep(r, o);
    else if (def.kind === 'chicken') roostSleep(r, def, o);
    else curlSleep(r, def, o);
  } else if (pose === 'stretch0' || pose === 'stretch1') {
    if (def.kind === 'quad' || def.kind === 'dachs') stretch(r, def, pose === 'stretch0' ? 0 : 1, o);
    else if (def.kind === 'hog') hog(r, stage, o);
  } else if ((pose === 'scratch0' || pose === 'scratch1') && def.kind === 'quad') catScratch(r, def, pose === 'scratch0' ? 0 : 1, o);
  else if ((pose === 'bat0' || pose === 'bat1') && def.kind === 'quad') catBat(r, def, pose === 'bat0' ? 0 : 1, o);
  else if (pose === 'leap' && def.kind === 'quad') catLeap(r, def, o);
  else if (def.kind === 'quad') quadSit(r, def, stage, o);
  else if (def.kind === 'dachs') dachs(r, stage, o);
  else if (def.kind === 'hog') hog(r, stage, o);
  else chicken(r, def, stage, o);
  applyRigPattern(r, o.pattern, o.seed ?? 1);
  const out = output(r, def.kind !== 'hog');
  if (cache.size > 600) cache.clear();
  cache.set(key, out);
  return out;
}
