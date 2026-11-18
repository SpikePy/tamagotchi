import { MIN, RULES } from '../engine/config';
import { activePet, hearts, type GameState, type Pet } from '../engine/state';
import type { Mood } from './rig';
import { species } from '../species';
import type { SpeciesDef } from '../species/types';
import { ColorMap, ICONS, PX, RES, drawMap, snapPx, drawPixels, eggColors, eggMap, hiResCanvas, petSprite } from './pixels';
import { Critters } from './critters';
import { COOP_PERCH_Y, DEN, GROUND_Y, PLATE_COLORS, clipToDen, SceneKind, drawNestBack, drawNestFront, drawOutdoorFar, drawOutdoorNear, drawOutdoorSky, skyState } from './outdoor';
import { Clouds, drawPrecip, drawPuddles, drawWindowDrops, weatherAt } from './weather';
import { Ambient, eveningLight, nightTint, nightness, roomNight } from './ambient';
import { remapContext, seasonOf, seasonTransform, snowCaps, type Season } from './season';
import { drawRoomBack, drawRoomWindowFront } from './roomart';
import * as PR from './props';
import { NEST_BOX, STRAW_HEAP, type VisitKind, decorTargets, drawDecorAnim, drawDecorFar, drawDecorNear, drawFrontDecorFor, drawNestEggs, drawSillDecor, drawSunflowers, drawWeathervane } from './decor';

export const SCREEN_W = 64;
export const SCREEN_H = 48;
const FLOOR_Y = 40;

// Körbchen unter dem Fenster (geflochten, mit Kissen)
const BASKET_X = 37;
const BASKET_Y = FLOOR_Y - 4; // flaches Körbchen
const BASKET_CX = BASKET_X + 12;
const BASKET_FRONT_DY = 2; // Vorderseite beginnt unter der Rückseite

// Futternapf neben der Pflanze
const BOWL_X = 17.5;
const BOWL_Y = FLOOR_Y + 2;
const BOWL = ['.ooooooo.', 'ohhhhhhho', '.obbbbbo.', '..ooooo..'];
// flache Schale (Hühnerhof: Blech, Garten: blaue Keramik) – in voller Rasterauflösung
const FLAT_DISH_COLORS: Record<string, ColorMap> = {
  farm: { o: '#4a5058', h: '#c8d0d8', b: '#8a949e' },
  garden: { o: '#1e3a6a', h: '#cfe0f6', b: '#3a6ab0' },
};
const HEAP_COLORS: Record<'grain' | 'food' | 'candy', { g: string; k: string }> = {
  grain: { g: '#e88a1c', k: '#6a3e1a' }, // Mais orange + dunkle Saat, hebt sich vom Heu ab
  food: { g: '#b07a42', k: '#7a4a24' },
  candy: { g: '#e46fb1', k: '#fff2f8' },
};
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
// Kratzbaum (Katze)
const POST_X = 6; // links im Zimmer
// Socken-Spiel des Hundes (Anteile der Besuchsdauer): Maul packen, wegschleudern, Landung
// Igel kullert: Einrollen, Tempo, Liegenbleiben am Ziel
const ROLL_CURL_MS = 450;
const ROLL_SPEED = 15;
const ROLL_REST_MS = 600;
// Huhn und Wurm: Anteile der Gesamtdauer (rausgucken → zuschnappen → ziehen → frei → geschluckt)
const WORM_MS = 5200;
const WORM_STRIKE = 0.32;
const WORM_FREE = 0.62;
const WORM_GONE = 0.9;
const SOCK_W = 8.5;
const SOCK_GRAB = 0.16;
const SOCK_TOSS = 0.7;
const SOCK_LAND = 0.82;
const POST_TOP = FLOOR_Y + 1 - 21; // Kratzbaum ist 21 Einheiten hoch
const POST_COLORS: ColorMap = { o: '#4a3a30', m: '#b9a58a', r: '#d8c08e', R: '#b89a62', l: '#5a4a40', y: '#e2384d' };

// Kauknochen und Socken (Hund), in voller Rasterauflösung
// flach liegende Socken: Bündchen (c/C), Ringel (w), Ferse und Spitze (k), Schatten (R)

// Spielball am Kratzbaum

// Tennisball (Hund)

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
  private eggTapAt = -Infinity;
  private flashStart = -Infinity;
  private jumpStart = -Infinity;
  private shakeStart = -Infinity;
  private meal: { kind: 'food' | 'candy'; eatStart: number | null } | null = null;
  private walkX = 30;
  private walkDir = 1;
  private ballKick = -1e9;
  /** rote Socke des Hundes: linke Kante (Spiel-Einheiten); der Hund schleudert sie beim Spielen woanders hin */
  private sockX = 46;
  private depth = 1; // 0 = hinten, 3.5 = vorne im Raum
  private act: { kind: 'walk' | 'idle' | 'look' | 'groom' | 'stretch' | 'watch' | 'pet' | 'visit' | 'chase' | 'scrape' | 'roll' | 'worm'; visit?: VisitKind; arrived?: number; sockTo?: number; wormX?: number; sillY?: number; start: number; until: number; target?: number; targetDepth?: number; speed?: number } = {
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
  debugCritter(kind: string, lane: number, dir: 1 | -1 = 1) {
    this.critters.debugSpawn(kind as never, lane, dir);
  }

  debugAct(kind: 'visit' | 'groom' | 'stretch' | 'look' | 'idle' | 'roll' | 'worm', visit?: VisitKind, target?: number) {
    const t = performance.now();
    this.act = { kind, visit, start: t, until: t + 30000, target, targetDepth: visitDepth(visit), speed: kind === 'roll' ? ROLL_SPEED : 12 };
    if (kind !== 'visit' && kind !== 'roll') this.act.until = t + (kind === 'worm' ? WORM_MS : 2600);
  }

  /** Liegt der Punkt (in Spiel-Einheiten) auf dem Tier? */
  hitPet(x: number, y: number): boolean {
    const b = this.petBox;
    return !!b && x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2;
  }

  /** Streicheln: stehen bleiben, Augen zu, wiegen, Herzchen */
  stroke(sleeping = false) {
    const t = performance.now();
    // sitzt die Katze gerade oben auf dem Kratzbaum oder der Fensterbank, bleibt sie dort und genießt es
    const perched = this.act.kind === 'visit' && (this.act.visit === 'perch' || this.act.visit === 'sill') && this.act.arrived !== undefined;
    if (!sleeping && !perched) this.act = { kind: 'pet', start: t, until: t + 1800 };
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
    this.hatchStart = this.eggTapAt = this.flashStart = this.jumpStart = this.shakeStart = -Infinity;
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

  /** Ei antippen: kurz wackeln */
  eggTap() {
    this.eggTapAt = performance.now();
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
        this.drawRoom(sp, s.clock, season);
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
        drawOutdoorFar(farCtx, this.env, season);
        drawDecorFar(remapContext(farCtx, tf), this.env);
        drawOutdoorNear(this.ctx, this.env, season);
        this.drawDecor(sp, t, 'static');
        drawDecorNear(this.ctx, sp.id, sunX, season === 'winter');
      }
      this.nestBack(season);
      if (season === 'winter' && this.env !== 'room') {
        snowCaps(this.bgFar);
        snowCaps(this.bg);
      }
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
      // Sonnenblumen und Wetterhahn bewegen sich im Wind (pro Bild gezeichnet)
      const wind = weatherAt(s.clock).wind;
      const skyW = skyState(s.clock);
      drawSunflowers(ctx, sp.id, skyW.day ? -5 + skyW.f * 69 + 2.5 : 32, t, wind, season === 'winter');
      if (this.env === 'farm') drawWeathervane(ctx, wind, t);
      if (weatherAt(s.clock).precip === 'rain') drawPuddles(ctx, t);
      this.critters.draw(ctx, 'air', t); // wehende Blätter
      this.critters.draw(ctx, 'near', t); // Vogel auf dem Aststummel (vor dem Baumstamm)
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
    // Maus/Igel am Boden: nach Tiefe sortiert zwischen Haustier und Napf zeichnen
    const critG = this.critters.groundY();
    const petG = walking ? FLOOR_Y + this.depth + 1 : FLOOR_Y + 1; // Unterkante des Tiers
    const bowlG = BOWL_Y + 2;
    if (critG !== null && critG < petG) this.critters.draw(ctx, 'foreground', t);
    if (p.stage === 'egg') {
      this.drawEgg(p, sp, t);
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
    const critAfterPet = critG !== null && critG >= petG;
    if (critAfterPet && critG < bowlG) this.critters.draw(ctx, 'foreground', t);
    // Napf liegt vorne auf dem Boden, also nach dem Tier zeichnen
    this.drawBowl(t);
    if (critAfterPet && critG >= bowlG) this.critters.draw(ctx, 'foreground', t);

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
  private nestBack(season: Season) {
    if (this.env === 'room') PR.drawProp(this.ctx, PR.basketBack(), BASKET_X, BASKET_Y);
    else drawNestBack(this.ctx, this.env, season);
  }

  /** Vorderseite des Schlafplatzes, verdeckt den unteren Teil des Tiers */
  private nestFront() {
    if (this.env === 'room') PR.drawProp(this.ctx, PR.basketFront(), BASKET_X, BASKET_Y + BASKET_FRONT_DY);
    else drawNestFront(this.ctx, this.env);
  }

  private drawRoom(sp: SpeciesDef, clock: number, season: Season) {
    drawRoomBack(this.ctx, sp.colors, WIN, skyState(clock), season, sp.id, clock);
    this.drawRug(BOWL_X + 4.5, 44.5, 9, 2.5); // Teppich unter dem Napf
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

  /** Spiegelung, Fensterkreuz und Fensterbrett (liegen über Himmel, Wolken und Vogel) */
  private drawWindowFront() {
    drawRoomWindowFront(this.ctx, WIN);
  }

  /** Deko passend zur Tierart: Gras, Laub, Kratzbaum */
  private drawDecor(sp: SpeciesDef, t: number, part: 'static' | 'anim') {
    const ctx = this.ctx;
    const room = sp.room ?? {};
    if (part === 'anim') {
      if (room.scratchingPost) this.drawPostToy(t);
      return;
    }
    // Gras und Laub am Boden malen die Außenszenen selbst (outdoor.ts)
    if (room.ball) PR.drawProp(ctx, PR.tennisBall(), 6, FLOOR_Y + 2);
    if (room.bone) PR.drawProp(ctx, PR.chewBone(), 29.5, FLOOR_Y + 5);

    if (room.scratchingPost) PR.drawProp(ctx, PR.scratchPost(), POST_X, FLOOR_Y + 1 - 21);
  }

  /** Dinge, die vor dem Schlafplatz liegen (nach dessen Vorderseite gezeichnet) */
  private drawFrontDecor(sp: SpeciesDef) {
    drawFrontDecorFor(this.ctx, sp.id);
    if (sp.room?.socks) {
      // die rote Socke fehlt hier, solange der Hund sie im Maul hat oder sie durch die Luft fliegt
      const a = this.act;
      const held = a.kind === 'visit' && a.visit === 'sock' && a.arrived !== undefined && a.sockTo !== undefined && (performance.now() - a.arrived) / Math.max(1, a.until - a.arrived) >= SOCK_GRAB;
      if (!held) PR.drawProp(this.ctx, PR.sock(true), this.sockX, FLOOR_Y + 3);
      PR.drawProp(this.ctx, PR.sock(false), 54, FLOOR_Y + 4.5, true);
    }
  }

  /** Socke im Maul (flattert beim Kopfschütteln hin und her) bzw. im Flug zur neuen Stelle */
  private drawHeldSock(img: { map: string[]; w: number }, x: number, y: number, w: number, flip: boolean, k: number, toX: number, ground: number, t: number) {
    const sock = PR.sock(true);
    // Maul = unter der Nase (Zeichen 'n' im Sprite)
    const sc = img.map[0].length / w;
    const ny = img.map.findIndex((r) => r.includes('n'));
    const nx = ny >= 0 ? (img.map[ny].indexOf('n') + 1) / sc : w / 2;
    const mx = x + (flip ? w - nx : nx);
    const my = y + (ny >= 0 ? (ny + 1) / sc + 1 : 4);
    if (k < SOCK_TOSS) {
      const side = Math.floor(t / 110) % 2 ? 1 : -1;
      PR.drawProp(this.ctx, sock, snapPx(mx - sock.w / 2 + side * 2.5), snapPx(my - sock.h / 2 + 0.5), side < 0);
      return;
    }
    // im Bogen zur neuen Stelle, dreht sich dabei
    const q = Math.min(1, (k - SOCK_TOSS) / (SOCK_LAND - SOCK_TOSS));
    const sx = mx - sock.w / 2 + (toX - (mx - sock.w / 2)) * q;
    const sy = my + (FLOOR_Y + 3 - my) * q - Math.sin(q * Math.PI) * 9;
    PR.drawProp(this.ctx, sock, snapPx(sx), snapPx(Math.min(sy, ground + 3)), Math.floor(t / 90) % 2 === 0);
  }

  /** Schnabelspitze des Huhns im Bild (Zeichen p/P/5 ganz vorne), in Spiel-Einheiten */
  private beakTip(img: { map: string[] }, x: number, y: number, w: number, flip: boolean): [number, number] {
    const sc = img.map[0].length / w;
    let bi = Infinity;
    let bj = 0;
    img.map.forEach((row, j) => {
      for (let i = 0; i < Math.min(row.length, bi); i++)
        if (row[i] === 'p' || row[i] === 'P' || row[i] === '5') {
          bi = i;
          bj = j;
          break;
        }
    });
    if (!Number.isFinite(bi)) return [x + (flip ? w : 0), y + 2];
    const ux = bi / sc;
    return [x + (flip ? w - ux : ux), y + (bj + 0.5) / sc];
  }

  /** Wurm schaut aus der Erde, wird gepackt, herausgezogen und verschluckt */
  private drawWormAct(img: { map: string[] }, x: number, y: number, w: number, flip: boolean, k: number, ground: number, t: number, small: boolean) {
    const ctx = this.ctx;
    const a = this.act;
    const [tx, ty] = this.beakTip(img, x, y, w, flip);
    // Stelle vor dem Schnabel merken (das Huhn bleibt stehen, schaut nur)
    if (a.wormX === undefined) a.wormX = tx + (flip ? 1.5 : -1.5);
    const wx = a.wormX;
    const gy = ground + 0.5;
    const len = small ? 3 : 4;
    const pts: [number, number][] = [];
    if (k < WORM_GONE) {
      // Erdloch
      ctx.fillStyle = 'rgba(70,45,25,0.85)';
      ctx.fillRect(snapPx(wx - 1), snapPx(gy), PX * 8, PX * 2);
    }
    if (k < WORM_STRIKE) {
      // herausschauen und sich winden
      const up = Math.min(1, k / 0.12) * (len * 0.6);
      for (let i = 0; i <= 8; i++) {
        const q = i / 8;
        pts.push([wx + Math.sin(t / 180 + q * 3) * 0.7 * q, gy - up * q]);
      }
    } else if (k < WORM_FREE) {
      // im Schnabel, gespannt zwischen Erde und Schnabel
      for (let i = 0; i <= 10; i++) {
        const q = i / 10;
        const sag = Math.sin(q * Math.PI) * (0.4 + (Math.floor(t / 120) % 2) * 0.25);
        pts.push([wx + (tx - wx) * q + sag, gy + (ty - gy) * q]);
      }
    } else if (k < WORM_GONE) {
      // baumelt aus dem Schnabel und wird Stück für Stück verschluckt
      const rest = len * (1 - (k - WORM_FREE) / (WORM_GONE - WORM_FREE));
      for (let i = 0; i <= 8; i++) {
        const q = i / 8;
        pts.push([tx + Math.sin(t / 110 + q * 4) * 0.6 * q, ty + rest * q]);
      }
    }
    if (pts.length < 2) return;
    ctx.fillStyle = '#d87a82';
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / PX));
      for (let s = 0; s <= n; s++) ctx.fillRect(snapPx(x0 + ((x1 - x0) * s) / n - PX / 2), snapPx(y0 + ((y1 - y0) * s) / n - PX / 2), PX * 2, PX * 2);
    }
    // Ringel
    ctx.fillStyle = '#b85a64';
    for (let i = 2; i < pts.length; i += 3) ctx.fillRect(snapPx(pts[i][0] - PX / 2), snapPx(pts[i][1]), PX * 2, PX);
  }

  /** Spielball am Kratzbaum pendelt an einer Schnur */
  private drawPostToy(t: number) {
    const ctx = this.ctx;
    const top = FLOOR_Y + 1 - 21; // Kratzbaum ist 21 Einheiten hoch
    const kick = t - this.ballKick;
    const swing = Math.sin(t / 1100) * 0.08 + (kick >= 0 && kick < 1600 ? Math.sin(kick / 110) * 0.45 * (1 - kick / 1600) : 0); // leichtes Wackeln, beim Anstupsen stärker
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
    PR.drawProp(ctx, PR.toyBall(), snapPx(bx) - 1, by);
  }

  private drawPoops(p: Pet, t: number) {
    const ctx = this.ctx;
    const cleaning = t < this.cleaningUntil;
    p.poops.slice(0, 6).forEach((_, i) => {
      // zwischen Pflanze und Körbchen, 3 nebeneinander, dann eine zweite Reihe
      const x = 26 + (i % 3) * 4 + (Math.floor(i / 3) % 2) * 2 + (cleaning ? (this.cleaningUntil - t) / 20 : 0);
      const y = FLOOR_Y + 1 - Math.floor(i / 3) * 2 + (i % 2);
      PR.drawProp(ctx, PR.poop(), x, y);
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
      PR.drawProp(this.ctx, PR.flatDish(FLAT_DISH_COLORS[this.env]), BOWL_X, BOWL_Y + 1);
      if (m && level > 0) {
        // Körner/Futter als Haufen mit dunkler Kontur, damit er sich vom Boden abhebt
        const colors = m.kind === 'candy' ? HEAP_COLORS.candy : this.env === 'farm' ? HEAP_COLORS.grain : HEAP_COLORS.food;
        PR.drawProp(this.ctx, PR.foodHeap(level, colors, true), BOWL_X + 1, BOWL_Y - 0.25);
      }
      return;
    }
    PR.drawProp(this.ctx, this.env === 'forest' ? PR.stonePlate() : PR.bowl(PLATE_COLORS[this.env]), BOWL_X, BOWL_Y);
    if (m && level > 0) {
      const fc = FOOD_COLORS[m.kind];
      PR.drawProp(this.ctx, PR.foodHeap(level, { g: fc.f, k: fc.k }, false), BOWL_X + 1, this.env === 'forest' ? BOWL_Y - 0.5 : BOWL_Y - 0.6);
    }
  }

  private drawEgg(p: Pet, sp: SpeciesDef, t: number) {
    // Risse je nach Zahl der Tipps: ab einem Viertel, der Hälfte und drei Vierteln kommen mehr dazu
    const k = (p.eggTaps ?? 0) / RULES.eggTaps;
    const stage = k >= 0.75 ? 3 : k >= 0.5 ? 2 : k >= 0.25 ? 1 : 0;
    // wackelt bei jedem Tipp, außerdem in Schüben – je mehr Risse, desto öfter
    let wobble = 0;
    const sinceTap = t - this.eggTapAt;
    if (sinceTap < 300) wobble = Math.round(Math.sin(sinceTap / 30) * 1.5);
    else if (stage > 0) {
      const period = [0, 2200, 1400, 700][stage];
      const inBurst = t % period < 400;
      if (inBurst) wobble = Math.round(Math.sin(t / 45) * (stage === 3 ? 1.5 : 1));
    }
    const x = EGG_X + wobble;
    drawMap(this.ctx, eggMap(), eggColors(sp, p.look), x, EGG_Y);
    this.ctx.fillStyle = '#3a2a1a';
    for (let k = 0; k < stage; k++) for (const [cx, cy] of CRACKS[k]) this.ctx.fillRect(x + cx, EGG_Y + cy, 1, 1);
    this.petBox = { x: EGG_X, y: EGG_Y, w: EGG_W, h: EGG_H }; // zum Antippen
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
      const tx = tg.kind === 'sock' ? this.sockX + SOCK_W / 2 : tg.x;
      return { kind: 'visit' as const, visit: tg.kind, start: t, until: t + 30000, target: tx - 8, targetDepth: visitDepth(tg.kind), speed: 7 };
    }
    // Igel: ab und zu zur Kugel einrollen und quer durchs Bild kullern
    if (p.species === 'hedgehog' && !p.sick && Math.random() < 0.08) {
      const far = this.walkX - from > to - this.walkX ? from : to;
      const target = far + (this.walkX - far) * Math.random() * 0.3;
      return { kind: 'roll' as const, start: t, until: t + 20000, target, speed: ROLL_SPEED };
    }
    // Huhn: ab und zu schaut ein Wurm aus der Erde, das Huhn zieht ihn heraus und frisst ihn
    if (p.species === 'chicken' && !p.sick && Math.random() < 0.07) return { kind: 'worm' as const, start: t, until: t + WORM_MS };
    if (r < 0.42) {
      let target = from + Math.random() * (to - from);
      if (Math.abs(target - this.walkX) < 4) target = this.walkX < (from + to) / 2 ? to : from;
      const speed = p.sick ? 2.5 + Math.random() * 2 : 4 + Math.random() * 9;
      const targetDepth = Math.round(Math.random() * 7) / 2; // mal weiter vorne, mal weiter hinten
      return { kind: 'walk' as const, start: t, until: t + 20000, target, targetDepth, speed };
    }
    if (r < 0.66) return { kind: 'idle' as const, start: t, until: t + 1000 + Math.random() * 3000 };
    // Huhn: ab und zu auf dem Boden scharren (danach picken)
    if (p.species === 'chicken' && !p.sick && r < 0.76) return { kind: 'scrape' as const, start: t, until: t + 2600 + Math.random() * 1400 };
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
          a.until = t + ({ sniff: 2200, nudge: 1600, drink: 2600, dustbath: 3500, sill: 9000, hop: 5000, scratch: 3600, play: 3400, scrape: 3000, perch: 12000, sock: 5600 } as const)[a.visit ?? 'sniff'];
          // Socke: wohin sie am Ende fliegt (nicht wieder an dieselbe Stelle)
          if (a.visit === 'sock') {
            let to = 36 + Math.random() * 16;
            if (Math.abs(to - this.sockX) < 5) to = this.sockX < 44 ? 48 + Math.random() * 4 : 36 + Math.random() * 4;
            a.sockTo = to;
          }
          if (a.visit === 'perch') a.until += Math.random() * 8000; // oben auf dem Kratzbaum ein Weilchen bleiben
        } else {
          const dist = Math.hypot(diff, dd * 2);
          const step = Math.min(dist, (a.speed ?? 6) * dt);
          if (Math.abs(diff) >= 0.3) this.walkDir = Math.sign(diff);
          this.walkX += (diff / dist) * step;
          this.depth += ((dd * 2) / dist) * step * 0.5;
        }
        face = this.walkDir;
      } else if (a.kind === 'roll') {
        // erst einrollen, dann kullern, am Ziel kurz liegen bleiben und wieder aufrollen
        const diff = (a.target ?? this.walkX) - this.walkX;
        if (a.arrived === undefined && t - a.start > ROLL_CURL_MS) {
          if (Math.abs(diff) < 0.3) {
            a.arrived = t;
            a.until = t + ROLL_REST_MS + 900;
          } else {
            this.walkDir = Math.sign(diff);
            this.walkX += this.walkDir * Math.min(Math.abs(diff), (a.speed ?? ROLL_SPEED) * dt);
          }
        }
        face = this.walkDir;
        // danach etwas benommen hin und her schauen
        if (a.arrived !== undefined && t - a.arrived > ROLL_REST_MS) gaze = Math.sin((t - a.arrived) / 160) > 0 ? 1 : -1;
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
    // Huhn: scharren (Bein kratzt nach hinten) und picken (Kopf zum Boden) als eigene Posen
    const bigBird = p.species === 'chicken' && p.stage !== 'baby' && p.stage !== 'child';
    const scraping = !m && a.kind === 'scrape';
    let birdPose: 'peck' | 'scrape0' | 'scrape1' | undefined;
    if (bigBird && scraping) birdPose = k < 0.7 ? (Math.floor(t / 170) % 2 ? 'scrape1' : 'scrape0') : Math.floor(t / 220) % 2 ? 'peck' : undefined;
    // Wurm: zuschnappen und herausziehen mit gesenktem Kopf, danach schlucken
    const wormK = !m && a.kind === 'worm' ? k : -1;
    if (bigBird && wormK >= WORM_STRIKE && wormK < WORM_FREE) birdPose = 'peck';
    else if (bigBird && wormK >= WORM_FREE && wormK < WORM_GONE) birdPose = Math.floor(t / 200) % 2 ? 'peck' : undefined;
    else if (bigBird && (grooming || eating)) birdPose = Math.floor(t / 220) % 2 ? 'peck' : undefined;
    const mood: Mood = petted ? 'joy' : moodOf(p);
    const img = petSprite(sp, p, { eyesClosed: !birdPose && (blink || grooming || stretching || petted), mood, gaze: flip ? -gaze : gaze, pose: birdPose });

    // Igel als Kugel: Drehstellung folgt dem zurückgelegten Weg (rollt also richtig herum)
    const balled = !m && a.kind === 'roll' && t - a.start > 150 && (a.arrived === undefined || t - a.arrived < ROLL_REST_MS);
    let ball: ReturnType<typeof petSprite> | null = null;
    if (balled) {
      const bw = petSprite(sp, p, { pose: 'roll', spin: 0 }).w;
      const spin = ((Math.round(this.walkX / (bw / 2) / (Math.PI / 4)) % 8) + 8) % 8;
      ball = petSprite(sp, p, { pose: 'roll', spin });
    }

    let x = this.walkX;
    let bob = 0;
    if (!m && a.kind === 'walk' && !p.sick) bob = (Math.floor(t / 220) % 2) * 0.5;
    if ((eating || grooming) && !bigBird) bob = -(Math.floor(t / (p.species === 'chicken' ? 160 : 280)) % 2) * (p.species === 'chicken' ? 1 : 0.5); // Kopf runter (Napf / Putzen / Picken)
    if (scraping && !bigBird) bob = -(Math.floor(t / 160) % 2); // Küken: nur nicken
    if (balled && a.arrived === undefined && t - a.start > ROLL_CURL_MS) bob = (Math.floor(t / 140) % 3 === 0 ? 0.5 : 0); // hoppelt über kleine Unebenheiten
    if (wormK >= 0 && !bigBird && ((wormK >= WORM_STRIKE && wormK < WORM_FREE) || (wormK >= WORM_FREE && wormK < WORM_GONE && Math.floor(t / 200) % 2))) bob = -1; // Küken: Kopf runter
    if (wormK >= WORM_STRIKE + 0.06 && wormK < WORM_FREE) bob += Math.min(1.5, (wormK - WORM_STRIKE - 0.06) / (WORM_FREE - WORM_STRIKE - 0.06) * 1.5) + (Math.floor(t / 120) % 2 ? 0.25 : 0); // ziehen und zerren
    if (visiting === 'sniff' || visiting === 'nudge' || visiting === 'drink') bob = -(Math.floor(t / (visiting === 'nudge' ? 200 : 320)) % 2) * 0.5;
    // Hund spielt mit der Socke: erst Spielaufforderung (vorne runter), dann Kopfschütteln, Wegschleudern, Freudensprung
    const sockK = visiting === 'sock' ? (t - (a.arrived ?? t)) / Math.max(1, a.until - (a.arrived ?? t)) : -1;
    if (sockK >= 0 && sockK < SOCK_GRAB) bob = -(Math.floor(t / 260) % 2) * 0.75;
    if (sockK >= SOCK_GRAB && sockK < SOCK_TOSS) x += Math.floor(t / 110) % 2 ? 0.75 : -0.75;
    if (sockK >= SOCK_LAND && this.jumpStart < (a.arrived ?? t)) this.jumpStart = t;
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
    // kleiner Schatten unter dem Tier (nicht, wenn es oben auf dem Kratzbaum sitzt)
    if (visiting !== 'perch') {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(snapPx((x + 2)), ground + 0.5, snapPx((w - 4)), 0.5);
      ctx.fillRect(snapPx((x + 3)), ground + 1, snapPx((w - 6)), 0.5);
    }
    let box = { x, y, w, h };
    if (visiting === 'sill' || visiting === 'dustbath') {
      // Katze döst auf dem Fensterkissen / Huhn plustert sich im Sandbad
      const sl = petSprite(sp, p, { sleeping: true, sleepSmall: visiting === 'sill' });
      const kk = (t - (a.arrived ?? t)) / Math.max(1, a.until - (a.arrived ?? t));
      let sx = x + w / 2 - sl.w / 2;
      let sy = ground - sl.h + 1;
      let leap = false;
      if (visiting === 'sill') {
        // Anlauf, Sprung mit gestrecktem Körper, liegen, Sprung zurück
        const sillTop = WIN.y + WIN.h - 0.5;
        const up = kk < 0.07 ? kk / 0.07 : kk > 0.93 ? (1 - kk) / 0.07 : 1;
        const lieX = WIN.x + 0.5;
        if (up < 1) {
          const lp = petSprite(sp, p, { pose: 'leap', mood: moodOf(p) });
          const c0 = x + w / 2;
          const c1 = lieX + sl.w / 2;
          const cx = c0 + (c1 - c0) * up;
          const by = ground + (sillTop - ground) * up - Math.sin(Math.PI * up) * 7;
          const movingRight = kk < 0.5 ? c1 > c0 : c0 > c1;
          drawMap(ctx, lp.map, lp.colors, cx - lp.w / 2, by - lp.h + 1, movingRight);
          leap = true;
        }
        sx = sx + (lieX - sx) * up;
        sy = sy + (sillTop - sl.h + 1 - sy) * up;
      } else if (Math.floor(t / 180) % 2) {
        // Staubwölkchen im Sandbad
        ctx.fillStyle = 'rgba(200,170,110,0.8)';
        for (let i = 0; i < 4; i++) ctx.fillRect(snapPx((sx + 2 + ((t / 60 + i * 5) % (sl.w - 3)))), snapPx((ground - 1 - (i % 2))), 0.5, 0.5);
      }
      if (!leap) drawMap(ctx, sl.map, sl.colors, sx, sy, false);
    } else if (visiting === 'perch') {
      // Katze springt auf die oberste Plattform des Kratzbaums, sitzt dort, schaut sich um und springt wieder herunter
      const kk = (t - (a.arrived ?? t)) / Math.max(1, a.until - (a.arrived ?? t));
      const jump = 900 / Math.max(1, a.until - (a.arrived ?? t)); // Sprung dauert knapp eine Sekunde
      const up = kk < jump ? kk / jump : kk > 1 - jump ? (1 - kk) / jump : 1;
      const topY = POST_TOP + 1.5; // Oberfläche der Plattform
      const sitX = POST_X + 5.5 - w / 2;
      if (up < 1) {
        const lp = petSprite(sp, p, { pose: 'leap', mood: moodOf(p) });
        const c0 = x + w / 2;
        const c1 = sitX + w / 2;
        const cx = c0 + (c1 - c0) * up;
        const by = ground + (topY - ground) * up - Math.sin(Math.PI * up) * 6;
        const movingRight = kk < 0.5 ? c1 > c0 : c0 > c1;
        drawMap(ctx, lp.map, lp.colors, cx - lp.w / 2, by - lp.h + 1, movingRight);
      } else {
        // oben: in Ruhe sitzen und sich ab und zu nach links und rechts umschauen
        const look = Math.floor((t - (a.arrived ?? t)) / 2500) % 3;
        const sitImg = look === 0 ? img : petSprite(sp, p, { mood: moodOf(p), gaze: look === 1 ? -1 : 1, eyesClosed: Math.floor(t / 3100) % 9 === 0 });
        drawMap(ctx, sitImg.map, sitImg.colors, sitX, topY - h + 1, look === 2);
        box = { x: sitX, y: topY - h + 1, w, h };
      }
    } else if (visiting === 'scratch' || visiting === 'play') {
      // Katze wetzt die Krallen am Kratzbaum bzw. schlägt nach der Kugel
      const fr = Math.floor(t / (visiting === 'scratch' ? 240 : 360)) % 2;
      const pose = visiting === 'scratch' ? (fr ? 'scratch1' : 'scratch0') : fr ? 'bat1' : 'bat0';
      const st = petSprite(sp, p, { pose, mood: moodOf(p) });
      const sx = visiting === 'scratch' ? POST_X + 6.2 : POST_X + 9.5 - st.w * 0.03;
      drawMap(ctx, st.map, st.colors, sx, ground - st.h + 1, false);
      if (visiting === 'play' && fr && t - this.ballKick > 700) this.ballKick = t;
      if (visiting === 'play') this.drawPostToy(t); // Kugel vor der Katze
      if (visiting === 'scratch') {
        // Sisalfasern rieseln herunter
        ctx.fillStyle = POST_COLORS.r;
        for (let i = 0; i < 3; i++) {
          const ft = ((t / 900 + i / 3) % 1);
          ctx.fillRect(snapPx(POST_X + 7 + i * 0.6), snapPx(ground - st.h * 0.6 + ft * st.h * 0.55), PX, PX * 2);
        }
      }
    } else if (stretching) {
      // Strecken: Vorbeugen -> volle Streckung mit Gähnen -> Vorbeugen
      const frame: 0 | 1 = k < 0.25 || k > 0.8 ? 0 : 1;
      const st = petSprite(sp, p, { stretch: frame });
      const sflip = face > 0; // Pose schaut von Haus aus nach links
      drawMap(ctx, st.map, st.colors, x + w / 2 - st.w / 2, ground - st.h + 1, sflip);
    } else if (ball) {
      const bx = x + w / 2 - ball.w / 2;
      const by = ground - ball.h + 1 - bob;
      drawMap(ctx, ball.map, ball.colors, bx, by, false);
      box = { x: bx, y: by, w: ball.w, h: ball.h };
      if (a.arrived === undefined && t - a.start > ROLL_CURL_MS) {
        // Staubwölkchen hinter der Kugel
        ctx.fillStyle = 'rgba(170,150,120,0.55)';
        const back = this.walkDir > 0 ? bx - 0.5 : bx + ball.w;
        for (let i = 0; i < 3; i++) ctx.fillRect(snapPx(back - this.walkDir * ((t / 80 + i * 1.3) % 3)), snapPx(ground - (i % 2) * 0.75), PX * 2, PX * 2);
      }
    } else drawMap(ctx, img.map, img.colors, x, y, flip);
    if (wormK >= 0) this.drawWormAct(img, x, y, w, flip, wormK, ground, t, p.stage === 'baby' || p.stage === 'child');
    if (sockK >= SOCK_GRAB && sockK < SOCK_LAND) this.drawHeldSock(img, x, y, w, flip, sockK, a.sockTo ?? this.sockX, ground, t);
    if (sockK >= SOCK_LAND && a.sockTo !== undefined) {
      this.sockX = a.sockTo;
      a.sockTo = undefined;
    }
    this.petBox = box;
    if (birdPose === 'scrape1') {
      // aufgewirbeltes Stroh/Erde hinter dem Huhn
      ctx.fillStyle = 'rgba(190,150,80,0.9)';
      const bx = flip ? x - 1 : x + w + 0.5; // Seitenansicht: Kopf links, hinten = rechts
      for (let i = 0; i < 4; i++) ctx.fillRect(snapPx(bx + (flip ? -1 : 1) * ((i * 0.7 + (t / 90) % 1.5))), snapPx(ground - 0.5 - (i % 3) * 0.75 - ((t / 70 + i) % 2) * 0.5), PX * 2, PX * 2);
    }

    if (visiting === 'drink' && Math.floor(t / 320) % 2 === 0) {
      ctx.fillStyle = '#7ac0f0'; // Wassertropfen
      ctx.fillRect(snapPx((x + w / 2)), snapPx((ground - 1)), 0.5, 0.5);
    }
    if (grooming) {
      // Zunge beim Putzen und am Ende ein Glitzern
      const sc = img.map[0].length / w; // Zeichen je Spiel-Einheit
      const ny = p.species === 'chicken' ? -1 : img.map.findIndex((r) => r.includes('n'));
      if (ny >= 0 && Math.floor(t / 280) % 2 === 0) {
        const nx = (img.map[ny].indexOf('n') + 1) / sc;
        const sx = flip ? w - nx : nx;
        ctx.fillStyle = '#f07a8a';
        ctx.fillRect(snapPx(x + sx - 0.25), snapPx(y + (ny + 1) / sc + 1), 0.5, 0.5);
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

/** wie weit vorne/hinten das Tier für einen Besuch steht */
function visitDepth(v?: VisitKind): number {
  if (v === 'drink' || v === 'dustbath') return 2.5;
  if (v === 'hop' || v === 'scratch' || v === 'play' || v === 'perch') return 0;
  return 1;
}

/** Mimik passend zum Zustand: krank, sonst nach Laune (Herzen) */
export function moodOf(p: Pet): Mood {
  if (p.sick) return 'sick';
  const h = hearts(p.happy);
  return h >= 3 ? 'joy' : h === 2 ? 'ok' : h === 1 ? 'sad' : 'down';
}
