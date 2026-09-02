// The save game, and every rule about what may change it.
//
// Two currencies, and the difference between them is the whole design:
//
//   STERNE are a record of what has been learned. They only ever go UP.
//   Nothing spends them, nothing takes them away, and a house unlocks
//   when the total passes its threshold. A child who has 40 stars will
//   have 40 stars tomorrow and the day after; there is no streak to
//   break and no decay to come back to.
//
//   BONBONS are spendable, and they are the only number in the app that
//   can go down — because the child chose to spend them on a cherry
//   tree. That is agency, not punishment, and it is the one place where
//   a falling number is a good thing.
//
// DESIGN.md argues against points, and it is right about the points it
// means: a score that measures you, a streak that punishes the day you
// were ill, three stars out of three that turn practice into a graded
// test. None of those exist here. What exists is a currency that buys
// the island, so the reward for learning is still a thing you look at
// and own — the same argument DESIGN.md makes for the meadow, with the
// child holding the brush.

import * as storage from './storage.js';

export interface Placed {
  /** Decoration id, from `islands/decor.ts`. */
  d: string;
  /** Island id. */
  i: string;
  /** Tile coordinates on that island. */
  x: number;
  y: number;
}

export interface Save {
  v: 1;
  /** Lifetime stars. Never decreases. Unlocks houses. */
  stars: number;
  /** Spendable sweets. */
  candy: number;
  /** Houses whose unlock has already been ANNOUNCED, so it happens once. */
  seen: string[];
  /** Everything the child has placed. */
  placed: Placed[];
  /**
   * Per-fact strength, 0..3. The scheduler asks for the weakest facts
   * more often. Keyed by a fact id like `vz:7` or `an:Apfel`.
   *
   * Deliberately small and forgiving: a miss drops a fact by one, never
   * to below zero, and the number is never shown to anybody.
   */
  strength: Record<string, number>;
  sound: boolean;
  voice: boolean;
}

function fresh(): Save {
  return {
    v: 1,
    stars: 0,
    candy: 0,
    seen: [],
    placed: [],
    strength: {},
    sound: true,
    voice: true,
  };
}

let state: Save = fresh();

/**
 * Read the save, repairing anything that is missing.
 *
 * A save written by an older build must never crash a newer one: the
 * child would lose an island because a field was renamed. So every
 * field is defaulted individually rather than the whole object being
 * trusted.
 */
export function init(): Save {
  const text = storage.load();
  if (!text) {
    state = fresh();
    return state;
  }
  try {
    const raw = JSON.parse(text) as Partial<Save>;
    const base = fresh();
    state = {
      v: 1,
      stars: typeof raw.stars === 'number' && raw.stars >= 0 ? Math.floor(raw.stars) : base.stars,
      candy: typeof raw.candy === 'number' && raw.candy >= 0 ? Math.floor(raw.candy) : base.candy,
      seen: Array.isArray(raw.seen) ? raw.seen.filter((s) => typeof s === 'string') : base.seen,
      placed: Array.isArray(raw.placed)
        ? raw.placed.filter(
            (p): p is Placed =>
              !!p && typeof p.d === 'string' && typeof p.i === 'string'
              && typeof p.x === 'number' && typeof p.y === 'number')
        : base.placed,
      strength: raw.strength && typeof raw.strength === 'object' ? { ...raw.strength } : base.strength,
      sound: raw.sound !== false,
      voice: raw.voice !== false,
    };
  } catch {
    state = fresh();
  }
  return state;
}

export function get(): Save {
  return state;
}

function flush(): void {
  storage.save(JSON.stringify(state));
}

// ------------------------------------------------------------- earning

/** Award stars. Never negative, never a no-op that pretends to be one. */
export function addStars(n: number): void {
  if (n <= 0) return;
  state.stars += Math.floor(n);
  flush();
}

export function addCandy(n: number): void {
  if (n <= 0) return;
  state.candy += Math.floor(n);
  flush();
}

/** Spend. Returns false and changes nothing if there is not enough. */
export function spendCandy(n: number): boolean {
  if (n <= 0 || state.candy < n) return false;
  state.candy -= Math.floor(n);
  flush();
  return true;
}

// ------------------------------------------------------------ mastery

export function strengthOf(fact: string): number {
  return state.strength[fact] ?? 0;
}

/**
 * Record how a fact went.
 *
 * Up by one on a hit, capped at 3. Down by one on a miss, floored at 0.
 * Nothing here is ever shown to the child; it exists so that 7+3, which
 * takes weeks, comes round more often than 5+5, which takes a day.
 */
export function recordFact(fact: string, correct: boolean): void {
  const cur = state.strength[fact] ?? 0;
  state.strength[fact] = correct ? Math.min(3, cur + 1) : Math.max(0, cur - 1);
  flush();
}

// ------------------------------------------------------------ building

export function place(p: Placed): void {
  state.placed.push(p);
  flush();
}

export function removeAt(island: string, x: number, y: number): Placed | null {
  const i = state.placed.findIndex((p) => p.i === island && p.x === x && p.y === y);
  if (i < 0) return null;
  const [gone] = state.placed.splice(i, 1);
  flush();
  return gone;
}

export function placedOn(island: string): Placed[] {
  return state.placed.filter((p) => p.i === island);
}

export function occupied(island: string, x: number, y: number): boolean {
  return state.placed.some((p) => p.i === island && p.x === x && p.y === y);
}

// ------------------------------------------------------------ settings

export function setSound(on: boolean): void {
  state.sound = on;
  flush();
}

export function setVoice(on: boolean): void {
  state.voice = on;
  flush();
}

/** Mark a house's arrival as announced, so it is celebrated exactly once. */
export function markSeen(id: string): void {
  if (state.seen.includes(id)) return;
  state.seen.push(id);
  flush();
}

export function hasSeen(id: string): boolean {
  return state.seen.includes(id);
}

export function reset(): void {
  storage.clear();
  state = fresh();
  flush();
}
