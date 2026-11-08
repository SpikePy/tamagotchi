// Ziehende Wolken. Das Wetter (Bewölkung und Wind) wechselt etwa alle 45 Minuten zufällig,
// in einem moderaten Rahmen; die Wolken passen sich langsam an.
import { cloud } from './fx';

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number; // Faktor auf den Wind (größere/nähere Wolken etwas schneller)
}

const PERIOD = 45 * 60_000;

function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Precip = 'none' | 'rain' | 'snow';

/**
 * Wetter für einen Zeitpunkt: Wolken (1–5), Wind (Einheiten/s, mit Richtung) und Niederschlag.
 * Regen etwa jedes 5. Wetter, im Winter (Dez–Feb) stattdessen Schnee etwa jedes 3. Wetter.
 */
export function weatherAt(clock: number): { clouds: number; wind: number; precip: Precip } {
  const r = rand(Math.floor(clock / PERIOD) * 7919 + 13);
  let clouds = 1 + Math.floor(r() * 5); // 1..5
  const strength = 0.4 + r() * 1.4; // 0,4..1,8
  const dir = r() < 0.75 ? 1 : -1; // meist West -> Ost
  const m = new Date(clock).getMonth();
  const winter = m === 11 || m <= 1;
  const roll = r();
  const precip: Precip = winter ? (roll < 0.33 ? 'snow' : 'none') : roll < 0.2 ? 'rain' : 'none';
  if (precip !== 'none') clouds = Math.max(clouds, 4); // bei Niederschlag mehr Wolken
  return { clouds, wind: strength * dir, precip };
}

export class Clouds {
  private list: Cloud[] = [];
  private wind = 0;
  private last = performance.now();
  private started = false;

  /** zeichnet die Wolken in den Himmelsbereich (x0..x0+w, y0..y0+h) */
  draw(ctx: CanvasRenderingContext2D, clock: number, t: number, area: { x: number; y: number; w: number; h: number }, night: boolean) {
    const dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    const wx = weatherAt(clock);
    if (!this.started) {
      // beim Start schon ein paar Wolken verteilt
      this.wind = wx.wind;
      for (let i = 0; i < wx.clouds; i++) this.list.push(this.make(area, area.x + Math.random() * area.w));
      this.started = true;
    }
    // Wind ändert sich sanft
    this.wind += (wx.wind - this.wind) * Math.min(1, dt * 0.2);
    // neue Wolken am Rand, wenn zu wenige da sind
    if (this.list.length < wx.clouds && Math.random() < dt * 0.25) {
      const startX = this.wind > 0 ? area.x - 12 : area.x + area.w + 2;
      this.list.push(this.make(area, startX));
    }
    for (const c of this.list) c.x += this.wind * c.speed * dt;
    // Wolken, die den Bereich verlassen haben, verschwinden
    this.list = this.list.filter((c) => c.x > area.x - 16 && c.x < area.x + area.w + 6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();
    if (night) ctx.globalAlpha = 0.35;
    for (const c of this.list) cloud(ctx, c.x, c.y, c.size, wx.precip !== 'none' ? '#b8c0cc' : '#ffffff');
    ctx.restore();
  }

  private make(area: { y: number; h: number }, x: number): Cloud {
    const size = 0.6 + Math.random() * 0.7;
    return { x, y: area.y + 2 + Math.random() * Math.max(1, area.h * 0.45), size, speed: 0.7 + size * 0.4 };
  }
}

/** Regen oder Schnee, fällt vor der ganzen Szene */
export function drawPrecip(ctx: CanvasRenderingContext2D, precip: Precip, wind: number, t: number, area = { x: 0, y: 0, w: 64, h: 48 }) {
  if (precip === 'none') return;
  const s = t / 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  if (precip === 'rain') {
    ctx.fillStyle = 'rgba(190,210,235,0.75)';
    for (let i = 0; i < 45; i++) {
      const speed = 38 + (i % 5) * 4;
      const y = (s * speed + i * 37) % (area.h + 6) + area.y - 3;
      const x = ((i * 23.7 + wind * 3 * ((y - area.y) / area.h)) % (area.w + 6)) + area.x - 3;
      ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 0.5, 1.5);
    }
  } else {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const speed = 4 + (i % 4);
      const y = (s * speed + i * 29) % (area.h + 2) + area.y - 1;
      const x = ((i * 17.3 + Math.sin(s * 1.5 + i) * 1.5 + wind * s * 0.5) % (area.w + 2) + area.w + 2) % (area.w + 2) + area.x - 1;
      ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 0.5, 0.5);
    }
  }
  ctx.restore();
}

/** Pfützen auf dem Boden bei Regen (mit kleinen Ringen) */
export function drawPuddles(ctx: CanvasRenderingContext2D, t: number) {
  const puddles: [number, number, number][] = [[24, 43.5, 3], [40, 45.5, 2.5], [10, 46, 2]];
  for (const [cx, cy, rx] of puddles) {
    for (let y = cy - 0.5; y <= cy + 0.5; y += 0.5)
      for (let x = cx - rx; x <= cx + rx; x += 0.5) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / 0.9) ** 2 > 1) continue;
        ctx.fillStyle = y < cy ? 'rgba(150,180,215,0.75)' : 'rgba(120,150,190,0.75)';
        ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 0.5, 0.5);
      }
    if (Math.floor(t / 400 + cx) % 3 === 0) {
      ctx.fillStyle = 'rgba(230,240,255,0.8)';
      ctx.fillRect(Math.round((cx - 0.5) * 2) / 2, cy - 0.5, 1.5, 0.5);
    }
  }
}

/** Regentropfen, die an der Fensterscheibe herunterlaufen */
export function drawWindowDrops(ctx: CanvasRenderingContext2D, win: { x: number; y: number; w: number; h: number }, t: number) {
  ctx.fillStyle = 'rgba(220,235,255,0.7)';
  for (let i = 0; i < 7; i++) {
    const x = win.x + 1 + ((i * 5.3) % (win.w - 2));
    const y = win.y + ((t / 1000) * (1.5 + (i % 3)) + i * 4) % win.h;
    ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 0.5, 1);
  }
}
