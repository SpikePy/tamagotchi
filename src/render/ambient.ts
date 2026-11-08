// Atmosphäre: Schmetterlinge am Tag, Glühwürmchen in der Nacht, warmes Abendlicht, Stehlampe drinnen.
import { drawPixels, type ColorMap } from './pixels';
import { pixelCircle } from './fx';
import type { SceneKind, Sky } from './outdoor';

const W = 64;
const snap = (v: number) => Math.round(v * 2) / 2;

const BUTTERFLY = [
  ['o.o', '.b.', 'o.o'],
  ['...', 'obo', '...'],
];
const BUTTERFLY_COLORS: ColorMap[] = [
  { o: '#f6d23c', b: '#3a2a1a' },
  { o: '#f4f4f4', b: '#3a2a1a' },
  { o: '#e86fa0', b: '#3a2a1a' },
  { o: '#5a9ae8', b: '#2a2a3a' },
];

export class Ambient {
  private seed = Math.random() * 1000;

  /** Schmetterlinge (Tag) bzw. Glühwürmchen (Nacht); win = Fensterausschnitt im Zimmer */
  draw(ctx: CanvasRenderingContext2D, env: SceneKind, sky: Sky, t: number, win: { x: number; y: number; w: number; h: number }) {
    const s = t / 1000 + this.seed;
    if (env === 'room') {
      if (sky.day) return;
      // Glühwürmchen draußen vor dem Fenster
      ctx.save();
      ctx.beginPath();
      ctx.rect(win.x, win.y, win.w, win.h);
      ctx.clip();
      for (let i = 0; i < 4; i++) this.firefly(ctx, win.x + 3 + ((i * 6 + Math.sin(s * 0.3 + i) * 3) % (win.w - 4)), win.y + win.h - 3 - ((i * 5) % 8) + Math.sin(s * 0.7 + i * 2), s, i);
      ctx.restore();
      return;
    }
    if (sky.day) {
      for (let i = 0; i < 2; i++) {
        const x = (s * (3 + i) + i * 30) % (W + 10) - 5;
        const y = 30 + Math.sin(s * 0.9 + i * 2) * 3 + Math.sin(s * 2.3 + i) * 1.2 - i * 4;
        const frame = BUTTERFLY[Math.floor(t / 120 + i) % 2];
        drawPixels(ctx, frame, BUTTERFLY_COLORS[(i + Math.floor(this.seed)) % BUTTERFLY_COLORS.length], snap(x), snap(y));
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const x = ((i * 8.3 + Math.sin(s * 0.25 + i * 1.7) * 4 + 64) % 64);
        const y = 28 + ((i * 3.7) % 12) + Math.sin(s * 0.5 + i) * 1.5;
        this.firefly(ctx, x, y, s, i);
      }
    }
  }

  private firefly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, i: number) {
    const glow = (Math.sin(s * 2 + i * 1.3) + 1) / 2;
    if (glow < 0.15) return;
    ctx.globalAlpha = 0.25 * glow;
    pixelCircle(ctx, x, y, 1.2, '#e8f870');
    ctx.globalAlpha = 0.6 + 0.4 * glow;
    ctx.fillStyle = '#f4ff9a';
    ctx.fillRect(snap(x), snap(y), 0.5, 0.5);
    ctx.globalAlpha = 1;
  }
}

/** warmer Orange-Ton zur Dämmerung (morgens und abends) */
export function eveningLight(ctx: CanvasRenderingContext2D, sky: Sky) {
  if (!sky.day || sky.edge > 0.12) return;
  const a = ((0.12 - sky.edge) / 0.12) * 0.16;
  ctx.fillStyle = `rgba(255,140,60,${a.toFixed(3)})`;
  ctx.fillRect(0, 0, 64, 48);
}

// Stehlampe rechts im Zimmer (hinter dem Körbchen)
export const LAMP = { x: 60.5, shadeY: 11 };

/** Lampe (aus) – statisch im Hintergrund */
export function drawLamp(ctx: CanvasRenderingContext2D) {
  const { x, shadeY } = LAMP;
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(x, shadeY + 4, 0.5, 40 - shadeY - 4);
  ctx.fillRect(x - 1.5, 39.5, 3.5, 0.5);
  drawPixels(ctx, ['...oooo...', '..oSSSSo..', '.oSSSSSSo.', 'oSSSSSSSSo', 'oooooooooo'], { o: '#7a5a3a', S: '#e8d8b0' }, x - 2.25, shadeY);
}

/** Lampe an: heller Schirm und warmer Lichtkegel */
export function drawLampLight(ctx: CanvasRenderingContext2D) {
  const { x, shadeY } = LAMP;
  ctx.globalAlpha = 0.18;
  pixelCircle(ctx, x + 0.25, shadeY + 4, 9, '#ffd890');
  ctx.globalAlpha = 0.22;
  pixelCircle(ctx, x + 0.25, shadeY + 4, 5, '#ffe8a8');
  ctx.globalAlpha = 1;
  drawPixels(ctx, ['...oooo...', '..oSSSSo..', '.oSSLSSSo.', 'oSSLLSSSSo', 'oooooooooo'], { o: '#9a7a4a', S: '#fff2c0', L: '#ffffff' }, x - 2.25, shadeY);
}
