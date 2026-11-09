import { beep } from '../audio';
import { Pet } from '../engine/state';
import { drawMap, drawPixels, hiResCanvas, petSprite } from '../render/pixels';
import { ITEMS, itemSize, type Item } from './gamesprites';
import type { SpeciesDef } from '../species/types';
import { h } from './dom';

export type GameId = 'catch' | 'dodge' | 'sneak' | 'rhythm' | 'timing' | 'throw' | 'memory' | 'guess';
export const GAME_IDS: GameId[] = ['catch', 'dodge', 'sneak', 'rhythm', 'timing', 'throw', 'memory', 'guess'];

type Done = (won: boolean) => void;
type Cleanup = () => void;

export function runGame(id: GameId, root: HTMLElement, sp: SpeciesDef, pet: Pet, done: Done): Cleanup {
  root.replaceChildren();
  const theme = sp.games[id];
  root.append(h('p', { class: 'game-desc' }, theme.description));
  const area = h('div', { class: 'game-area' });
  root.append(area);
  return GAMES[id](area, sp, pet, done);
}

const GAMES: Record<GameId, (el: HTMLElement, sp: SpeciesDef, pet: Pet, done: Done) => Cleanup> = {
  timing: timingGame,
  guess: guessGame,
  catch: catchGame,
  throw: throwGame,
  memory: memoryGame,
  dodge: dodgeGame,
  sneak: sneakGame,
  rhythm: rhythmGame,
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// 1) Timing: Im richtigen Moment tippen (3 Versuche, 2 Treffer gewinnen)
function timingGame(el: HTMLElement, sp: SpeciesDef, _pet: Pet, done: Done): Cleanup {
  const theme = sp.games.timing;
  const info = h('div', { class: 'game-info' });
  const track = h('div', { class: 'meter' });
  const zone = h('div', { class: 'meter-zone' });
  const marker = h('div', { class: 'meter-marker' });
  track.append(zone, marker);
  const btn = h('button', { class: 'big-btn' }, 'Jetzt!');
  el.append(info, track, btn);

  let tries = 0;
  let hits = 0;
  let pos = 0;
  let dir = 1;
  let zoneStart = 0;
  const zoneW = 16;
  let speed = 55;
  let raf = 0;
  let last = performance.now();
  let locked = false;

  const newRound = () => {
    zoneStart = rand(10, 100 - zoneW - 5);
    zone.style.left = `${zoneStart}%`;
    zone.style.width = `${zoneW}%`;
    info.textContent = `Versuch ${tries + 1}/3 · Treffer: ${hits} · ${theme.target} raschelt …`;
    locked = false;
  };
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    if (!locked) {
      pos += dir * speed * dt;
      if (pos > 100) (pos = 100), (dir = -1);
      if (pos < 0) (pos = 0), (dir = 1);
      marker.style.left = `${pos}%`;
    }
    raf = requestAnimationFrame(loop);
  };
  btn.onclick = () => {
    if (locked) return;
    locked = true;
    tries++;
    const hit = pos >= zoneStart - 1 && pos <= zoneStart + zoneW + 1;
    if (hit) hits++;
    hit ? beep.ok() : beep.no();
    info.textContent = hit ? theme.hit : 'Daneben!';
    speed += 15;
    setTimeout(() => {
      if (hits >= 2) return done(true);
      if (tries - hits >= 2) return done(false);
      newRound();
    }, 800);
  };
  newRound();
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

// 2) Links oder rechts? (5 Runden, 3 richtig gewinnen)
function guessGame(el: HTMLElement, sp: SpeciesDef, _pet: Pet, done: Done): Cleanup {
  const theme = sp.games.guess;
  const hide = theme.hideEmoji;
  const info = h('div', { class: 'game-info' });
  const row = h('div', { class: 'guess-row' });
  const left = h('button', { class: 'guess-btn' }, hide);
  const right = h('button', { class: 'guess-btn' }, hide);
  row.append(left, right);
  el.append(info, row);
  let round = 0;
  let right_ = 0;
  let timer = 0;
  const update = () => (info.textContent = `Runde ${round + 1}/5 · richtig: ${right_} · Hinter welchem ${theme.hideout}?`);
  const pick = (side: 0 | 1) => {
    if (timer) return;
    const where = Math.random() < 0.5 ? 0 : 1;
    const ok = side === where;
    if (ok) right_++;
    ok ? beep.ok() : beep.no();
    const btns = [left, right];
    btns[where].textContent = theme.petEmoji;
    info.textContent = ok ? 'Gefunden!' : 'Falsch, dort war er!';
    round++;
    timer = window.setTimeout(() => {
      timer = 0;
      btns.forEach((b) => (b.textContent = hide));
      if (right_ >= 3) return done(true);
      if (round - right_ >= 3) return done(false);
      update();
    }, 900);
  };
  left.onclick = () => pick(0);
  right.onclick = () => pick(1);
  update();
  return () => clearTimeout(timer);
}

// 3) Fangen (20 s, 8 Punkte gewinnen)
function catchGame(el: HTMLElement, sp: SpeciesDef, pet: Pet, done: Done): Cleanup {
  const theme = sp.games.catch;
  const W = 64;
  const H = 56;
  const info = h('div', { class: 'game-info' });
  const canvas = hiResCanvas(W, H, 'game-canvas');
  const ctrl = h('div', { class: 'ctrl-row' });
  const lb = h('button', { class: 'big-btn' }, '◀');
  const rb = h('button', { class: 'big-btn' }, '▶');
  ctrl.append(lb, rb);
  el.append(info, canvas, ctrl);
  const ctx = canvas.getContext('2d')!;

  const { map: sprite, colors: pal, w: pw, h: ph } = petSprite(sp, pet);
  const good = ITEMS[theme.goodItem] ?? ITEMS.berry;
  const bad = ITEMS[theme.badItem] ?? ITEMS.rottenBerry;
  const GK = 1.5;
  let px = (W - pw) / 2;
  let move = 0;
  let score = 0;
  const items: { x: number; y: number; bad: boolean; v: number }[] = [];
  let spawnIn = 0;
  const end = performance.now() + 20_000;
  let last = performance.now();
  let raf = 0;
  let finished = false;

  const hold = (b: HTMLElement, d: number) => {
    b.onpointerdown = (e) => ((move = d), e.preventDefault());
    b.onpointerup = b.onpointerleave = b.onpointercancel = () => move === d && (move = 0);
  };
  hold(lb, -1);
  hold(rb, 1);
  canvas.onpointermove = canvas.onpointerdown = (e) => {
    if (e.pointerType === 'mouse' && e.buttons === 0 && e.type === 'pointermove') return;
    const r = canvas.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width) * W - pw / 2;
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') move = e.type === 'keydown' ? -1 : 0;
    if (e.key === 'ArrowRight') move = e.type === 'keydown' ? 1 : 0;
  };
  window.addEventListener('keydown', key);
  window.addEventListener('keyup', key);

  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    px = Math.max(0, Math.min(W - pw, px + move * 45 * dt));
    spawnIn -= dt;
    if (spawnIn <= 0) {
      items.push({ x: rand(1, W - 9), y: -6, bad: Math.random() < 0.3, v: rand(18, 30) });
      spawnIn = rand(0.5, 1.0);
    }
    for (const it of items) it.y += it.v * dt;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const [iw, ih] = itemSize(it.bad ? bad : good).map((v) => v * GK);
      if (it.y + ih >= H - ph && it.y < H - ph + 4 && it.x + iw - 1 > px && it.x + 1 < px + pw) {
        score += it.bad ? -1 : 1;
        it.bad ? beep.no() : beep.click();
        items.splice(i, 1);
      } else if (it.y > H) items.splice(i, 1);
    }

    ctx.fillStyle = '#cfe8b8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7da55a';
    ctx.fillRect(0, H - 2, W, 2);
    for (const it of items) {
      const spr = it.bad ? bad : good;
      drawItem(ctx, spr, it.x, it.y, false, GK);
    }
    drawMap(ctx, sprite, pal, px, H - ph - 1);
    const left = Math.max(0, Math.ceil((end - now) / 1000));
    info.textContent = `${theme.good}: ${score} / 8 · noch ${left} s · ${theme.bad} = −1`;
    if (now >= end && !finished) {
      finished = true;
      return done(score >= 8);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', key);
    window.removeEventListener('keyup', key);
  };
}

// 4) Werfen: Winkel und Kraft stoppen, Bach meiden (3 Würfe, einer >= 70 m gewinnt)
function throwGame(el: HTMLElement, sp: SpeciesDef, _pet: Pet, done: Done): Cleanup {
  const theme = sp.games.throw;
  const water = theme.water;
  const info = h('div', { class: 'game-info' });
  const field = h('div', { class: 'field' });
  const river = h('div', { class: 'field-river' });
  const goal = h('div', { class: 'field-goal' });
  const thing = h('div', { class: 'field-thing' }, theme.emoji);
  field.append(river, goal, thing);
  const meter = h('div', { class: 'meter' });
  const marker = h('div', { class: 'meter-marker' });
  meter.append(marker);
  const btn = h('button', { class: 'big-btn' }, 'Stopp!');
  el.append(info, field, meter, btn);

  const RIVER: [number, number] = [52, 66];
  river.style.left = `${RIVER[0]}%`;
  river.style.width = `${RIVER[1] - RIVER[0]}%`;
  goal.style.left = '70%';

  let attempt = 0;
  let phase: 'angle' | 'power' | 'wait' = 'angle';
  let angle = 0;
  let val = 0;
  let dir = 1;
  let raf = 0;
  let last = performance.now();
  let timer = 0;

  const label = () =>
    (info.textContent = `Wurf ${attempt + 1}/3 · ${phase === 'angle' ? 'Winkel wählen' : 'Kraft wählen'} · Ziel: über 70 m, nicht in den ${water}`);
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    if (phase !== 'wait') {
      val += dir * (phase === 'angle' ? 70 : 90) * dt;
      if (val > 100) (val = 100), (dir = -1);
      if (val < 0) (val = 0), (dir = 1);
      marker.style.left = `${val}%`;
    }
    raf = requestAnimationFrame(loop);
  };
  btn.onclick = () => {
    if (phase === 'angle') {
      angle = (val / 100) * 90;
      phase = 'power';
      val = 0;
      dir = 1;
      label();
      return;
    }
    if (phase !== 'power') return;
    phase = 'wait';
    const dist = Math.round((val / 100) * 100 * Math.sin((2 * angle * Math.PI) / 180));
    thing.style.left = `${Math.max(4, Math.min(97, dist))}%`;
    const wet = dist >= RIVER[0] && dist <= RIVER[1];
    const won = !wet && dist >= 70;
    info.textContent = wet ? `Platsch! In den ${water} (${dist} m).` : `${theme.thing}: ${dist} m`;
    won ? beep.win() : beep.click();
    attempt++;
    timer = window.setTimeout(() => {
      if (won) return done(true);
      if (attempt >= 3) return done(false);
      thing.style.left = '4%';
      phase = 'angle';
      val = 0;
      dir = 1;
      label();
    }, 1300);
  };
  label();
  raf = requestAnimationFrame(loop);
  return () => (cancelAnimationFrame(raf), clearTimeout(timer));
}

// 5) Spuren lesen: Folge nachtippen (Längen 3, 4, 5)
function memoryGame(el: HTMLElement, _sp: SpeciesDef, _pet: Pet, done: Done): Cleanup {
  const info = h('div', { class: 'game-info' });
  const grid = h('div', { class: 'paw-grid' });
  const pads = [0, 1, 2, 3].map((i) => {
    const b = h('button', { class: `paw paw-${i}` }, '🐾');
    grid.append(b);
    return b;
  });
  el.append(info, grid);
  let seq: number[] = [];
  let input = 0;
  let accepting = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

  const flash = (i: number) => {
    pads[i].classList.add('lit');
    beep.click();
    later(() => pads[i].classList.remove('lit'), 350);
  };
  const play = () => {
    accepting = false;
    info.textContent = `Merk dir die Spur (${seq.length} Schritte) …`;
    seq.forEach((i, k) => later(() => flash(i), 600 + k * 600));
    later(() => {
      accepting = true;
      input = 0;
      info.textContent = 'Jetzt du!';
    }, 600 + seq.length * 600);
  };
  const next = () => {
    if (seq.length === 0) seq = [0, 0, 0].map(() => Math.floor(Math.random() * 4));
    else seq.push(Math.floor(Math.random() * 4));
    play();
  };
  pads.forEach((b, i) => {
    b.onclick = () => {
      if (!accepting) return;
      flash(i);
      if (seq[input] !== i) {
        accepting = false;
        info.textContent = 'Falsche Spur!';
        beep.no();
        later(() => done(false), 800);
        return;
      }
      input++;
      if (input === seq.length) {
        accepting = false;
        if (seq.length >= 5) return later(() => done(true), 500);
        info.textContent = 'Richtig!';
        later(next, 700);
      }
    };
  });
  next();
  return () => timers.forEach(clearTimeout);
}

// ---------- gemeinsame Helfer für Canvas-Spiele ----------

function canvasGame(el: HTMLElement, W: number, H: number) {
  const info = h('div', { class: 'game-info' });
  const canvas = hiResCanvas(W, H, 'game-canvas');
  el.append(info, canvas);
  return { info, canvas, ctx: canvas.getContext('2d')! };
}

function drawItem(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number, flip = false, k = 1) {
  if (!flip && k === 1) return drawPixels(ctx, it.map, it.colors, x, y);
  const [w] = itemSize(it);
  ctx.save();
  ctx.translate(flip ? x + w * k : x, y);
  ctx.scale(flip ? -k : k, k);
  drawPixels(ctx, it.map, it.colors, 0, 0);
  ctx.restore();
}

/** kleiner Pixeltext-Ersatz: Sprechblase mit Zeichen */
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = '#fff') {
  ctx.save();
  ctx.font = 'bold 5px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000a';
  ctx.fillText(text, x + 0.4, y + 0.4);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 6) Ausweichen: Seele im Kampfkasten, Angriffswellen überstehen (16 s, 3 Leben)
function dodgeGame(el: HTMLElement, sp: SpeciesDef, pet: Pet, done: Done): Cleanup {
  const theme = sp.games.dodge;
  const W = 64;
  const H = 56;
  const { info, canvas, ctx } = canvasGame(el, W, H);
  const box = { x: 8, y: 14, w: 48, h: 38 };
  const shots = theme.items.map((k) => ITEMS[k] ?? ITEMS.drop);
  const soulIt = ITEMS.heart;
  const DK = 1.4;
  const [sw, sh] = itemSize(soulIt).map((v) => v * 1.2);
  const soul = { x: box.x + box.w / 2 - sw / 2, y: box.y + box.h / 2 - sh / 2 };
  const { map: face, colors: pal, w: fw, h: fh } = petSprite(sp, pet, { mood: 'ok' });
  type Shot = { x: number; y: number; vx: number; vy: number; it: Item; wob?: number; t0: number };
  const list: Shot[] = [];
  let hp = 3;
  let hurtUntil = 0;
  const LEN = 16_000;
  const start = performance.now();
  let last = start;
  let raf = 0;
  let finished = false;
  let wave = -1;
  let waveT = 0;
  let spawnIn = 0;
  const keys = new Set<string>();
  const key = (e: KeyboardEvent) => {
    if (!/^Arrow|^[wasd]$/.test(e.key)) return;
    e.preventDefault();
    e.type === 'keydown' ? keys.add(e.key) : keys.delete(e.key);
  };
  window.addEventListener('keydown', key);
  window.addEventListener('keyup', key);
  // Ziehen: Seele folgt relativ zur Fingerbewegung
  let drag: { x: number; y: number } | null = null;
  const toUnits = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  canvas.onpointerdown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = toUnits(e);
  };
  canvas.onpointermove = (e) => {
    if (!drag) return;
    const q = toUnits(e);
    soul.x += (q.x - drag.x) * 1.2;
    soul.y += (q.y - drag.y) * 1.2;
    drag = q;
  };
  canvas.onpointerup = canvas.onpointercancel = () => (drag = null);

  const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const spawn = (now: number) => {
    const it = rnd(shots);
    const [iw, ih] = itemSize(it).map((v) => v * DK);
    switch (wave % 4) {
      case 0: // Regen von oben
        list.push({ x: rand(box.x, box.x + box.w - iw), y: box.y - ih, vx: 0, vy: rand(16, 24), it, t0: now });
        spawnIn = 0.28;
        break;
      case 1: {
        // Reihe von der Seite mit einer Lücke
        const fromLeft = Math.random() < 0.5;
        const gap = Math.floor(rand(0, 5));
        for (let i = 0; i < 6; i++) {
          if (i === gap) continue;
          list.push({ x: fromLeft ? box.x - iw : box.x + box.w, y: box.y + 1 + i * (box.h / 6), vx: fromLeft ? 20 : -20, vy: 0, it, t0: now });
        }
        spawnIn = 1.1;
        break;
      }
      case 2: {
        // gezielte Würfe vom Rand
        const side = Math.floor(rand(0, 4));
        const x = side === 0 ? box.x : side === 1 ? box.x + box.w - iw : rand(box.x, box.x + box.w - iw);
        const y = side === 2 ? box.y : side === 3 ? box.y + box.h - ih : rand(box.y, box.y + box.h - ih);
        const dx = soul.x - x;
        const dy = soul.y - y;
        const d = Math.hypot(dx, dy) || 1;
        list.push({ x, y, vx: (dx / d) * 22, vy: (dy / d) * 22, it, t0: now });
        spawnIn = 0.5;
        break;
      }
      default: // Schlangenlinien
        list.push({ x: rand(box.x + 4, box.x + box.w - iw - 4), y: box.y - ih, vx: 0, vy: 14, it, wob: rand(6, 12), t0: now });
        spawnIn = 0.4;
    }
  };

  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const el_ = now - start;
    // Wellen à 4 s, mit kurzer Pause dazwischen
    const w = Math.floor(el_ / 4000);
    if (w !== wave) {
      wave = w;
      waveT = 0;
      spawnIn = 0.6;
    }
    waveT += dt;
    spawnIn -= dt;
    if (spawnIn <= 0 && waveT < 3.4 && el_ < LEN - 600) spawn(now);
    const sp_ = 30;
    if (keys.has('ArrowLeft') || keys.has('a')) soul.x -= sp_ * dt;
    if (keys.has('ArrowRight') || keys.has('d')) soul.x += sp_ * dt;
    if (keys.has('ArrowUp') || keys.has('w')) soul.y -= sp_ * dt;
    if (keys.has('ArrowDown') || keys.has('s')) soul.y += sp_ * dt;
    soul.x = Math.max(box.x + 0.5, Math.min(box.x + box.w - sw - 0.5, soul.x));
    soul.y = Math.max(box.y + 0.5, Math.min(box.y + box.h - sh - 0.5, soul.y));
    const cx = soul.x + sw / 2;
    const cy = soul.y + sh / 2;
    for (let i = list.length - 1; i >= 0; i--) {
      const s_ = list[i];
      s_.x += s_.vx * dt + (s_.wob ? Math.cos((now - s_.t0) / 250) * s_.wob * dt : 0);
      s_.y += s_.vy * dt;
      const [iw, ih] = itemSize(s_.it).map((v) => v * DK);
      if (s_.x < box.x - 12 || s_.x > box.x + box.w + 12 || s_.y < box.y - 12 || s_.y > box.y + box.h + 4) {
        list.splice(i, 1);
        continue;
      }
      if (now > hurtUntil && Math.abs(s_.x + iw / 2 - cx) < (iw + sw) / 2 - 1.2 && Math.abs(s_.y + ih / 2 - cy) < (ih + sh) / 2 - 1.2) {
        hp--;
        hurtUntil = now + 1100;
        beep.no();
        list.splice(i, 1);
      }
    }
    // Zeichnen
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, W, H);
    // das eigene Tier schaut von oben zu und feuert an
    const k = Math.min(1, 12 / fh);
    ctx.save();
    ctx.translate(W / 2 - (fw * k) / 2, 0.5 - (Math.floor(now / 300) % 2) * 0.25);
    ctx.scale(k, k);
    drawMap(ctx, face, pal, 0, 0);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(box.x - 1, box.y - 1, box.w + 2, 1);
    ctx.fillRect(box.x - 1, box.y + box.h, box.w + 2, 1);
    ctx.fillRect(box.x - 1, box.y - 1, 1, box.h + 2);
    ctx.fillRect(box.x + box.w, box.y - 1, 1, box.h + 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    for (const s_ of list) drawItem(ctx, s_.it, s_.x, s_.y, false, DK);
    ctx.restore();
    if (now > hurtUntil || Math.floor(now / 90) % 2) drawItem(ctx, soulIt, soul.x, soul.y, false, 1.2);
    const left = Math.max(0, Math.ceil((LEN - el_) / 1000));
    info.textContent = `${'❤'.repeat(Math.max(0, hp))}${'♡'.repeat(3 - Math.max(0, hp))} · noch ${left} s · ziehen oder Pfeiltasten`;
    if (!finished && (hp <= 0 || el_ >= LEN)) {
      finished = true;
      return done(hp > 0);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', key);
    window.removeEventListener('keyup', key);
  };
}

// 7) Anschleichen: nur bewegen, solange die Beute wegschaut (30 s, 2 Fehler erlaubt)
function sneakGame(el: HTMLElement, sp: SpeciesDef, pet: Pet, done: Done): Cleanup {
  const theme = sp.games.sneak;
  const W = 64;
  const H = 40;
  const { info, canvas, ctx } = canvasGame(el, W, H);
  canvas.style.aspectRatio = `${W} / ${H}`;
  const btn = h('button', { class: 'big-btn' }, 'Gedrückt halten zum Schleichen');
  el.append(btn);
  const prey = ITEMS[theme.preyItem] ?? ITEMS.mouse;
  const QK = 2;
  const [qw0, qh0] = itemSize(prey);
  const qw = qw0 * QK;
  const qh = qh0 * QK;
  const base = petSprite(sp, pet);
  const pk = Math.min(1, 16 / base.h);
  const pw = base.w * pk;
  const ph = base.h;
  const groundY = H - 5;
  const preyX = W - qw - 3;
  let px = 2;
  let moving = false;
  let strikes = 0;
  let state: 'away' | 'warn' | 'look' = 'away';
  let stateUntil = performance.now() + rand(1500, 2800);
  let caughtAt = -1e9;
  let won = -1;
  const LEN = 30_000;
  const start = performance.now();
  let last = start;
  let raf = 0;
  let finished = false;
  const down = (e: Event) => ((moving = true), e.preventDefault());
  const up = () => (moving = false);
  btn.onpointerdown = canvas.onpointerdown = down;
  btn.onpointerup = btn.onpointerleave = btn.onpointercancel = canvas.onpointerup = canvas.onpointerleave = up;
  const key = (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    moving = e.type === 'keydown';
  };
  window.addEventListener('keydown', key);
  window.addEventListener('keyup', key);

  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (won < 0) {
      if (now >= stateUntil) {
        if (state === 'away') (state = 'warn'), (stateUntil = now + rand(380, 650));
        else if (state === 'warn') (state = 'look'), (stateUntil = now + rand(900, 1800));
        else (state = 'away'), (stateUntil = now + rand(900, 2600));
      }
      if (moving && now - caughtAt > 900) {
        px += 9 * dt;
        if (state === 'look') {
          strikes++;
          caughtAt = now;
          beep.no();
          px = Math.max(2, px - 12);
          moving = false;
        }
      }
      if (px + pw >= preyX + 1) {
        won = now;
        beep.ok();
      }
    }
    // Zeichnen: Wiese
    ctx.fillStyle = '#cfe8b8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9cc77a';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#7da55a';
    for (let x = 0; x < W; x += 3) ctx.fillRect(x + ((x * 7) % 2), groundY - 0.5 - ((x * 13) % 3) * 0.25, 0.5, 1);
    // Beute
    const looking = state === 'look' && won < 0;
    const hop = won >= 0 ? -Math.min(6, (now - won) / 60) : state === 'warn' ? Math.sin(now / 40) * 0.3 : 0;
    drawItem(ctx, prey, preyX, groundY - qh + hop, !looking, QK);
    if (state === 'warn' && won < 0) bubble(ctx, preyX + qw / 2, groundY - qh - 1.5, '?', '#ffe08a');
    if (looking && now - caughtAt >= 900) bubble(ctx, preyX + qw / 2, groundY - qh - 1.5, '!', '#fff');
    // Tier
    const crouch = moving && won < 0 ? Math.floor(now / 160) % 2 * 0.25 : 0;
    const jump = won >= 0 ? -Math.sin(Math.min(1, (now - won) / 500) * Math.PI) * 6 : 0;
    const img = petSprite(sp, pet, { mood: now - caughtAt < 900 ? 'sad' : won >= 0 ? 'joy' : 'ok', eyesClosed: false });
    ctx.save();
    ctx.translate(px, groundY - ph * pk + 0.5 + crouch + jump);
    ctx.scale(pk, pk);
    drawMap(ctx, img.map, img.colors, 0, 0, img.facesLeft);
    ctx.restore();
    if (now - caughtAt < 900) bubble(ctx, preyX + qw / 2, groundY - qh - 6, '!!', '#ff5a5a');
    const left = Math.max(0, Math.ceil((LEN - (now - start)) / 1000));
    info.textContent = won >= 0 ? `${theme.hit}` : `${looking ? `Stillhalten! ${theme.prey} schaut!` : `${theme.prey} schaut weg …`} · Fehler ${strikes}/2 · ${left} s`;
    if (!finished && (strikes >= 2 || now - start >= LEN || (won >= 0 && now - won > 900))) {
      finished = true;
      return done(won >= 0);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', key);
    window.removeEventListener('keyup', key);
  };
}

// 8) Rhythmus: im Takt tippen, wenn die Noten den Kreis erreichen (mind. 75 % treffen)
function rhythmGame(el: HTMLElement, sp: SpeciesDef, pet: Pet, done: Done): Cleanup {
  const theme = sp.games.rhythm;
  const W = 64;
  const H = 40;
  const { info, canvas, ctx } = canvasGame(el, W, H);
  canvas.style.aspectRatio = `${W} / ${H}`;
  const btn = h('button', { class: 'big-btn' }, theme.sound);
  el.append(btn);
  const note = ITEMS[theme.noteItem] ?? ITEMS.berry;
  const NK = 1.5;
  const [nw0, nh0] = itemSize(note);
  const nw = nw0 * NK;
  const nh = nh0 * NK;
  const BEAT = 0.6; // 100 BPM
  const LEAD = 4 * BEAT; // Vorzähler
  const bars = [
    [1, 0, 1, 0],
    [1, 0, 1, 0],
    [1, 1, 1, 0],
    [1, 0, 1, 1],
    [1, 0, 0.5, 1],
    [1, 1, 0, 1],
    [0.5, 0.5, 1, 0],
    [1, 1, 1, 1],
  ];
  // Notenzeiten in Sekunden (0.5 = Achtelnote dazu)
  const times: number[] = [];
  bars.forEach((bar, b) =>
    bar.forEach((v, i) => {
      const t = LEAD + (b * 4 + i) * BEAT;
      if (v) times.push(t);
      if (v === 0.5) times.push(t + BEAT / 2);
    }),
  );
  times.sort((a, b) => a - b);
  const judged: (null | 'perfect' | 'good' | 'miss')[] = times.map(() => null);
  const END = LEAD + bars.length * 4 * BEAT + 1;
  const hitX = 12;
  const laneY = 28;
  const SPEED = 26; // Einheiten pro Sekunde
  const start = performance.now();
  let raf = 0;
  let finished = false;
  let lastTick = -1;
  let flash: { at: number; text: string; color: string } | null = null;
  let happyUntil = 0;
  const tap = (e?: Event) => {
    e?.preventDefault();
    const t = (performance.now() - start) / 1000;
    let best = -1;
    let bd = 1;
    times.forEach((nt, i) => {
      if (judged[i] === null && Math.abs(nt - t) < bd) (bd = Math.abs(nt - t)), (best = i);
    });
    if (best < 0 || bd > 0.2) return;
    judged[best] = bd < 0.08 ? 'perfect' : bd < 0.16 ? 'good' : 'miss';
    if (judged[best] === 'miss') {
      beep.no();
      flash = { at: performance.now(), text: 'Daneben', color: '#ff8a8a' };
    } else {
      beep.note(judged[best] === 'perfect' ? 1047 : 880);
      flash = { at: performance.now(), text: judged[best] === 'perfect' ? 'Perfekt!' : 'Gut', color: judged[best] === 'perfect' ? '#ffe066' : '#c8f0a0' };
      happyUntil = performance.now() + 250;
    }
  };
  btn.onpointerdown = tap;
  canvas.onpointerdown = tap;
  const key = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') tap(e);
  };
  window.addEventListener('keydown', key);

  const loop = (now: number) => {
    const t = (now - start) / 1000;
    // verpasste Noten
    times.forEach((nt, i) => {
      if (judged[i] === null && t - nt > 0.2) {
        judged[i] = 'miss';
        flash = { at: now, text: 'Verpasst', color: '#ff8a8a' };
      }
    });
    const beat = Math.floor(t / BEAT);
    if (beat !== lastTick) {
      lastTick = beat;
      if (t < LEAD) beep.note(beat === 3 ? 1319 : 660);
      else if (t < END - 1) beep.tick();
    }
    // Bühne
    ctx.fillStyle = '#2a1e3a';
    ctx.fillRect(0, 0, W, H);
    // Scheinwerfer im Takt
    const pulse = 1 - ((t % BEAT) / BEAT);
    ctx.fillStyle = `rgba(255,230,160,${0.08 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(hitX - 2, 0);
    ctx.lineTo(hitX + 2, 0);
    ctx.lineTo(hitX + 12, H);
    ctx.lineTo(hitX - 12, H);
    ctx.fill();
    ctx.fillStyle = '#4a3a5e';
    ctx.fillRect(0, laneY - 0.5, W, 1);
    // Zielkreis
    ctx.strokeStyle = pulse > 0.7 ? '#ffe066' : '#d8c8ff';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(hitX, laneY, 4 + pulse * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    // Noten
    times.forEach((nt, i) => {
      if (judged[i] && judged[i] !== 'miss') return;
      const x = hitX + (nt - t) * SPEED;
      if (x < -6 || x > W + 4) return;
      ctx.globalAlpha = judged[i] === 'miss' ? 0.35 : 1;
      drawItem(ctx, note, x - nw / 2, laneY - nh / 2, false, NK);
      ctx.globalAlpha = 1;
    });
    // das Tier wippt im Takt
    const img = petSprite(sp, pet, { mood: 'joy', eyesClosed: now < happyUntil });
    const bob = pulse > 0.75 ? -0.75 : 0;
    const pk = Math.min(1, 13 / img.h);
    ctx.save();
    ctx.translate(hitX - (img.w * pk) / 2, laneY - 5.5 - img.h * pk + bob);
    ctx.scale(pk, pk);
    drawMap(ctx, img.map, img.colors, 0, 0, img.facesLeft);
    ctx.restore();
    if (t < LEAD) bubble(ctx, W / 2 + 6, 14, String(4 - Math.min(3, beat)), '#ffe066');
    if (flash && now - flash.at < 450) bubble(ctx, hitX + 12, laneY - 7 - (now - flash.at) / 120, flash.text, flash.color);
    if (now < happyUntil) bubble(ctx, hitX + 10, 8, theme.sound, '#fff');
    const hits = judged.filter((j) => j === 'perfect' || j === 'good').length;
    const need = Math.ceil(times.length * 0.75);
    info.textContent = t < LEAD ? 'Gleich geht’s los – tippe im Takt, wenn eine Note im Kreis ist!' : `Treffer: ${hits} / ${need} nötig (von ${times.length})`;
    if (!finished && t >= END) {
      finished = true;
      return done(hits >= need);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', key);
  };
}
