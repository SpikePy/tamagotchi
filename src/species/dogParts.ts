// Baukasten für Hunde-Sprites: Kopf, Ohren, Körper und Schwanz werden je Rasse kombiniert.
import type { Stage } from '../engine/state';
import type { Sprite } from './types';

export type Ears = 'floppy' | 'floppyLong' | 'pointy' | 'big' | 'half' | 'small' | 'fluffy';
export type Tail = 'straight' | 'curly' | 'tipped' | 'none';

export interface DogShape {
  ears: Ears;
  tail: Tail;
  face?: 'normal' | 'flat'; // flat = kurze, dunkle Schnauze (Mops)
  short?: boolean; // kurze Beine (Dackel, Corgi)
  tuft?: boolean; // Haarschopf (Pudel)
}

const HEAD = [
  '..ooooooooo..',
  '.oaaaaaaaaao.',
  'oaaaaaaaaaaao',
  'oaaEaaaaaEaao',
  'oaaeaaaaaeaao',
  'oaaabnnnbaaao',
  '.oaabbobbaao.',
  '..ooobbbooo..',
];
const HEAD_FLAT = [
  '..ooooooooo..',
  '.oaaaaaaaaao.',
  'oaaaaaaaaaaao',
  'oaaEaaaaaEaao',
  'oaaeacccceaao',
  'oaaccnnnccaao',
  '.oacccocccao.',
  '..ooocccooo..',
];
const TUFT = ['..oaoaoaoao..'];

// Ohren für die linke Seite; rechts wird gespiegelt. [map, dx, dy] relativ zur Kopf-Ecke
const EARS: Record<Ears, [string[], number, number]> = {
  floppy: [['.oo.', 'occo', 'occo', 'occo', 'occo', '.oo.'], -2, 1],
  floppyLong: [['.oo.', 'occo', 'occo', 'occo', 'occo', 'occo', 'occo', '.oo.'], -2, 1],
  fluffy: [['.oo.', 'oaao', 'oaao', 'oaao', 'oaao', 'oaao', '.oo.'], -2, 1],
  pointy: [['o...', 'oo..', 'oco.', 'occo'], 1, -3],
  big: [['oo...', 'oco..', 'occo.', 'occo.', 'occco'], 0, -4],
  half: [['ooo.', 'occo', '.oco'], 1, -2],
  small: [['ooo', 'occ', '.oo'], 0, 0],
};

// Körper je Stufe (gleiche Breite wie der Kopf)
const BODY: Record<Exclude<Stage, 'egg'>, string[]> = {
  baby: ['..oabbbbbao..', '..oaaoooaao..', '...oo...oo...'],
  child: ['..oaabbbaao..', '.oaaabbbaaao.', '.oaaabbbaaao.', '.obaoooooabo.', '..oo.....oo..'],
  teen: [
    '..oaabbbaao..',
    '.oaaabbbaaao.',
    '.oaaabbbaaao.',
    '.oaaabbbaaao.',
    '.oaaabbbaaao.',
    '.obaoooooabo.',
    '..oo.....oo..',
  ],
  adult: [
    '..oaabbbaao..',
    '.oaaabbbaaao.',
    'oaaaabbbaaaao',
    'oaaaabbbaaaao',
    'oaaaabbbaaaao',
    'oaaaabbbaaaao',
    'oaaaobbboaaao',
    'obbo.ooo.obbo',
    '.oo.......oo.',
  ],
};

const TAILS: Record<Exclude<Tail, 'none'>, string[]> = {
  straight: ['...oo', '..oao', '.oao.', 'oao..', 'oo...'],
  curly: ['.ooo.', 'oaaao', 'oo.ao', '...ao', '..oo.'],
  tipped: ['..ob.', '.oao.', '.oao.', 'oao..', 'oo...'],
};

const HEAD_X = 2; // Platz links für Schlappohren
const WIDTH = 20;

function stamp(g: string[][], map: string[], x: number, y: number, mirror = false) {
  map.forEach((row, ry) => {
    const r = mirror ? [...row].reverse().join('') : row;
    [...r].forEach((ch, rx) => {
      if (ch === '.') return;
      const yy = y + ry;
      const xx = x + rx;
      if (yy >= 0 && yy < g.length && xx >= 0 && xx < WIDTH) g[yy][xx] = ch;
    });
  });
}

export function buildDog(stage: Exclude<Stage, 'egg'>, shape: DogShape): Sprite {
  const [earMap, edx, edy] = EARS[shape.ears];
  const top = Math.max(0, -edy, shape.tuft ? 1 : 0);
  let body = BODY[stage];
  if (shape.short && body.length > 5) body = [...body.slice(0, 2), ...body.slice(4)];
  const headY = top;
  const bodyY = headY + HEAD.length;
  const h = bodyY + body.length;
  const g = Array.from({ length: h }, () => Array(WIDTH).fill('.'));

  // Schwanz zuerst (liegt hinter dem Körper)
  if (shape.tail !== 'none' && stage !== 'baby') {
    const t = TAILS[shape.tail];
    stamp(g, t, HEAD_X + 12, h - t.length - 2);
  }
  stamp(g, body, HEAD_X, bodyY);
  stamp(g, shape.face === 'flat' ? HEAD_FLAT : HEAD, HEAD_X, headY);
  if (shape.tuft) stamp(g, TUFT, HEAD_X, headY - 1);
  // Ohren: Schlappohren hängen seitlich über den Kopf, Stehohren sitzen oben drauf
  const rightX = HEAD_X + HEAD[0].length - edx - earMap[0].length;
  stamp(g, earMap, HEAD_X + edx, headY + edy);
  stamp(g, earMap, rightX, headY + edy, true);
  return g.map((r) => r.join(''));
}

export function buildDogSprites(shape: DogShape): Record<Exclude<Stage, 'egg'>, Sprite> {
  return {
    baby: buildDog('baby', shape),
    child: buildDog('child', shape),
    teen: buildDog('teen', shape),
    adult: buildDog('adult', shape),
  };
}
