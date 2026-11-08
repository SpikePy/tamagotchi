// Grafik-Helfer im Pixelraster (Koordinaten in Spiel-Einheiten, Raster = 0,5 Einheiten).
const PX = 0.5;
const snap = (v: number) => Math.round(v / PX) * PX;

export function shadeHex(c: string, f: number): string {
  const n = parseInt(c.slice(1, 7), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))),
  );
  return `#${((1 << 24) | (ch[0] << 16) | (ch[1] << 8) | ch[2]).toString(16).slice(1)}`;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

/** Farbverlauf in sichtbaren Stufen (Pixel-Look statt weichem Verlauf) */
export function bands(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bottom: string, n = 6) {
  const bh = h / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = mix(top, bottom, i / (n - 1));
    ctx.fillRect(x, snap(y + i * bh), w, snap(bh) + PX);
  }
}

/** gefüllter Kreis im Pixelraster */
export function pixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let y = snap(cy - r); y <= cy + r; y += PX) {
    const dy = y + PX / 2 - cy;
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (half <= 0) continue;
    const x0 = snap(cx - half);
    ctx.fillRect(x0, y, snap(cx + half) - x0, PX);
  }
}

/** Wolke aus Pixelkreisen */
export function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, size = 1) {
  for (const [dx, dy, r] of [
    [0, 0.4, 1.6],
    [2.4, -0.6, 2.1],
    [4.8, 0.3, 1.7],
    [2.4, 0.9, 1.7],
  ])
    pixelCircle(ctx, x + dx * size, y + dy * size, r * size, '#ffffff');
  // Schattenkante unten
  ctx.fillStyle = 'rgba(160,180,210,0.5)';
  ctx.fillRect(snap(x - 0.5 * size), snap(y + 2 * size), snap(5.5 * size), PX);
}

/** Lichtschein als zwei Pixel-Ringe */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.globalAlpha = 0.35;
  pixelCircle(ctx, x, y, r, color);
  ctx.globalAlpha = 0.45;
  pixelCircle(ctx, x, y, r * 0.65, color);
  ctx.globalAlpha = 1;
}

export const hash = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997;
