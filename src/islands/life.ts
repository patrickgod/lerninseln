// What lives on the island, and why it lives there.
//
// This is the idea from the brainstorm that mattered most: the island
// should react to what the CHILD built, with rules rather than scripts.
//
//   Three trees or more   → birds circle over the wood
//   A pond                → ducks paddle on it
//   A fence               → a sheep grazes inside it
//   A bench               → two people sit and talk
//   A vegetable patch     → hens scratch around it
//   A flower bed          → butterflies
//   The lighthouse        → a boat crosses the water
//
// The point is not decoration. It is that buying a pond and later
// noticing that ducks came ON THEIR OWN teaches a child something about
// cause and effect, where a duck you simply bought teaches them about a
// shop. It also means the expensive things keep paying out after the
// purchase, which is what stops a shop from being a slot machine.
//
// Two hard rules, both from Tidegarden's ART-DIRECTION.md, and both of
// them are what keep this cheap:
//
//   AMBIENT LIFE IS STATELESS. Every position here is a pure function
//   of the clock and an index. Nothing accumulates, nothing is born or
//   retired, screenshots are reproducible, and closing the app for a
//   week costs nothing to resume. If a creature needs memory, that is
//   a design smell, not a feature.
//
//   MOTION IS WEATHER, NOT ANIMATION. Animals move in BOUTS — a dash,
//   then a long stillness — rather than drifting constantly. A scene
//   where everything moves is noise and reads as cheap. The target is
//   a screen where, on any glance, one or two small things are
//   happening, and where watching for a minute reveals a dozen more.

import { GRID, isLand, isSand } from './islands.js';
import type { Placed } from '../core/state.js';

export interface Critter {
  /** Which sprite generator draws it. */
  art: 'sheep' | 'hen' | 'duck' | 'cat' | 'fox';
  /** Float tile position. */
  x: number;
  y: number;
  seed: number;
}

export interface Flyer {
  /** Float tile position; birds are drawn above everything. */
  x: number;
  y: number;
  /** Height above the ground in sprite pixels. */
  h: number;
  frame: number;
  seed: number;
}

function hash(n: number): number {
  let h = (n * 374761393) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * A creature pottering about near a home tile.
 *
 * Four waypoints in a small loop, and the creature is STILL for the
 * first sixty per cent of each leg and moves during the last forty.
 * That is the whole "bouts" rule in four lines, and it is the
 * difference between an island that feels alive and one that looks
 * like a screensaver.
 */
function potter(hx: number, hy: number, seed: number, time: number, period: number, range: number)
: { x: number; y: number } {
  const legs = 4;
  const t = ((time / period) + hash(seed) ) % 1;
  const leg = Math.floor(t * legs);
  const f = (t * legs) % 1;
  const way = (i: number): { x: number; y: number } => ({
    x: hx + (hash(seed * 31 + i) - 0.5) * 2 * range,
    y: hy + (hash(seed * 57 + i) - 0.5) * 2 * range,
  });
  const a = way(leg);
  const b = way((leg + 1) % legs);
  // still, then a smooth dash
  const k = Math.max(0, (f - 0.6) / 0.4);
  const e = k * k * (3 - 2 * k);
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
}

/** Everything walking about, given what has been built. */
export function critters(islandId: string, time: number, placed: Placed[], trees: number): Critter[] {
  const out: Critter[] = [];

  for (const p of placed) {
    switch (p.d) {
      case 'teich': {
        // Ducks come to a pond on their own. Two of them, circling
        // slowly, and they stay ON the water — a duck wandering off
        // across the grass would be a bug that reads as a bug.
        for (let i = 0; i < 2; i++) {
          const a = time * 0.22 + i * Math.PI + hash(p.x * 31 + p.y + i) * 6;
          out.push({
            art: 'duck',
            x: p.x + Math.cos(a) * 0.26,
            y: p.y + Math.sin(a) * 0.26,
            seed: p.x * 71 + p.y * 13 + i,
          });
        }
        break;
      }
      case 'zaun': {
        // A fence gets a sheep. It grazes inside the fence line, which
        // is why the range is small.
        const s = potter(p.x, p.y - 0.55, p.x * 7 + p.y * 3, time, 22, 0.45);
        out.push({ art: 'sheep', x: s.x, y: s.y, seed: p.x * 91 + p.y });
        break;
      }
      case 'beet': {
        // Hens scratch around a vegetable patch. Two, on different
        // phases, so they are never in step.
        for (let i = 0; i < 2; i++) {
          const s = potter(p.x, p.y, p.x * 13 + p.y * 5 + i * 97, time, 13 + i * 4, 0.75);
          out.push({ art: 'hen', x: s.x, y: s.y, seed: p.x * 41 + p.y + i });
        }
        break;
      }
      default:
        break;
    }
  }

  // A cat needs somewhere to sit, and a bench is exactly that. It
  // spends most of its time on the bench and occasionally strolls.
  const bench = placed.find((p) => p.d === 'bank');
  if (bench) {
    const s = potter(bench.x, bench.y - 0.2, bench.x * 5 + bench.y, time, 34, 0.8);
    out.push({ art: 'cat', x: s.x, y: s.y, seed: bench.x * 17 + bench.y });
  }

  // A wood brings a fox, but only a real wood: five trees or more, and
  // it keeps to the trees rather than crossing the lawn.
  if (trees >= 5) {
    const home = woodCentre(islandId);
    if (home) {
      const s = potter(home.x, home.y, 4242, time, 40, 1.6);
      out.push({ art: 'fox', x: s.x, y: s.y, seed: 4242 });
    }
  }

  return out;
}

/** Roughly where the island's trees are, for things that live in them. */
const woodCache = new Map<string, { x: number; y: number } | null>();
export function setWood(islandId: string, tiles: { x: number; y: number }[]): void {
  if (!tiles.length) { woodCache.set(islandId, null); return; }
  let sx = 0, sy = 0;
  for (const t of tiles) { sx += t.x; sy += t.y; }
  woodCache.set(islandId, { x: sx / tiles.length, y: sy / tiles.length });
}
function woodCentre(islandId: string): { x: number; y: number } | null {
  return woodCache.get(islandId) ?? null;
}

/**
 * Birds over the wood.
 *
 * Long periods, offset phases, and empty sky between them. Patrick's
 * rule for Tidegarden was "lots and lots of stuff going on, but only
 * from time to time, so people really discover the details" — that is a
 * rule about RHYTHM, and for birds it means most of the time there are
 * none.
 */
export function birds(islandId: string, time: number, trees: number): Flyer[] {
  if (trees < 3) return [];
  const home = woodCentre(islandId) ?? { x: (GRID - 1) / 2, y: (GRID - 1) / 2 };
  const out: Flyer[] = [];
  const flock = Math.min(4, 1 + Math.floor(trees / 5));
  for (let i = 0; i < flock; i++) {
    // Each bird has its own long cycle and is only in the air for part
    // of it, so the sky empties and fills again.
    const period = 46 + i * 11;
    const t = ((time / period) + hash(i * 977)) % 1;
    if (t > 0.55) continue;                 // resting, out of sight
    const k = t / 0.55;
    const a = k * Math.PI * 2 + i * 1.7;
    const r = 2.2 + hash(i * 31) * 1.6;
    out.push({
      x: home.x + Math.cos(a) * r,
      y: home.y + Math.sin(a) * r * 0.8,
      h: 34 + Math.sin(k * Math.PI) * 16 + i * 5,
      // Wingbeat: fast, and not in step between birds.
      frame: Math.floor(time * 6 + i * 0.5) % 2,
      seed: i,
    });
  }
  return out;
}

/** Butterflies over a flower bed. Small, close, and always in twos. */
export function butterflies(time: number, placed: Placed[]): Flyer[] {
  const out: Flyer[] = [];
  for (const p of placed) {
    if (p.d !== 'blumenbeet') continue;
    for (let i = 0; i < 2; i++) {
      const s = potter(p.x, p.y, p.x * 3 + p.y * 11 + i * 61, time, 7 + i * 2, 0.6);
      out.push({
        x: s.x, y: s.y,
        h: 12 + Math.sin(time * 2.2 + i * 2) * 5,
        frame: Math.floor(time * 9 + i) % 2,
        seed: p.x + p.y + i,
      });
    }
  }
  return out;
}

export interface Freund {
  /** The number on its front. */
  n: number;
  /** Which pair it belongs to, for the colour. */
  pair: number;
  x: number;
  y: number;
  frame: number;
}

/**
 * The Zahlenfreunde, wandering near the house they came out of.
 *
 * They move as PAIRS and they never separate: the second one follows
 * the first at a fixed offset, half a tile behind. That is the entire
 * point — a child looking at the island and seeing the 6 and the 4
 * walking together has just recalled the fact without being asked.
 *
 * They keep near their house rather than roaming the island, so that
 * the Haus der verliebten Zahlen slowly gathers a little crowd. It is
 * the progress bar, and it has no numbers on it.
 */
export function freunde(
  home: { x: number; y: number }, time: number, paare: number[],
): Freund[] {
  const out: Freund[] = [];
  const count = Math.max(1, paare.length);
  paare.forEach((n, i) => {
    // Each pair gets its OWN corner of the ground around the house,
    // spread around a ring. The first version sent every pair pottering
    // about the same spot and they piled up on each other and on the
    // house — six creatures in a heap is not six friendships, it is a
    // sprite bug.
    const a = (i / count) * Math.PI * 2 + 0.6;
    const hx = home.x + Math.cos(a) * 2.4;
    const hy = home.y + 1.1 + Math.sin(a) * 1.7;
    const s = potter(hx, hy, 7000 + n * 131, time, 26 + i * 5, 0.7);

    // A slow bob, so they are never completely still even between
    // bouts — a creature that freezes solid reads as a statue.
    const frame = Math.floor(time * 1.6 + i) % 2;
    out.push({ n, pair: n, x: s.x, y: s.y, frame });

    // The partner, standing beside them and never further. They are a
    // PAIR: the whole point is seeing the six and the four together.
    out.push({
      n: 10 - n,
      pair: n,
      x: s.x + 0.95,
      y: s.y + 0.06,
      frame: Math.floor(time * 1.6 + i + 0.5) % 2,
    });
  });
  return out;
}

/**
 * Fireflies, after dark.
 *
 * Added instead of making the night darker, and that is the whole
 * design argument. Night here is a step down the same ramps — an
 * honest palette move rather than a blue filter — so it can only ever
 * be so dark before every colour clamps to the bottom of its ramp and
 * the picture loses its contrast. Two more steps of gloom would have
 * made the island less legible for a six-year-old at bedtime and no
 * more atmospheric.
 *
 * What actually says "night" is small warm lights doing something a
 * daytime island cannot: lit windows, a lantern, and these. They
 * wander slowly, they blink, and there are never many.
 */
export function fireflies(islandId: string, time: number, trees: number): Flyer[] {
  if (trees < 3) return [];
  const home = woodCentre(islandId) ?? { x: (GRID - 1) / 2, y: (GRID - 1) / 2 };
  const out: Flyer[] = [];
  for (let i = 0; i < 7; i++) {
    // Blink: on for most of a long cycle, off for a beat. Offset per
    // fly, so they are never in step — a synchronised swarm reads as a
    // string of fairy lights.
    const blink = (time * 0.55 + hash(i * 733)) % 1;
    if (blink > 0.72) continue;
    const a = time * (0.10 + hash(i * 91) * 0.09) + i * 2.1;
    const r = 1.1 + hash(i * 17) * 2.4;
    out.push({
      x: home.x + Math.cos(a) * r + Math.sin(time * 0.7 + i) * 0.25,
      y: home.y + Math.sin(a * 0.8) * r * 0.8,
      h: 14 + Math.sin(time * 0.9 + i * 1.3) * 9,
      frame: 0,
      seed: i,
    });
  }
  return out;
}

/**
 * A boat, if there is a lighthouse to guide it.
 *
 * The single most satisfying thing the shop sells, and the reason it is
 * the most expensive: sixty sweets buys a tower, and then a boat starts
 * crossing the water that was empty before.
 */
export function boat(islandId: string, time: number, placed: Placed[]): { x: number; y: number } | null {
  if (!placed.some((p) => p.d === 'leuchtturm')) return null;
  // One crossing every three minutes, taking about fifty seconds of it.
  const period = 180;
  const t = (time / period) % 1;
  if (t > 0.28) return null;
  const k = t / 0.28;
  // Diagonally across the sea, well outside the island.
  const x = -3 + k * (GRID + 6);
  const y = GRID + 2.5 - k * 3;
  if (isLand(islandId, Math.round(x), Math.round(y))) return null;
  return { x, y };
}

/** True where a decoration would be standing in the water. */
export function onWater(islandId: string, x: number, y: number): boolean {
  const rx = Math.round(x), ry = Math.round(y);
  return !isLand(islandId, rx, ry) || isSand(islandId, rx, ry);
}
