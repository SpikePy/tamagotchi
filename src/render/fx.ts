// Kleine Grafik-Helfer für Details in hoher Auflösung (Koordinaten in Spiel-Pixeln).

export function shadeHex(c: string, f: number): string {
  const n = parseInt(c.slice(1, 7), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))),
  );
  return `#${((1 << 24) | (ch[0] << 16) | (ch[1] << 8) | ch[2]).toString(16).slice(1)}`;
}

/** weiche Wolke aus mehreren Kreisen */
export function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, size = 1) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [dx, dy, r] of [
    [0, 0, 1.6],
    [1.8, -0.8, 2],
    [3.8, 0, 1.6],
    [1.9, 0.6, 1.6],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx * size * 1.4, y + dy * size, r * size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** weicher Lichtschein (Sonne) */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** deterministisches Rauschen */
export const hash = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997;
