// Rendert Sprites in eine PNG zur Kontrolle: alle Arten/Stufen + Katzen-Fellvarianten.
// Aufruf: npx vite-node scripts/preview.ts out.png
import { writeFileSync } from 'node:fs';
// @ts-ignore
import { encodePng, hex } from './png.mjs';
import { SPECIES } from '../src/species';
import { petSprite } from '../src/render/pixels';
import type { Look, Stage } from '../src/engine/state';

// Die Tiere kommen schon in voller Rasterdichte (4 Bildpixel je Spiel-Einheit); S vergrößert zusätzlich
const S = Number(process.env.SCALE ?? 1);
type Cell = { sp: string; stage: Stage; look?: Look | null; sleeping?: boolean };
/** Arten mit Rassen (Hund, Huhn) brauchen eine Rasse, sonst die Standard-Optik */
const firstLook = (id: string): Look | null =>
  SPECIES[id].breeds ? { breed: 0, coat: 0, pattern: 'solid', seed: 5, sex: SPECIES[id].sexes ? 'f' : undefined } : null;
const rows: Cell[][] = Object.keys(SPECIES).map((id) =>
  (['baby', 'child', 'teen', 'adult'] as Stage[]).map((stage) => ({ sp: id, stage, look: firstLook(id) })),
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
// Schlafposen: jede Art klein + groß, Hunde je Rasse groß
rows.push(Object.keys(SPECIES).flatMap((id) => (['child', 'adult'] as Stage[]).map((stage) => ({ sp: id, stage, sleeping: true, look: id === 'cat' ? { coat: 1, pattern: 'tabby', seed: 3 } : firstLook(id) }))));
rows.push(SPECIES.dog.breeds!.map((b, breed) => ({ sp: 'dog', stage: 'adult' as Stage, sleeping: true, look: { breed, coat: 0, pattern: (b.coats[0].patterns ?? b.patterns ?? ['solid'])[0], seed: 5 } })));
const only = process.argv[3];
if (only === 'dackel') rows.splice(0, rows.length, ...rows.filter((r) => r[0].sp === 'dog' && r[0].look?.breed === 2));
else if (only === 'sleep') rows.splice(0, rows.length, ...rows.filter((r) => r[0].sleeping));
else if (only) rows.splice(0, rows.length, ...rows.filter((r) => r[0].sp === only));
const cols = Math.max(...rows.map((r) => r.length));
const drawn = rows.map((row) =>
  row.map((c) => petSprite(SPECIES[c.sp], { stage: c.stage, variant: c.stage === 'adult' ? 'normal' : 'good', look: c.look }, { sleeping: c.sleeping })),
);
// Zellen so groß wie das größte Tier; alle stehen auf einer gemeinsamen Bodenlinie (Größen direkt vergleichbar)
const all = drawn.flat();
const CW = Math.max(...all.map((d) => d.map[0].length)) + 8;
const CH = Math.max(...all.map((d) => d.map.length)) + 8;
const W = cols * CW * S, H = rows.length * CH * S;
const buf = Buffer.alloc(W * H * 4, 255);
drawn.forEach((row, r) =>
  row.forEach(({ map, colors }, ci) => {
    const c = rows[r][ci];
    const ox = ci * CW + Math.floor((CW - map[0].length) / 2);
    const oy = (r + 1) * CH - 4 - map.length;
    map.forEach((line, y) => {
      if (line.length !== map[0].length) console.log('LÄNGE', c.sp, c.stage, y, line.length);
      [...line].forEach((ch, x) => {
        const col = colors[ch];
        if (!col) return;
        const [R, G, B] = hex(col);
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
          const i = (((oy + y) * S + dy) * W + (ox + x) * S + dx) * 4;
          buf[i] = R; buf[i + 1] = G; buf[i + 2] = B; buf[i + 3] = 255;
        }
      });
    });
  }),
);
writeFileSync(process.argv[2], encodePng(W, H, buf));
