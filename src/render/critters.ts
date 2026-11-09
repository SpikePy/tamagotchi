// Kleine Tiere, die ab und zu durchs Bild laufen oder fliegen, und wehende Blätter.
//  Wald (Fuchs):          Maus, Igel, Reh (klein im Hintergrund, grast), Vogel; grüne Blätter
//  Garten (Igel):         Maus, Vogel; bunte Herbstblätter
//  Zimmer (Katze, Hund):  Vogel fliegt am Fenster vorbei
// Alle Grafiken sind im feinen Pixelraster gezeichnet (1 Zeichen = 1 Bildpixel).
import { RES, drawPixels, type ColorMap } from './pixels';
import type { SceneKind } from './outdoor';
import type { Season } from './season';

const W = 64;
const FLOOR_Y = 40;
const GROUND_Y = 33;
const PX = 1 / RES;

type Kind = 'mouse' | 'hedgehog' | 'deer' | 'bird' | 'fly' | 'perch';
export type CritterLayer = 'sky' | 'window' | 'background' | 'near' | 'foreground';

const MOUSE_BODY = [
  '..........oo....',
  '.........oppo...',
  '......ooooppo...',
  '....oollllgoo...',
  '...ollgggggggoo.',
  '..oggggggggggeoo',
  'ttoggggggggggggn',
  't.ogggggggggggo.',
  '...ooooooooooo..',
];
const HOG_BODY = [
  '....c.c.c.c.......',
  '...cdcdcdcdc......',
  '..cdddddddddc.....',
  '.cddddddddddcbb...',
  'cdddddddddddcbbb..',
  'cddddddddddcbbbeb.',
  'cddddddddddcbbbbbn',
  '.cdddddddddcbbbbb.',
  '..ccccccccccbbbb..',
];
const DEER_STAND = [
  '..........o.o..',
  '..........oao..',
  '.........oaaao.',
  '.........oaeaan',
  '.........oaaao.',
  '.ooooooooaaao..',
  'owaaaaaaaaaao..',
  'oaaaaaaaaaaao..',
  '.oaaaaaaaaao...',
  '.obbbbbbbbbo...',
];

export const SPRITES: Record<Kind, { frames: string[][]; colors: ColorMap }> = {
  fly: {
    frames: [
      ['w.w', '.k.'],
      ['...', 'wkw'],
    ],
    colors: { k: '#1a1a1a', w: '#c8d8e8' },
  },
  mouse: {
    frames: [
      [...MOUSE_BODY, '....f.....f.....'],
      [...MOUSE_BODY, '.....f...f......'],
    ],
    colors: { o: '#4a4248', g: '#9a929a', l: '#c4bcc4', p: '#f2a6b2', e: '#111111', n: '#e07a8a', t: '#c89aa0', f: '#e8a6b0' },
  },
  hedgehog: {
    frames: [
      [...HOG_BODY, '...a...a...a..a...'],
      [...HOG_BODY, '....a...a...a..a..'],
    ],
    colors: { c: '#4a3020', d: '#7a5434', b: '#e8cba0', e: '#111111', n: '#222222', a: '#c98f6b' },
  },
  deer: {
    frames: [
      [...DEER_STAND, '..o.o...o.o....', '..o.o...o.o....', '..o.o...o.o....'],
      [...DEER_STAND, '..o..o..o..o...', '.o...o.o...o...', '.o...o.o....o..'],
      // grasen: Kopf unten am Boden
      [
        '...............', '...............', '...............', '...............', '...............',
        '.oooooooooo....',
        'owaaaaaaaaao...',
        'oaaaaaaaaaaao..',
        '.oaaaaaaaaaaao.',
        '.obbbbbbbbboaao',
        '..o.o...o.oaeao',
        '..o.o...o.o.oan',
        '..o.o...o.o....',
      ],
    ],
    colors: { a: '#b07840', b: '#e8d0a8', w: '#f4ecdc', o: '#5a3820', e: '#111111', n: '#222222' },
  },
  bird: {
    frames: [
      ['o.......o..', 'wo.....ow..', '.wo...ow...', '..obbbbbo..', '..obbbbeyy.', '...ooooo...'],
      ['...........', '...........', '..obbbbbo..', '.wobbbbeyy.', 'wo.ooooo...', 'o..........'],
    ],
    colors: { o: '#3a2a20', b: '#8a6040', w: '#c8a070', e: '#111111', y: '#f0a020' },
  },
  // Vogel, der auf dem Aststummel landet: Flug-Frames wie oben, dazu Sitzen und Picken/Umschauen
  perch: {
    frames: [
      ['o.......o..', 'wo.....ow..', '.wo...ow...', '..obbbbbo..', '..obbbbeyy.', '...ooooo...'],
      ['...........', '...........', '..obbbbbo..', '.wobbbbeyy.', 'wo.ooooo...', 'o..........'],
      ['...........', '....obbo...', '...obbbeyy.', '..wwbbbbo..', '.wwwbbbo...', '....o.o....'],
      ['...........', '...........', '....obbbo..', '..wwbbbbeyy', '.wwwbbbbo..', '....o.o....'],
    ],
    colors: { o: '#3a2a20', b: '#8a6040', w: '#c8a070', e: '#111111', y: '#f0a020' },
  },
};

const KINDS: Record<SceneKind, Kind[]> = {
  room: ['bird'],
  forest: ['mouse', 'hedgehog', 'deer', 'bird', 'perch'],
  garden: ['mouse', 'bird', 'bird'],
  farm: ['mouse', 'bird', 'bird'],
};

const DURATION: Record<Kind, number> = { mouse: 3000, hedgehog: 14000, deer: 20000, bird: 5000, fly: 9000, perch: 0 };
// Aststummel am Baum des Fuchses: Landeplatz (Mitte x, Oberkante y in Spiel-Einheiten)
const PERCH = { x: 38.5, y: 11.5 };
const PERCH_FLY = 1800; // An- bzw. Abflug in ms

// Blätter: zwei Frames (Drehung), Farben je Umgebung
export const LEAF_FRAMES = [
  ['.lg.', 'lggd', '.dd.'],
  ['.l.', 'lgd', 'ggd', '.d.'],
];
export const LEAF_PALETTES: Record<'forest' | 'garden' | 'farm', ColorMap[]> = {
  forest: [
    { l: '#9ad46a', g: '#5fa84a', d: '#3f7432' },
    { l: '#c4e07a', g: '#8ab84a', d: '#5a8a34' },
  ],
  garden: [
    { l: '#f6c46a', g: '#e08a3a', d: '#a8542a' },
    { l: '#f08a6a', g: '#c95a2a', d: '#8a3a1a' },
    { l: '#f6e07a', g: '#e0b13a', d: '#a8802a' },
  ],
  // Hühnerhof: Heu- und Strohhalme wehen
  farm: [
    { l: '#f4d878', g: '#e0b850', d: '#a8802a' },
    { l: '#e8c860', g: '#c89a38', d: '#8a6a20' },
  ],
};

const SNOW_PUFF: ColorMap[] = [{ l: '#ffffff', g: '#eef3f8', d: '#c8d4e4' }];

interface Active {
  env: SceneKind;
  kind: Kind;
  start: number;
  dir: 1 | -1;
  y: number;
  sit?: number; // Vogel auf dem Ast: Sitzdauer in ms
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  phase: number;
  colors: ColorMap;
}

const flipRows = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
const snap = (v: number) => Math.round(v * RES) / RES;

export class Critters {
  private active: Active | null = null;
  private nextAt = performance.now() + 4000 + Math.random() * 8000;
  private leaves: Leaf[] = [];
  private nextGust = performance.now() + 3000 + Math.random() * 6000;
  private last = performance.now();
  private seen: { id: number; x: number; kind: Kind } | null = null;
  flyY = 0;
  private species = '';

  /** Tier, das gerade vorbeikommt (Mitte in Spiel-Einheiten), damit das Haustier hinschauen kann */
  watchTarget(): { id: number; x: number; kind: Kind } | null {
    return this.seen;
  }

  /** zum Testen: ein bestimmtes Tier auf einer bestimmten Bodenlinie vorbeischicken */
  debugSpawn(kind: Kind, lane: number, dir: 1 | -1 = 1) {
    this.active = { env: this.env, kind, start: performance.now(), dir, y: lane, sit: kind === 'perch' ? 6000 : undefined };
  }

  /** Bodenlinie des Tiers, das gerade am Boden vorbeiläuft (für die Tiefensortierung), sonst null */
  groundY(): number | null {
    const f = this.frame;
    return f && f.layer === 'foreground' ? f.ground : null;
  }

  private frame: { layer: CritterLayer; rows: string[]; colors: ColorMap; x: number; y: number; ground: number; clip?: { x: number; y: number; w: number; h: number } } | null = null;
  private dt = 0;
  private env: SceneKind = 'room';

  /** einmal pro Bild: Positionen berechnen (win = Fensterausschnitt im Zimmer) */
  private season: Season = 'summer';

  update(env: SceneKind, day: boolean, t: number, win?: { x: number; y: number; w: number; h: number }, season: Season = 'summer', species = '') {
    this.season = season;
    this.species = species;
    this.dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    this.env = env;
    this.seen = null;
    this.frame = null;
    this.updateAnimal(env, day, t, win);
  }

  /**
   * Zeichnet, was auf dieser Ebene liegt:
   *  sky        – Vögel draußen (hinter Bergen/Hecke nicht nötig, sie fliegen oben)
   *  window     – Vogel im Zimmerfenster (hinter dem Fensterkreuz)
   *  background – Reh (hinter Tannen, Busch und Baum)
   *  air        – wehende Blätter (vor der Landschaft, hinter dem Haustier)
   *  foreground – Maus und Igel (vor dem Haustier)
   */
  draw(ctx: CanvasRenderingContext2D, layer: CritterLayer | 'air', t: number) {
    if (layer === 'air') return this.drawLeaves(ctx, this.env, t, this.dt);
    const f = this.frame;
    if (!f || f.layer !== layer) return;
    ctx.save();
    if (f.clip) {
      ctx.beginPath();
      ctx.rect(f.clip.x, f.clip.y, f.clip.w, f.clip.h);
      ctx.clip();
    }
    drawPixels(ctx, f.rows, f.colors, snap(f.x), snap(f.y));
    ctx.restore();
  }

  private updateAnimal(env: SceneKind, day: boolean, t: number, win?: { x: number; y: number; w: number; h: number }) {
    if (this.active && this.active.env !== env) this.active = null;
    if (!this.active) {
      if (t < this.nextAt || !day) return;
      // bei der Katze summt im Zimmer ab und zu eine Fliege herum
      const kinds = env === 'room' && this.species === 'cat' ? (['bird', 'fly', 'fly'] as Kind[]) : KINDS[env];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      this.active = {
        env,
        kind,
        start: t,
        dir: Math.random() < 0.5 ? 1 : -1,
        sit: kind === 'perch' ? 5000 + Math.random() * 15000 : undefined,
        // Vögel: Flughöhe; Maus und Igel: eigene Bodenlinie (Tiefe), damit sie mal vor, mal hinter dem Haustier laufen
        y:
          kind === 'bird' || kind === 'perch'
            ? env === 'room' && win ? win.y + 2 + Math.random() * (win.h - 6) : 4 + Math.random() * 10
            : kind === 'mouse' || kind === 'hedgehog'
              ? FLOOR_Y + 1.5 + Math.random() * 5
              : 0,
      };
    }
    const a = this.active;
    const inRoom = a.env === 'room' && !!win && a.kind !== 'fly';
    const dur = inRoom ? 2600 : a.kind === 'perch' ? PERCH_FLY * 2 + (a.sit ?? 8000) : DURATION[a.kind];
    const k = (t - a.start) / dur;
    if (k >= 1) {
      this.active = null;
      this.nextAt = t + 15000 + Math.random() * 35000; // alle 15–50 s mal was los
      return;
    }
    const sp = SPRITES[a.kind];
    const hPx = sp.frames[0].length;
    const w = sp.frames[0][0].length * PX;
    const [x0, span] = inRoom ? [win!.x, win!.w] : [0, W];
    const across = (p: number) => x0 + (a.dir > 0 ? -w + p * (span + w * 2) : span + w - p * (span + w * 2));
    let frame = 0;
    let flipNow = false;
    let x = 0;
    let y = 0;
    switch (a.kind) {
      case 'fly': {
        // fliegt im Zick-Zack durchs Zimmer, kommt von der Seite und verschwindet wieder
        const ph = a.start / 1000;
        const s = t / 1000;
        const cx = 12 + (Math.sin(s * 0.9 + ph) * 0.5 + 0.5) * 40 + Math.sin(s * 7 + ph) * 1.5;
        const cy = 14 + (Math.sin(s * 1.3 + ph * 2) * 0.5 + 0.5) * 18 + Math.sin(s * 11) * 0.8;
        const edge = a.dir > 0 ? -4 : W + 4;
        const inOut = k < 0.1 ? k / 0.1 : k > 0.9 ? (1 - k) / 0.1 : 1;
        x = edge + (cx - edge) * inOut;
        y = cy;
        frame = Math.floor(t / 40) % 2;
        break;
      }
      case 'mouse':
        x = across(k);
        y = a.y - hPx * PX;
        frame = Math.floor(t / 70) % 2;
        break;
      case 'hedgehog':
        x = across(k);
        y = a.y - hPx * PX;
        frame = Math.floor(t / 220) % 2;
        break;
      case 'perch': {
        // anfliegen, eine Weile auf dem Ast sitzen (umschauen, picken), weiterfliegen
        const el = t - a.start;
        const sit = a.sit ?? 8000;
        const sx = PERCH.x - w / 2;
        const sy = PERCH.y - hPx * PX;
        const from = a.dir > 0 ? -w - 2 : W + 2;
        if (el < PERCH_FLY) {
          const q = el / PERCH_FLY;
          const e = 1 - (1 - q) * (1 - q); // abbremsen zur Landung
          x = from + (sx - from) * e;
          y = a.y + (sy - a.y) * e - Math.sin(q * Math.PI) * 3;
          frame = q > 0.85 ? 2 : Math.floor(t / 110) % 2;
        } else if (el < PERCH_FLY + sit) {
          x = sx;
          y = sy;
          const s = Math.floor((el - PERCH_FLY) / 700);
          frame = (s * 7) % 5 === 0 ? 3 : 2; // ab und zu picken
          if (Math.floor((el - PERCH_FLY) / 2300) % 2 === 1) flipNow = true; // umschauen
        } else {
          const q = (el - PERCH_FLY - sit) / PERCH_FLY;
          x = sx + (a.dir > 0 ? 1 : -1) * q * q * (W * 0.8);
          y = sy - q * 14;
          frame = Math.floor(t / 100) % 2;
        }
        break;
      }
      case 'bird':
        x = across(k);
        y = a.y + Math.sin(k * 12) * 1.2;
        frame = Math.floor(t / 140) % 2;
        break;
      case 'deer': {
        // läuft rein, grast eine Weile, läuft weiter (klein im Hintergrund)
        const p = k < 0.35 ? (k / 0.35) * 0.45 : k < 0.65 ? 0.45 : 0.45 + ((k - 0.65) / 0.35) * 0.55;
        x = across(p);
        y = GROUND_Y + 0.5 - 13 * PX;
        frame = k >= 0.35 && k < 0.65 ? 2 : Math.floor(t / 260) % 2;
        break;
      }
    }
    const rows = (a.dir < 0) !== flipNow ? flipRows(sp.frames[frame]) : sp.frames[frame];
    const layer: CritterLayer = inRoom ? 'window' : a.kind === 'bird' ? 'sky' : a.kind === 'perch' ? 'near' : a.kind === 'deer' ? 'background' : 'foreground';
    this.flyY = y;
    this.frame = { layer, rows, colors: sp.colors, x, y, ground: y + hPx * PX, clip: inRoom ? win : undefined };
    const cx = x + w / 2;
    const visible = inRoom ? cx > win!.x && cx < win!.x + win!.w : cx > 0 && cx < W;
    if (visible) this.seen = { id: a.start, x: cx, kind: a.kind };
  }

  /** Windböen: ab und zu wehen ein paar Blätter durchs Bild (nur draußen) */
  private drawLeaves(ctx: CanvasRenderingContext2D, env: SceneKind, t: number, dt: number) {
    if (env === 'room') {
      this.leaves = [];
      return;
    }
    if (t >= this.nextGust) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const n = 2 + Math.floor(Math.random() * 4);
      // Blätterfarben je Jahreszeit: Herbst bunt, Winter Schneeflocken-Böen
      const pal = this.season === 'winter' ? SNOW_PUFF : this.season === 'autumn' && env === 'forest' ? LEAF_PALETTES.garden : LEAF_PALETTES[env];
      for (let i = 0; i < n; i++)
        this.leaves.push({
          x: dir > 0 ? -2 - Math.random() * 12 : W + 2 + Math.random() * 12,
          y: 8 + Math.random() * 30,
          vx: dir * (9 + Math.random() * 7),
          phase: Math.random() * Math.PI * 2,
          colors: pal[Math.floor(Math.random() * pal.length)],
        });
      this.nextGust = t + 8000 + Math.random() * 16000;
    }
    this.leaves = this.leaves.filter((l) => l.x > -16 && l.x < W + 16);
    for (const l of this.leaves) {
      l.x += l.vx * dt;
      l.phase += dt * 4;
      l.y += Math.sin(l.phase) * dt * 4 + dt * 1.2; // trudelt und sinkt langsam
      const frame = LEAF_FRAMES[Math.floor(l.phase / 1.5) % 2];
      const rows = Math.floor(l.phase / 3) % 2 ? flipRows(frame) : frame;
      drawPixels(ctx, rows, l.colors, snap(l.x), snap(l.y));
    }
  }
}
