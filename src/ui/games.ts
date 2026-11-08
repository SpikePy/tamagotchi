import { beep } from '../audio';
import { Pet } from '../engine/state';
import { drawMap, hiResCanvas, petSprite } from '../render/pixels';
import type { SpeciesDef } from '../species/types';
import { h } from './dom';

export type GameId = 'timing' | 'guess' | 'catch' | 'throw' | 'memory';
export const GAME_IDS: GameId[] = ['timing', 'guess', 'catch', 'throw', 'memory'];

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

  const { map: sprite, colors: pal } = petSprite(sp, pet);
  const pw = sprite[0].length;
  const ph = sprite.length;
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
      items.push({ x: rand(2, W - 5), y: -3, bad: Math.random() < 0.3, v: rand(18, 30) });
      spawnIn = rand(0.5, 1.0);
    }
    for (const it of items) it.y += it.v * dt;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.y + 3 >= H - ph && it.y < H - ph + 4 && it.x + 3 > px && it.x < px + pw) {
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
      ctx.fillStyle = it.bad ? '#6b5a2e' : '#d8263b';
      ctx.fillRect(Math.round(it.x), Math.round(it.y), 3, 3);
      ctx.fillStyle = '#3d7a2a';
      ctx.fillRect(Math.round(it.x) + 1, Math.round(it.y) - 1, 1, 1);
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
