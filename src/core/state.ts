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
import { DECOR } from '../islands/decor.js';

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
  /**
   * How many rounds each house has been played, keyed by house id.
   *
   * A record of work, and the only counter in the app besides the two
   * currencies. It never goes down and it is never compared to anything
   * — not to a target, not to another child, not to yesterday. What it
   * does is give a house a LEVEL, which changes how the house looks on
   * the island and how wide a range of numbers it asks about.
   */
  rounds: Record<string, number>;
  /**
   * How far each island has been extended, keyed by island id.
   *
   * The endgame. An island is finite, and a child who has filled theirs
   * has finished the game — so the coast can be pushed outwards for
   * sweets, four times, and each time is an earthquake.
   */
  ausbau: Record<string, number>;
  sound: boolean;
  voice: boolean;
  /**
   * The child's name, if anybody typed one.
   *
   * Ownership is one of the strongest things there is at six, and this
   * is the cheapest possible version of it: the picker stops saying
   * "Wähle eine Insel" and starts saying "Die Inseln von Ben".
   *
   * Stays on the device with everything else. It is never sent
   * anywhere, because nothing here is.
   */
  name: string;
}

function fresh(): Save {
  return {
    v: 1,
    stars: 0,
    candy: 0,
    seen: [],
    placed: [],
    strength: {},
    rounds: {},
    ausbau: {},
    sound: true,
    voice: true,
    name: '',
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
    ladenGrundstock();
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
      rounds: raw.rounds && typeof raw.rounds === 'object' ? { ...raw.rounds } : base.rounds,
      ausbau: raw.ausbau && typeof raw.ausbau === 'object' ? { ...raw.ausbau } : base.ausbau,
      sound: raw.sound !== false,
      voice: raw.voice !== false,
      // Trimmed and capped: this goes into a heading, and a name that
      // is four hundred characters long would push the islands off the
      // screen.
      name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 16) : base.name,
    };
  } catch {
    state = fresh();
  }
  ladenGrundstock();
  return state;
}

/**
 * Everything the shop is ALREADY offering counts as seen.
 *
 * The "Neu" flash marks a thing that has just turned up. Without this,
 * a brand-new save opens the shop and every single card says Neu — and
 * a badge that is on everything is a decoration rather than a signal.
 * Worse, the first island Patrick's son opens after an update would
 * have thirty-five of them.
 *
 * So the moment a save is loaded, whatever is on the shelves now is
 * ordinary. Anything that arrives after this is genuinely new, and it
 * is the only thing that will ever wear the badge.
 */
function ladenGrundstock(): void {
  if (state.seen.includes('shop:init')) return;
  for (const d of DECOR) if (d.ab <= state.stars) state.seen.push(`shop:${d.id}`);
  state.seen.push('shop:init');
  flush();
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

/**
 * One more round of this house, please.
 *
 * Counted whatever the child scored, because it is a record of having
 * turned up rather than of having done well. AGENTS.md rule 10 cuts
 * both ways: a counter that only moves when you get things right is a
 * score with a friendly name.
 */
export function recordRound(houseId: string): void {
  state.rounds[houseId] = (state.rounds[houseId] ?? 0) + 1;
  flush();
}

export function roundsOf(houseId: string): number {
  return state.rounds[houseId] ?? 0;
}

/**
 * The level of a house: how worn its doorstep is.
 *
 * A gentle curve — 0, 2, 5, 9, 14, 20 rounds — so the first step comes
 * on the second evening and the last one takes a month. Capped at five
 * because a number that keeps climbing forever is a score.
 */
export function houseLevel(houseId: string): number {
  const n = roundsOf(houseId);
  const stufen = [2, 5, 9, 14, 20];
  let lvl = 0;
  for (const s of stufen) if (n >= s) lvl++;
  return lvl;
}

export function ausbauOf(islandId: string): number {
  return state.ausbau[islandId] ?? 0;
}

/** Push the coast out one step. Returns false if the sweets are short. */
export function ausbauen(islandId: string, preis: number): boolean {
  if (state.candy < preis) return false;
  state.candy -= preis;
  state.ausbau[islandId] = (state.ausbau[islandId] ?? 0) + 1;
  flush();
  return true;
}

export function setSound(on: boolean): void {
  state.sound = on;
  flush();
}

export function setVoice(on: boolean): void {
  state.voice = on;
  flush();
}

export function setName(n: string): void {
  state.name = n.trim().slice(0, 16);
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

/**
 * The pairs of numbers that make ten and are known BOTH ways.
 *
 * Both ways on purpose: 7 -> 3 and 3 -> 7 are different retrievals to a
 * beginner even though they are the same fact to us, and a child who
 * can do one and not the other has not learned the pair. So a pair only
 * counts when both of its facts have reached full strength — which is
 * three correct answers in a row, each.
 *
 * Returns the smaller number of each pair: 0 for 0+10, 3 for 3+7, and
 * 5 for 5+5, which is its own partner.
 */
export function bekanntePaare(): number[] {
  const out: number[] = [];
  for (let n = 0; n <= 5; n++) {
    if (strengthOf(`vz:${n}`) >= 3 && strengthOf(`vz:${10 - n}`) >= 3) out.push(n);
  }
  return out;
}

export function reset(): void {
  storage.clear();
  state = fresh();
  flush();
}
