import { MIN, RULES } from '../engine/config';
import { activePet, hearts, type GameState, type Pet } from '../engine/state';
import { species } from '../species';
import type { SpeciesDef } from '../species/types';
import { ColorMap, ICONS, RES, drawMap, eggColors, eggMap, hiResCanvas, petSprite } from './pixels';
import { Critters } from './critters';
import { cloud, glow, shadeHex } from './fx';
import { PLATE_COLORS, SceneKind, drawNestBack, drawNestFront, drawOutdoor, skyState } from './outdoor';

export const SCREEN_W = 64;
export const SCREEN_H = 48;
const FLOOR_Y = 40;

// Körbchen unter dem Fenster (geflochten, mit Kissen)
const BASKET_X = 37;
const BASKET_Y = FLOOR_Y - 6;
const BASKET_CX = BASKET_X + 12;
const BASKET_COLORS: ColorMap = {
  o: '#4a2f17', // Umriss
  b: '#e0b57a', // Flechtrand hell
  c: '#a8743e', // Flechtrand dunkel
  a: '#c48f55', // Geflecht
  x: '#8a5a2b', // Weidenstäbe
  i: '#5a3a20', // Innenschatten
  p: '#6c8fd1', // Kissen
};
const BASKET_BACK = [
  '....oooooooooooooooo....',
  '..oobbbbbbbbbbbbbbbboo..',
  '.oiippppppppppppppppiio.',
];
const BASKET_FRONT = [
  'oobcbcbcbcbcbcbcbcbcbcoo',
  'ocbcbcbcbcbcbcbcbcbcbcbo',
  'oxaaxaaxaaxaaxaaxaaxaaxo',
  '.oaxaaxaaxaaxaaxaaxaaxo.',
  '.oxaaxaaxaaxaaxaaxaaxao.',
  '..oaxaaxaaxaaxaaxaaxao..',
  '...oooooooooooooooooo...',
];

// Futternapf neben der Pflanze
const BOWL_X = 15;
const BOWL_Y = FLOOR_Y + 2;
const BOWL = ['.ooooooo.', 'ohhhhhhho', '.obbbbbo.', '..ooooo..'];
const FOOD_LEVELS = [
  [], // leer
  ['.......', '..fkf..'],
  ['.......', '.fkfkf.'],
  ['..fkf..', '.fkfkf.'],
];
const FOOD_COLORS: Record<'food' | 'candy', ColorMap> = {
  food: { f: '#8a5a2b', k: '#b07a42' },
  candy: { f: '#e46fb1', k: '#fff2f8' },
};

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

// Fenster, Himmel, Pflanze
const WIN = { x: 37, y: 3, w: 22, h: 16 };
const SUNRISE = 7;
const SUNSET = 20;
const STARS: [number, number][] = [[2, 2], [8, 1], [15, 3], [19, 7], [4, 9], [12, 6], [17, 12], [6, 13]];
// Kratzbaum (Katze)
const POST_X = 6; // links im Zimmer
const POST = [
  '..ooooooo..',
  '.ommmmmmmo.',
  'ommmmmmmmmo',
  'ooooooooooo',
  ...Array.from({ length: 13 }, (_, i) => (i % 2 ? '...oRRRo...' : '...orrro...')),
  '..ooooooo..',
  '.ommmmmmmo.',
  'ommmmmmmmmo',
  'ooooooooooo',
];
const POST_COLORS: ColorMap = { o: '#4a3a30', m: '#b9a58a', r: '#d8c08e', R: '#b89a62', l: '#5a4a40', y: '#e2384d' };

// Tennisball (Hund)
const BALL = ['.ooo.', 'oyyso', 'oysyo', 'osyyo', '.ooo.'];
const BALL_COLORS: ColorMap = { o: '#5a6a1a', y: '#d8e84a', s: '#f6f6e4' };

// Grasbüschel (Fuchs) und Herbstlaub (Igel)
const TUFT = ['l.l.l', '.lgl.', 'ggggg'];
const TUFT_COLORS: ColorMap = { l: '#8cc85a', g: '#4d9a3a' };
const TUFTS_X = [12, 21, 29, 35, 60];
const GRASS_DOTS: [number, number][] = [[3, 43], [9, 46], [15, 44], [24, 46], [31, 43], [40, 46], [47, 44], [55, 46], [61, 43], [19, 41], [51, 42]];
const LEAF_SHAPES = [['.x.', 'xxx'], ['xx', '.x'], ['x.', 'xx']];
const LEAF_COLORS = ['#d9772b', '#b8432a', '#e0b13a', '#8a5a2b', '#c95a2a'];
const LEAVES: [number, number, number, number][] = [
  [13, 42, 0, 0], [20, 45, 1, 1], [27, 41, 2, 2], [33, 44, 3, 0], [9, 45, 4, 1], [3, 42, 2, 2],
  [42, 45, 0, 1], [49, 43, 1, 0], [56, 46, 2, 1], [61, 42, 3, 2], [24, 43, 4, 0], [37, 46, 1, 2], [16, 46, 3, 2],
];

// HUD-Symbole
const HUD_ICON_COLORS: ColorMap = { b: '#c0763a', w: '#f4f0e8', y: '#f2d64b', o: '#3a2a1a' };
const HUD_FOOD = ['..bb.', '.bbbb', '.bbb.', 'w.b..', 'ww...'];
const HUD_SMILE = ['.yyy.', 'yoyoy', 'yyyyy', 'yoooy', '.yyy.'];

type FxKind = 'food' | 'candy' | 'pill' | 'heart' | 'angry' | 'sparkle';

const HATCH_MS = 1800;
const EAT_MS = 2400; // Fressen am Napf
const WALK_SPEED_TO_BOWL = 28; // Pixel pro Sekunde

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private fx: { kind: FxKind; start: number; until: number } | null = null;
  private cleaningUntil = 0;
  private hatchStart = -Infinity;
  private flashStart = -Infinity;
  private jumpStart = -Infinity;
  private shakeStart = -Infinity;
  private meal: { kind: 'food' | 'candy'; eatStart: number | null } | null = null;
  private walkX = 30;
  private walkDir = 1;
  private lastFrame = performance.now();
  private env: SceneKind = 'room';
  private shownPetId: string | null = null;
  private bg = hiResCanvas(SCREEN_W, SCREEN_H);
  private bgKey = '';
  private bgDay = true;
  private critters = new Critters();

  /** Animationen zurücksetzen (z. B. beim Umschalten auf ein anderes Tier) */
  reset() {
    this.meal = null;
    this.fx = null;
    this.walkX = 30;
    this.walkDir = 1;
    this.hatchStart = this.flashStart = this.jumpStart = this.shakeStart = -Infinity;
  }

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SCREEN_W * RES;
    canvas.height = SCREEN_H * RES;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.setTransform(RES, 0, 0, RES, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  effect(kind: FxKind) {
    const now = performance.now();
    if (kind === 'food' || kind === 'candy') {
      // Futter erscheint im Napf, das Tier läuft hin und frisst
      this.meal = { kind, eatStart: null };
      return;
    }
    this.fx = { kind, start: now, until: now + 1500 };
    if (kind === 'heart' || kind === 'sparkle') this.jumpStart = now;
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
    const p = activePet(s);
    if ((p?.id ?? null) !== this.shownPetId) {
      this.shownPetId = p?.id ?? null;
      this.reset();
    }
    const sp = species(p?.species ?? s.memorials[0]?.species ?? 'fox');

    this.env = sp.room?.scene ?? 'room';
    // Hintergrund ändert sich höchstens einmal pro Minute -> zwischenspeichern
    const bgKey = `${this.env}|${sp.id}|${Math.floor(s.clock / MIN)}`;
    if (bgKey !== this.bgKey) {
      const main = this.ctx;
      this.ctx = this.bg.getContext('2d')!;
      this.ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
      if (this.env === 'room') {
        this.drawRoom(sp, s.clock);
        this.drawDecor(sp, t, 'static');
        this.bgDay = true;
      } else {
        this.bgDay = drawOutdoor(this.ctx, this.env, s.clock);
        this.drawDecor(sp, t, 'static');
        if (!this.bgDay) this.overlay(0.3); // Nacht draußen: Hintergrund dunkler
      }
      this.nestBack();
      this.ctx = main;
      this.bgKey = bgKey;
    }
    ctx.drawImage(this.bg, 0, 0, SCREEN_W, SCREEN_H);
    this.drawDecor(sp, t, 'anim');
    this.critters.draw(ctx, this.env, this.env === 'room' ? skyState(s.clock).day : this.bgDay, t, WIN);

    if (!p) {
      this.nestFront();
      this.overlay(0.2);
      return;
    }

    this.drawPoops(p, t);

    const hatching = t - this.hatchStart < HATCH_MS;
    if (p.stage === 'egg') {
      this.drawEgg(s, p, sp, t);
      this.nestFront();
    } else if (p.asleep || hatching) {
      this.drawPetInBasket(p, sp, t, hatching);
    } else {
      this.nestFront();
      this.drawPetWalking(p, sp, t);
    }

    // Napf liegt vorne auf dem Boden, also nach dem Tier zeichnen
    this.drawBowl(t);

    if (!p.lightOn) this.overlay(0.55); // dunkel, aber das Tier bleibt erkennbar

    // Zzz (über dem Dunkel, damit man es sieht)
    if (p.stage !== 'egg' && p.asleep) {
      const sl = petSprite(sp, p, { sleeping: true });
      const zx = Math.min(BASKET_CX + sl.w / 2 - 4, SCREEN_W - 12);
      const k = Math.floor(t / 600) % 3;
      for (let i = 0; i <= k; i++) drawMap(ctx, ICONS.z.map, ICONS.z.colors, zx + i * 4, FLOOR_Y - sl.h - 6 - i * 5);
    }

    // Entwicklung: weißes Aufblitzen
    const fl = t - this.flashStart;
    if (fl < 900) {
      ctx.fillStyle = `rgba(255,255,255,${(Math.floor(fl / 150) % 2 === 0 ? 0.85 : 0.2).toFixed(2)})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }

    this.drawHud(p, t);
  }

  /** HUD oben im Bild wie in einem Videospiel: Sättigung links, Laune rechts, Warnsymbole in der Mitte */
  private drawHud(p: Pet, t: number) {
    const ctx = this.ctx;
    const BAR_W = 13;
    if (p.stage !== 'egg') {
      ctx.fillStyle = 'rgba(20,16,12,0.4)';
      ctx.fillRect(0, 0, 20, 7);
      ctx.fillRect(SCREEN_W - 20, 0, 20, 7);
      drawMap(ctx, HUD_FOOD, HUD_ICON_COLORS, 1, 1);
      this.drawBar(6, 1, hearts(p.hunger), '#f2a23a', t);
      this.drawBar(SCREEN_W - 1 - BAR_W, 1, hearts(p.happy), '#f2d64b', t);
      drawMap(ctx, HUD_SMILE, HUD_ICON_COLORS, SCREEN_W - 2 - BAR_W - 5, 1);
    }
    // Mitte: krank / ruft
    const calling = Object.keys(p.calls).length > 0;
    const icons: { map: string[]; colors: ColorMap }[] = [];
    if (p.sick) icons.push(ICONS.skull);
    if (calling && Math.floor(t / 500) % 2 === 0) icons.push(ICONS.bang);
    const width = (p.sick ? 5 : 0) + (calling ? 2 : 0) + (p.sick && calling ? 2 : 0);
    let x = Math.round(SCREEN_W / 2 - width / 2);
    if (width) {
      ctx.fillStyle = 'rgba(20,16,12,0.4)';
      ctx.fillRect(x - 2, 0, width + 4, 7);
    }
    for (const icon of icons) {
      drawMap(ctx, icon.map, icon.colors, x, 1);
      x += icon.map[0].length + 2;
    }
  }

  /** schmale Leiste mit 4 Segmenten; bei 0–1 Segment rot blinkend */
  private drawBar(x: number, y: number, filled: number, color: string, t: number) {
    const ctx = this.ctx;
    const low = filled <= 1 && Math.floor(t / 400) % 2 === 0;
    ctx.fillStyle = '#1a140e';
    ctx.fillRect(x, y, 13, 5);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < filled ? (low ? '#e2384d' : color) : '#4a4038';
      ctx.fillRect(x + 1 + i * 3, y + 1, 2, 3);
      if (i < filled) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x + 1 + i * 3, y + 1, 2, 1);
      }
    }
  }

  /** Schlafplatz hinten: Körbchen, Fuchsbau oder Laubnest */
  private nestBack() {
    if (this.env === 'room') drawMap(this.ctx, BASKET_BACK, BASKET_COLORS, BASKET_X, BASKET_Y);
    else drawNestBack(this.ctx, this.env);
  }

  /** Vorderseite des Schlafplatzes, verdeckt den unteren Teil des Tiers */
  private nestFront() {
    if (this.env === 'room') drawMap(this.ctx, BASKET_FRONT, BASKET_COLORS, BASKET_X, BASKET_Y + 3);
    else drawNestFront(this.ctx, this.env);
  }

  private drawRoom(sp: SpeciesDef, clock: number) {
    const ctx = this.ctx;
    // Wand mit leichtem Verlauf und Tapetenmuster
    const wall = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    wall.addColorStop(0, sp.colors.wall);
    wall.addColorStop(1, sp.colors.wallDark);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, SCREEN_W, FLOOR_Y);
    ctx.fillStyle = sp.colors.wallDark;
    for (let x = 0; x < SCREEN_W; x += 8) ctx.fillRect(x, 0, 0.5, FLOOR_Y);
    ctx.globalAlpha = 0.35;
    for (let y = 2; y < FLOOR_Y - 3; y += 4)
      for (let x = (y / 4) % 2 ? 2 : 6; x < SCREEN_W; x += 8) {
        ctx.fillRect(x - 0.25, y - 0.75, 0.5, 1.5);
        ctx.fillRect(x - 0.75, y - 0.25, 1.5, 0.5);
      }
    ctx.globalAlpha = 1;
    // Dielenboden
    const floor = ctx.createLinearGradient(0, FLOOR_Y, 0, SCREEN_H);
    floor.addColorStop(0, shadeHex(sp.colors.floor, -0.12));
    floor.addColorStop(1, shadeHex(sp.colors.floor, 0.08));
    ctx.fillStyle = floor;
    ctx.fillRect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0, y = FLOOR_Y + 2; y < SCREEN_H; y += 2.5, i++) {
      ctx.fillRect(0, y, SCREEN_W, 0.25);
      for (let x = (i * 13) % 17; x < SCREEN_W; x += 17) ctx.fillRect(x, y - 2.5, 0.25, 2.5);
    }
    // Fußleiste
    ctx.fillStyle = shadeHex(sp.colors.wallDark, -0.25);
    ctx.fillRect(0, FLOOR_Y - 1.5, SCREEN_W, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, FLOOR_Y - 1.5, SCREEN_W, 0.25);
    this.drawWindow(clock);
  }

  /** Fenster: Sonne (7–20 Uhr) bzw. Mond wandern im Bogen über den Himmel */
  private drawWindow(clock: number) {
    const ctx = this.ctx;
    const d = new Date(clock);
    const h = d.getHours() + d.getMinutes() / 60;
    const day = h >= SUNRISE && h < SUNSET;
    // Fortschritt 0..1 über Tag bzw. Nacht
    const f = day ? (h - SUNRISE) / (SUNSET - SUNRISE) : ((h - SUNSET + 24) % 24) / (24 - SUNSET + SUNRISE);
    const edge = Math.min(f, 1 - f); // nahe 0 = Morgen/Abend

    // Rahmen
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(WIN.x - 1, WIN.y - 1, WIN.w + 2, WIN.h + 2);
    ctx.fillStyle = '#7a5c3c';
    ctx.fillRect(WIN.x - 1, WIN.y - 1, WIN.w + 2, 0.5);
    // Himmel als Verlauf
    const sky = ctx.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
    const [top, bottom] = !day ? ['#0f1330', '#262c5c'] : edge < 0.08 ? ['#e98f5c', '#f8c79a'] : edge < 0.16 ? ['#9fbcd8', '#e4ecf2'] : ['#6fb8ea', '#c4e6f8'];
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.clip();
    if (!day) {
      ctx.fillStyle = '#e8e6c8';
      for (const [sx, sy] of STARS) ctx.fillRect(WIN.x + sx, WIN.y + sy, 0.5, 0.5);
    } else {
      const drift = (clock / MIN / 6) % 40;
      cloud(ctx, WIN.x - 6 + drift, WIN.y + 4, 1);
      cloud(ctx, WIN.x + 14 - drift * 0.6, WIN.y + 9, 0.7);
    }
    const icon = ICONS[day ? 'sun' : 'moon'];
    const sx = WIN.x - 5 + f * (WIN.w + 5);
    const sy = WIN.y + WIN.h - Math.sin(Math.PI * f) * (WIN.h - 1) - 1;
    if (day) glow(ctx, sx + 2.5, sy + 2.5, 6, 'rgba(255,240,170,0.55)');
    drawMap(ctx, icon.map, icon.colors, sx, sy);
    // Spiegelung auf der Scheibe
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(WIN.x + 3 + i * 1.2, WIN.y + WIN.h);
      ctx.lineTo(WIN.x + 9 + i * 1.2, WIN.y);
      ctx.lineTo(WIN.x + 9.6 + i * 1.2, WIN.y);
      ctx.lineTo(WIN.x + 3.6 + i * 1.2, WIN.y + WIN.h);
      ctx.fill();
    }
    ctx.restore();

    // Fensterkreuz und Fensterbrett
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(WIN.x + WIN.w / 2 - 0.5, WIN.y, 1, WIN.h);
    ctx.fillRect(WIN.x, WIN.y + WIN.h / 2 - 0.5, WIN.w, 1);
    ctx.fillStyle = '#7a5c3c';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 1, WIN.w + 6, 2);
    ctx.fillStyle = '#9a7a54';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 1, WIN.w + 6, 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 3, WIN.w + 6, 0.75);
  }

  /** Deko passend zur Tierart: Gras, Laub, Kratzbaum */
  private drawDecor(sp: SpeciesDef, t: number, part: 'static' | 'anim') {
    const ctx = this.ctx;
    const room = sp.room ?? {};
    if (part === 'anim') {
      if (room.scratchingPost) this.drawPostToy(t);
      return;
    }
    if (room.floor === 'grass') {
      ctx.fillStyle = '#6aa84a';
      for (const [x, y] of GRASS_DOTS) ctx.fillRect(x, y, 1, 1);
      for (const x of TUFTS_X) drawMap(ctx, TUFT, TUFT_COLORS, x, FLOOR_Y - 2);
    }
    if (room.floor === 'leaves') {
      for (const [x, y, c, shape] of LEAVES) drawMap(ctx, LEAF_SHAPES[shape], { x: LEAF_COLORS[c] }, x, y);
    }
    if (room.ball) drawMap(ctx, BALL, BALL_COLORS, 6, FLOOR_Y + 2);
    if (room.scratchingPost) drawMap(ctx, POST, POST_COLORS, POST_X, FLOOR_Y + 1 - POST.length);
  }

  /** Spielball am Kratzbaum pendelt an einer Schnur */
  private drawPostToy(t: number) {
    const ctx = this.ctx;
    const top = FLOOR_Y + 1 - POST.length;
    const swing = Math.sin(t / 700) * 0.35;
    const len = 6;
    const ax = POST_X + 9.5;
    const ay = top + 3;
    const bx = ax + swing * len;
    const by = ay + len + 1;
    ctx.strokeStyle = POST_COLORS.l;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = POST_COLORS.y;
    ctx.beginPath();
    ctx.arc(bx, by + 1, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(bx - 0.4, by + 0.6, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPoops(p: Pet, t: number) {
    const ctx = this.ctx;
    const cleaning = t < this.cleaningUntil;
    p.poops.slice(0, 6).forEach((_, i) => {
      // zwischen Pflanze und Körbchen, 3 nebeneinander, dann eine zweite Reihe
      const x = 26 + (i % 3) * 4 + (Math.floor(i / 3) % 2) * 2 + (cleaning ? (this.cleaningUntil - t) / 20 : 0);
      const y = FLOOR_Y + 1 - Math.floor(i / 3) * 2 + (i % 2);
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

  private drawBowl(t: number) {
    const m = this.meal;
    let level = 0;
    if (m) {
      const k = m.eatStart === null ? 0 : (t - m.eatStart) / EAT_MS;
      level = 3 - Math.min(3, Math.floor(k * 3));
    }
    if (m && level > 0) drawMap(this.ctx, FOOD_LEVELS[level], FOOD_COLORS[m.kind], BOWL_X + 1, BOWL_Y - 2);
    drawMap(this.ctx, BOWL, PLATE_COLORS[this.env], BOWL_X, BOWL_Y);
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
    drawMap(this.ctx, eggMap(), eggColors(sp, p.look), x, EGG_Y);
    this.ctx.fillStyle = '#3a2a1a';
    for (let k = 0; k < stage; k++) for (const [cx, cy] of CRACKS[k]) this.ctx.fillRect(x + cx, EGG_Y + cy, 1, 1);
  }

  private drawPetInBasket(p: Pet, sp: SpeciesDef, t: number, hatching: boolean) {
    const ctx = this.ctx;
    // schlafend: eingerollte Schlafpose, liegt im Körbchen bzw. in der Höhle
    const sleeping = p.asleep && !hatching;
    const { map, colors: pal, w, h } = petSprite(sp, p, { sleeping });
    const x = Math.round(BASKET_CX - w / 2);
    const k = hatching ? (t - this.hatchStart) / HATCH_MS : 1;
    // beim Schlüpfen taucht es langsam aus der Schale auf
    const rise = hatching ? Math.round(Math.min(1, k * 2) * 3) - 3 : 0;
    const bottom = sleeping ? (this.env === 'room' ? BASKET_Y + 3 : FLOOR_Y - 1) : FLOOR_Y;
    // sanftes Atmen im Schlaf
    const breathe = sleeping && Math.floor(t / 1200) % 2 === 0 ? 1 : 0;
    const y = bottom - h + 1 - rise + breathe;
    drawMap(ctx, map, pal, x, y);

    if (hatching) {
      const egg = eggMap();
      const colors = eggColors(sp, p.look);
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
    this.nestFront();
  }

  private drawPetWalking(p: Pet, sp: SpeciesDef, t: number) {
    const ctx = this.ctx;
    const dt = Math.min(0.1, (t - this.lastFrame) / 1000);
    this.lastFrame = t;
    const blink = t % 3500 < 150;
    const { map, colors: pal, w, h } = petSprite(sp, p, { eyesClosed: blink });

    const from = 12;
    const to = Math.max(from + 8, 58 - w);
    let eating = false;
    const m = this.meal;
    if (m) {
      // zum Napf laufen, dann fressen
      const target = BOWL_X + BOWL[0].length / 2 - w / 2; // mittig über dem Napf
      const diff = target - this.walkX;
      if (m.eatStart === null) {
        if (Math.abs(diff) <= 0.5) m.eatStart = t;
        else {
          this.walkDir = Math.sign(diff);
          this.walkX += this.walkDir * Math.min(Math.abs(diff), WALK_SPEED_TO_BOWL * dt);
        }
      }
      if (m.eatStart !== null) {
        eating = true;
        if (t - m.eatStart >= EAT_MS) {
          if (m.kind === 'candy') this.jumpStart = t;
          this.meal = null;
          eating = false;
        }
      }
    } else {
      // gemütlich hin und her laufen
      const speed = ((to - from) / (p.sick ? 4.5 : 2.25)) * dt;
      this.walkX += this.walkDir * speed;
      if (this.walkX >= to) (this.walkX = to), (this.walkDir = -1);
      if (this.walkX <= from) (this.walkX = from), (this.walkDir = 1);
    }
    let x = this.walkX;
    const flip = this.walkDir < 0;

    let bob = p.sick ? 0 : Math.floor(t / 400) % 2;
    if (eating) bob = -(Math.floor(t / 250) % 2); // Kopf in den Napf
    const j = t - this.jumpStart;
    if (j >= 0 && j < 900) bob = Math.round(Math.abs(Math.sin((j / 900) * Math.PI * 2)) * 5);
    const s = t - this.shakeStart;
    if (s >= 0 && s < 600) x += Math.round(Math.sin(s / 25) * 1.5);

    const y = FLOOR_Y - h + 1 - bob;
    drawMap(ctx, map, pal, x, y, flip);

    if (p.variant === 'great' && Math.floor(t / 600) % 3 === 0) {
      drawMap(ctx, ICONS.sparkle.map, ICONS.sparkle.colors, x + w - 2, y - 4);
    }

    const fx = this.fx && t < this.fx.until ? this.fx : null;
    if (!fx) return;
    const icon = ICONS[fx.kind];
    const rise = Math.floor((t - fx.start) / 250);
    drawMap(ctx, icon.map, icon.colors, x + w / 2 - 2, y - 7 - rise);
  }

  private overlay(alpha: number) {
    this.ctx.fillStyle = `rgba(8,10,30,${alpha})`;
    this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}
