// Kleine Pixel-Grafiken für die Minispiele (1 Zeichen = 0,5 Spiel-Einheiten, per drawPixels verfeinert).
import type { ColorMap } from '../render/pixels';

export interface Item {
  map: string[];
  colors: ColorMap;
}

const O = '#3a2418';

export const ITEMS: Record<string, Item> = {
  fish: {
    map: ['...oooo...o.', '..oBBBBo.oo.', '.oBkBBBBoBo.', '.obbbbbbbbo.', '..owwwwo.oo.', '...oooo...o.'],
    colors: { o: '#24425e', B: '#a9d2f0', b: '#6fa5d0', w: '#e8f2fa', k: '#10202c' },
  },
  sock: {
    map: ['.ooooo..', '.owwwo..', '.orrro..', '.owwwo..', '.orrroo.', '.orrrrro', '.owwwwwo', '..ooooo.'],
    colors: { o: O, w: '#f2efe6', r: '#c94c4c' },
  },
  treat: {
    map: ['.oo....oo.', 'oWwoooowwo', '.owwwwwwo.', 'owwoooowwo', '.oo....oo.'],
    colors: { o: '#6a4422', w: '#e2b878', W: '#f4d8a4' },
  },
  lemon: {
    map: ['...oo...', '..oyyoo.', '.oYyyyyo', 'oyYyyyyo', 'oyyyyyyo', '.oyyyyo.', '..oooo..'],
    colors: { o: '#7a6410', y: '#f2d930', Y: '#fff58a' },
  },
  berry: {
    map: ['..gg..', '.oogo.', 'orRrro', 'oRrrro', 'orrrro', '.oooo.'],
    colors: { o: '#5a1420', r: '#d8263b', R: '#ff7a86', g: '#4d9a3a' },
  },
  rottenBerry: {
    map: ['..gg..', '.oogo.', 'orxrro', 'orrrxo', 'oxrrro', '.oooo.'],
    colors: { o: '#2a1a14', r: '#6b4a2e', x: '#3e5a28', g: '#6a6a3a' },
  },
  apple: {
    map: ['....g...', '...og...', '.oooooo.', 'orRrrrro', 'oRrrrrro', 'orrrrrro', '.orrrro.', '..oooo..'],
    colors: { o: '#5a1420', r: '#d8263b', R: '#ff8a8a', g: '#4d7a2a' },
  },
  rottenApple: {
    map: ['....g...', '...og...', '.oooooo.', 'orrxrrro', 'oxrrrxro', 'orrrrrro', '.orxrro.', '..oooo..'],
    colors: { o: '#2a1a14', r: '#8a5a2e', x: '#4a3018', g: '#6a5a3a' },
  },
  grain: {
    map: ['.oo.', 'oYyo', 'oyyo', 'oyyo', '.oo.'],
    colors: { o: '#6a4a10', y: '#e8b83a', Y: '#fff0a0' },
  },
  pebble: {
    map: ['..ooo.', '.oGggo', 'oggggo', 'ogggdo', '.oooo.'],
    colors: { o: '#3a3a3a', g: '#9a958c', G: '#d4cfc4', d: '#7a756c' },
  },
  drop: {
    map: ['..o..', '..o..', '.obo.', 'obWbo', 'obbbo', '.ooo.'],
    colors: { o: '#2a5a9a', b: '#6ab0f0', W: '#e0f4ff' },
  },
  cucumber: {
    map: ['.oo.', 'oGgo', 'oggo', 'ogdo', 'oggo', 'oGgo', 'ogdo', 'oggo', '.oo.'],
    colors: { o: '#1e3a14', g: '#4f9a3a', G: '#8ad06a', d: '#2e6a22' },
  },
  bubble: {
    map: ['..ooo..', '.o...o.', 'o.w...o', 'o.....o', 'o.....o', '.o...o.', '..ooo..'],
    colors: { o: '#8ecdf0', w: '#ffffff' },
  },
  snowball: {
    map: ['..ooo.', '.owwwo', 'owWwwo', 'owwwso', '.owsso', '..ooo.'],
    colors: { o: '#7a90b0', w: '#ffffff', W: '#ffffff', s: '#cfdcf0' },
  },
  pinecone: {
    map: ['..oo..', '.obbo.', 'obBbbo', 'obbBbo', 'obBbbo', '.obbo.', '..oo..'],
    colors: { o: '#3a2010', b: '#8a5a2e', B: '#c08a50' },
  },
  acorn: {
    map: ['...o..', '.oooo.', 'occcco', 'obBbbo', 'obbbbo', '.obbo.', '..oo..'],
    colors: { o: '#3a2010', c: '#7a5a30', b: '#c8903e', B: '#f0c070' },
  },
  hail: {
    map: ['.oo.', 'owWo', 'owwo', '.oo.'],
    colors: { o: '#8aa0c0', w: '#e8f2ff', W: '#ffffff' },
  },
  // Beute zum Anschleichen (schaut nach links, also zum Tier)
  bird: {
    map: ['...ooo....', '..obbko...', '.oobbbopp.', 'oobbbbbo..', '.obwwwbo..', '..ooooo...', '...p.p....'],
    colors: { o: '#2a2a3a', b: '#6a7ab0', w: '#e8e0d0', k: '#000000', p: '#e0a040' },
  },
  mouse: {
    map: ['.oo.......', 'oppo......', '.ogggo....', 'okgggggo..', 'ogggggggoo', '.ooooooo.o'],
    colors: { o: '#3a3030', g: '#a09890', p: '#f0a0a8', k: '#000000' },
  },
  butterfly: {
    map: ['oo....oo', 'oyyo.oyyo', 'oyYyoyYyo', '.oyyoyyo.', '..oyoyo..', '.oyyoyyo.', '.oooo.oo.'],
    colors: { o: '#3a2a10', y: '#f0a030', Y: '#fff0a0' },
  },
  beetle: {
    map: ['o.o.....', '.okko...', 'okkggoo.', 'okgGggo.', 'okggggo.', '.oooooo.', '.o.o.o..'],
    colors: { o: '#101a10', k: '#202020', g: '#2a8a5a', G: '#7ad0a0' },
  },
  worm: {
    map: ['.oo.......', 'okpo...oo.', 'oppo..oppo', '.oppoopppo', '..opppppo.', '...ooooo..'],
    colors: { o: '#7a3040', p: '#e88a9a', k: '#000000' },
  },
  heart: {
    map: ['.oo.oo.', 'orrorro', 'oRrrrro', 'orrrrro', '.orrro.', '..oro..', '...o...'],
    colors: { o: '#5a0a18', r: '#e8283c', R: '#ff9aa8' },
  },
};

/** Breite/Höhe eines Items in Spiel-Einheiten */
export const itemSize = (it: Item): [number, number] => [Math.max(...it.map.map((r) => r.length)) / 2, it.map.length / 2];

// alle Zeilen auf gleiche Breite bringen
for (const it of Object.values(ITEMS)) {
  const w = Math.max(...it.map.map((r) => r.length));
  it.map = it.map.map((r) => r.padEnd(w, '.'));
}
