import { MIN, RULES } from '../engine/config';
import { activePet, type GameState, type Pet } from '../engine/state';
import { species } from '../species';
import type { SpeciesDef } from '../species/types';
import { ColorMap, ICONS, PX, RES, drawMap, snapPx, drawPixels, eggColors, eggMap, hiResCanvas, petSprite } from './pixels';
import { Critters } from './critters';
import { bands, glow, shadeHex } from './fx';
import { COOP_PERCH_Y, DEN, GROUND_Y, PLATE_COLORS, clipToDen, SceneKind, drawNestBack, drawNestFront, drawOutdoorFar, drawOutdoorNear, drawOutdoorSky, skyState } from './outdoor';
import { Clouds, drawPrecip, drawPuddles, drawWindowDrops, weatherAt } from './weather';
import { Ambient, eveningLight, nightTint, nightness, roomNight } from './ambient';
import { remapContext, seasonOf, seasonTransform, snowCaps, snowGround } from './season';
import { NEST_BOX, STRAW_HEAP, decorTargets, drawDecorAnim, drawDecorFar, drawDecorNear, drawFrontDecorFor, drawNestEggs, drawSillDecor, drawWeathervane } from './decor';

export const SCREEN_W = 64;
export const SCREEN_H = 48;
const FLOOR_Y = 40;

// Körbchen unter dem Fenster (geflochten, mit Kissen)
const BASKET_X = 37;
const BASKET_Y = FLOOR_Y - 4; // flaches Körbchen
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
  '..oobbbbbbbbbbbbbbbboo..',
  '.oiippppppppppppppppiio.',
];
const BASKET_FRONT = [
  'oobcbcbcbcbcbcbcbcbcbcoo',
  'oxaaxaaxaaxaaxaaxaaxaaxo',
  '.oaxaaxaaxaaxaaxaaxaaxo.',
  '..oooooooooooooooooooo..',
];
const BASKET_FRONT_DY = 2; // Vorderseite beginnt unter der Rückseite

// Futternapf neben der Pflanze
const BOWL_X = 17.5;
const BOWL_Y = FLOOR_Y + 2;
const BOWL = ['.ooooooo.', 'ohhhhhhho', '.obbbbbo.', '..ooooo..'];
// flache Schale (Hühnerhof: Blech, Garten: blaue Keramik) – in voller Rasterauflösung
const FLAT_DISH = ['.oooooooooooooooo.', 'ohhhhhhhhhhhhhhhho', 'obbbbbbbbbbbbbbbbo', '..oooooooooooooo..'];
const FLAT_DISH_COLORS: Record<string, ColorMap> = {
  farm: { o: '#4a5058', h: '#c8d0d8', b: '#8a949e' },
  garden: { o: '#1e3a6a', h: '#cfe0f6', b: '#3a6ab0' },
};
const HEAP_LEVELS = [
  [],
  ['..............', '..............', '....gkgkgk....'],
  ['..............', '....gkgkgk....', '..kgkgkgkgkg..'],
  ['....kgkgk.....', '..gkgkgkgkgk..', '.kgkgkgkgkgkg.'],
];
const HEAP_COLORS: Record<'grain' | 'food' | 'candy', ColorMap> = {
  grain: { g: '#e88a1c', k: '#6a3e1a' }, // Mais orange + dunkle Saat, hebt sich vom Heu ab
  food: { g: '#b07a42', k: '#7a4a24' },
  candy: { g: '#e46fb1', k: '#fff2f8' },
};
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

// Kauknochen und Socken (Hund), in voller Rasterauflösung
const BONE = ['.oo......oo.', 'owwoooooowwo', '.owwwwwwwwo.', '.owwwwwwwso.', 'owwoooooowso', '.oo......oo.'];
const BONE_COLORS: ColorMap = { o: '#8a7a5e', w: '#f4ecd8', s: '#cbbd9e' };
// flach liegende Socken: Bündchen (c/C), Ringel (w), Ferse und Spitze (k), Schatten (R)
const SOCK = [
  '.oooooooooooooo..',
  'occcrrwwrrwwrrrko',
  'oCccrrwwrrwwrrkko',
  'occcRRwwRRwwkRkko',
  '.oooooooookkoooo.',
  '..........oo.....',
];
const SOCK2 = SOCK.map((r) => [...r].reverse().join(''));
const SOCK_RED: ColorMap = { o: '#5a1a22', r: '#d8404a', R: '#a82a36', w: '#f6f2ea', c: '#f6f2ea', C: '#d8d0c4', k: '#f6f2ea' };
const SOCK_BLUE: ColorMap = { o: '#1a2a5a', r: '#4a6ad8', R: '#3448a8', w: '#f4d24a', c: '#f6f2ea', C: '#d8d0c4', k: '#f4d24a' };

// Spielball am Kratzbaum
const TOY_BALL = ['.rr.', 'rwrr', 'rrrr', '.rr.'];
const TOY_COLORS: ColorMap = { r: '#e2384d', w: '#ffd0d6' };

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
// kleinere Blätter weiter hinten auf der Wiese (Tiefenwirkung)
const LEAF_SMALL = [['.x', 'xx'], ['xx.', '.xx'], ['x.', 'xx']];
const LEAVES_BACK: [number, number, number, number][] = Array.from({ length: 26 }, (_, i) => {
  const n = (((i * 73856093) ^ (i * 7 * 19349663)) >>> 0) % 997;
  return [((n * 7) % 126) / 2, 33.5 + ((n >> 2) % 14) / 2, n % 5, (n >> 1) % 3];
});

// kleines Schlaf-Z in voller Rasterauflösung
const Z_SMALL = ['www', '..w', '.w.', 'www'];

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
  private depth = 1; // 0 = hinten, 3.5 = vorne im Raum
  private act: { kind: 'walk' | 'idle' | 'look' | 'groom' | 'stretch' | 'watch' | 'pet' | 'visit' | 'chase'; visit?: 'sniff' | 'nudge' | 'drink' | 'dustbath' | 'sill' | 'hop'; arrived?: number; sillY?: number; start: number; until: number; target?: number; targetDepth?: number; speed?: number } = {
    kind: 'idle',
    start: 0,
    until: 0,
  };
  private watched = -1;
  private lastPounce = 0;
  /** wo das Tier zuletzt gezeichnet wurde (für Klick/Tippen) */
  private petBox: { x: number; y: number; w: number; h: number } | null = null;
  private hearts: { x: number; y: number; born: number; drift: number }[] = [];

  /** Liegt der Punkt auf dem Nistkasten (Hühnerhof)? */
  hitNestBox(x: number, y: number): boolean {
    const b = NEST_BOX;
    return this.env === 'farm' && x >= b.x - 1 && x <= b.x + b.w + 1 && y >= b.y - 1 && y <= b.y + b.h + 1;
  }

  /** nur zum Testen: bestimmte Aktion sofort auslösen */
  debugAct(kind: 'visit' | 'groom' | 'stretch' | 'look' | 'idle', visit?: 'sniff' | 'nudge' | 'drink' | 'dustbath' | 'sill' | 'hop', target?: number) {
    const t = performance.now();
    this.act = { kind, visit, start: t, until: t + 30000, target, targetDepth: visit === 'drink' || visit === 'dustbath' ? 2.5 : visit === 'hop' ? 0 : 1, speed: 12 };
    if (kind !== 'visit') this.act.until = t + 2600;
  }

  /** Liegt der Punkt (in Spiel-Einheiten) auf dem Tier? */
  hitPet(x: number, y: number): boolean {
    const b = this.petBox;
    return !!b && x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2;
  }

  /** Streicheln: stehen bleiben, Augen zu, wiegen, Herzchen */
  stroke(sleeping = false) {
    const t = performance.now();
    if (!sleeping) this.act = { kind: 'pet', start: t, until: t + 1800 };
    const b = this.petBox;
    if (!b) return;
    for (let i = 0; i < (sleeping ? 1 : 3); i++)
      this.hearts.push({ x: b.x + b.w / 2 - 1 + (i - 1) * 2, y: b.y + 1, born: t + i * 220, drift: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 5) });
  }

  private drawHearts(t: number) {
    const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
    this.hearts = this.hearts.filter((h) => t - h.born < 1300);
    for (const h of this.hearts) {
      const k = (t - h.born) / 1300;
      if (k < 0) continue;
      this.ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      const sway = Math.sin(k * 9 + h.drift) * 0.8;
      drawPixels(this.ctx, HEART, { r: '#ff5a7a' }, snapPx((h.x + h.drift * k + sway)), snapPx((h.y - k * 7)));
      this.ctx.globalAlpha = 1;
    }
  }
  private lastFrame = performance.now();
  private env: SceneKind = 'room';
  private shownPetId: string | null = null;
  private bg = hiResCanvas(SCREEN_W, SCREEN_H);
  private bgSky = hiResCanvas(SCREEN_W, SCREEN_H);
  private bgFar = hiResCanvas(SCREEN_W, SCREEN_H);
  private clouds = new Clouds();
  private ambient = new Ambient();
  private bgKey = '';
  private bgDay = true;
  private critters = new Critters();

  /** Animationen zurücksetzen (z. B. beim Umschalten auf ein anderes Tier) */
  reset() {
    this.meal = null;
    this.fx = null;
    this.walkX = 30;
    this.walkDir = 1;
    this.act = { kind: 'idle', start: 0, until: 0 };
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
    const season = seasonOf(s.clock);
    const bgKey = `${this.env}|${sp.id}|${season}|${Math.floor(s.clock / MIN)}`;
    if (bgKey !== this.bgKey) {
      const main = this.ctx;
      this.ctx = this.bg.getContext('2d')!;
      this.ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
      const sky = skyState(s.clock);
      const sunX = sky.day ? -5 + sky.f * 69 + 2.5 : 32;
      if (this.env === 'room') {
        this.drawRoom(sp, s.clock);
        this.drawDecor(sp, t, 'static');
        drawDecorNear(this.ctx, sp.id, sunX);
        this.bgDay = true;
      } else {
        // Himmel und Landschaft getrennt, damit die Wolken dazwischen ziehen können
        const skyCtx = this.bgSky.getContext('2d')!;
        skyCtx.clearRect(0, 0, SCREEN_W, SCREEN_H);
        this.bgDay = drawOutdoorSky(skyCtx, s.clock);
        const farCtx = this.bgFar.getContext('2d')!;
        farCtx.clearRect(0, 0, SCREEN_W, SCREEN_H);
        // Landschaft in Jahreszeiten-Farben
        const tf = seasonTransform(season);
        drawOutdoorFar(remapContext(farCtx, tf), this.env);
        drawDecorFar(remapContext(farCtx, tf), this.env);
        drawOutdoorNear(remapContext(this.ctx, tf), this.env);
        if (season === 'winter') snowGround(this.ctx, GROUND_Y + 0.5);
        this.drawDecor(sp, t, 'static');
        drawDecorNear(this.ctx, sp.id, sunX, season === 'winter');
      }
      this.nestBack();
      if (season === 'winter' && this.env !== 'room') {
        snowCaps(this.bgFar);
        snowCaps(this.bg);
      }
      if (this.env === 'farm') drawWeathervane(this.ctx, weatherAt(s.clock).wind);
      this.ctx = main;
      this.bgKey = bgKey;
    }
    // Ebenen von hinten nach vorn; bewegte Dinge liegen jeweils dazwischen
    this.critters.update(this.env, this.env === 'room' ? skyState(s.clock).day : this.bgDay, t, WIN, season, sp.id);
    if (this.env === 'room') {
      ctx.drawImage(this.bg, 0, 0, SCREEN_W, SCREEN_H);
      if (weatherAt(s.clock).precip !== 'none') {
        ctx.fillStyle = 'rgba(120,130,145,0.45)';
        ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
      }
      // im Fenster: Wolken, Vogel, dann Fensterkreuz und Spiegelung darüber
      this.clouds.draw(ctx, s.clock, t, WIN, !skyState(s.clock).day);
      this.critters.draw(ctx, 'window', t);
      if (season !== 'winter') this.ambient.draw(ctx, 'room', skyState(s.clock), t, WIN);
      const wxr = weatherAt(s.clock);
      drawPrecip(ctx, wxr.precip, wxr.wind, t, WIN);
      if (wxr.precip === 'rain') drawWindowDrops(ctx, WIN, t);
      this.drawWindowFront();
      drawSillDecor(ctx, sp.id, { x: WIN.x - 3, y: WIN.y + WIN.h + 1, w: WIN.w + 6 });
    } else {
      ctx.drawImage(this.bgSky, 0, 0, SCREEN_W, SCREEN_H); // Himmel
      if (weatherAt(s.clock).precip !== 'none') {
        ctx.fillStyle = 'rgba(120,130,145,0.45)'; // grauer Himmel bei Regen/Schnee
        ctx.fillRect(0, 0, SCREEN_W, GROUND_Y);
      }
      this.clouds.draw(ctx, s.clock, t, { x: 0, y: 0, w: SCREEN_W, h: GROUND_Y }, !this.bgDay); // Wolken
      this.critters.draw(ctx, 'sky', t); // Vögel
      const night = nightness(skyState(s.clock));
      ctx.drawImage(this.bgFar, 0, 0, SCREEN_W, SCREEN_H); // Berge, Hügel / Hecke, Zaun
      if (sp.id === 'fox') drawDecorAnim(ctx, 'fox', t); // Glitzern auf dem Bach
      this.critters.draw(ctx, 'background', t); // Reh
      nightTint(ctx, night * 0.38); // Ferne nachts am dunkelsten
      ctx.drawImage(this.bg, 0, 0, SCREEN_W, SCREEN_H); // Wiese, Bäume, Busch, Schlafplatz
      if (weatherAt(s.clock).precip === 'rain') drawPuddles(ctx, t);
      this.critters.draw(ctx, 'air', t); // wehende Blätter
      nightTint(ctx, night * 0.26); // Nahes etwas weniger dunkel
      if (season !== 'winter') this.ambient.draw(ctx, this.env, skyState(s.clock), t, WIN); // Schmetterlinge / Glühwürmchen
    }
    this.drawDecor(sp, t, 'anim');
    if (sp.id !== 'fox') drawDecorAnim(ctx, sp.id, t); // z. B. Schnecke
    if (p && sp.id === 'chicken') drawNestEggs(ctx, p.eggsInNest ?? 0);

    this.petBox = null;
    if (!p) {
      this.nestFront();
      this.overlay(0.2);
      return;
    }

    const hatching = t - this.hatchStart < HATCH_MS;
    const walking = p.stage !== 'egg' && !p.asleep && !hatching;
    // Haufen liegen vorne: steht das Tier weiter hinten, verdecken sie es
    const poopsInFront = walking && this.depth < 1.5;
    if (!poopsInFront) this.drawPoops(p, t);
    if (p.stage === 'egg') {
      this.drawEgg(s, p, sp, t);
      this.nestFront();
      this.drawFrontDecor(sp);
    } else if (!walking) {
      this.drawPetInBasket(p, sp, t, hatching);
      this.drawFrontDecor(sp);
    } else {
      this.nestFront();
      this.drawFrontDecor(sp);
      this.drawPetWalking(p, sp, t);
    }
    if (poopsInFront) this.drawPoops(p, t);
    this.critters.draw(ctx, 'foreground', t); // Maus/Igel laufen vor dem Haustier vorbei

    // Napf liegt vorne auf dem Boden, also nach dem Tier zeichnen
    this.drawBowl(t);

    const skyNow = skyState(s.clock);
    // Nacht: draußen das Tier nur leicht abdunkeln; drinnen zu den Rändern hin dunkler (Mitte heller)
    const nightNow = nightness(skyNow);
    if (this.env === 'room') roomNight(ctx, nightNow * 0.35, [{ x: SCREEN_W / 2, y: 30, r: 46 }]);
    else nightTint(ctx, nightNow * 0.12);
    if (this.env !== 'room') {
      const wx = weatherAt(s.clock);
      if (wx.precip === 'rain') this.overlay(0.12); // trüber bei Regen
      drawPrecip(ctx, wx.precip, wx.wind, t);
    }
    eveningLight(ctx, skyNow);
    // kein Abdunkeln bei „Licht aus“ – das Bild bleibt hell, auch wenn das Tier schläft

    // Zzz (über dem Dunkel, damit man es sieht)
    if (p.stage !== 'egg' && p.asleep) {
      const sl = petSprite(sp, p, { sleeping: true, sleepSmall: this.env === 'forest' });
      const zx = this.env === 'forest' ? DEN.cx + DEN.half - 1 : Math.min(BASKET_CX + sl.w / 2 - 4, SCREEN_W - 12);
      const k = Math.floor(t / 600) % 3;
      for (let i = 0; i <= k; i++) drawPixels(ctx, Z_SMALL, ICONS.z.colors, zx + i * 2, FLOOR_Y - sl.h - 3 - i * 2.5);
    }

    // Entwicklung: weißes Aufblitzen
    const fl = t - this.flashStart;
    if (fl < 900) {
      ctx.fillStyle = `rgba(255,255,255,${(Math.floor(fl / 150) % 2 === 0 ? 0.85 : 0.2).toFixed(2)})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }

    this.drawHearts(t);
  }

  /** Schlafplatz hinten: Körbchen, Fuchsbau oder Laubnest */
  private nestBack() {
    if (this.env === 'room') drawMap(this.ctx, BASKET_BACK, BASKET_COLORS, BASKET_X, BASKET_Y);
    else drawNestBack(this.ctx, this.env);
  }

  /** Vorderseite des Schlafplatzes, verdeckt den unteren Teil des Tiers */
  private nestFront() {
    if (this.env === 'room') drawMap(this.ctx, BASKET_FRONT, BASKET_COLORS, BASKET_X, BASKET_Y + BASKET_FRONT_DY);
    else drawNestFront(this.ctx, this.env);
  }

  private drawRoom(sp: SpeciesDef, clock: number) {
    const ctx = this.ctx;
    // Wand mit leichtem Verlauf und Tapetenmuster
    bands(ctx, 0, 0, SCREEN_W, FLOOR_Y, sp.colors.wall, shadeHex(sp.colors.wallDark, 0.3), 5);
    // Tapete: feine Streifen (dunkle Linie mit heller Kante) und kleine Blüten-Motive
    for (let x = 0; x < SCREEN_W; x += 8) {
      ctx.fillStyle = sp.colors.wallDark;
      ctx.fillRect(x, 0, PX, FLOOR_Y);
      ctx.fillStyle = shadeHex(sp.colors.wall, 0.35);
      ctx.fillRect(x + PX, 0, PX, FLOOR_Y);
    }
    ctx.globalAlpha = 0.45;
    for (let y = 2; y < FLOOR_Y - 3; y += 4)
      for (let x = (y / 4) % 2 ? 2 : 6; x < SCREEN_W; x += 8) {
        // kleine Blüte: vier Blätter um eine helle Mitte
        ctx.fillStyle = sp.colors.wallDark;
        for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) ctx.fillRect(x + dx * PX, y + dy * PX, PX, PX);
        ctx.fillStyle = shadeHex(sp.colors.wall, 0.45);
        ctx.fillRect(x, y, PX, PX);
      }
    ctx.globalAlpha = 1;
    // Dielenboden: Bretter mit Fugen, Lichtkante, Maserung und Astlöchern
    bands(ctx, 0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y, shadeHex(sp.colors.floor, -0.12), shadeHex(sp.colors.floor, 0.06), 3);
    for (let i = 0, y = FLOOR_Y; y < SCREEN_H; y += 2.5, i++) {
      // Maserung: kurze dunklere und hellere Striche
      for (let x = 0; x < SCREEN_W; x += PX) {
        const n = (((Math.round(x * 4) * 73856093) ^ ((i + 7) * 19349663)) >>> 0) % 997;
        if (n % 9 === 0) {
          ctx.fillStyle = 'rgba(60,30,10,0.16)';
          ctx.fillRect(x, y + PX * (2 + (n % 6)), PX * (4 + (n % 9)), PX);
        } else if (n % 23 === 0) {
          ctx.fillStyle = 'rgba(255,240,210,0.14)';
          ctx.fillRect(x, y + PX * (2 + (n % 5)), PX * (3 + (n % 6)), PX);
        }
      }
      ctx.fillStyle = 'rgba(255,240,210,0.16)';
      ctx.fillRect(0, y + PX, SCREEN_W, PX); // Lichtkante
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      if (i > 0) ctx.fillRect(0, y, SCREEN_W, PX); // Fuge
      for (let x = (i * 13) % 17; x < SCREEN_W; x += 17) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, y, PX, 2.5); // Stoßfuge
        ctx.fillStyle = 'rgba(60,30,10,0.3)';
        ctx.fillRect(x + 5 + (i % 3) * 2, y + 1, PX * 3, PX * 2); // Astloch
      }
    }
    // Fußleiste mit Lichtkante und Schatten
    ctx.fillStyle = shadeHex(sp.colors.wallDark, -0.25);
    ctx.fillRect(0, FLOOR_Y - 1.5, SCREEN_W, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(0, FLOOR_Y - 1.5, SCREEN_W, PX);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, FLOOR_Y - 1.5 + PX, SCREEN_W, PX);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, FLOOR_Y - PX, SCREEN_W, PX);
    this.drawPicture(21, 8);
    this.drawRug(BOWL_X + 4.5, 44.5, 9, 2.5); // Teppich unter dem Napf
    this.drawWindow(clock);
  }

  /** Bild an der Wand: kleine Landschaft im Holzrahmen */
  private drawPicture(x: number, y: number) {
    const ctx = this.ctx;
    const P = 0.5;
    const w = 11;
    const h = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + P, y + P, w, h);
    ctx.fillStyle = '#6a4a28';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#a07a4a';
    ctx.fillRect(x, y, w, P);
    ctx.fillRect(x, y, P, h);
    // Landschaft
    const ix = x + 1;
    const iy = y + 1;
    const iw = w - 2;
    const ih = h - 2;
    bands(ctx, ix, iy, iw, ih, '#8ccaf0', '#d8eef8', 3);
    ctx.fillStyle = '#f6d23c';
    ctx.fillRect(ix + 6.5, iy + 1, 1, 1);
    for (let k = 0; k < iw / P; k++) {
      const hx = ix + k * P;
      const hy = iy + ih - 2 - snapPx(Math.sin(k / 3));
      ctx.fillStyle = '#6aa850';
      ctx.fillRect(hx, hy, P, iy + ih - hy);
      ctx.fillStyle = '#86c262';
      ctx.fillRect(hx, hy, P, P);
    }
    ctx.fillStyle = '#2f5a26';
    ctx.fillRect(ix + 1.5, iy + 2.5, 1, 2);
    ctx.fillRect(ix + 1, iy + 3, 2, 1);
  }

  /** ovaler Teppich mit Randmuster */
  private drawRug(cx: number, cy: number, rx: number, ry: number) {
    const ctx = this.ctx;
    const P = PX;
    for (let y = cy - ry; y < cy + ry; y += P)
      for (let x = cx - rx; x < cx + rx; x += P) {
        const d = ((x + P / 2 - cx) / rx) ** 2 + ((y + P / 2 - cy) / ry) ** 2;
        if (d > 1) continue;
        let c = '#b8483a';
        if (d > 0.78) c = '#7a2a22';
        else if (d > 0.55) c = (Math.round(x * 4) + Math.round(y * 4)) % 6 < 2 ? '#e8c46a' : '#b8483a';
        else if (d < 0.18) c = (Math.round(x * 4) + Math.round(y * 4)) % 4 === 0 ? '#e88a6a' : '#d8705a';
        else if ((Math.round(x * 4) * 3 + Math.round(y * 4) * 5) % 17 === 0) c = '#a83e32'; // Webstruktur
        else if (d < 0.18) c = '#d8705a';
        ctx.fillStyle = c;
        ctx.fillRect(x, y, P, P);
      }
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
    ctx.fillRect(WIN.x - 1, WIN.y - 1, WIN.w + 2, PX * 2);
    ctx.fillRect(WIN.x - 1, WIN.y - 1, PX * 2, WIN.h + 2);
    ctx.fillStyle = '#3e2e1e';
    ctx.fillRect(WIN.x - PX, WIN.y - PX, WIN.w + PX * 2, PX); // Schattenfuge innen
    ctx.fillRect(WIN.x - PX, WIN.y - PX, PX, WIN.h + PX * 2);
    // Himmel als Verlauf
    const [top, bottom] = !day ? ['#0f1330', '#262c5c'] : edge < 0.08 ? ['#e98f5c', '#f8c79a'] : edge < 0.16 ? ['#9fbcd8', '#e4ecf2'] : ['#6fb8ea', '#c4e6f8'];
    bands(ctx, WIN.x, WIN.y, WIN.w, WIN.h, top, bottom, 5);

    ctx.save();
    ctx.beginPath();
    ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.clip();
    if (!day) {
      ctx.fillStyle = '#e8e6c8';
      for (const [sx, sy] of STARS) ctx.fillRect(WIN.x + sx, WIN.y + sy, PX, PX);
    }
    const icon = ICONS[day ? 'sun' : 'moon'];
    const sx = WIN.x - 5 + f * (WIN.w + 5);
    const sy = WIN.y + WIN.h - Math.sin(Math.PI * f) * (WIN.h - 1) - 1;
    if (day) glow(ctx, sx + 2.5, sy + 2.5, 5, '#fff3b0');
    drawMap(ctx, icon.map, icon.colors, sx, sy);
    ctx.restore();
    this.drawWindowFront();
  }

  /** Spiegelung, Fensterkreuz und Fensterbrett (liegen über Himmel und Wolken) */
  private drawWindowFront() {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (const [off, wd] of [[3, 2], [4.5, 1]] as [number, number][]) {
      for (let k = 0; k < WIN.h * 4; k++) {
        const yy = WIN.y + WIN.h - PX - k * PX;
        const xx = WIN.x + off + Math.floor(k / 3) * PX;
        ctx.fillRect(xx, yy, PX * wd, PX);
      }
    }
    ctx.restore();
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(WIN.x + WIN.w / 2 - 0.5, WIN.y, 1, WIN.h);
    ctx.fillRect(WIN.x, WIN.y + WIN.h / 2 - 0.5, WIN.w, 1);
    ctx.fillStyle = '#7a5c3c'; // Lichtkante am Fensterkreuz
    ctx.fillRect(WIN.x + WIN.w / 2 - 0.5, WIN.y, PX, WIN.h);
    ctx.fillRect(WIN.x, WIN.y + WIN.h / 2 - 0.5, WIN.w, PX);
    ctx.fillStyle = '#7a5c3c';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 1, WIN.w + 6, 2);
    ctx.fillStyle = '#9a7a54';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 1, WIN.w + 6, PX * 2);
    ctx.fillStyle = '#b8966a';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 1, WIN.w + 6, PX);
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 3 - PX, WIN.w + 6, PX);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(WIN.x - 3, WIN.y + WIN.h + 3, WIN.w + 6, PX * 2);
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
      for (const [x, y, c, shape] of LEAVES_BACK) drawPixels(ctx, LEAF_SMALL[shape], { x: LEAF_COLORS[c] }, x, y);
      for (const [x, y, c, shape] of LEAVES) drawMap(ctx, LEAF_SHAPES[shape], { x: LEAF_COLORS[c] }, x, y);
    }
    if (room.ball) drawMap(ctx, BALL, BALL_COLORS, 6, FLOOR_Y + 2);
    if (room.bone) drawPixels(ctx, BONE, BONE_COLORS, 29.5, FLOOR_Y + 5);

    if (room.scratchingPost) drawMap(ctx, POST, POST_COLORS, POST_X, FLOOR_Y + 1 - POST.length);
  }

  /** Dinge, die vor dem Schlafplatz liegen (nach dessen Vorderseite gezeichnet) */
  private drawFrontDecor(sp: SpeciesDef) {
    drawFrontDecorFor(this.ctx, sp.id);
    if (sp.room?.socks) {
      drawPixels(this.ctx, SOCK, SOCK_RED, 46, FLOOR_Y + 3);
      drawPixels(this.ctx, SOCK2, SOCK_BLUE, 54, FLOOR_Y + 4.5);
    }
  }

  /** Spielball am Kratzbaum pendelt an einer Schnur */
  private drawPostToy(t: number) {
    const ctx = this.ctx;
    const top = FLOOR_Y + 1 - POST.length;
    const swing = Math.sin(t / 1100) * 0.08; // nur leichtes Wackeln
    const len = 6;
    const ax = POST_X + 9.5;
    const ay = top + 3;
    const bx = ax + swing * len;
    const by = ay + len + 1;
    // Schnur in Pixelschritten
    ctx.fillStyle = POST_COLORS.l;
    for (let i = 0; i <= (by - ay) * RES; i++) {
      const k = i / ((by - ay) * RES);
      ctx.fillRect(snapPx(ax + (bx - ax) * k), ay + i * PX, PX, PX);
    }
    drawMap(ctx, TOY_BALL, TOY_COLORS, snapPx(bx) - 1, by);
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
    if (this.env === 'farm' || this.env === 'garden') {
      // flache Schale; Futter als kleiner Haufen (Huhn: Körner)
      drawPixels(this.ctx, FLAT_DISH, FLAT_DISH_COLORS[this.env], BOWL_X, BOWL_Y + 1);
      if (m && level > 0) {
        const colors = m.kind === 'candy' ? HEAP_COLORS.candy : this.env === 'farm' ? HEAP_COLORS.grain : HEAP_COLORS.food;
        // Körner bekommen eine dunkle Kontur, damit sie vor dem Stroh gut sichtbar sind
        if (this.env === 'farm') {
          const dark = { g: '#3a2410', k: '#3a2410' };
          for (const [dx, dy] of [[-0.5, 0], [0.5, 0], [0, -0.5]]) drawPixels(this.ctx, HEAP_LEVELS[level], dark, BOWL_X + 1.5 + dx, BOWL_Y - 0.5 + dy);
        }
        drawPixels(this.ctx, HEAP_LEVELS[level], colors, BOWL_X + 1.5, BOWL_Y - 0.5);
      }
      return;
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
    const inDen = sleeping && this.env === 'forest'; // Fuchs liegt IN der Baumhöhle
    const { map, colors: pal, w, h } = petSprite(sp, p, { sleeping, sleepSmall: inDen });
    // in der Höhle: Kopf (links im Sprite) an den linken Rand der Öffnung, Rest verschwindet im Dunkeln
    const x = inDen ? DEN.cx - DEN.half + 0.5 : Math.round(BASKET_CX - w / 2);
    const k = hatching ? (t - this.hatchStart) / HATCH_MS : 1;
    // beim Schlüpfen taucht es langsam aus der Schale auf
    const rise = hatching ? Math.round(Math.min(1, k * 2) * 3) - 3 : 0;
    const bottom = sleeping
      ? this.env === 'room'
        ? BASKET_Y + BASKET_FRONT_DY
        : this.env === 'farm'
          ? COOP_PERCH_Y - 0.5
          : this.env === 'forest'
            ? DEN.base - 1
            : FLOOR_Y - 1
      : FLOOR_Y;
    // sanftes Atmen im Schlaf
    const breathe = sleeping && Math.floor(t / 1800) % 2 === 0 ? 0.5 : 0;
    const y = bottom - h + 1 - rise + breathe;
    if (inDen) {
      ctx.save();
      clipToDen(ctx);
      drawMap(ctx, map, pal, x, y);
      ctx.fillStyle = 'rgba(30,16,8,0.25)'; // im Bau ist es schattig
      ctx.fillRect(DEN.cx - DEN.half, DEN.top, DEN.half * 2 + 1, DEN.base - DEN.top + 1);
      ctx.restore();
      this.petBox = { x: DEN.cx - DEN.half, y: DEN.top, w: DEN.half * 2, h: DEN.base - DEN.top };
    } else {
      drawMap(ctx, map, pal, x, y);
      this.petBox = { x, y, w, h };
    }

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

  /** zufällig das nächste Verhalten wählen */
  private nextAct(t: number, p: Pet, from: number, to: number) {
    const groomer = p.species === 'cat' || p.species === 'dog' || p.species === 'fox' || p.species === 'chicken';
    const r = Math.random();
    // ab und zu zu einem Deko-Objekt gehen und dort etwas tun
    const targets = decorTargets(p.species);
    if (targets.length && !p.sick && Math.random() < 0.14) {
      const tg = targets[Math.floor(Math.random() * targets.length)];
      return { kind: 'visit' as const, visit: tg.kind, start: t, until: t + 30000, target: tg.x - 8, targetDepth: tg.kind === 'drink' || tg.kind === 'dustbath' ? 2.5 : tg.kind === 'hop' ? 0 : 1, speed: 7 };
    }
    if (r < 0.42) {
      let target = from + Math.random() * (to - from);
      if (Math.abs(target - this.walkX) < 4) target = this.walkX < (from + to) / 2 ? to : from;
      const speed = p.sick ? 2.5 + Math.random() * 2 : 4 + Math.random() * 9;
      const targetDepth = Math.round(Math.random() * 7) / 2; // mal weiter vorne, mal weiter hinten
      return { kind: 'walk' as const, start: t, until: t + 20000, target, targetDepth, speed };
    }
    if (r < 0.66) return { kind: 'idle' as const, start: t, until: t + 1000 + Math.random() * 3000 };
    if (r < 0.8 || !groomer || p.sick) return { kind: 'look' as const, start: t, until: t + 2000 + Math.random() * 2000 };
    const grown = (p.stage === 'teen' || p.stage === 'adult') && p.species !== 'chicken'; // Hühner picken statt sich zu strecken
    if (r < 0.92 || !grown) return { kind: 'groom' as const, start: t, until: t + 2400 };
    return { kind: 'stretch' as const, start: t, until: t + 2600 };
  }

  private drawPetWalking(p: Pet, sp: SpeciesDef, t: number) {
    const ctx = this.ctx;
    const dt = Math.min(0.1, (t - this.lastFrame) / 1000);
    this.lastFrame = t;
    const base = petSprite(sp, p);
    const w = base.w;
    const h = base.h;

    const from = 12;
    const to = Math.max(from + 8, 58 - w);
    let eating = false;
    let gaze = 0;
    let face = this.walkDir;
    const m = this.meal;
    if (m) {
      // zum Napf laufen, dann fressen
      const target = BOWL_X + BOWL[0].length / 2 - w / 2; // mittig über dem Napf
      const diff = target - this.walkX;
      if (m.eatStart === null) {
        if (Math.abs(diff) <= 0.5) m.eatStart = t;
        else {
          this.walkDir = Math.sign(diff);
          face = this.walkDir;
          this.walkX += this.walkDir * Math.min(Math.abs(diff), WALK_SPEED_TO_BOWL * dt);
        }
        this.depth = Math.max(0, this.depth - 4 * dt); // Napf steht vorne, Tier dahinter
      }
      if (m.eatStart !== null) {
        eating = true;
        if (t - m.eatStart >= EAT_MS) {
          if (m.kind === 'candy') this.jumpStart = t;
          this.meal = null;
          eating = false;
          this.act = { kind: 'idle', start: t, until: t + 800 };
        }
      }
    } else {
      // vorbeikommendem Tier nachschauen
      const crit = this.critters.watchTarget();
      if (crit && crit.id !== this.watched && !p.sick) {
        this.watched = crit.id;
        // zufällig: beobachten, hinterherlaufen (nur bei Tieren am Boden in der Nähe) oder ignorieren
        const catchable = crit.kind === 'mouse' || crit.kind === 'hedgehog' || (crit.kind === 'fly' && p.species === 'cat');
        const r = Math.random();
        if (catchable && r < 0.3) this.act = { kind: 'chase', start: t, until: t + 7000 };
        else if (r < (catchable ? 0.85 : 0.8)) this.act = { kind: 'watch', start: t, until: t + 6000 };
        // sonst: weitermachen wie bisher
      }
      if ((this.act.kind === 'watch' || this.act.kind === 'chase') && !crit) this.act.until = Math.min(this.act.until, t + 700);
      if (t >= this.act.until) this.act = this.nextAct(t, p, from, to);
      const a = this.act;
      if (a.kind === 'pet') gaze = 0;
      if (a.kind === 'visit' && a.arrived === undefined) {
        // Ziel: Objekt mittig vor dem Tier
        const tx = (a.target ?? this.walkX) + 8 - w / 2;
        const diff = tx - this.walkX;
        const dd = (a.targetDepth ?? this.depth) - this.depth;
        if (Math.abs(diff) < 0.3 && Math.abs(dd) < 0.1) {
          a.arrived = t;
          a.until = t + ({ sniff: 2200, nudge: 1600, drink: 2600, dustbath: 3500, sill: 9000, hop: 5000 } as const)[a.visit ?? 'sniff'];
        } else {
          const dist = Math.hypot(diff, dd * 2);
          const step = Math.min(dist, (a.speed ?? 6) * dt);
          if (Math.abs(diff) >= 0.3) this.walkDir = Math.sign(diff);
          this.walkX += (diff / dist) * step;
          this.depth += ((dd * 2) / dist) * step * 0.5;
        }
        face = this.walkDir;
      } else if (a.kind === 'walk') {
        const diff = (a.target ?? this.walkX) - this.walkX;
        const dd = (a.targetDepth ?? this.depth) - this.depth;
        if (Math.abs(diff) < 0.3 && Math.abs(dd) < 0.1) a.until = t;
        else {
          // auf geradem Weg zum Ziel (links/rechts und vor/zurück gleichzeitig)
          const dist = Math.hypot(diff, dd * 2);
          const step = Math.min(dist, (a.speed ?? 6) * dt);
          if (Math.abs(diff) >= 0.3) this.walkDir = Math.sign(diff);
          this.walkX += (diff / dist) * step;
          this.depth += ((dd * 2) / dist) * step * 0.5;
        }
        face = this.walkDir;
      } else if (a.kind === 'chase' && crit) {
        // hinterherlaufen und nach der Fliege springen, wenn sie nah ist
        const tx = Math.max(from, Math.min(to, crit.x - w / 2));
        const diff = tx - this.walkX;
        if (Math.abs(diff) > 0.3) {
          this.walkDir = Math.sign(diff);
          this.walkX += this.walkDir * Math.min(Math.abs(diff), 16 * dt);
        }
        face = crit.x < this.walkX + w / 2 ? -1 : 1;
        gaze = face;
        if (Math.abs(diff) < 2.5 && t - this.lastPounce > 1300 && p.species !== 'hedgehog' && p.species !== 'chicken') {
          this.lastPounce = t;
          this.jumpStart = t;
        }
      } else if (a.kind === 'watch' && crit) {
        const dir = crit.x < this.walkX + w / 2 ? -1 : 1;
        this.walkDir = dir;
        face = dir;
        gaze = dir;
      } else if (a.kind === 'look' || (a.kind === 'visit' && a.visit === 'hop' && a.arrived !== undefined)) {
        gaze = Math.sin((t - a.start) / 450) > 0 ? 1 : -1;
        if (a.kind === 'visit') face = gaze; // auf dem Strohhaufen hin und her schauen
      }
    }
    // Seitenansicht-Sprites (Dackel) schauen von Haus aus nach links
    const flip = base.facesLeft ? face > 0 : face < 0;
    const a = this.act;
    const grooming = !m && a.kind === 'groom';
    const petted = !m && a.kind === 'pet';
    const visiting = !m && a.kind === 'visit' && a.arrived !== undefined ? a.visit : undefined;
    const stretching = !m && a.kind === 'stretch';
    const k = (t - a.start) / Math.max(1, a.until - a.start);
    const blink = t % 3500 < 150;
    // Blickrichtung ist im Bild gemeint; bei gespiegeltem Sprite umdrehen
    if (base.facesLeft) gaze = 0; // Seitenansicht: der Kopf zeigt schon die Richtung
    const img = petSprite(sp, p, { eyesClosed: blink || grooming || stretching || petted, gaze: flip ? -gaze : gaze });

    let x = this.walkX;
    let bob = 0;
    if (!m && a.kind === 'walk' && !p.sick) bob = (Math.floor(t / 220) % 2) * 0.5;
    if (eating || grooming) bob = -(Math.floor(t / (p.species === 'chicken' ? 160 : 280)) % 2) * (p.species === 'chicken' ? 1 : 0.5); // Kopf runter (Napf / Putzen / Picken)
    if (visiting === 'sniff' || visiting === 'nudge' || visiting === 'drink') bob = -(Math.floor(t / (visiting === 'nudge' ? 200 : 320)) % 2) * 0.5;
    const j = t - this.jumpStart;
    if (j >= 0 && j < 900) bob = Math.round(Math.abs(Math.sin((j / 900) * Math.PI * 2)) * 5);
    const s = t - this.shakeStart;
    if (s >= 0 && s < 600) x += Math.round(Math.sin(s / 25) * 1.5);
    if (petted) x += Math.floor((t - a.start) / 300) % 2 ? 0.5 : 0; // genießerisch wiegen

    let ground = FLOOR_Y + snapPx(this.depth);
    if (visiting === 'hop') {
      // hochhüpfen, oben stehen, runterhüpfen
      const kk = (t - (a.arrived ?? t)) / Math.max(1, a.until - (a.arrived ?? t));
      const up = kk < 0.1 ? kk / 0.1 : kk > 0.9 ? (1 - kk) / 0.1 : 1;
      const arc = up < 1 ? Math.sin(Math.PI * up) * 2.5 : 0;
      ground = snapPx((ground - (STRAW_HEAP.h - 0.5) * up - arc));
    }
    const y = ground - h + 1 - bob;
    // kleiner Schatten unter dem Tier
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(snapPx((x + 2)), ground + 0.5, snapPx((w - 4)), 0.5);
    ctx.fillRect(snapPx((x + 3)), ground + 1, snapPx((w - 6)), 0.5);
    if (visiting === 'sill' || visiting === 'dustbath') {
      // Katze döst auf dem Fensterkissen / Huhn plustert sich im Sandbad
      const sl = petSprite(sp, p, { sleeping: true, sleepSmall: visiting === 'sill' });
      const kk = (t - (a.arrived ?? t)) / Math.max(1, a.until - (a.arrived ?? t));
      let sx = x + w / 2 - sl.w / 2;
      let sy = ground - sl.h + 1;
      if (visiting === 'sill') {
        // hochspringen, liegen, runterspringen
        const sillTop = WIN.y + WIN.h - 0.5;
        const up = kk < 0.06 ? kk / 0.06 : kk > 0.94 ? (1 - kk) / 0.06 : 1;
        const lieX = WIN.x + 0.5;
        sx = sx + (lieX - sx) * up;
        sy = sy + (sillTop - sl.h + 1 - sy) * up - Math.sin(Math.PI * Math.min(1, up)) * (up < 1 ? 4 : 0);
      } else if (Math.floor(t / 180) % 2) {
        // Staubwölkchen im Sandbad
        ctx.fillStyle = 'rgba(200,170,110,0.8)';
        for (let i = 0; i < 4; i++) ctx.fillRect(snapPx((sx + 2 + ((t / 60 + i * 5) % (sl.w - 3)))), snapPx((ground - 1 - (i % 2))), 0.5, 0.5);
      }
      drawMap(ctx, sl.map, sl.colors, sx, sy, false);
    } else if (stretching) {
      // Strecken: Vorbeugen -> volle Streckung mit Gähnen -> Vorbeugen
      const frame: 0 | 1 = k < 0.25 || k > 0.8 ? 0 : 1;
      const st = petSprite(sp, p, { stretch: frame });
      const sflip = face > 0; // Pose schaut von Haus aus nach links
      drawMap(ctx, st.map, st.colors, x + w / 2 - st.w / 2, ground - st.h + 1, sflip);
    } else drawMap(ctx, img.map, img.colors, x, y, flip);
    this.petBox = { x, y, w, h };

    if (visiting === 'drink' && Math.floor(t / 320) % 2 === 0) {
      ctx.fillStyle = '#7ac0f0'; // Wassertropfen
      ctx.fillRect(snapPx((x + w / 2)), snapPx((ground - 1)), 0.5, 0.5);
    }
    if (grooming) {
      // Zunge beim Putzen und am Ende ein Glitzern
      const ny = p.species === 'chicken' ? -1 : img.map.findIndex((r) => r.includes('n'));
      if (ny >= 0 && Math.floor(t / 280) % 2 === 0) {
        const nx = img.map[ny].indexOf('n');
        const sx = flip ? w - 1 - nx : nx;
        ctx.fillStyle = '#f07a8a';
        ctx.fillRect(snapPx((x + sx)), snapPx((y + ny + 1)), 0.5, 0.5);
      }
      if (k > 0.75 && p.species !== 'chicken') drawMap(ctx, ICONS.sparkle.map, ICONS.sparkle.colors, x + w - 3, y - 2);
    }

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
