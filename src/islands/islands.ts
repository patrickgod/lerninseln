// The islands, the houses on them, and the shape of the land itself.
//
// An island is a grid of tiles with a land mask. The mask is generated
// rather than authored, from a per-island seed, so the two islands have
// genuinely different coastlines without anybody drawing one — and so a
// third island costs a seed rather than a morning.
//
// House positions are FIXED, not generated. A child who learns that the
// Haus der verliebten Zahlen is the one by the little bay should find it
// there tomorrow; a house that wanders is a house you cannot remember.
// Decorations, which the child places, are the part that moves.

import { t } from '../core/i18n.js';
import { deco } from './decor.js';
import { ausbauOf } from '../core/state.js';

/**
 * The island is a GRID x GRID field of tiles.
 *
 * Fifty-one, and it is bigger than the screen. That is new.
 *
 * It went 13 -> 17 -> 23 -> 51, and the last step is a different kind
 * of step from the others. Up to 23, the island had to FIT: `fit` chose
 * whatever integer zoom put the whole thing on screen, so wanting a
 * bigger island meant accepting smaller sprites, and 23 was the largest
 * island that still drew at 2x on an iPad.
 *
 * The zoom is a constant now (`render.NAH`) and the camera moves, so
 * the size of an island and the size of its sprites have stopped being
 * the same decision. What holds it together is `render.klemme`, which
 * keeps the view rectangle inside the land: pan as hard as you like and
 * the island is still under your thumb, so there is no ocean to get
 * lost in.
 *
 * Measured on the real page at 1080x810, at the building zoom:
 *
 *   GRID   screenfuls (w x h)                free tiles
 *    23    0.7x0.6  0.9x0.5  0.8x0.7         165 / 170 / 183
 *    45    1.3x1.2  1.7x1.1  1.5x1.3         655 / 675 / 737
 *    51    1.5x1.4  1.9x1.2  1.7x1.5         841 / 864 / 951
 *    57    1.7x1.5  2.1x1.4  1.9x1.7        1059 /1089 /1189
 *
 * 51 rather than 57 because of the ROUNDEST island, not the widest one.
 * Die Insel der Zahlen is the one his son uses most and it is the least
 * elongated, so it is always the first to stop being worth panning: at
 * 45 it moves half a screen, at 51 it moves a screen and a half. Past
 * that the gain is more empty coast rather than more to do.
 *
 * ~850 free tiles is deliberately more than anyone will fill. A cozy
 * builder that can be finished stops being a place and becomes a task
 * list, and the child builds outward from the houses in the middle,
 * where the camera starts.
 */
export const GRID = 51;

/**
 * The grid the house positions below were authored on.
 *
 * The coastline is a radius function of angle that the tile grid only
 * samples, so changing GRID changes the resolution of the coast and not
 * its shape. House positions are plain tile coordinates and do NOT have
 * that property, so they are scaled from the grid they were drawn on.
 * Without this, growing the island moves every house towards the
 * north-west corner and some of them into the sea.
 */
const AUTHORED_GRID = 17;

export interface HouseDef {
  id: string;
  island: string;
  /** i18n key for the name shown to a parent. */
  nameKey: string;
  /** i18n key for the line the voice speaks when the house opens. */
  sayKey: string;
  /** Lifetime stars needed. 0 means it is there from the first minute. */
  stars: number;
  /** Fixed tile. */
  x: number;
  y: number;
  /** Which roof family, so a street is not all one colour. */
  roof: 'terracotta' | 'slate' | 'thatch';
  /** Which task generator runs inside. */
  game: string;
}

export interface IslandDef {
  id: string;
  nameKey: string;
  subKey: string;
  sayKey: string;
  seed: number;
  /** The island's own greenery, so the two do not look identical. */
  tree: 'leaf' | 'pine';
}

export const ISLANDS: IslandDef[] = [
  {
    id: 'mathe',
    nameKey: 'island.mathe',
    subKey: 'island.mathe.sub',
    sayKey: 'say.mathe',
    seed: 1337,
    tree: 'leaf',
  },
  {
    id: 'sprache',
    nameKey: 'island.sprache',
    subKey: 'island.sprache.sub',
    sayKey: 'say.sprache',
    seed: 8821,
    tree: 'pine',
  },
  {
    id: 'entdecker',
    nameKey: 'island.entdecker',
    subKey: 'island.entdecker.sub',
    sayKey: 'say.entdecker',
    seed: 4711,
    tree: 'leaf',
  },
];

/**
 * The houses, in the order they arrive.
 *
 * The star thresholds are a ladder with a deliberately flat first rung:
 * the second house arrives after about two good rounds, so a child who
 * plays twice on the first evening sees the island change. After that
 * the gaps widen, because the point of the later ones is to still be
 * arriving in three weeks.
 */
export const HOUSES: HouseDef[] = [
  // ------------------------------------------- Die Insel der Zahlen
  {
    id: 'verliebte-zahlen',
    island: 'mathe',
    nameKey: 'house.verliebteZahlen',
    sayKey: 'say.verliebteZahlen',
    stars: 0,
    x: 8, y: 8,
    roof: 'terracotta',
    game: 'verliebte-zahlen',
  },
  // Straight out of the homework folder. Dice come first because they
  // are the easiest thing in the box — a child who has just met the app
  // should meet something they can already do — and the cube bars come
  // next because five and six come apart long before ten does.
  {
    id: 'wuerfelbilder',
    island: 'mathe',
    nameKey: 'house.wuerfelbilder',
    sayKey: 'say.wuerfelbilder',
    stars: 4,
    x: 12, y: 4,
    roof: 'thatch',
    game: 'wuerfelbilder',
  },
  {
    id: 'steckwuerfel',
    island: 'mathe',
    nameKey: 'house.steckwuerfel',
    sayKey: 'say.steckwuerfel',
    stars: 8,
    x: 11, y: 10,
    roof: 'slate',
    game: 'steckwuerfel',
  },
  {
    id: 'zahlenhaus',
    island: 'mathe',
    nameKey: 'house.zahlenhaus',
    sayKey: 'say.zahlenhaus',
    stars: 25,
    x: 5, y: 12,
    roof: 'terracotta',
    game: 'zahlenhaus',
  },
  {
    id: 'zahlenreihe',
    island: 'mathe',
    nameKey: 'house.zahlenreihe',
    sayKey: 'say.zahlenreihe',
    stars: 12,
    x: 5, y: 9,
    roof: 'slate',
    game: 'zahlenreihe',
  },
  {
    id: 'rechenmeister',
    island: 'mathe',
    nameKey: 'house.rechenmeister',
    sayKey: 'say.rechenmeister',
    stars: 40,
    x: 11, y: 7,
    roof: 'thatch',
    game: 'rechenmeister',
  },
  {
    id: 'zwillinge',
    island: 'mathe',
    nameKey: 'house.zwillinge',
    sayKey: 'say.zwillinge',
    stars: 80,
    x: 6, y: 5,
    roof: 'terracotta',
    game: 'zwillinge',
  },

  // ------------------------------------------ Die Insel der Sprache
  {
    id: 'anlaute',
    island: 'sprache',
    nameKey: 'house.anlaute',
    sayKey: 'say.anlaute',
    stars: 0,
    x: 8, y: 8,
    roof: 'slate',
    game: 'anlaute',
  },
  {
    id: 'silben',
    island: 'sprache',
    nameKey: 'house.silben',
    sayKey: 'say.silben',
    stars: 20,
    x: 10, y: 11,
    roof: 'thatch',
    game: 'silben',
  },
  {
    id: 'schreiben',
    island: 'sprache',
    nameKey: 'house.schreiben',
    sayKey: 'say.schreiben',
    stars: 40,
    x: 7, y: 12,
    roof: 'thatch',
    game: 'schreiben',
  },
  {
    id: 'silbenwoerter',
    island: 'sprache',
    nameKey: 'house.silbenwoerter',
    sayKey: 'say.silbenwoerter',
    stars: 70,
    x: 13, y: 9,
    roof: 'terracotta',
    game: 'silbenwoerter',
  },
  {
    id: 'woerter',
    island: 'sprache',
    nameKey: 'house.woerter',
    sayKey: 'say.woerter',
    stars: 100,
    x: 5, y: 9,
    roof: 'terracotta',
    game: 'woerter',
  },
  {
    id: 'reime',
    island: 'sprache',
    nameKey: 'house.reime',
    sayKey: 'say.reime',
    stars: 130,
    x: 11, y: 6,
    roof: 'slate',
    game: 'reime',
  },

  // ---------------------------------------- Die Insel der Entdecker
  //
  // Both houses here ask their question with NO WORDS ON SCREEN AT
  // ALL — the shape is named aloud and the answers are drawings. That
  // makes this the island a child who cannot read a single letter can
  // play completely unaided, which is why it is the third one and not
  // the last.
  {
    id: 'formen',
    island: 'entdecker',
    nameKey: 'house.formen',
    sayKey: 'say.formen',
    stars: 0,
    x: 8, y: 8,
    roof: 'terracotta',
    game: 'formen',
  },
  {
    id: 'richtungen',
    island: 'entdecker',
    nameKey: 'house.richtungen',
    sayKey: 'say.richtungen',
    stars: 15,
    x: 5, y: 10,
    roof: 'thatch',
    game: 'richtungen',
  },
  {
    id: 'muster',
    island: 'entdecker',
    nameKey: 'house.muster',
    sayKey: 'say.muster',
    stars: 30,
    x: 11, y: 11,
    roof: 'slate',
    game: 'muster',
  },
];

// Authored on a 17x17 grid; see AUTHORED_GRID. Done once, here, rather
// than at every read, so the rest of the file can go on treating h.x
// and h.y as plain tile coordinates.
{
  const c = (GRID - 1) / 2;
  const ca = (AUTHORED_GRID - 1) / 2;
  // A fixed multiple of the AUTHORED offset rather than a multiple of
  // the grid, so that growing the island does not fling the houses at
  // the coast. The houses were packed for a smaller island and their
  // name plates overlapped each other in the middle; on an island that
  // now starts empty, four overlapping labels are the only thing on it.
  // `land()` pulls land up under any house that ends over water, so
  // spreading them is safe.
  // Wider now that the island is. The houses are still a village in
  // the middle rather than scattered to the four coasts — a child
  // arrives among them and builds outward — but they are far enough
  // apart that finding one is a small journey.
  // 2.0, not 2.7. Four houses at 2.7 were a comfortable village; seven
  // of them were spread across more than a screenful, so two were off
  // the edge when the island opened and a child had to go looking for a
  // house they did not know existed. At 2.0 every house on every island
  // is on screen at once when you arrive.
  const streuung = 2.0;
  void ca;
  for (const h of HOUSES) {
    h.x = Math.round((h.x - ca) * streuung + c);
    h.y = Math.round((h.y - ca) * streuung + c);
  }
  // Two houses on one tile is a house you cannot open, and it would
  // only show up on the island nobody looked at.
  const seen = new Set<string>();
  for (const h of HOUSES) {
    const k = `${h.island}:${h.x},${h.y}`;
    if (seen.has(k)) throw new Error(`two houses on ${k}`);
    seen.add(k);
  }
}

export function island(id: string): IslandDef {
  const found = ISLANDS.find((i) => i.id === id);
  if (!found) throw new Error(`unknown island ${id}`);
  return found;
}

export function housesOn(islandId: string): HouseDef[] {
  return HOUSES.filter((h) => h.island === islandId);
}

export function houseName(h: HouseDef): string {
  return t(h.nameKey);
}

/** Houses whose star threshold has been passed. */
export function unlockedHouses(islandId: string, stars: number): HouseDef[] {
  return housesOn(islandId).filter((h) => stars <= 0 ? h.stars === 0 : h.stars <= stars);
}

/** The next house that is still ahead, if there is one. */
export function nextHouse(islandId: string, stars: number): HouseDef | null {
  return housesOn(islandId)
    .filter((h) => h.stars > stars)
    .sort((a, b) => a.stars - b.stars)[0] ?? null;
}

// ------------------------------------------------------------ the land

/** Deterministic per-island randomness. Same island, same coastline. */
function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a ^= a << 13; a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5; a >>>= 0;
    return a / 4294967296;
  };
}

export interface Land {
  /** GRID*GRID, true where there is land. */
  mask: boolean[];
  /** GRID*GRID, true where the tile is sand rather than grass. */
  sand: boolean[];
}

/**
 * How much further out the coast goes per expansion, in the same
 * normalised units the coastline is defined in.
 *
 * 0.09 is a measurement: it is the smallest step that adds a visible
 * ring of land all the way round rather than a scatter of new tiles at
 * the widest points, and four of them take the island from 0.80 to
 * 1.16, which is as far as a 51x51 grid can carry a round island.
 */
export const AUSBAU_SCHRITT = 0.09;

/** What each expansion costs, in sweets. Four of them, and no more. */
export const AUSBAU_PREISE = [45, 90, 170, 300];

export function ausbauPreis(islandId: string): number | null {
  const n = ausbauOf(islandId);
  return n < AUSBAU_PREISE.length ? AUSBAU_PREISE[n] : null;
}

// Keyed by island AND by how far it has been extended, because the
// coastline is the one thing in this file that is allowed to change.
const cache = new Map<string, Land>();

/** Throw the coastline away, so the next draw builds the bigger one. */
export function vergissLand(islandId: string): void {
  for (const k of [...cache.keys()]) if (k.startsWith(`${islandId}:`)) cache.delete(k);
}

/**
 * The coastline, as a per-tile distance field rather than a per-tile
 * coin flip.
 *
 * ART-DIRECTION.md's rule: an edge that looks like Minecraft is a
 * SAMPLING bug. So the shape is a smooth radius function of the angle —
 * a few sine terms with per-island phases — and the tile grid only
 * samples it. Changing GRID changes the resolution of the coast, not
 * its shape, which is the property that says the shape is real.
 */
export function land(islandId: string): Land {
  const key = `${islandId}:${ausbauOf(islandId)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const def = island(islandId);
  const r = rng(def.seed);
  const c = (GRID - 1) / 2;

  // Three lobes at random phases. Enough to make a bay and a headland,
  // few enough that the island still reads as one round thing a child
  // can hold in their head.
  const lobes = [0, 1, 2].map(() => ({
    k: 2 + Math.floor(r() * 3),
    phase: r() * Math.PI * 2,
    amp: 0.10 + r() * 0.13,
  }));

  const mask: boolean[] = new Array(GRID * GRID).fill(false);
  const sand: boolean[] = new Array(GRID * GRID).fill(false);

  const radiusAt = (angle: number): number => {
    let rad = 0.80 + AUSBAU_SCHRITT * ausbauOf(islandId);
    for (const l of lobes) rad += Math.sin(angle * l.k + l.phase) * l.amp;
    return rad;
  };

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = (x - c) / c;
      const dy = (y - c) / c;
      const d = Math.sqrt(dx * dx + dy * dy);
      const a = Math.atan2(dy, dx);
      const edge = radiusAt(a);
      const i = y * GRID + x;
      if (d <= edge) {
        mask[i] = true;
        // The beach is the outer band of the same field, so it follows
        // every wiggle of the coast for free.
        sand[i] = d > edge - 0.155;
      }
    }
  }

  // Every house must stand on land, whatever the coastline did. A house
  // in the sea is the kind of bug that only shows up on the island
  // nobody tested, so it is fixed here rather than hoped away.
  for (const h of housesOn(islandId)) {
    const i = h.y * GRID + h.x;
    mask[i] = true;
    sand[i] = false;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const nx = h.x + ox, ny = h.y + oy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      mask[ny * GRID + nx] = true;
    }
  }

  const out = { mask, sand };
  cache.set(key, out);
  return out;
}

export function isLand(islandId: string, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
  return land(islandId).mask[y * GRID + x];
}

export function isSand(islandId: string, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
  return land(islandId).sand[y * GRID + x];
}

/**
 * A tile a decoration may be placed on: land, not a house, and not the
 * beach unless the thing being placed belongs on a beach.
 *
 * The sand ring is between a quarter and a third of every island and
 * nothing could ever go on it, which made it the largest unusable part
 * of the place a child is meant to be filling. It is still not a lawn —
 * a windmill on the beach would look wrong — but the sandcastle belongs
 * there and nowhere else.
 */
export function buildable(islandId: string, x: number, y: number, decoId?: string): boolean {
  if (!isLand(islandId, x, y)) return false;
  if (isSand(islandId, x, y) && !(decoId && deco(decoId)?.sand)) return false;
  // Every house tile is off limits, including the ones that are still
  // only a marked-out plot — a cherry tree planted where the Haus der
  // Zwillinge is going to be would have to be bulldozed later, and
  // nothing in this app takes anything away from a child.
  return !housesOn(islandId).some((h) => h.x === x && h.y === y);
}
