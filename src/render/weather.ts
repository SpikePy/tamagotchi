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

/** Wetter für einen Zeitpunkt: wie viele Wolken (1–5) und wie viel Wind (Einheiten/s, mit Richtung) */
export function weatherAt(clock: number): { clouds: number; wind: number } {
  const r = rand(Math.floor(clock / PERIOD) * 7919 + 13);
  const clouds = 1 + Math.floor(r() * 5); // 1..5
  const strength = 0.4 + r() * 1.4; // 0,4..1,8
  const dir = r() < 0.75 ? 1 : -1; // meist West -> Ost
  return { clouds, wind: strength * dir };
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
    for (const c of this.list) cloud(ctx, c.x, c.y, c.size);
    ctx.restore();
  }

  private make(area: { y: number; h: number }, x: number): Cloud {
    const size = 0.6 + Math.random() * 0.7;
    return { x, y: area.y + 2 + Math.random() * Math.max(1, area.h * 0.45), size, speed: 0.7 + size * 0.4 };
  }
}
