// Rendert Sprites in eine PNG zur Kontrolle: alle Arten/Stufen + Katzen-Fellvarianten.
// Aufruf: npx vite-node scripts/preview.ts out.png
import { writeFileSync } from 'node:fs';
// @ts-ignore
import { encodePng, hex } from './png.mjs';
import { SPECIES } from '../src/species';
import { petSprite } from '../src/render/pixels';
import type { Look, Stage } from '../src/engine/state';

const S = 6, CELL = 22;
type Cell = { sp: string; stage: Stage; look?: Look | null };
const rows: Cell[][] = Object.keys(SPECIES).map((id) =>
  (['baby', 'child', 'teen', 'adult'] as Stage[]).map((stage) => ({ sp: id, stage })),
);
const cat = SPECIES.cat;
for (const stage of ['baby', 'adult'] as Stage[])
  for (const pattern of cat.patterns!)
    rows.push(cat.coats!.map((_, coat) => ({ sp: 'cat', stage, look: { coat, pattern, seed: 7 + coat } })));

const dog = SPECIES.dog;
dog.breeds!.forEach((b, breed) => {
  const row: Cell[] = (['baby', 'child', 'teen', 'adult'] as Stage[]).map((stage) => ({
    sp: 'dog', stage, look: { breed, coat: 0, pattern: (b.coats[0].patterns ?? b.patterns ?? ['solid'])[0], seed: 5 },
  }));
  b.coats.forEach((c, coat) => (c.patterns ?? b.patterns ?? ['solid']).forEach((pattern) =>
    row.push({ sp: 'dog', stage: 'adult', look: { breed, coat, pattern, seed: 9 + coat } })));
  rows.push(row);
});
const only = process.argv[3];
if (only) rows.splice(0, rows.length, ...rows.filter((r) => r[0].sp === only));
const cols = Math.max(...rows.map((r) => r.length));
const W = cols * CELL * S, H = rows.length * CELL * S;
const buf = Buffer.alloc(W * H * 4, 255);
rows.forEach((row, r) =>
  row.forEach((c, ci) => {
    const { map, colors } = petSprite(SPECIES[c.sp], { stage: c.stage, variant: c.stage === 'adult' ? 'normal' : 'good', look: c.look });
    map.forEach((line, y) => {
      if (line.length !== map[0].length) console.log('LÄNGE', c.sp, c.stage, y, line.length);
      [...line].forEach((ch, x) => {
        const col = colors[ch];
        if (!col) return;
        const [R, G, B] = hex(col);
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
          const i = (((r * CELL + 1 + y) * S + dy) * W + (ci * CELL + 1 + x) * S + dx) * 4;
          buf[i] = R; buf[i + 1] = G; buf[i + 2] = B; buf[i + 3] = 255;
        }
      });
    });
  }),
);
writeFileSync(process.argv[2], encodePng(W, H, buf));
