import { MIN, RULES } from '../engine/config';
import type { GameState } from '../engine/state';
import { species } from '../species';
import { ICONS, drawMap, eggMap, paletteFor, petMap } from './pixels';

export const SCREEN_W = 64;
export const SCREEN_H = 48;
const FLOOR_Y = 40;

type FxKind = 'food' | 'candy' | 'pill' | 'heart' | 'angry' | 'sparkle';

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private fx: { kind: FxKind; until: number } | null = null;
  private cleaningUntil = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    this.ctx = canvas.getContext('2d')!;
  }

  effect(kind: FxKind) {
    this.fx = { kind, until: performance.now() + 1500 };
  }

  cleaning() {
    this.cleaningUntil = performance.now() + 700;
  }

  draw(s: GameState) {
    const ctx = this.ctx;
    const t = performance.now();
    const p = s.pet;
    const sp = species(p?.species ?? s.memorials[0]?.species ?? 'fox');
    const hour = new Date(s.clock).getHours();
    const day = hour >= 7 && hour < 20;

    // Raum
    ctx.fillStyle = sp.colors.wall;
    ctx.fillRect(0, 0, SCREEN_W, FLOOR_Y);
    ctx.fillStyle = sp.colors.wallDark;
    for (let x = 0; x < SCREEN_W; x += 8) ctx.fillRect(x, 0, 1, FLOOR_Y);
    ctx.fillStyle = sp.colors.floor;
    ctx.fillRect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, FLOOR_Y, SCREEN_W, 1);

    // Fenster mit Tag/Nacht
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(45, 6, 14, 12);
    ctx.fillStyle = day ? '#9fd6f5' : '#1d2147';
    ctx.fillRect(46, 7, 12, 10);
    drawMap(ctx, ICONS[day ? 'sun' : 'moon'].map, ICONS[day ? 'sun' : 'moon'].colors, 49, 9);
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(51, 7, 1, 10);
    ctx.fillRect(46, 12, 12, 1);

    if (!p) {
      this.overlay(0.2);
      return;
    }

    // Haufen
    const cleaning = t < this.cleaningUntil;
    p.poops.slice(0, 6).forEach((_, i) => {
      const x = 50 + (i % 2) * 7 - (cleaning ? (this.cleaningUntil - t) / 20 : 0);
      const y = FLOOR_Y - Math.floor(i / 2) * 2 + (i % 2);
      drawMap(ctx, ICONS.poop.map, ICONS.poop.colors, x, y);
    });

    // Tier
    if (p.stage === 'egg') {
      const left = RULES.eggMinutes * MIN - (s.clock - p.createdAt);
      const wobble = left < 30_000 ? Math.round(Math.sin(t / 80)) : 0;
      drawMap(ctx, eggMap(), { o: '#3a2a1a', s: sp.egg.shell, x: sp.egg.spots }, 26 + wobble, FLOOR_Y - 12);
    } else {
      const sprite = sp.sprites[p.stage];
      const w = sprite[0].length;
      const h = sprite.length;
      let x = (SCREEN_W - w) / 2 - 6;
      let flip = false;
      let bob = 0;
      if (!p.asleep) {
        const speed = p.sick ? 9000 : 4500;
        const phase = (t % speed) / speed; // 0..1
        const range = 14;
        const pos = phase < 0.5 ? phase * 2 : 2 - phase * 2;
        x = 4 + Math.round(pos * range);
        flip = phase >= 0.5;
        bob = Math.floor(t / 400) % 2;
      }
      const blink = !p.asleep && t % 3500 < 150;
      const map = petMap(sprite, { eyesClosed: p.asleep || blink, brows: p.variant === 'cheeky' });
      drawMap(ctx, map, paletteFor(sp, p.variant), x, FLOOR_Y - h + 1 - bob, flip);

      if (p.variant === 'great' && Math.floor(t / 600) % 3 === 0) {
        drawMap(ctx, ICONS.sparkle.map, ICONS.sparkle.colors, x + w - 2, FLOOR_Y - h - 3);
      }

      // Effekt über dem Kopf
      if (this.fx && t < this.fx.until) {
        const icon = ICONS[this.fx.kind];
        const rise = Math.floor((1500 - (this.fx.until - t)) / 250);
        drawMap(ctx, icon.map, icon.colors, x + w / 2 - 2, FLOOR_Y - h - 6 - rise);
      }

    }

    if (!p.lightOn) this.overlay(0.72);

    // Zzz (über dem Dunkel, damit man es sieht)
    if (p.stage !== 'egg' && p.asleep) {
      const spr = sp.sprites[p.stage];
      const zx = (SCREEN_W - spr[0].length) / 2 - 6 + spr[0].length;
      const k = Math.floor(t / 600) % 3;
      for (let i = 0; i <= k; i++) drawMap(ctx, ICONS.z.map, ICONS.z.colors, zx + i * 4, FLOOR_Y - spr.length - 2 - i * 5);
    }

    // Statussymbole oben links
    let ix = 2;
    if (p.sick) {
      const icon = p.lightOn ? ICONS.skullDark : ICONS.skull;
      drawMap(ctx, icon.map, icon.colors, ix, 2);
      ix += 7;
    }
    if (Object.keys(p.calls).length > 0 && Math.floor(t / 500) % 2 === 0) {
      drawMap(ctx, ICONS.bang.map, ICONS.bang.colors, ix, 2);
    }
  }

  private overlay(alpha: number) {
    this.ctx.fillStyle = `rgba(8,10,30,${alpha})`;
    this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}
