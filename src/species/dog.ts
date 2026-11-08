import { buildDogSprites, type DogShape } from './dogParts';
import type { SleepShape } from '../render/sleepers';
import type { Breed, SpeciesDef } from './types';

// 10 typische Rassen. Jeder Hund bekommt beim Ei zufällig Rasse, Fellfarbe und Muster.
// dunkles Fell: hellere Augen, damit man sie sieht
const BLACK = { o: '#111014', e: '#b08850' };
const DARK_EYES = { e: '#b08850' };
/** Schlafpose aus der Rassen-Form ableiten */
function sleepOf(d: DogShape): SleepShape {
  const ears = d.ears === 'small' ? 'small' : ['pointy', 'big', 'half'].includes(d.ears) ? 'pointy' : 'floppy';
  return { kind: 'curl', ears, tail: d.tail === 'none' ? 'none' : 'thin', tailTip: d.tail === 'tipped' };
}
function shape(d: DogShape) {
  return { sprites: buildDogSprites(d), sleep: sleepOf(d) };
}

export const DOG_BREEDS: Breed[] = [
  {
    name: 'Labrador',
    ...shape({ ears: 'floppy', tail: 'straight' }),
    coats: [
      { name: 'Schwarz', colors: { a: '#2b2a2c', c: '#1e1d1f', b: '#3a383a', ...BLACK } },
      { name: 'Blond', colors: { a: '#e4c07a', c: '#d0a65e', b: '#f1d9a8' } },
      { name: 'Schoko', colors: { a: '#6b4428', c: '#573620', b: '#7e5434' } },
    ],
    adultGrams: 30000,
  },
  {
    name: 'Schäferhund',
    ...shape({ ears: 'pointy', tail: 'straight' }),
    coats: [
      { name: 'Schwarz-Braun', colors: { a: '#c08040', c: '#2a2420', b: '#e0b070', d: '#2a2420' } },
      { name: 'Grau', colors: { a: '#a49a90', c: '#3a3532', b: '#cfc6bc', d: '#3a3532' } },
    ],
    patterns: ['saddle'],
    adultGrams: 32000,
  },
  {
    name: 'Dackel',
    ...shape({ ears: 'floppyLong', tail: 'straight', short: true }),
    coats: [
      { name: 'Rot', colors: { a: '#b0582a', c: '#8a4220', b: '#c06a38' } },
      { name: 'Schwarz-Braun', colors: { a: '#2a2420', c: '#1e1a18', b: '#b5793e', d: '#b5793e', ...DARK_EYES }, patterns: ['points'] },
    ],
    adultGrams: 9000,
  },
  {
    name: 'Mops',
    ...shape({ ears: 'small', tail: 'curly', face: 'flat' }),
    coats: [
      { name: 'Beige', colors: { a: '#dcbf8e', c: '#3a3230', b: '#e8d0a8' } },
      { name: 'Schwarz', colors: { a: '#2e2c2c', c: '#1a1818', b: '#3a3838', ...BLACK } },
    ],
    adultGrams: 7000,
  },
  {
    name: 'Husky',
    ...shape({ ears: 'pointy', tail: 'curly' }),
    coats: [
      { name: 'Grau-Weiß', colors: { a: '#7d838a', c: '#5e636a', b: '#f4f4f4', e: '#5f9ed6' } },
      { name: 'Schwarz-Weiß', colors: { a: '#2e3034', c: '#1e2024', b: '#f4f4f4', e: '#7fb4e6' } },
      { name: 'Rot-Weiß', colors: { a: '#b8683a', c: '#8a4a2a', b: '#f4f4f4', e: '#c08a3a' } },
    ],
    patterns: ['solid', 'socks'],
    adultGrams: 23000,
  },
  {
    name: 'Beagle',
    ...shape({ ears: 'floppyLong', tail: 'tipped' }),
    coats: [
      { name: 'Dreifarbig', colors: { a: '#c0803e', c: '#8a5a2b', b: '#f6f2ea', d: '#2e2a26' } },
      { name: 'Zweifarbig', colors: { a: '#c0803e', c: '#9a6a3a', b: '#f6f2ea', d: '#f6f2ea' } },
    ],
    patterns: ['saddle', 'patches'],
    adultGrams: 12000,
  },
  {
    name: 'Dalmatiner',
    ...shape({ ears: 'floppy', tail: 'straight' }),
    coats: [
      { name: 'Schwarz getupft', colors: { a: '#f6f4f0', c: '#1e1e1e', b: '#ffffff', d: '#1e1e1e' } },
      { name: 'Leberbraun getupft', colors: { a: '#f6f4f0', c: '#6b3a22', b: '#ffffff', d: '#6b3a22' } },
    ],
    patterns: ['spots'],
    adultGrams: 27000,
  },
  {
    name: 'Pudel',
    ...shape({ ears: 'fluffy', tail: 'curly', tuft: true }),
    coats: [
      { name: 'Weiß', colors: { a: '#f4f0ea', c: '#e2dcd2', b: '#ffffff' } },
      { name: 'Schwarz', colors: { a: '#2b2a2c', c: '#1e1d1f', b: '#3a383a', ...BLACK } },
      { name: 'Apricot', colors: { a: '#e8b07a', c: '#d49a62', b: '#f2c898' } },
      { name: 'Grau', colors: { a: '#9a9a9a', c: '#7a7a7a', b: '#b4b4b4' } },
    ],
    adultGrams: 22000,
  },
  {
    name: 'Border Collie',
    ...shape({ ears: 'half', tail: 'straight' }),
    coats: [
      { name: 'Schwarz-Weiß', colors: { a: '#24222a', c: '#18161c', b: '#f4f4f4', d: '#f4f4f4', ...DARK_EYES } },
      { name: 'Braun-Weiß', colors: { a: '#6b4428', c: '#4e3020', b: '#f4f4f4', d: '#f4f4f4' } },
    ],
    patterns: ['solid', 'socks', 'patches'],
    adultGrams: 18000,
  },
  {
    name: 'Corgi',
    ...shape({ ears: 'big', tail: 'none', short: true }),
    coats: [
      { name: 'Rot-Weiß', colors: { a: '#d0843e', c: '#b06a2e', b: '#f6f2ea' } },
      { name: 'Dreifarbig', colors: { a: '#2e2a26', c: '#1e1a18', b: '#f6f2ea', d: '#c0803e', ...DARK_EYES }, patterns: ['points'] },
    ],
    patterns: ['solid', 'socks'],
    adultGrams: 12000,
  },
];

export const dog: SpeciesDef = {
  id: 'dog',
  name: 'Hund',
  article: 'der',
  homeName: 'Hundezimmer',
  nameIdeas: ['Bello', 'Luna', 'Balu', 'Sammy', 'Paul', 'Nala', 'Rocky', 'Emma', 'Lucky', 'Buddy'],
  colors: { floor: '#9c7a58', wall: '#e8efe0', wallDark: '#d2dcc6' },
  palette: {
    o: '#2a201a',
    a: '#c8925a',
    b: '#f6efe4',
    c: '#8a5a32',
    n: '#1e1816',
    E: '#1e1816',
    e: '#4a3222',
    p: '#f0a39a',
    w: '#8a7a70',
    d: '#2a2420',
  },
  variantPalettes: {
    bad: { o: '#3a2e28' },
  },
  // Standard-Gewichte (Labrador); je Rasse wird über breeds[].adultGrams gerechnet
  weightGrams: { baby: 450, child: 6000, teen: 20000, adult: 30000 },
  room: {},
  breeds: DOG_BREEDS,
  egg: { shell: '#f6efe4', spots: '#c8925a' },
  sprites: DOG_BREEDS[0].sprites,
  sleep: DOG_BREEDS[0].sleep,
  stageNames: {
    egg: { normal: 'Ei' },
    baby: { normal: 'Hundewelpe' },
    child: { good: 'Welpe', bad: 'Strubbelwelpe' },
    teen: { good: 'Junghund', bad: 'Rabauke' },
    adult: { great: 'Prachthund', normal: 'Familienhund', cheeky: 'Frechdachs' },
  },
  games: {
    timing: {
      title: 'Frisbee fangen',
      description: 'Eine Frisbee fliegt heran. Tippe im richtigen Moment, dann springt der Hund hoch und schnappt sie!',
      target: 'Frisbee',
      hit: 'Geschnappt!',
    },
    guess: {
      title: 'Links oder rechts?',
      description: 'Der Hund hat sich in einem Korb versteckt. In welchem?',
      hideout: 'Korb',
      hideEmoji: '🧺',
      petEmoji: '🐶',
    },
    catch: {
      title: 'Leckerli fangen',
      description: 'Fang die Leckerli, weich den Zitronen aus!',
      good: 'Leckerli',
      bad: 'Zitrone',
    },
    throw: {
      title: 'Ball werfen',
      description: 'Wirf den Ball möglichst weit, aber nicht in die Pfütze!',
      thing: 'Ball',
      emoji: '🎾',
      water: 'Pfütze',
    },
    memory: {
      title: 'Spuren lesen',
      description: 'Merk dir die Pfotenspur und tippe sie nach.',
    },
  },
};
