// The palette. One closed set of ramps, and nothing may use a colour
// that is not in here.
//
// Lifted from Tidegarden's `src/pixel/palette.ts`, because it is the
// same person's world and the look should transfer wholesale. The rules
// it encodes are Tidegarden's rules, and they are the reason a cherry
// tree and a fox and a little house drawn months apart still read as
// ONE island:
//
//   Every material is a RAMP of 4-5 steps, dark to light, and shading
//   is stepping along the ramp — never multiplying a colour. Real ramps
//   shift hue as they darken: shadows cooler and slightly purple,
//   highlights warmer and slightly yellow.
//
//   There is ONE ink, so the whole picture is tied together by a single
//   darkest value.
//
//   Light comes from the upper LEFT, always.
//
// What is NEW here, and the reason this is not simply an import: a game
// for a six-year-old needs a handful of hues Tidegarden had no use for.
// A cherry tree in blossom, a fruit tree with fruit you can actually
// see at 32 pixels, and the sweets that are the currency. Those are
// added as proper ramps rather than as one-off bright colours, so they
// obey the same shading machinery as everything else.

/** A shade ramp, index 0 darkest. */
export type Ramp = readonly string[];

export const INK = '#241d2b';

export const P = {
  /** Deep sea to breaking foam. */
  sea: ['#173a5c', '#1f5479', '#2a7396', '#3f96ad', '#6cbcc4'] as Ramp,
  foam: ['#6cbcc4', '#9ad9d8', '#c9efe9', '#eafaf4'] as Ramp,

  /** Beach. Warm, and the brightest large surface on an island. */
  sand: ['#8a6c45', '#a98a5c', '#c9a875', '#e0c694', '#f0dcb0'] as Ramp,

  /** Meadow. The most-seen colour in the game, so it carries the mood. */
  grass: ['#2f5334', '#3f6c3a', '#548544', '#6da052', '#8cbc66'] as Ramp,
  /** Dry grass, for paths and worn ground. */
  dry: ['#5c5730', '#7a7040', '#9c8d52', '#bda96a'] as Ramp,

  /** Bare earth and trodden path. */
  earth: ['#4a3524', '#664a31', '#856245', '#a37e5c'] as Ramp,

  /** Stone: cliffs, walls, kerbs, wells. */
  stone: ['#3c3b48', '#565565', '#767488', '#9a98ab', '#bcbbc9'] as Ramp,

  /** Plaster walls — the cream a little house is painted. */
  plaster: ['#8a7a5e', '#b3a181', '#d6c4a0', '#eddfc0', '#f8f0dc'] as Ramp,

  /** Roofs. Several families so a village has variety without new hues. */
  terracotta: ['#6b2f28', '#8f4030', '#b5573f', '#d17550', '#e39a6f'] as Ramp,
  slate: ['#2f3a4c', '#425067', '#5c6b85', '#7d8ca6', '#a0aec4'] as Ramp,
  thatch: ['#6b5326', '#8f7238', '#b3934c', '#d1b46a', '#e6d093'] as Ramp,

  /** Timber framing, fences, jetties, signposts. */
  timber: ['#3c2a1c', '#573c27', '#734f33', '#8f6944', '#ab875e'] as Ramp,

  /** Foliage. Deliberately darker than the meadow so trees read as mass. */
  leaf: ['#15301f', '#22482a', '#356338', '#4d8244', '#6da855'] as Ramp,
  amber: ['#6b3a1c', '#8f5423', '#b5722f', '#d19546', '#e6b566'] as Ramp,
  pine: ['#1a3325', '#24472e', '#315f36', '#417a41', '#54964f'] as Ramp,

  /** Warm light: lit windows, lanterns. The only saturated warms. */
  glow: ['#8f5a1c', '#c98a26', '#e8b447', '#ffe08a', '#fff6cf'] as Ramp,

  /** Skin, so a crowd is not all one person. */
  skin: ['#8f6141', '#b8865c', '#d9a97c', '#f0c79a'] as Ramp,

  /** Backlit leaf — sun coming THROUGH foliage. The idyllic cue. */
  backlit: ['#7a9c3a', '#9cbf4a', '#bcdc63', '#daf089', '#f0ffb8'] as Ramp,

  /** Sky, for the backdrop behind an island. */
  sky: ['#4a6b96', '#6b93b8', '#94b9d4', '#bcd9e8', '#dcecf2'] as Ramp,

  // ---------------------------------------------------------- new here

  /**
   * Cherry blossom. A whole ramp rather than one pink, because a
   * blossom canopy needs a shaded underside or it reads as a cloud of
   * chewing gum stuck to a stick. The dark end goes purple, following
   * the same rule as every other ramp.
   */
  blossom: ['#8f4a6b', '#bd6b91', '#dc93b3', '#f0bcd1', '#ffe0ec'] as Ramp,

  /**
   * Fruit. Apples, cherries, berries. At 32 pixels a fruit is two or
   * three pixels, so it has to be the most saturated thing on the tree
   * or it disappears into the leaves.
   */
  fruit: ['#6b1c28', '#9c2836', '#c93a44', '#e35f5c', '#f5907f'] as Ramp,
  /** Oranges, apricots, pumpkins. */
  citrus: ['#8f4a14', '#bd6b1c', '#e08f2a', '#f5b552', '#ffd98f'] as Ramp,
  /** Plums, grapes, lavender. */
  plum: ['#3f2447', '#5c3a68', '#7d558f', '#a37cb3', '#c9a8d6'] as Ramp,

  /**
   * Sweets — the currency. Reads as sugar: high value, and the top end
   * desaturates so a pile of them does not vibrate.
   */
  candy: ['#8f3a5c', '#c25a80', '#e88aa8', '#f7b8ca', '#fff0f4'] as Ramp,

  /** Animal coats: fox, cat, cow, hen. Warm browns and creams. */
  fur: ['#4a2c1c', '#7a4527', '#a8633a', '#cf8f5c', '#edc39a'] as Ramp,
  /** White-ish animals: sheep, geese, ducks. */
  wool: ['#7a7a86', '#9c9ca8', '#c2c2cc', '#e0e0e8', '#f7f7fa'] as Ramp,

  /**
   * The learning colour. The ten-frame, the answer cards, the numeral
   * being asked about. One family, used for nothing else, so that "this
   * is the maths" is a colour the eye learns within a session.
   */
  chalk: ['#2a3f5c', '#3f5c85', '#5c82ad', '#8fb0d1', '#c9dcec'] as Ramp,
} as const;

/**
 * Six garment hues with a real ramp each, for the little people who
 * wander the island. Tidegarden kept the six hues in one array, which
 * shaded by accident once and put a pink panel down a blue smock; this
 * shape avoids that trap by construction.
 */
export const CLOTH_RAMPS: Ramp[] = [
  ['#5c2436', '#8f3a4a', '#c25a5a'] as Ramp,   // madder red
  ['#8f3a4a', '#c25a5a', '#e08a80'] as Ramp,   // salmon
  ['#2e4360', '#4a6b8f', '#7a9cbd'] as Ramp,   // woad blue
  ['#375c4e', '#5a8f7a', '#8fbda6'] as Ramp,   // sage green
  ['#5c4423', '#8f6b3a', '#c2996b'] as Ramp,   // ochre
  ['#432e5c', '#6b4a8f', '#9a7abd'] as Ramp,   // dyer's purple
];

/** Every ramp — the palette's own and the garment ones. */
const ALL_RAMPS: Ramp[] = [...(Object.values(P) as Ramp[]), ...CLOTH_RAMPS];

/** Step along a ramp with clamping. */
export function shade(ramp: Ramp, i: number): string {
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(i)))];
}

/** Every colour mapped to the step below it in its own ramp. */
const DOWN = new Map<string, string>();
for (const ramp of ALL_RAMPS) {
  for (let i = 0; i < ramp.length; i++) {
    DOWN.set(ramp[i].toLowerCase(), ramp[Math.max(0, i - 2)]);
  }
}

/** Every colour's position in its own ramp, so an image can be stepped. */
const WHERE = new Map<string, { ramp: Ramp; i: number }>();
for (const ramp of ALL_RAMPS) {
  for (let i = 0; i < ramp.length; i++) {
    if (!WHERE.has(ramp[i].toLowerCase())) WHERE.set(ramp[i].toLowerCase(), { ramp, i });
  }
}

export function stepBy(hex: string, n: number): string {
  const w = WHERE.get(hex.toLowerCase());
  if (!w) return hex;
  return w.ramp[Math.max(0, Math.min(w.ramp.length - 1, w.i + n))];
}

export function stepDown(hex: string): string {
  return DOWN.get(hex.toLowerCase()) ?? INK;
}

/** Halfway between two palette colours, snapped BACK onto the palette. */
const ALL: string[] = [];
for (const ramp of ALL_RAMPS) ALL.push(...ramp);
export function mixSnap(a: string, b: string): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = (((pa >> 16) & 255) + ((pb >> 16) & 255)) / 2;
  const g = (((pa >> 8) & 255) + ((pb >> 8) & 255)) / 2;
  const bl = ((pa & 255) + (pb & 255)) / 2;
  let best = a, bestD = Infinity;
  for (const c of ALL) {
    const n = parseInt(c.slice(1), 16);
    const dr = ((n >> 16) & 255) - r, dg = ((n >> 8) & 255) - g, db = (n & 255) - bl;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/**
 * The light direction every sprite agrees on: upper LEFT. Returned as a
 * ramp offset for a surface facing a given way, so a generator can ask
 * "how lit is this face" instead of hard-coding a colour and drifting
 * out of agreement with everything else.
 */
export type Face = 'top' | 'left' | 'right' | 'front';
export const FACE_STEP: Record<Face, number> = {
  top: 1.0,
  left: 0.0,
  right: -1.4,
  front: -0.5,
};

/** Is this colour in the palette? Used by the verification harness. */
export function inPalette(hex: string): boolean {
  return hex.toLowerCase() === INK || WHERE.has(hex.toLowerCase());
}
