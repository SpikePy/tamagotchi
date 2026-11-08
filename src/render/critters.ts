// Kleine Tiere, die draußen ab und zu durchs Bild laufen oder fliegen.
//  Wald (Fuchs):   Maus, Igel, Reh (klein im Hintergrund, grast), Vogel
//  Garten (Igel):  Maus, Vogel
//  Zimmer (Katze, Hund): Vogel fliegt am Fenster vorbei
import { drawMap, type ColorMap } from './pixels';
import type { SceneKind } from './outdoor';

const W = 64;
const FLOOR_Y = 40;
const GROUND_Y = 33;

type Kind = 'mouse' | 'hedgehog' | 'deer' | 'bird';

const SPRITES: Record<Kind, { frames: string[][]; colors: ColorMap }> = {
  mouse: {
    frames: [
      ['...pp...', 'ttaaaaan', '..o..o..'],
      ['...pp...', 'ttaaaaan', '.o...o..'],
    ],
    colors: { o: '#3a3a3a', a: '#9a9a9a', p: '#f0a0a0', n: '#222222', t: '#b08a8a' },
  },
  hedgehog: {
    frames: [
      ['..c.c..', '.ccccc.', 'cccccbn', '.a..a..'],
      ['..c.c..', '.ccccc.', 'cccccbn', '..a..a.'],
    ],
    colors: { c: '#6b4a2f', b: '#e8c8a0', n: '#222222', a: '#c98f6b' },
  },
  deer: {
    frames: [
      ['.......o..', '......oaa.', '......aaan', '.aaaaaaa..', 'baaaaaaa..', '.aaaaaa...', '.a.a..a.a.', '.a.a..a.a.'],
      ['.......o..', '......oaa.', '......aaan', '.aaaaaaa..', 'baaaaaaa..', '.aaaaaa...', '..a.a..a.a', '..a.a..a.a'],
      // grasen: Kopf unten
      ['..........', '..........', '..........', '.aaaaaaa..', 'baaaaaaaa.', '.aaaaaaaaa', '.a.a..a.an', '.a.a..a.a.'],
    ],
    colors: { a: '#a8703a', b: '#f0dcc0', o: '#4a2e18', n: '#222222' },
  },
  bird: {
    frames: [
      ['k...k', '.kkky', '..k..'],
      ['.....', 'kkkky', '.k.k.'],
    ],
    colors: { k: '#3a3a4a', y: '#e0a020' },
  },
};

const KINDS: Record<SceneKind, Kind[]> = {
  room: ['bird'],
  forest: ['mouse', 'hedgehog', 'deer', 'bird', 'bird'],
  garden: ['mouse', 'bird', 'bird'],
};

const DURATION: Record<Kind, number> = { mouse: 3000, hedgehog: 14000, deer: 20000, bird: 5000 };

interface Active {
  env: SceneKind;
  kind: Kind;
  start: number;
  dir: 1 | -1;
  y: number;
}

export class Critters {
  private active: Active | null = null;
  private nextAt = performance.now() + 4000 + Math.random() * 8000;

  /** win = Fensterausschnitt im Zimmer (Vogel nur dort sichtbar) */
  draw(ctx: CanvasRenderingContext2D, env: SceneKind, day: boolean, t: number, win?: { x: number; y: number; w: number; h: number }) {
    if (this.active && this.active.env !== env) this.active = null;
    if (!this.active) {
      if (t < this.nextAt || !day) return;
      const kinds = KINDS[env];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      this.active = {
        env,
        kind,
        start: t,
        dir: Math.random() < 0.5 ? 1 : -1,
        y: kind === 'bird' ? (env === 'room' && win ? win.y + 2 + Math.random() * (win.h - 6) : 5 + Math.random() * 10) : 0,
      };
    }
    const a = this.active;
    const inRoom = a.env === 'room' && !!win;
    const dur = inRoom ? 2600 : DURATION[a.kind];
    const k = (t - a.start) / dur;
    if (k >= 1) {
      this.active = null;
      this.nextAt = t + 15000 + Math.random() * 35000; // alle 15–50 s mal was los
      return;
    }
    const sp = SPRITES[a.kind];
    const w = sp.frames[0][0].length;
    const flip = a.dir < 0;
    // im Zimmer nur quer durchs Fenster
    const [x0, span] = inRoom ? [win!.x, win!.w] : [0, W];
    const across = (p: number) => x0 + (a.dir > 0 ? -w + p * (span + w * 2) : span + w - p * (span + w * 2));
    let frame = Math.floor(t / 150) % 2;
    let x: number;
    let y: number;
    let scale = 1;
    switch (a.kind) {
      case 'mouse':
        x = across(k);
        y = FLOOR_Y + 3;
        frame = Math.floor(t / 80) % 2;
        break;
      case 'hedgehog':
        x = across(k);
        y = FLOOR_Y + 2;
        frame = Math.floor(t / 250) % 2;
        break;
      case 'bird':
        x = across(k);
        y = a.y + Math.sin(k * 12) * 1.2;
        frame = Math.floor(t / 180) % 2;
        break;
      case 'deer': {
        // läuft rein, grast eine Weile, läuft weiter (klein im Hintergrund)
        scale = 0.6;
        const p = k < 0.35 ? (k / 0.35) * 0.45 : k < 0.65 ? 0.45 : 0.45 + ((k - 0.65) / 0.35) * 0.55;
        x = across(p) / scale;
        y = (GROUND_Y - 4.5) / scale;
        frame = k >= 0.35 && k < 0.65 ? 2 : Math.floor(t / 300) % 2;
        break;
      }
    }
    ctx.save();
    if (inRoom) {
      ctx.beginPath();
      ctx.rect(win!.x, win!.y, win!.w, win!.h);
      ctx.clip();
    }
    if (scale !== 1) ctx.scale(scale, scale);
    drawMap(ctx, sp.frames[frame], sp.colors, x, y, flip);
    ctx.restore();
  }
}
