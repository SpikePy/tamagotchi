import { MIN, RULES } from '../engine/config';
import type { GameState, Pet } from '../engine/state';
import { species } from '../species';
import type { SpeciesDef } from '../species/types';
import { ColorMap, ICONS, drawMap, eggMap, paletteFor, petMap } from './pixels';

export const SCREEN_W = 64;
export const SCREEN_H = 48;
const FLOOR_Y = 40;

// Körbchen links im Raum
const BASKET_X = 1;
const BASKET_Y = FLOOR_Y - 6;
const BASKET_CX = BASKET_X + 11;
const BASKET_COLORS: ColorMap = { o: '#4a2f17', a: '#b5824a', c: '#8a5a2b', b: '#d9a86a', p: '#6c8fd1' };
const BASKET_BACK = [
  '...oooooooooooooooo...',
  '..obbbbbbbbbbbbbbbbo..',
  '.oppppppppppppppppppo.',
];
const BASKET_FRONT = [
  'oooooooooooooooooooooo',
  'obbbbbbbbbbbbbbbbbbbbo',
  'oaacaacaacaacaacaacaao',
  'ocaacaacaacaacaacaacao',
  'oaacaacaacaacaacaacaao',
  '.oooooooooooooooooooo.',
];

// Risse im Ei (relativ zum Ei), je Stufe kommen mehr dazu
const CRACKS: [number, number][][] = [
  [[1, 6], [2, 5], [3, 6]],
  [[4, 5], [5, 6], [6, 5]],
  [[7, 6], [8, 5], [9, 6], [10, 5], [5, 7], [6, 8], [8, 4]],
];
const EGG_W = 12;
const EGG_H = 13;
const EGG_X = BASKET_CX - EGG_W / 2;
const EGG_Y = FLOOR_Y - EGG_H - 2;

type FxKind = 'food' | 'candy' | 'pill' | 'heart' | 'angry' | 'sparkle';

const HATCH_MS = 1800;
const EAT_MS = 1500;

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private fx: { kind: FxKind; start: number; until: number } | null = null;
  private cleaningUntil = 0;
  private hatchStart = -Infinity;
  private flashStart = -Infinity;
  private jumpStart = -Infinity;
  private shakeStart = -Infinity;
  private lastX = 30;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    this.ctx = canvas.getContext('2d')!;
  }

  effect(kind: FxKind) {
    const now = performance.now();
    this.fx = { kind, start: now, until: now + 1500 };
    if (kind === 'heart' || kind === 'candy' || kind === 'sparkle') this.jumpStart = now + (kind === 'candy' ? EAT_MS : 0);
    if (kind === 'angry') this.shakeStart = now;
  }

  cleaning() {
    this.cleaningUntil = performance.now() + 700;
  }

  hatch() {
    this.hatchStart = performance.now();
  }

  evolve() {
    this.flashStart = performance.now();
    this.jumpStart = performance.now() + 900;
  }

  /** true, solange die Schlüpf-Animation läuft */
  get hatching() {
    return performance.now() - this.hatchStart < HATCH_MS;
  }

  draw(s: GameState) {
    const ctx = this.ctx;
    const t = performance.now();
    const p = s.pet;
    const sp = species(p?.species ?? s.memorials[0]?.species ?? 'fox');

    this.drawRoom(sp, new Date(s.clock).getHours());
    drawMap(ctx, BASKET_BACK, BASKET_COLORS, BASKET_X, BASKET_Y);

    if (!p) {
      drawMap(ctx, BASKET_FRONT, BASKET_COLORS, BASKET_X, BASKET_Y + 3);
      this.overlay(0.2);
      return;
    }

    this.drawPoops(p, t);

    const hatching = t - this.hatchStart < HATCH_MS;
    if (p.stage === 'egg') {
      this.drawEgg(s, p, sp, t);
      drawMap(ctx, BASKET_FRONT, BASKET_COLORS, BASKET_X, BASKET_Y + 3);
    } else if (p.asleep || hatching) {
      this.drawPetInBasket(p, sp, t, hatching);
    } else {
      drawMap(ctx, BASKET_FRONT, BASKET_COLORS, BASKET_X, BASKET_Y + 3);
      this.drawPetWalking(p, sp, t);
    }

    if (!p.lightOn) this.overlay(0.72);

    // Zzz (über dem Dunkel, damit man es sieht)
    if (p.stage !== 'egg' && p.asleep) {
      const spr = sp.sprites[p.stage];
      const zx = BASKET_CX + spr[0].length / 2;
      const k = Math.floor(t / 600) % 3;
      for (let i = 0; i <= k; i++) drawMap(ctx, ICONS.z.map, ICONS.z.colors, zx + i * 4, FLOOR_Y - spr.length - i * 5);
    }

    // Entwicklung: weißes Aufblitzen
    const fl = t - this.flashStart;
    if (fl < 900) {
      ctx.fillStyle = `rgba(255,255,255,${(Math.floor(fl / 150) % 2 === 0 ? 0.85 : 0.2).toFixed(2)})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
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

  private drawRoom(sp: SpeciesDef, hour: number) {
    const ctx = this.ctx;
    const day = hour >= 7 && hour < 20;
    ctx.fillStyle = sp.colors.wall;
    ctx.fillRect(0, 0, SCREEN_W, FLOOR_Y);
    ctx.fillStyle = sp.colors.wallDark;
    for (let x = 0; x < SCREEN_W; x += 8) ctx.fillRect(x, 0, 1, FLOOR_Y);
    ctx.fillStyle = sp.colors.floor;
    ctx.fillRect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, FLOOR_Y, SCREEN_W, 1);

    ctx.fillStyle = '#5a4630';
    ctx.fillRect(45, 6, 14, 12);
    ctx.fillStyle = day ? '#9fd6f5' : '#1d2147';
    ctx.fillRect(46, 7, 12, 10);
    const icon = ICONS[day ? 'sun' : 'moon'];
    drawMap(ctx, icon.map, icon.colors, 49, 9);
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(51, 7, 1, 10);
    ctx.fillRect(46, 12, 12, 1);
  }

  private drawPoops(p: Pet, t: number) {
    const ctx = this.ctx;
    const cleaning = t < this.cleaningUntil;
    p.poops.slice(0, 6).forEach((_, i) => {
      const x = 50 + (i % 2) * 7 - (cleaning ? (this.cleaningUntil - t) / 20 : 0);
      const y = FLOOR_Y - Math.floor(i / 2) * 2 + (i % 2);
      drawMap(ctx, ICONS.poop.map, ICONS.poop.colors, x, y);
      if (!cleaning) {
        // Stinkewölkchen
        ctx.fillStyle = 'rgba(110,130,70,0.8)';
        for (let k = 0; k < 3; k++) {
          const yy = ((t / 180 + k * 3 + i * 2) % 9) | 0;
          const xx = Math.round(Math.sin((t / 250) + yy + k) * 1.2);
          ctx.fillRect(Math.round(x) + 2 + xx + (k - 1) * 2, y - 2 - yy, 1, 1);
        }
      }
    });
  }

  private drawEgg(s: GameState, p: Pet, sp: SpeciesDef, t: number) {
    const left = RULES.eggMinutes * MIN - (s.clock - p.createdAt) - (Date.now() - s.lastReal);
    const stage = left < 12_000 ? 3 : left < 25_000 ? 2 : left < 40_000 ? 1 : 0;
    // wackelt in Schüben, kurz vor dem Schlüpfen immer heftiger
    let wobble = 0;
    if (stage > 0) {
      const period = [0, 2200, 1400, 700][stage];
      const inBurst = t % period < 400;
      if (inBurst) wobble = Math.round(Math.sin(t / 45) * (stage === 3 ? 1.5 : 1));
    }
    const x = EGG_X + wobble;
    drawMap(this.ctx, eggMap(), { o: '#3a2a1a', s: sp.egg.shell, x: sp.egg.spots }, x, EGG_Y);
    this.ctx.fillStyle = '#3a2a1a';
    for (let k = 0; k < stage; k++) for (const [cx, cy] of CRACKS[k]) this.ctx.fillRect(x + cx, EGG_Y + cy, 1, 1);
  }

  private drawPetInBasket(p: Pet, sp: SpeciesDef, t: number, hatching: boolean) {
    const ctx = this.ctx;
    const sprite = sp.sprites[p.stage as Exclude<Pet['stage'], 'egg'>];
    const w = sprite[0].length;
    const h = sprite.length;
    const x = Math.round(BASKET_CX - w / 2);
    const k = hatching ? (t - this.hatchStart) / HATCH_MS : 1;
    // beim Schlüpfen taucht es langsam aus der Schale auf
    const rise = hatching ? Math.round(Math.min(1, k * 2) * 3) - 3 : 0;
    const y = FLOOR_Y - h + 1 - rise;
    const map = petMap(sprite, { eyesClosed: p.asleep, brows: p.variant === 'cheeky' });
    drawMap(ctx, map, paletteFor(sp, p.variant), x, y);

    if (hatching) {
      const egg = eggMap();
      const colors = { o: '#3a2a1a', s: sp.egg.shell, x: sp.egg.spots };
      // untere Schalenhälfte bleibt kurz stehen, obere fliegt weg
      if (k < 0.55) drawMap(ctx, egg.slice(6), colors, EGG_X, EGG_Y + 6);
      drawMap(ctx, egg.slice(0, 6), colors, EGG_X - k * 16, EGG_Y - k * 18 + k * k * 10);
      // Funkeln
      if (k > 0.3) {
        for (let i = 0; i < 4; i++) {
          if ((Math.floor(t / 120) + i) % 3) continue;
          const a = i * 1.7 + k * 3;
          drawMap(ctx, ICONS.sparkle.map, ICONS.sparkle.colors, BASKET_CX - 2 + Math.cos(a) * 12, y + 4 + Math.sin(a) * 8);
        }
      }
    }
    drawMap(ctx, BASKET_FRONT, BASKET_COLORS, BASKET_X, BASKET_Y + 3);
  }

  private drawPetWalking(p: Pet, sp: SpeciesDef, t: number) {
    const ctx = this.ctx;
    const sprite = sp.sprites[p.stage as Exclude<Pet['stage'], 'egg'>];
    const w = sprite[0].length;
    const h = sprite.length;
    const fx = this.fx && t < this.fx.until ? this.fx : null;
    const eating = fx && (fx.kind === 'food' || fx.kind === 'candy') && t - fx.start < EAT_MS;

    const from = 24;
    const to = Math.max(from + 4, 49 - w);
    let x: number;
    let flip = false;
    if (eating) {
      x = this.lastX; // beim Essen bleibt es stehen
    } else {
      const speed = p.sick ? 9000 : 4500;
      const phase = (t % speed) / speed;
      const pos = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      x = from + Math.round(pos * (to - from));
      flip = phase >= 0.5;
      this.lastX = x;
    }

    let bob = p.sick ? 0 : Math.floor(t / 400) % 2;
    const j = t - this.jumpStart;
    if (j >= 0 && j < 900) bob = Math.round(Math.abs(Math.sin((j / 900) * Math.PI * 2)) * 5);
    const s = t - this.shakeStart;
    if (s >= 0 && s < 600) x += Math.round(Math.sin(s / 25) * 1.5);

    const blink = t % 3500 < 150;
    const map = petMap(sprite, { eyesClosed: blink, brows: p.variant === 'cheeky' });
    const y = FLOOR_Y - h + 1 - bob;
    drawMap(ctx, map, paletteFor(sp, p.variant), x, y, flip);

    if (p.variant === 'great' && Math.floor(t / 600) % 3 === 0) {
      drawMap(ctx, ICONS.sparkle.map, ICONS.sparkle.colors, x + w - 2, y - 4);
    }

    if (!fx) return;
    const icon = ICONS[fx.kind];
    if (eating) {
      // Futter vor dem Maul, wird in Bissen kleiner
      const bites = Math.floor(((t - fx.start) / EAT_MS) * 3);
      const cut = [5, 3, 1][bites] ?? 0;
      const map = icon.map.map((row) => row.slice(0, cut));
      drawMap(ctx, map, icon.colors, x + w, FLOOR_Y - 5);
    } else {
      const rise = Math.floor((t - fx.start) / 250);
      drawMap(ctx, icon.map, icon.colors, x + w / 2 - 2, y - 7 - rise);
    }
  }

  private overlay(alpha: number) {
    this.ctx.fillStyle = `rgba(8,10,30,${alpha})`;
    this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}
