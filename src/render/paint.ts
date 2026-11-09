// Malen direkt im Bildpixel-Raster (256 × 192): für Hintergründe, die nativ in voller Auflösung entstehen.
import { RES } from './pixels';

export const PW = 64 * RES;
export const PH = 48 * RES;

let scratch: CanvasRenderingContext2D | null = null;
const parsed = new Map<string, [number, number, number, number]>();

function parseCss(c: string): [number, number, number, number] {
  if (c.startsWith('#')) {
    const n = parseInt(c.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [m[0], m[1], m[2], m[3] ?? 1];
}

/** Pixel-Puffer; Farben werden über einen Canvas-Kontext aufgelöst (so greifen auch Umfärbungen) */
export class Painter {
  readonly d: Uint8ClampedArray<ArrayBuffer>;
  private local = new Map<string, [number, number, number, number]>();
  constructor(private ctx?: CanvasRenderingContext2D, readonly w = PW, readonly h = PH) {
    this.d = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  }

  rgba(c: string): [number, number, number, number] {
    let v = this.local.get(c);
    if (v) return v;
    if (this.ctx) {
      const old = this.ctx.fillStyle;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillStyle = c;
      v = parseCss(String(this.ctx.fillStyle));
      this.ctx.fillStyle = old;
    } else {
      v = parsed.get(c);
      if (!v) {
        scratch ??= document.createElement('canvas').getContext('2d')!;
        scratch.fillStyle = '#000000';
        scratch.fillStyle = c;
        v = parseCss(String(scratch.fillStyle));
        parsed.set(c, v);
      }
    }
    this.local.set(c, v);
    return v;
  }

  px(x: number, y: number, c: string) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = this.rgba(c);
    const d = this.d;
    const i = (y * this.w + x) * 4;
    if (a >= 1) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      return;
    }
    const da = d[i + 3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    d[i] = (r * a + d[i] * da * (1 - a)) / oa;
    d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
    d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) this.px(xx, yy, c);
  }

  /** deckend gesetzt? */
  filled(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.d[(Math.floor(y) * this.w + Math.floor(x)) * 4 + 3] > 0;
  }

  /** kleine Grafik: 1 Zeichen = 1 Bildpixel */
  map(rows: string[], colors: Record<string, string>, x: number, y: number) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => colors[ch] && this.px(x + i, y + j, colors[ch])));
  }

  /** Linie (Bresenham) */
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    cv.getContext('2d')!.putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return cv;
  }

  /** auf einen (auf Spiel-Einheiten skalierten) Kontext zeichnen */
  commit(ctx: CanvasRenderingContext2D, x = 0, y = 0) {
    ctx.drawImage(this.toCanvas(), x, y, this.w / RES, this.h / RES);
  }
}

/** deterministisches Rauschen 0..1 */
export function hash(x: number, y: number, s = 0): number {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1013904223)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

/** weiches Wertrauschen 0..1 */
export function vnoise(x: number, y: number, s = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, s = 0, oct = 3): number {
  let f = 0;
  let amp = 0.5;
  let fr = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    f += amp * vnoise(x * fr, y * fr, s + i * 17);
    norm += amp;
    fr *= 2;
    amp *= 0.5;
  }
  return f / norm;
}

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** geordnetes Dithering: true, wenn bei Anteil t (0..1) an dieser Stelle die zweite Farbe gesetzt wird */
export const dither = (x: number, y: number, t: number) => t * 16 > B4[(y & 3) * 4 + (x & 3)] + 0.5;

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const c = [16, 8, 0].map((sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

/** Verlauf über mehrere Farben in sichtbaren Stufen mit Dithering an den Übergängen */
export function gradient(stops: string[], levels: number): (x: number, y: number, t: number) => string {
  const cols = Array.from({ length: levels }, (_, i) => {
    const u = (i / (levels - 1)) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(u));
    return mix(stops[k], stops[k + 1], u - k);
  });
  return (x, y, t) => {
    const v = Math.max(0, Math.min(1, t)) * (levels - 1);
    const k = Math.floor(v);
    return cols[Math.min(levels - 1, k + (dither(x, y, v - k) ? 1 : 0))];
  };
}
