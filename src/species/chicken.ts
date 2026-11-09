import type { Breed, SpeciesDef, Sprite } from './types';
import type { ChickenRig } from '../render/rig';

// Hühner in Seitenansicht (Kopf links). Küken (Baby/Kind) für alle Rassen gleich gebaut,
// sie bekommen aber schon die Farben ihrer Rasse. Jedes Huhn ist zufällig Henne oder Hahn;
// Hähne haben ab dem Teenager-Alter großen Kamm, Kehllappen und Sichelschwanz.
const S = {
  chickBaby: [
    '....oooo....',
    '...obbbbo...',
    '..obEbbbbo..',
    '.ppbebbbbbo.',
    '..obbbbaabo.',
    '..obbbaaabo.',
    '..obbbbbbbo.',
    '...obbbbbo..',
    '....ooooo...',
    '.....w.w....',
    '....ww.ww...',
  ],
  chickChild: [
    '....oooo......',
    '...obbbbo.....',
    '..obEbbbbo....',
    '.ppbebbbbo....',
    '..obbbbbbboo..',
    '..obbbaaaabbo.',
    '..obbaaaaabbo.',
    '..obbbaaabbbo.',
    '...obbbbbbbo..',
    '....ooooooo...',
    '......w..w....',
    '.....ww.ww....',
  ],
  henTeen: [
    '...c..............',
    '..occo............',
    '.oaaaao...........',
    'oaaEaao.......oo..',
    'ppaeaaao.....oado.',
    '.ocaaaaoooooooado.',
    '..oaaaaaaaaaaaao..',
    '..oaaabbbaaaaaao..',
    '...oabbbbbaaaao...',
    '....oobbbbaaoo....',
    '......oooooo......',
    '.......w..w.......',
    '......ww.ww.......',
  ],
  henAdult: [
    '...cc.............',
    '..occo............',
    '.oaaaao.......oo..',
    'oaaEaao......oado.',
    'ppaeaaao....oaddo.',
    'ppoaaaaooooooaado.',
    '.ocaaaaaaaaaaaaao.',
    '.ocaaaaaaaaaaaaao.',
    '..oaaaabbbaaaaaao.',
    '..oaabbbbbbaaaao..',
    '...oabbbbbbaaao...',
    '....oobbbbaaoo....',
    '......oooooo......',
    '.......w..w.......',
    '.......w..w.......',
    '......ww.ww.......',
  ],
  roosterAdult: [
    '..c.c.........oo....',
    '.occcco......oddo...',
    '.oaaaao.....odddo...',
    'oaaEaao....oddodo...',
    'ppaeaaao..oddo.oddo.',
    'ppoaaaao.oddo...odo.',
    '.occaaaaooddo...odo.',
    '.occaaaaaaaddo..oo..',
    '..ocaaaaaaaaddo.....',
    '..oaaabbbbaaaado....',
    '...oaabbbbbaaao.....',
    '....oabbbbbaao......',
    '.....ooooooo........',
    '.......w..w.........',
    '.......w..w.........',
    '......ww.ww.........',
  ],
  silkieAdult: [
    '..oooo............',
    '.oaaaaoo..........',
    'oaaaaaaao.........',
    'oaEaaaaao.....ooo.',
    'ppeaaaaao....oaaao',
    '.ocaaaaaoooooaaaao',
    '.oaaaaaaaaaaaaaao.',
    '.oaaaaaaaaaaaaaao.',
    '..oaaaabbbaaaaao..',
    '...oabbbbbbaaao...',
    '....oobbbbaaoo....',
    '......oooooo......',
    '.......w..w.......',
    '......ww.ww.......',
  ],
};

// Junghahn: Teenager-Körper mit größerem Kamm und dunklen Schwanzfedern
const ROOSTER_TEEN: Sprite = [
  '..c.c.............',
  '.occco........oo..',
  '.oaaaao......oddo.',
  'oaaEaao.....odddo.',
  'ppaeaaao...oddodo.',
  '.occaaaoooooaado..',
  '..oaaaaaaaaaaaao..',
  '..oaaabbbaaaaaao..',
  '...oabbbbbaaaao...',
  '....oobbbbaaoo....',
  '......oooooo......',
  '.......w..w.......',
  '......ww.ww.......',
];

type Rows = Sprite;
/** Beine befiedern (Brahma): Beinpixel außer den Zehen werden Federn */
const featherLegs = (rows: Rows): Rows =>
  rows.map((r, y) => (y >= rows.length - 3 && y < rows.length - 1 ? r.replace(/w/g, 'a') : r));
/** obere Kopfzeilen ersetzen (Kamm/Haube) */
const head = (rows: Rows, top: string[]): Rows => [...top.map((t, i) => t.padEnd(rows[i].length, '.').slice(0, rows[i].length)), ...rows.slice(top.length)];
/** Körper fülliger: eine Rumpfzeile verdoppeln */
const fluffy = (rows: Rows, at: number): Rows => [...rows.slice(0, at + 1), rows[at], ...rows.slice(at + 1)];

const HEN = S.henAdult;
const ROO = S.roosterAdult;
const CHICKS = { baby: S.chickBaby, child: S.chickChild };
const ROOST = { kind: 'roost' as const };
const BLACK = { o: '#111014', e: '#d09040', E: '#d09040' };

function breed(name: string, hen: { teen: Rows; adult: Rows }, rooster: { teen: Rows; adult: Rows }, rest: Omit<Breed, 'name' | 'sprites' | 'maleSprites' | 'sleep' | 'facesLeft' | 'rig'>, rig: Omit<ChickenRig, 'kind'> = {}): Breed {
  return { name, sprites: { ...CHICKS, ...hen }, maleSprites: rooster, sleep: ROOST, facesLeft: true, rig: { kind: 'chicken', ...rig }, ...rest };
}

const LEGHORN_COMB = ['..c.c.c...........', '.occccco..........'];
const CREST = ['..aaa.............', '.oaaao............'];
const CREST_ROO = ['.aaa.c..............', 'oaaaacco............'];

export const CHICKEN_BREEDS: Breed[] = [
  breed('Legehuhn', { teen: S.henTeen, adult: HEN }, { teen: ROOSTER_TEEN, adult: ROO }, {
    coats: [
      { name: 'Braun', colors: { a: '#b8682e', b: '#e8b070', d: '#1e3a28' } },
      { name: 'Weiß', colors: { a: '#f4f0e8', b: '#ffffff', d: '#d8d0c0', o: '#7a6a5a' } },
      { name: 'Schwarz', colors: { a: '#2a2a2e', b: '#4a4a50', d: '#1e5a3e', ...BLACK } },
    ],
    adultGrams: 2000,
  }),
  breed('Seidenhuhn', { teen: S.silkieAdult, adult: S.silkieAdult }, { teen: S.silkieAdult, adult: fluffy(S.silkieAdult, 6) }, {
    coats: [
      { name: 'Weiß', colors: { a: '#f6f2ec', b: '#ffffff', d: '#e0d8cc', o: '#7a6a5a' } },
      { name: 'Schwarz', colors: { a: '#2e2c32', b: '#46444c', d: '#1e1c22', ...BLACK } },
      { name: 'Buff', colors: { a: '#e8c890', b: '#f6e2bc', d: '#c8a060' } },
    ],
    adultGrams: 1200,
  }, { silkie: true }),
  breed('Sperberhuhn', { teen: S.henTeen, adult: HEN }, { teen: ROOSTER_TEEN, adult: ROO }, {
    coats: [
      { name: 'Grau gesperbert', colors: { a: '#8a8a90', b: '#c8c8cc', d: '#3a3a40' } },
      { name: 'Gold gesperbert', colors: { a: '#c89a4a', b: '#e8c88a', d: '#6a4a1a' } },
    ],
    patterns: ['tabby'],
    adultGrams: 2500,
  }),
  breed('Leghorn', { teen: S.henTeen, adult: head(HEN, LEGHORN_COMB) }, { teen: ROOSTER_TEEN, adult: ROO }, {
    coats: [
      { name: 'Weiß', colors: { a: '#f6f4ee', b: '#ffffff', d: '#e0dad0', o: '#7a6a5a' } },
      { name: 'Rebhuhnfarbig', colors: { a: '#c87a3a', b: '#e8b070', d: '#2a3a2a' } },
    ],
    adultGrams: 1800,
  }, { comb: 'big' }),
  breed('Brahma', { teen: featherLegs(S.henTeen), adult: featherLegs(fluffy(HEN, 7)) }, { teen: featherLegs(ROOSTER_TEEN), adult: featherLegs(fluffy(ROO, 8)) }, {
    coats: [
      { name: 'Hell', colors: { a: '#f4f0e8', b: '#ffffff', d: '#2a2a2e', o: '#6a6a6a' } },
      { name: 'Dunkel', colors: { a: '#6a6a70', b: '#b8b8bc', d: '#2a2a2e' } },
      { name: 'Gelb', colors: { a: '#e8b070', b: '#f4d8a8', d: '#5a3a1a' } },
    ],
    adultGrams: 4500,
  }, { featherLegs: true, fluffy: 1.1 }),
  breed('Orpington', { teen: S.henTeen, adult: fluffy(fluffy(HEN, 7), 8) }, { teen: ROOSTER_TEEN, adult: fluffy(ROO, 9) }, {
    coats: [
      { name: 'Gelb', colors: { a: '#e8b878', b: '#f4d8a8', d: '#a87838' } },
      { name: 'Schwarz', colors: { a: '#2a2a2e', b: '#3e3e44', d: '#1e4a3a', ...BLACK } },
      { name: 'Blau', colors: { a: '#6a7a8a', b: '#9aa8b8', d: '#3a4a5a' } },
    ],
    adultGrams: 3500,
  }, { fluffy: 1.15 }),
  breed('Wyandotte', { teen: S.henTeen, adult: HEN }, { teen: ROOSTER_TEEN, adult: ROO }, {
    coats: [
      { name: 'Silber gesäumt', colors: { a: '#f0f0f0', b: '#ffffff', d: '#2a2a2e', o: '#4a4a4a' } },
      { name: 'Gold gesäumt', colors: { a: '#e0a040', b: '#f0c878', d: '#3a2414' } },
    ],
    patterns: ['laced'],
    adultGrams: 2800,
  }),
  breed('Appenzeller Spitzhaube', { teen: head(S.henTeen, CREST), adult: head(HEN, CREST) }, { teen: head(ROOSTER_TEEN, CREST), adult: head(ROO, CREST_ROO) }, {
    coats: [
      { name: 'Silber getupft', colors: { a: '#f4f4f4', b: '#ffffff', d: '#1e1e1e', o: '#4a4a4a' }, patterns: ['spots'] },
      { name: 'Schwarz', colors: { a: '#2a2a2e', b: '#3e3e44', d: '#1e4a3a', ...BLACK } },
    ],
    adultGrams: 1600,
  }, { crest: true }),
  breed('Zwerghuhn', { teen: S.chickChild, adult: S.henTeen }, { teen: S.chickChild, adult: ROOSTER_TEEN }, {
    coats: [
      { name: 'Goldhals', colors: { a: '#d88a2a', b: '#f0b860', d: '#2a3a2a' } },
      { name: 'Weiß', colors: { a: '#f4f0e8', b: '#ffffff', d: '#e0d8c8', o: '#7a6a5a' } },
      { name: 'Schwarz', colors: { a: '#2a2a2e', b: '#3a3a40', d: '#1e5a3e', ...BLACK } },
    ],
    adultGrams: 700,
  }, { bantam: true }),
];

export const chicken: SpeciesDef = {
  id: 'chicken',
  name: 'Huhn',
  article: 'das',
  homeName: 'Hühnerhof',
  nameIdeas: ['Henni', 'Berta', 'Gackerli', 'Frieda', 'Erna', 'Goldi', 'Kiki', 'Hilde'],
  colors: { floor: '#8a6a45', wall: '#e9dcc0', wallDark: '#d3c3a2' },
  palette: {
    o: '#4a2a14',
    a: '#b8682e',
    b: '#e8b070',
    c: '#e2283a', // Kamm und Kehllappen
    n: '#222222',
    E: '#111111',
    e: '#111111',
    p: '#f0a020', // Schnabel
    w: '#e8b030', // Beine
    d: '#5a3018',
  },
  variantPalettes: { bad: { o: '#3a2a20' } },
  weightGrams: { baby: 40, child: 400, teen: 1300, adult: 2000 },
  sleep: ROOST,
  sexes: true,
  maleStageNames: {
    teen: { good: 'Junghahn', bad: 'Rabaukenhahn' },
    adult: { great: 'Prachthahn', normal: 'Hahn', cheeky: 'Frechhahn' },
  },
  room: { scene: 'farm' },
  breeds: CHICKEN_BREEDS,
  egg: { shell: '#f6efe4', spots: '#c8a070' },
  sprites: CHICKEN_BREEDS[0].sprites,
  stageNames: {
    egg: { normal: 'Ei' },
    baby: { normal: 'Küken' },
    child: { good: 'Küken', bad: 'Struppelküken' },
    teen: { good: 'Junghuhn', bad: 'Rabaukenhuhn' },
    adult: { great: 'Prachthuhn', normal: 'Huhn', cheeky: 'Frechhuhn' },
  },
  games: {
    timing: {
      title: 'Wurm picken',
      description: 'Ein Wurm schaut aus der Erde. Tippe im richtigen Moment, dann pickt das Huhn zu!',
      target: 'Wurm',
      hit: 'Gepickt!',
    },
    guess: {
      title: 'Links oder rechts?',
      description: 'Das Huhn hat sich hinter einem Strohballen versteckt. Hinter welchem?',
      hideout: 'Strohballen',
      hideEmoji: '🌾',
      petEmoji: '🐔',
    },
    catch: {
      title: 'Körner fangen',
      description: 'Fang die Körner, weich den Steinchen aus!',
      good: 'Korn',
      bad: 'Steinchen',
    },
    throw: {
      title: 'Weitflattern',
      description: 'Das Huhn flattert los. Möglichst weit, aber nicht in den Teich!',
      thing: 'Huhn',
      emoji: '🐔',
      water: 'Teich',
    },
    memory: {
      title: 'Spuren lesen',
      description: 'Merk dir die Hühnerspur und tippe sie nach.',
    },
  },
};
