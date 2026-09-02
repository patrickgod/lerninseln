// Juice: particles, screen shake, and the little pops that make an
// action feel like it landed.
//
// Patrick asked for this in one word — "Juice. Animationen, subtile
// Sound Effekte, Screen Shakes" — and the whole difficulty is that this
// app has a rule that seems to forbid it. ART-DIRECTION.md: *nothing
// flashes, pulses or demands. When something wants attention it ARRIVES
// rather than alerts.*
//
// That rule is not against juice. It is against juice that the app
// starts on its own. So the line drawn here, and it decides every
// decision below:
//
//   Every effect is a RESPONSE to something the child just did.
//   Nothing here ever fires while they are sitting still, and nothing
//   fires on a mistake.
//
// A screen shake on a wrong answer is the single most obvious thing to
// build and it would be a small act of violence against a six-year-old
// who is already unsure. So the shake fires on a house arriving, on a
// building being placed, and on finishing a round — on the good things
// only, where it reads as weight rather than as alarm.

import { P, INK, shade } from './palette.js';
import { Px } from './px.js';

export type Kind = 'herz' | 'stern' | 'staub' | 'konfetti' | 'funke';

interface Particle {
  kind: Kind;
  x: number; y: number;
  vx: number; vy: number;
  /** Seconds remaining, and the life it started with. */
  t: number; t0: number;
  /** Which baked sprite variant. */
  v: number;
  rot: number;
  spin: number;
  gravity: number;
}

const parts: Particle[] = [];

/** Hard ceiling, so a stuck loop cannot melt an old iPad. */
const MAX = 220;

// ------------------------------------------------------------ sprites

const baked = new Map<string, HTMLCanvasElement>();

function sprite(kind: Kind, v: number): HTMLCanvasElement {
  const key = `${kind}:${v}`;
  const hit = baked.get(key);
  if (hit) return hit;

  let p: Px;
  switch (kind) {
    case 'herz': {
      p = new Px(7, 7);
      const ramp = v === 0 ? P.blossom : P.fruit;
      const M = ['.#.#.', '#####', '#####', '.###.', '..#..'];
      for (let j = 0; j < M.length; j++) {
        for (let i = 0; i < M[j].length; i++) {
          if (M[j][i] !== '#') continue;
          p.set(i + 1, j + 1, shade(ramp, i + j < 3 ? 3 : 2));
        }
      }
      break;
    }
    case 'stern': {
      p = new Px(7, 7);
      p.line(1, 3, 5, 3, shade(P.glow, 3));
      p.line(3, 1, 3, 5, shade(P.glow, 3));
      p.set(3, 3, shade(P.glow, 4));
      p.set(2, 2, shade(P.glow, 2));
      p.set(4, 2, shade(P.glow, 2));
      p.set(2, 4, shade(P.glow, 2));
      p.set(4, 4, shade(P.glow, 2));
      break;
    }
    case 'funke': {
      p = new Px(3, 3);
      p.set(1, 1, shade(P.glow, 4));
      p.set(0, 1, shade(P.glow, 3));
      p.set(2, 1, shade(P.glow, 3));
      p.set(1, 0, shade(P.glow, 3));
      p.set(1, 2, shade(P.glow, 3));
      break;
    }
    case 'staub': {
      // Dust is the one that sells weight. Three sizes, all the same
      // warm grey-brown as the ground it came off.
      const r = 2 + v;
      p = new Px(r * 2 + 1, r * 2 + 1);
      p.ellipse(r, r, r, r, shade(P.sand, 3));
      p.ellipse(r - 1, r - 1, Math.max(1, r - 1), Math.max(1, r - 1), shade(P.sand, 4));
      break;
    }
    default: {
      // Confetti: little rectangles in the island's own colours, so a
      // celebration still belongs to the same world.
      const ramps = [P.blossom, P.glow, P.backlit, P.chalk, P.citrus, P.plum];
      p = new Px(5, 4);
      p.rect(0, 0, 5, 4, shade(ramps[v % ramps.length], 2));
      p.rect(0, 0, 5, 2, shade(ramps[v % ramps.length], 3));
      break;
    }
  }
  const c = p.toCanvas();
  baked.set(key, c);
  return c;
}

// ------------------------------------------------------------- spawning

interface BurstOpts {
  /** How many. */
  n?: number;
  /** Initial speed in CSS px per second. */
  speed?: number;
  /** Upward bias, for things that should fountain rather than scatter. */
  up?: number;
  gravity?: number;
  life?: number;
  /** Drawing scale, so a burst can match the pixel scale of its screen. */
  scale?: number;
}

let drawScale = 3;

/** Match the particle scale to the island's zoom, so nothing looks alien. */
export function setScale(s: number): void {
  drawScale = Math.max(2, Math.min(5, s));
}

export function burst(kind: Kind, x: number, y: number, o: BurstOpts = {}): void {
  const n = o.n ?? 12;
  const speed = o.speed ?? 170;
  const up = o.up ?? 0.5;
  for (let i = 0; i < n; i++) {
    if (parts.length >= MAX) return;
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.45 + Math.random() * 0.75);
    const life = (o.life ?? 0.9) * (0.7 + Math.random() * 0.6);
    parts.push({
      kind,
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - up * speed,
      t: life, t0: life,
      v: Math.floor(Math.random() * 3),
      rot: 0,
      spin: (Math.random() - 0.5) * 6,
      gravity: o.gravity ?? 420,
    });
  }
  void o.scale;
}

/**
 * Confetti from the top of the screen. Used once, when a round is
 * finished, and deliberately slow: this is a shower, not a party
 * popper.
 */
export function rain(w: number, n = 40): void {
  for (let i = 0; i < n; i++) {
    if (parts.length >= MAX) return;
    const life = 2.2 + Math.random() * 1.4;
    parts.push({
      kind: 'konfetti',
      x: Math.random() * w,
      y: -20 - Math.random() * 120,
      vx: (Math.random() - 0.5) * 40,
      vy: 90 + Math.random() * 70,
      t: life, t0: life,
      v: Math.floor(Math.random() * 6),
      rot: Math.random() * 6,
      spin: (Math.random() - 0.5) * 5,
      gravity: 12,
    });
  }
}

/**
 * A thing that flies from A to B and then is gone — a star heading for
 * the counter it is about to be added to.
 *
 * Kept as its own list rather than as a particle with a target,
 * because the arrival has to fire a callback and particles do not have
 * one.
 */
interface Flyer {
  kind: Kind;
  x: number; y: number;
  x0: number; y0: number;
  x1: number; y1: number;
  t: number; dur: number;
  done: () => void;
}

const flyers: Flyer[] = [];

export function fly(
  kind: Kind, from: { x: number; y: number }, to: { x: number; y: number },
  delay: number, done: () => void,
): void {
  flyers.push({
    kind,
    x: from.x, y: from.y,
    x0: from.x, y0: from.y,
    x1: to.x, y1: to.y,
    t: -delay, dur: 0.55,
    done,
  });
}

// ---------------------------------------------------------------- shake

let shakeAmount = 0;
let shakeUntil = 0;

/**
 * Shake the screen.
 *
 * `strength` is in CSS pixels and should stay small — 3 is a building
 * landing, 6 is a house arriving, and there is no case for more. A
 * child holding a tablet 30cm from their face feels a 3px shake
 * perfectly well, and anything that actually looks dramatic in a
 * screenshot is far too much in the hand.
 */
export function shake(strength = 4, seconds = 0.32): void {
  shakeAmount = Math.max(shakeAmount, strength);
  shakeUntil = Math.max(shakeUntil, performance.now() + seconds * 1000);
}

/** The current offset, for whatever is applying it. */
export function shakeOffset(now: number): { x: number; y: number } {
  if (now >= shakeUntil || shakeAmount <= 0) {
    shakeAmount = 0;
    return { x: 0, y: 0 };
  }
  const left = (shakeUntil - now) / 1000;
  const a = shakeAmount * Math.min(1, left / 0.32);
  // Two different frequencies, so it is a shake and not a wobble.
  return {
    x: Math.round(Math.sin(now * 0.09) * a),
    y: Math.round(Math.cos(now * 0.13) * a * 0.7),
  };
}

// ---------------------------------------------------------------- frame

export function update(dt: number): void {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t -= dt;
    if (p.t <= 0) { parts.splice(i, 1); continue; }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.spin * dt;
  }
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.t += dt;
    if (f.t < 0) continue;
    const k = Math.min(1, f.t / f.dur);
    // Ease out, with a little overshoot at the start so the star leaps
    // away from where it was born rather than sliding.
    const e = 1 - Math.pow(1 - k, 3);
    f.x = f.x0 + (f.x1 - f.x0) * e;
    f.y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 70;
    if (k >= 1) {
      f.done();
      flyers.splice(i, 1);
    }
  }
}

export function draw(ctx: CanvasRenderingContext2D): void {
  if (!parts.length && !flyers.length) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const p of parts) {
    const c = sprite(p.kind, p.v);
    // Fade out over the last third, by dropping whole steps of alpha
    // rather than smoothly — a pixel sprite that dissolves smoothly
    // stops looking like a pixel sprite.
    const k = p.t / p.t0;
    ctx.globalAlpha = k > 0.35 ? 1 : k > 0.2 ? 0.66 : 0.33;
    const s = drawScale;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (p.kind === 'konfetti') ctx.rotate(p.rot);
    ctx.drawImage(c, Math.round(-c.width * s / 2), Math.round(-c.height * s / 2),
      c.width * s, c.height * s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const f of flyers) {
    if (f.t < 0) continue;
    const c = sprite(f.kind, 0);
    const s = drawScale + 1;
    ctx.drawImage(c, Math.round(f.x - c.width * s / 2), Math.round(f.y - c.height * s / 2),
      c.width * s, c.height * s);
  }
  ctx.restore();
}

export function busy(): boolean {
  return parts.length > 0 || flyers.length > 0;
}

/** Wipe everything. Used on a screen change, so nothing is left over. */
export function clear(): void {
  parts.length = 0;
  flyers.length = 0;
  shakeAmount = 0;
  void INK;
}
