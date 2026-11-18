// Singvögel (Seitenansicht, Schnabel nach rechts), wie die Haustiere in voller Rasterdichte aus Formen gezeichnet:
// runder Körper, heller Bauch, Flügel mit Federkanten, Schwanzfedern, Auge mit Glanzpunkt, spitzer Schnabel.
// Benutzt von den vorbeifliegenden Vögeln (critters.ts) und dem Anschleich-Spiel der Katze.
import { markHires, withShades, type ColorMap } from './pixels';
import { Raster, ell, inter, line2, output, poly, tube, union } from './rig';

export type BirdKind = 'robin' | 'bluetit' | 'sparrow';
/** stand = sitzt, peck = pickt, alert = reckt den Kopf, fly0/fly1 = Flügel oben/unten */
export type BirdPose = 'stand' | 'peck' | 'alert' | 'fly0' | 'fly1';

// a Rücken/Kopf, b Bauch, c Flügel, p Brust/Gesicht, w Wange, d Kappe, y Schnabel, l Beine
const PALETTES: Record<BirdKind, ColorMap> = {
  robin: { a: '#8a6a48', b: '#efe4d2', c: '#6e5236', p: '#e8762c', w: '#e8762c', d: '#8a6a48', y: '#3a2a1e', l: '#8a6a52', o: '#2e2018', E: '#141010' },
  bluetit: { a: '#7aa26a', b: '#f2d84a', c: '#4f86c8', p: '#f2d84a', w: '#ffffff', d: '#3f7ad0', y: '#2a2a2a', l: '#6a7a8a', o: '#1e2a3a', E: '#101418' },
  sparrow: { a: '#9a7448', b: '#d8cdb8', c: '#7a5432', p: '#c8bba4', w: '#e8e0d0', d: '#7a7470', y: '#4a3a2a', l: '#8a6a52', o: '#2e2018', E: '#141010' },
};

const cache = new Map<string, { map: string[]; colors: ColorMap }>();

/** Vogel als Raster mit w × h Bildpixeln (volle Dichte), Blick nach rechts */
export function birdSprite(kind: BirdKind, pose: BirdPose, w: number, h: number): { map: string[]; colors: ColorMap } {
  const key = `${kind}|${pose}|${w}|${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = new Raster(w, h);
  const fly = pose === 'fly0' || pose === 'fly1';
  const peck = pose === 'peck';
  const alert = pose === 'alert';
  // Grundmaße relativ zur Rastergröße
  const bodyCx = w * (fly ? 0.46 : 0.44);
  const bodyCy = h * (fly ? 0.56 : peck ? 0.6 : 0.56);
  const bodyRx = w * (fly ? 0.27 : 0.26);
  const bodyRy = h * (fly ? 0.2 : 0.25);
  const headR = Math.min(w * 0.15, h * 0.2);
  const headX = peck ? bodyCx + bodyRx * 1.05 : bodyCx + bodyRx * (alert ? 0.62 : 0.72);
  const headY = peck ? bodyCy + bodyRy * 0.3 : alert ? bodyCy - bodyRy * 1.25 : bodyCy - bodyRy * 0.95;

  // Schwanz: schmaler Federfächer nach hinten (beim Sitzen leicht nach unten)
  const tailY = fly ? bodyCy : bodyCy + bodyRy * 0.35;
  const tailEnd: [number, number] = [w * 0.04, fly ? bodyCy - h * 0.04 : bodyCy + bodyRy * (peck ? -0.6 : 1.1)];
  r.fill(poly([[bodyCx - bodyRx * 0.55, tailY - bodyRy * 0.35], [tailEnd[0], tailEnd[1] - h * 0.07], [tailEnd[0] + 1, tailEnd[1] + h * 0.06], [bodyCx - bodyRx * 0.4, tailY + bodyRy * 0.3]]), 'c');

  // Beine (hinter dem Bauch)
  if (!fly) {
    const footY = h - 1;
    for (const dx of [-0.12, 0.12]) {
      const lx = bodyCx + bodyRx * dx;
      r.seg(lx, bodyCy + bodyRy * 0.7, lx, footY, 'l');
      r.seg(lx, footY, lx + Math.max(2, w * 0.06), footY, 'l');
    }
  }

  // Flügel im Flug: spitz zulaufend, nach hinten geschwungen (hinterer Flügel blasser, hinter dem Körper)
  const wingUp = pose === 'fly0';
  const flightWing = (front: boolean) => {
    const sx = bodyCx + bodyRx * (front ? -0.05 : 0.25);
    const sy = bodyCy - bodyRy * 0.35;
    const tipX = bodyCx - bodyRx * (front ? 0.85 : 0.55);
    const tipY = wingUp ? 1 : h - 2;
    const dir = wingUp ? -1 : 1;
    const wd = bodyRy * (front ? 0.7 : 0.6);
    return tube([sx, sy], [sx + bodyRx * 0.1, sy + dir * h * 0.25], [tipX + bodyRx * 0.35, tipY - dir * h * 0.08], [tipX, tipY], (t) => Math.max(1, wd * (1 - t * 0.85)));
  };
  if (fly) r.fill(flightWing(false), 'c');

  // Körper, Bauch, Brust
  const body = ell(bodyCx, bodyCy, bodyRx, bodyRy);
  const head = ell(headX, headY, headR, headR * 0.95);
  const neck = line2(bodyCx + bodyRx * 0.35, bodyCy - bodyRy * 0.3, headX, headY, headR * 0.8);
  const all = union(body, head, neck);
  r.fill(all, 'a');
  r.fill(inter(ell(bodyCx + bodyRx * 0.25, bodyCy + bodyRy * 0.55, bodyRx * 0.85, bodyRy * 0.65), all), 'b', { line: false });
  if (kind === 'robin') r.fill(inter(union(ell(headX - headR * 0.05, headY + headR * 0.45, headR * 0.95, headR * 0.75), ell(bodyCx + bodyRx * 0.55, bodyCy - bodyRy * 0.05, bodyRx * 0.5, bodyRy * 0.6)), all), 'p', { line: false });
  if (kind === 'bluetit') r.fill(inter(ell(bodyCx + bodyRx * 0.3, bodyCy + bodyRy * 0.2, bodyRx * 0.75, bodyRy * 0.75), all), 'p', { line: false });
  // Kopf: Kappe, Wange, Augenstreif
  if (kind !== 'robin') r.fill(inter(ell(headX - headR * 0.1, headY - headR * 0.75, headR * 1.0, headR * 0.6), head), 'd', { line: false });
  if (kind === 'bluetit') {
    r.fill(inter(ell(headX - headR * 0.05, headY + headR * 0.2, headR * 0.7, headR * 0.5), head), 'w', { line: false, flat: true });
    r.seg(headX - headR * 0.8, headY - headR * 0.05, headX + headR * 0.7, headY - headR * 0.05, 'o');
  }
  if (kind === 'sparrow') {
    r.fill(inter(ell(headX - headR * 0.1, headY + headR * 0.35, headR * 0.6, headR * 0.45), head), 'w', { line: false, flat: true });
    r.fill(inter(ell(headX + headR * 0.55, headY + headR * 0.75, headR * 0.35, headR * 0.35), all), 'o', { line: false, flat: true }); // Kehlfleck
  }

  // Flügel am Körper (Sitzen) bzw. vorderer Flügel (Flug), mit Federkanten
  if (fly) {
    const wing = flightWing(true);
    r.fill(wing, (x, y) => (wing.at(x, y) > 0.55 ? 'C' : 'c'));
    // Schwungfedern: ein paar Kerben an der Hinterkante
    for (let i = 1; i <= 3; i++) {
      const t = 0.35 + i * 0.15;
      const sx = bodyCx + bodyRx * 0.15;
      const tx = bodyCx - bodyRx * 0.85;
      const x = sx + (tx - sx) * t;
      const y0 = bodyCy - bodyRy * 0.35 + ((wingUp ? 1 : h - 2) - (bodyCy - bodyRy * 0.35)) * t;
      r.seg(x - 1, y0, x - bodyRy * 0.5 * (1 - t), y0 + (wingUp ? 1 : -1), 'o');
    }
  } else {
    const wing = inter(ell(bodyCx - bodyRx * 0.18, bodyCy - bodyRy * 0.05, bodyRx * 0.72, bodyRy * 0.62), body);
    r.fill(wing, 'c');
    // Federkanten: zwei helle Bögen und die Schwungfeder-Spitzen nach hinten
    for (let i = 0; i < 2; i++) {
      const yy = bodyCy - bodyRy * 0.15 + i * bodyRy * 0.35;
      r.seg(bodyCx - bodyRx * 0.55, yy, bodyCx + bodyRx * 0.25, yy - bodyRy * 0.1, kind === 'sparrow' ? 'b' : 'C');
    }
    r.fill(poly([[bodyCx - bodyRx * 0.75, bodyCy - bodyRy * 0.1], [bodyCx - bodyRx * 1.25, bodyCy + bodyRy * 0.5], [bodyCx - bodyRx * 0.5, bodyCy + bodyRy * 0.45]]), 'c');
  }

  // Schnabel und Auge
  const bx = headX + headR * 0.85;
  const by = headY + headR * (peck ? 0.35 : 0.1);
  const bl = Math.max(2.5, headR * 0.75);
  r.fill(poly([[bx - 1, by - headR * 0.28], [bx + bl, by + (peck ? headR * 0.3 : 0.2)], [bx - 1, by + headR * 0.28]]), 'y');
  const ex = headX + headR * 0.3;
  const ey = headY - headR * 0.12;
  const er = Math.max(1.2, headR * 0.24);
  r.fill(ell(ex, ey, er, er), 'E', { line: false, flat: true });
  r.dot(ex - er * 0.3, ey - er * 0.4, 'h');

  const out = { map: markHires(output(r, true)), colors: withShades(PALETTES[kind]) };
  cache.set(key, out);
  return out;
}

export const BIRD_KINDS: BirdKind[] = ['robin', 'bluetit', 'sparrow'];
