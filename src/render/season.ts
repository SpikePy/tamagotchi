// Jahreszeiten nach echtem Datum: Farben der Landschaft umfärben, im Winter Schnee.
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function seasonOf(clock: number): Season {
  const m = new Date(clock).getMonth(); // 0 = Januar
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

const hexRgb = (h: string) => {
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (r: number, g: number, b: number) =>
  `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
const lerp = (h: string, to: string, k: number) => {
  const a = hexRgb(h);
  const b = hexRgb(to);
  return rgbHex(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
};

// Laub von Busch und Hecke (Tannen haben eigene Farben und bleiben grün)
const AUTUMN_LEAVES: Record<string, string> = {
  '#3f7432': '#b8582a',
  '#4f8a3c': '#d07a30',
  '#5fa84a': '#e8a040',
  '#7cc45a': '#f4c060',
  '#2f5a26': '#8a3a1a',
  '#28501f': '#7a3418',
  '#43783a': '#c06a2a',
  '#5a9a44': '#e09040',
  '#6aa850': '#e8a848',
  '#86c262': '#f0c868',
  '#2d5524': '#7a3a1a',
};
const WINTER_LEAVES: Record<string, string> = {
  '#7cc45a': '#f4f8fc',
  '#86c262': '#f4f8fc',
  '#6aa850': '#e4ecf4',
  '#5fa84a': '#e4ecf4',
  '#5a9ae8': '#c8e0f0',
  '#5aa6d6': '#c8e0f0', // Bach zugefroren
  '#8ccaf0': '#eef6fc',
  '#3a6a8a': '#9ab8d0',
};
const SPRING_LEAVES: Record<string, string> = {
  '#7cc45a': '#f8c8dc', // Blüten am Busch
  '#86c262': '#ffffff', // weiße Blüten in der Hecke
};

/** Farbfunktion für eine Jahreszeit (für Landschaft draußen) */
export function seasonTransform(season: Season): (hex: string) => string {
  if (season === 'summer') return (h) => h;
  return (h) => {
    const key = h.toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(key)) return h;
    const leaves = season === 'autumn' ? AUTUMN_LEAVES : season === 'winter' ? WINTER_LEAVES : SPRING_LEAVES;
    if (leaves[key]) return leaves[key];
    const [r, g, b] = hexRgb(key);
    const greenish = g > r + 10 && g > b + 10 && r + g + b > 300; // Gras, Wiese, Hügel
    if (!greenish) return h;
    if (season === 'autumn') return lerp(key, '#c8a040', 0.45);
    if (season === 'winter') return lerp(key, '#eef3f8', 0.85);
    return lerp(key, '#9ee070', 0.2); // Frühling: frischer
  };
}

/** Kontext, der Füllfarben beim Setzen umfärbt */
export function remapContext(ctx: CanvasRenderingContext2D, f: (hex: string) => string): CanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop) {
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      if (prop === 'fillStyle' && typeof value === 'string') value = f(value);
      return Reflect.set(target, prop, value, target);
    },
  });
}

/** Winter: Schneedecke auf dem Boden (mit ein paar Lücken) */
export function snowGround(ctx: CanvasRenderingContext2D, groundY: number) {
  for (let y = groundY; y < 48; y += 0.5)
    for (let x = 0; x < 64; x += 0.5) {
      const n = (((Math.round(x * 2) * 73856093) ^ (Math.round(y * 2) * 19349663)) >>> 0) % 997;
      if (n % 11 === 0) continue; // Lücken
      ctx.fillStyle = n % 5 === 0 ? '#dce6f0' : n % 7 === 0 ? '#ffffff' : '#eef3f8';
      ctx.fillRect(x, y, 0.5, 0.5);
    }
}

/** Winter: Schneehauben auf allen nach oben offenen Flächen einer Ebene */
export function snowCaps(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const alpha = (x: number, y: number) => (y < 0 ? 0 : d[(y * w + x) * 4 + 3]);
  for (let x = 0; x < w; x++)
    for (let y = 1; y < h; y++) {
      if (alpha(x, y) < 200 || alpha(x, y - 1) > 0) continue;
      // oberste 2 Pixel schneeweiß, mit leichtem Blau darunter
      for (let k = 0; k < 2 && y + k < h; k++) {
        const i = ((y + k) * w + x) * 4;
        if (d[i + 3] < 200) break;
        d[i] = k ? 220 : 248;
        d[i + 1] = k ? 230 : 250;
        d[i + 2] = k ? 242 : 255;
      }
    }
  ctx.putImageData(img, 0, 0);
}
