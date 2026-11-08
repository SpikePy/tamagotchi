// Retro-Piepser über WebAudio.
let ctx: AudioContext | null = null;
let enabled = true;

export function setSound(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.value = 0.06;
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur);
}

export const beep = {
  click: () => tone(1400, 0, 0.04),
  ok: () => (tone(988, 0, 0.07), tone(1319, 0.08, 0.1)),
  no: () => (tone(330, 0, 0.12), tone(247, 0.13, 0.15)),
  call: () => [0, 0.15, 0.3].forEach((d) => tone(1760, d, 0.08)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.09)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.12)),
};
