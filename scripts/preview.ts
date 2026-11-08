// Rendert alle Sprites nebeneinander in eine PNG zur Kontrolle.
import { writeFileSync } from 'node:fs';
// @ts-ignore
import { encodePng, hex } from './png.mjs';
import { SPECIES } from '../src/species';

const S = 8, PAD = 2;
const rows = Object.values(SPECIES);
const W = (4 * (20 + PAD) + PAD) * S, H = (rows.length * (20 + PAD) + PAD) * S;
const buf = Buffer.alloc(W * H * 4, 255);
rows.forEach((sp, r) => {
  (['baby', 'child', 'teen', 'adult'] as const).forEach((st, c) => {
    sp.sprites[st].forEach((line, y) => {
      if (line.length !== sp.sprites[st][0].length) console.log('LÄNGE', sp.id, st, y, line.length);
      [...line].forEach((ch, x) => {
        if (ch === '.') return;
        const [R, G, B] = hex((sp.palette as any)[ch]);
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
          const px = ((PAD + c * (20 + PAD) + x) * S + dx), py = ((PAD + r * (20 + PAD) + y) * S + dy);
          const i = (py * W + px) * 4; buf[i] = R; buf[i + 1] = G; buf[i + 2] = B; buf[i + 3] = 255;
        }
      });
    });
  });
});
writeFileSync(process.argv[2], encodePng(W, H, buf));
