// Erzeugt die App-Icons (PNG) aus dem Fuchs-Sprite.
// Aufruf: npm run icons
import { writeFileSync } from 'node:fs';
// @ts-ignore
import { encodePng, hex } from './png.mjs';
import { fox } from '../src/species/fox';

const BG = hex('#2f3b2a');
const BG2 = hex('#3f5236');
const sprite = fox.sprites.child;

function icon(size: number, fill: number) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = y > size * 0.72 ? BG2 : BG;
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
    }
  const w = sprite[0].length, h = sprite.length;
  const scale = Math.floor((size * fill) / Math.max(w, h));
  const ox = Math.floor((size - w * scale) / 2), oy = Math.floor((size - h * scale) / 2);
  sprite.forEach((row, sy) =>
    [...row].forEach((ch, sx) => {
      if (ch === '.') return;
      const [r, g, b] = hex((fox.palette as any)[ch]);
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i = ((oy + sy * scale + dy) * size + ox + sx * scale + dx) * 4;
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
        }
    }),
  );
  return encodePng(size, size, buf);
}

writeFileSync('public/icons/icon-192.png', icon(192, 0.75));
writeFileSync('public/icons/icon-512.png', icon(512, 0.75));
writeFileSync('public/icons/icon-maskable-512.png', icon(512, 0.55));
console.log('Icons erzeugt.');
