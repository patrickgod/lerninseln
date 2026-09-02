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

/**
 * The island is a GRID x GRID field of tiles.
 *
 * Seventeen, not thirteen. The first prototype gave the child about
 * forty buildable tiles, which sounds like plenty and is not: houses
 * take four of them, the beach is not buildable, and a child who has
 * bought a dozen things has filled the place up. An island you cannot
 * keep decorating stops being yours and becomes a puzzle with a
 * solution.
 *
 * The camera fits the LAND rather than the grid, so a bigger island
 * costs a little zoom rather than a lot of empty sea.
 */
export const GRID = 17;

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
    id: 'woerter',
    island: 'sprache',
    nameKey: 'house.woerter',
    sayKey: 'say.woerter',
    stars: 45,
    x: 5, y: 9,
    roof: 'terracotta',
    game: 'woerter',
  },
  {
    id: 'reime',
    island: 'sprache',
    nameKey: 'house.reime',
    sayKey: 'say.reime',
    stars: 85,
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

const cache = new Map<string, Land>();

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
  const hit = cache.get(islandId);
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
    let rad = 0.80;
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
  cache.set(islandId, out);
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

/** A tile a decoration may be placed on: land, not sand, not a house. */
export function buildable(islandId: string, x: number, y: number): boolean {
  if (!isLand(islandId, x, y)) return false;
  if (isSand(islandId, x, y)) return false;
  // Every house tile is off limits, including the ones that are still
  // only a marked-out plot — a cherry tree planted where the Haus der
  // Zwillinge is going to be would have to be bulldozed later, and
  // nothing in this app takes anything away from a child.
  return !housesOn(islandId).some((h) => h.x === x && h.y === y);
}
