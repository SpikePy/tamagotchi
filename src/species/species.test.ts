import { describe, expect, it } from 'vitest';
import { SPECIES, lookName, randomLook, weightLabel } from '.';
import { applyPattern, petSprite } from '../render/pixels';

describe('Tierarten', () => {
  for (const sp of Object.values(SPECIES)) {
    it(`${sp.name}: alle Sprites rechteckig, alle Zeichen haben Farben`, () => {
      for (const [stage, rows] of Object.entries(sp.sprites)) {
        for (const r of rows) expect(r.length, `${sp.id}/${stage}`).toBe(rows[0].length);
        const { map, colors } = petSprite(sp, { stage: stage as never, variant: 'normal', look: randomLook(sp) });
        for (const ch of map.join('').replaceAll('.', '')) expect(colors[ch], `${sp.id}/${stage} '${ch}'`).toBeTruthy();
      }
    });
  }

  it('Katze bekommt zufälliges Fell, andere Arten nicht', () => {
    expect(randomLook(SPECIES.fox)).toBeNull();
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(lookName(SPECIES.cat, randomLook(SPECIES.cat))!);
    expect(seen.size).toBeGreaterThan(15); // 6 Farben x 4 Muster
  });

  it('Muster färbt nur die Hauptfarbe um', () => {
    const rows = ['oaaao', 'abbba', 'aaaaa'];
    for (const p of ['tabby', 'patches', 'socks']) {
      const out = applyPattern(rows, p, 42);
      out.forEach((r, y) => [...r].forEach((ch, x) => rows[y][x] !== 'a' && expect(ch).toBe(rows[y][x])));
    }
  });

  it('zeigt realistische Gewichte', () => {
    expect(weightLabel(SPECIES.fox, { stage: 'adult', weight: 30 })).toBe('6 kg');
    expect(weightLabel(SPECIES.hedgehog, { stage: 'baby', weight: 5 })).toBe('25 g');
    expect(weightLabel(SPECIES.hedgehog, { stage: 'adult', weight: 33 })).toBe('1,1 kg');
    expect(weightLabel(SPECIES.cat, { stage: 'teen', weight: 20 })).toBe('2,5 kg');
  });

  it('Hund: 10 Rassen, alle kommen zufällig vor, Gewicht je Rasse', () => {
    const dog = SPECIES.dog;
    expect(dog.breeds).toHaveLength(10);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomLook(dog)!.breed!);
    expect(seen.size).toBe(10);
    const mops = dog.breeds!.findIndex((b) => b.name === 'Mops');
    expect(weightLabel(dog, { stage: 'adult', weight: 30, look: { breed: mops, coat: 0, pattern: 'solid', seed: 1 } })).toBe('7 kg');
    for (const [i, b] of dog.breeds!.entries())
      for (const stage of ['baby', 'child', 'teen', 'adult'] as const) {
        const { map, colors } = petSprite(dog, { stage, variant: 'normal', look: { breed: i, coat: 0, pattern: 'solid', seed: 1 } });
        for (const r of map) expect(r.length, `${b.name}/${stage}`).toBe(map[0].length);
        for (const ch of map.join('').replaceAll('.', '')) expect(colors[ch], `${b.name}/${stage} '${ch}'`).toBeTruthy();
      }
  });

  it('alle Rassen aller Arten: Sprites rechteckig, alle Farben vorhanden', () => {
    for (const sp of Object.values(SPECIES))
      for (const [i, b] of (sp.breeds ?? []).entries())
        for (const [c] of b.coats.entries())
          for (const stage of ['baby', 'child', 'teen', 'adult'] as const)
            for (const sleeping of [false, true]) {
              const { map, colors } = petSprite(sp, { stage, variant: 'normal', look: { breed: i, coat: c, pattern: 'solid', seed: 1 } }, { sleeping });
              for (const r of map) expect(r.length, `${b.name}/${stage}`).toBe(map[0].length);
              for (const ch of map.join('').replaceAll('.', '')) expect(colors[ch], `${sp.id}/${b.name}/${stage} '${ch}'`).toBeTruthy();
            }
  }, 60_000); // zeichnet alle Rassen in voller Rasterdichte – auf langsamen CI-Rechnern dauert das
});
