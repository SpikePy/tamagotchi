// Schlaf-Grafiken: eingerollt liegende Tiere, aus einfachen Formen erzeugt.
// Nutzen dieselben Paletten-Zeichen wie die normalen Sprites (a, b, c, n, o, d),
// damit Fellfarbe und Muster erhalten bleiben.

export interface SleepShape {
  kind: 'curl' | 'ball'; // curl = eingerollt mit Schwanz, ball = Stachelkugel
  ears?: 'pointy' | 'floppy' | 'small' | 'none';
  tail?: 'fluffy' | 'thin' | 'none';
  tailTip?: boolean; // helle Schwanzspitze (Fuchs, Beagle)
}

type Grid = string[][];

const inEll = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
  ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

function outline(g: Grid) {
  const h = g.length;
  const w = g[0].length;
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && g[y][x] !== '.';
  const out = g.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (filled(x, y) && (!filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1))) out[y][x] = 'o';
  return out;
}

// Handgezeichnete Vorlagen für die eingerollte Pose (Kopf links auf den Pfoten,
// Schwanz vorne herum). Platzhalter: P Stehohr, F Schlappohr, Z geschlossenes Auge,
// T Schwanz, X Schwanzspitze.
const CURL_BIG = [
  '.P..................',
  '.PP....oooooooo.....',
  'oPPPo.oaaaaaaaaoo...',
  'oaaaaooaaaaaaaaaaoo.',
  'oaFFaaoaaaaaaaaaaaao',
  'oZZFaaaoaaaaaaaaaaao',
  'naaFaaaaoaaaaaaaaaao',
  'obbbaaaaoaaaaaaaaaao',
  '.obbbbaaoaaaaaaaaaao',
  '..oXXTTTTTTTTTTTaao.',
  '..oXXTTTTTTTTTTTTo..',
  '...ooooooooooooooo..',
];
const CURL_SMALL = [
  '.P............',
  'oPPo..oooo....',
  'oaaaoooaaaoo..',
  'oZFaaoaaaaaao.',
  'naFaaaoaaaaao.',
  'obbbaaoaaaaao.',
  '.oXXTTTTTTTao.',
  '..oooooooooo..',
];

function buildCurl(s: SleepShape, big: boolean): string[] {
  const tpl = big ? CURL_BIG : CURL_SMALL;
  const hasTail = !!s.tail && s.tail !== 'none';
  const pRows = tpl.map((r, y) => (r.includes('P') ? y : -1)).filter((y) => y >= 0);
  const lastP = pRows[pRows.length - 1];
  const g = tpl.map((row, y) =>
    [...row].map((ch) => {
      switch (ch) {
        case 'P':
          if (s.ears === 'pointy') return y === lastP ? 'c' : 'a';
          if (s.ears === 'small' && y === lastP) return 'c';
          return y === lastP ? 'a' : '.';
        case 'F':
          return s.ears === 'floppy' ? 'c' : 'a';
        case 'Z':
          return 'o';
        case 'X':
          return hasTail && s.tailTip ? 'b' : 'a';
        case 'T':
          return 'a';
        default:
          return ch;
      }
    }),
  );
  // Stehohren bekommen einen Umriss
  if (s.ears === 'pointy')
    for (const y of pRows.slice(0, -1)) {
      const row = g[y];
      const first = row.findIndex((c) => c === 'a');
      if (first > 0 && row[first - 1] === '.') row[first - 1] = 'o';
      const last = row.lastIndexOf('a');
      if (last >= 0 && row[last + 1] === '.') row[last + 1] = 'o';
    }
  // Schwanz vom Körper absetzen (Linie über dem Schwanz)
  if (hasTail) {
    const ty = tpl.findIndex((r) => r.includes('T'));
    for (let x = 0; x < tpl[ty].length; x++)
      if ((tpl[ty][x] === 'T' || tpl[ty][x] === 'X') && g[ty - 1][x] === 'a') g[ty - 1][x] = 'o';
  }
  return g.map((r) => r.join(''));
}

function buildBall(big: boolean): string[] {
  const W = big ? 20 : 14;
  const H = big ? 12 : 9;
  const g: Grid = Array.from({ length: H }, () => Array(W).fill('.'));
  const cx = W / 2;
  const rx = W / 2 - 0.5;
  const ry = H / 2 - 0.5;
  const cy = H / 2 + 0.5;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inEll(x, y, cx, cy, rx, ry)) continue;
      g[y][x] = 'c';
    }
  // Stacheln oben
  for (let x = 2; x < W - 2; x += 2) {
    const y0 = g.findIndex((r) => r[x] !== '.');
    if (y0 > 0) g[y0 - 1][x] = 'c';
  }
  // Gesicht unten links eingekuschelt
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (g[y][x] !== '.' && inEll(x, y, W * 0.28, H * 0.72, W * 0.2, H * 0.24)) g[y][x] = 'b';
  const out = outline(g);
  // Stachel-Textur
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) if (out[y][x] === 'c' && (x + 2 * y) % 4 === 0) out[y][x] = 'o';
  const ey = Math.round(H * 0.66);
  const ex = Math.round(W * 0.3);
  out[ey][ex] = 'o';
  out[ey][ex + 1] = 'o';
  const ny = Math.round(H * 0.78);
  const nx = out[ny].findIndex((c) => c !== '.');
  if (nx >= 0) out[ny][nx + 1] = 'n';
  // Füßchen
  out[H - 1][Math.round(W * 0.6)] = 'a';
  out[H - 1][Math.round(W * 0.75)] = 'a';
  return out.map((r) => r.join(''));
}

const cache = new Map<string, string[]>();

/** Schlaf-Sprite: klein für Baby/Kind, groß für Teenager/Erwachsen */
export function sleepSprite(shape: SleepShape, big: boolean): string[] {
  const key = JSON.stringify([shape, big]);
  let s = cache.get(key);
  if (!s) {
    s = shape.kind === 'ball' ? buildBall(big) : buildCurl(shape, big);
    cache.set(key, s);
  }
  return s;
}

// ---------- Streck-Pose (Seitenansicht, Kopf links) ----------
// 0 = Vorbeugen (Po hoch, Vorderbeine nach vorn), 1 = volle Streckung mit Gähnen
const STRETCH_TPL = [
  [
    '.....................oXo',
    '.....................oTo',
    '..............oooooooTo.',
    '............ooaaaaaaaao.',
    '...PP......oaaaaaaaaaao.',
    '..oPPo...ooaaaaaaaaaaao.',
    '.oaaFFoooaaaaaaaaaaaao..',
    'oaaZFFaaaaaaaaaaaaaaao..',
    'nbaaFaaaaaaaabbbbaaaao..',
    'obbbaaaaaaaobbbbo.oaao..',
    '.obbboaaaaoooooo..oaao..',
    '..obbaaaaaaao.....oaao..',
    '...ooooooooo......oaao..',
    '..................oooo..',
  ],
  [
    '......................oX',
    '.....................oTo',
    '...............ooooooTo.',
    '.............ooaaaaaaao.',
    '..PP........oaaaaaaaaao.',
    '.oPPo......oaaaaaaaaaao.',
    'oaaFFo...ooaaaaaaaaaao..',
    'oaZFFaoooaaaaaaaaaaaao..',
    'nMaFaaaaaaaaaabbbaaaao..',
    'oMbbaaaaaaaaobbbo.oaao..',
    '.obbbbaaaaaoooooo.oaao..',
    'obbaaaaaaaao......oaao..',
    '.oooooooooo.......oaao..',
    '..................oooo..',
  ],
];

/** Streck-Pose, Ohren und Schwanz passend zum Tier (Kopf zeigt nach links) */
export function stretchSprite(s: SleepShape, frame: 0 | 1): string[] {
  const key = JSON.stringify(['stretch', s, frame]);
  const hit = cache.get(key);
  if (hit) return hit;
  const tpl = STRETCH_TPL[frame];
  const hasTail = !!s.tail && s.tail !== 'none';
  const pRows = tpl.map((r, y) => (r.includes('P') ? y : -1)).filter((y) => y >= 0);
  const lastP = pRows[pRows.length - 1];
  const g = tpl.map((row, y) =>
    [...row].map((ch, x) => {
      // ohne Schwanz: alles oberhalb des Rückens rechts weg
      if (!hasTail && y < 3 && x > 18) return '.';
      switch (ch) {
        case 'P':
          if (s.ears === 'pointy') return y === lastP ? 'c' : 'a';
          if (s.ears === 'small' && y === lastP) return 'c';
          if (s.ears === 'floppy') return y === lastP ? 'a' : '.';
          return y === lastP ? 'a' : '.';
        case 'F':
          return s.ears === 'floppy' ? 'c' : 'a';
        case 'Z':
          return 'o';
        case 'M':
          return 'p';
        case 'X':
          return hasTail ? (s.tailTip ? 'b' : 'a') : '.';
        case 'T':
          return hasTail ? (s.tail === 'thin' && (x + y) % 2 ? 'a' : 'a') : '.';
        default:
          return ch;
      }
    }),
  );
  // Stehohren bekommen seitlich einen Umriss
  if (s.ears === 'pointy')
    for (const y of pRows.slice(0, -1)) {
      const row = g[y];
      const first = row.findIndex((c) => c === 'a');
      if (first > 0 && row[first - 1] === '.') row[first - 1] = 'o';
      const last = row.lastIndexOf('a');
      if (last >= 0 && row[last + 1] === '.') row[last + 1] = 'o';
    }
  const out = g.map((r) => r.join(''));
  cache.set(key, out);
  return out;
}
