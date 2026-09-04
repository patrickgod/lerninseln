// The island, drawn.
//
// Isometric, 32x16 tiles, painter order. Every world position is an
// integer tile; only the CAMERA is allowed a fractional anything, and
// even that is snapped, because a pixel-art scene drawn at a fractional
// offset resamples and the whole look dies.
//
// Two rules from Tidegarden that are load-bearing here:
//
//   Sprites are generated ONCE into canvases and blitted. Regenerating
//   a tree every frame is not a performance problem you can optimise
//   later; it is a different program.
//
//   Every source canvas is created with `willReadFrequently`. A plain
//   context lives on the GPU in real Chrome, and drawing a GPU canvas
//   into a CPU canvas is a readback PER blit. On Tidegarden that was
//   the difference between 17ms in the harness and 194ms on the real
//   machine — and the harness never showed it, because a software
//   rasteriser does not pay for mixed surfaces.

import { P, shade, atNight } from '../core/palette.js';
import { GRID, isLand, isSand, island, buildable, unlockedHouses, housesOn, type HouseDef } from './islands.js';
import * as S from './sprites.js';
import * as D from './deko.js';
import * as N from './nasch.js';
import * as state from '../core/state.js';
import type { Placed } from '../core/state.js';
import { deco } from './decor.js';
import * as life from './life.js';

const TW = S.TILE_W;
const TH = S.TILE_H;

/** How many phases of animated water we bake. More is smoother and heavier. */
const WAVE_PHASES = 8;

interface Baked {
  c: HTMLCanvasElement;
  ax: number;
  ay: number;
}

const cache = new Map<string, Baked>();

// ------------------------------------------------------- time of day
//
// Tidegarden's seasons are a ramp lookup resolved once, not a tint over
// summer, and that is exactly why autumn there looks authored rather
// than filtered. The same trick, applied to the clock: night is the
// same sprites reading a different row of the same table.
//
// Four phases, on the real clock, because a child who plays after
// dinner should see a different island from the one they saw after
// school — and because it costs a lookup.

export type Tageszeit = 'morgen' | 'tag' | 'abend' | 'nacht';

/** How many ramp steps down each phase sits. */
const DIM: Record<Tageszeit, number> = {
  morgen: 0,
  tag: 0,
  abend: -1,
  nacht: -2,
};

let forced: Tageszeit | null = null;

/** Pin the time of day. Used by the screenshot harness, and by tests. */
export function forceTime(t: Tageszeit | null): void {
  if (forced === t) return;
  forced = t;
  cache.clear();
}

export function tageszeit(now = new Date()): Tageszeit {
  if (forced) return forced;
  const h = now.getHours();
  if (h >= 6 && h < 9) return 'morgen';
  if (h >= 9 && h < 18) return 'tag';
  if (h >= 18 && h < 21) return 'abend';
  return 'nacht';
}

/**
 * The colour of the board over each house's door.
 *
 * A first-grader cannot read "Das Haus der verliebten Zahlen", so the
 * COLOUR is the name. It is the one thing on the house that differs
 * between houses at a glance, and it is worth being deliberate about.
 */
const ACCENTS: Record<string, readonly string[]> = {
  'verliebte-zahlen': P.fruit,
  'zahlenreihe': P.chalk,
  'rechenmeister': P.citrus,
  'zwillinge': P.plum,
  'anlaute': P.backlit,
  'silben': P.blossom,
  'woerter': P.terracotta,
  'reime': P.foam,
  'formen': P.backlit,
  'muster': P.citrus,
  'schreiben': P.plum,
  'silbenwoerter': P.fruit,
};

function bake(key: string, make: () => S.Sprite): Baked {
  const dim = DIM[tageszeit()];
  const k = dim ? `${key}@${dim}` : key;
  const hit = cache.get(k);
  if (hit) return hit;
  const s = make();
  // The whole sprite steps down its own ramps — lit windows and
  // lanterns excepted, which is what makes dusk read as the lights
  // coming up rather than as the island being switched off.
  if (dim) s.px.remap((hex) => atNight(hex, dim));
  const out = { c: s.px.toCanvas(), ax: s.ax, ay: s.ay };
  cache.set(k, out);
  return out;
}

/**
 * The sprite a decoration id draws as.
 *
 * `frame` exists for the handful of decorations that move — the fire
 * and the windmill — and is folded into the cache key so that an
 * animated thing is still a blit rather than a redraw.
 */
function decoSprite(art: string, seed: number, frame = 0): Baked {
  switch (art) {
    case 'pear': return bake(`d:pear:${seed}`, () => S.pearTree(seed));
    case 'plum': return bake(`d:plum:${seed}`, () => S.plumTree(seed));
    case 'berry': return bake(`d:berry:${seed}`, () => D.berryBush(seed));
    case 'hedge': return bake(`d:hedge:${seed}`, () => D.hedge(seed));
    case 'sunflowers': return bake(`d:sun:${seed}`, () => D.sunflowers(seed));
    case 'pumpkins': return bake(`d:pump:${seed}`, () => D.pumpkins(seed));
    case 'mushrooms': return bake(`d:mush:${seed}`, () => D.mushrooms(seed));
    case 'beehive': return bake('d:hive', () => D.beehive());
    case 'birdbox': return bake('d:box', () => D.birdBox());
    case 'campfire': return bake('d:fire', () => D.campfire());
    case 'windmill': return bake(`d:mill:${frame}`, () => D.windmill(frame));
    case 'zuckerstange': return bake(`n:cane:${seed}`, () => N.zuckerstange(seed));
    case 'lolliblumen': return bake(`n:lolli:${seed}`, () => N.lolliblumen(seed));
    case 'zuckerwatte': return bake(`n:watte:${seed}`, () => N.zuckerwatte(seed));
    case 'bonbonbusch': return bake(`n:bonbon:${seed}`, () => N.bonbonbusch(seed));
    case 'lebkuchenhaus': return bake('n:lebkuchen', () => N.lebkuchenhaus());
    case 'schokobrunnen': return bake('n:schoko', () => N.schokobrunnen());
    case 'sandburg': return bake(`n:burg:${seed}`, () => N.sandburg(seed));
    case 'fahne': return bake(`n:fahne:${seed}`, () => N.fahne(seed));
    default: break;
  }
  return bake(`d:${art}:${seed}`, () => {
    switch (art) {
      case 'cherry': return S.cherryTree(seed);
      case 'apple': return S.appleTree(seed);
      case 'pine': return S.pineTree(seed);
      case 'flowers': return S.flowers(seed);
      case 'veg': return S.vegPatch(seed);
      case 'fence': return S.fence();
      case 'pond': return S.pond(seed);
      case 'sheep': return S.sheep(seed);
      case 'hen': return S.hen(seed);
      case 'duck': return S.duck(seed);
      case 'cat': return S.cat(seed);
      case 'fox': return S.fox(seed);
      case 'kaninchen': return N.kaninchen(seed);
      case 'igel': return N.igel(seed);
      case 'lamp': return S.lamp();
      case 'bench': return S.bench();
      case 'well': return S.well();
      case 'lighthouse': return S.lighthouse();
      default: return S.flowers(seed);
    }
  });
}

// ------------------------------------------------------------- dapple

/**
 * The drifting light on the meadow.
 *
 * Sine terms were the obvious choice and the wrong one: however many
 * you add, a sum of sines sampled on a square grid produces a beat
 * pattern that lines up with the grid, and the meadow came out in big
 * rectangular patches that read as a mowing plan rather than as light.
 *
 * This is value noise instead — a hash at each corner of a coarse cell,
 * smoothly interpolated. It has no period at all, so there is nothing
 * for the eye to lock onto, and the drift comes from moving the sample
 * point rather than from adding time to a phase.
 */
function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  // smoothstep, so the cells do not show as diamonds at their corners
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// ------------------------------------------------------------ scenery

/**
 * The island's own trees. There are none, and that is the design.
 *
 * There used to be a wood here — about thirty tiles of it per island,
 * generated from the island seed, sparse in the middle and thickening
 * towards the coast. It was pretty and it was wrong, and one playtest
 * said so.
 *
 * A child handed a decorated island is decorating somebody else's
 * island. His twelfth tree changes nothing he can see, because there
 * were already thirty. Handed an empty one, the FIRST tree changes
 * everything, and every tree after it is visibly his. That is the whole
 * difference between decorating and making, and it costs a deletion.
 *
 * It also gives the wild trees' tiles back: about thirty per island,
 * on top of the twenty-four the grid grew by.
 *
 * The function stays rather than the call sites changing, because the
 * wood is still a real thing in the game — it is just made of the
 * child's own trees now, and `zaehleBaeume` below is what finds it.
 */
function scenery(_islandId: string): { x: number; y: number; seed: number }[] {
  return [];
}

/**
 * The child's own wood: every tree they have planted.
 *
 * This is what birds circle over and what the fox lives in. Making it
 * the PLACED trees rather than the island's own is the better rule as
 * well as the necessary one — three trees bring birds, and now they are
 * three trees somebody chose to plant.
 */
function zaehleBaeume(placed: Placed[]): { x: number; y: number }[] {
  return placed.filter((p) => deco(p.d)?.group === 'baum').map((p) => ({ x: p.x, y: p.y }));
}

const sceneryCache = new Map<string, { x: number; y: number; seed: number }[]>();
function sceneryOf(islandId: string): { x: number; y: number; seed: number }[] {
  let s = sceneryCache.get(islandId);
  if (!s) {
    s = scenery(islandId);
    sceneryCache.set(islandId, s);
    // The wood is where the birds circle and where the fox lives, so
    // its centre is worked out once here rather than every frame.
    life.setWood(islandId, s);
  }
  return s;
}

/**
 * How many tiles are free to build on, right now.
 *
 * Exported for `tools/verify.mjs`, because "the island is big enough
 * and starts empty" is the whole point of this change and it is not
 * something a screenshot can count. It catches a shrinking grid, the
 * wild wood coming back, and a change to what counts as buildable, all
 * with one number.
 */
export function freieFelder(islandId: string, stars: number): number {
  const placed = state.placedOn(islandId);
  let n = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!buildable(islandId, x, y)) continue;
      if (placed.some((p) => p.x === x && p.y === y)) continue;
      if (sceneryOf(islandId).some((t) => t.x === x && t.y === y)) continue;
      n++;
    }
  }
  void stars;
  return n;
}

// ---------------------------------------------------------------- view

export interface View {
  /** Integer zoom. Pixel art must never be drawn at a fractional scale. */
  scale: number;
  /** Where tile (0,0)'s centre lands, in CSS pixels, before scaling. */
  ox: number;
  oy: number;
}

/**
 * How far the land plate stands above the water, in sprite pixels.
 *
 * Without this the sea tile in FRONT of a coastal tile covers exactly
 * the rows the cliff was drawn into, so the island has no edge at all —
 * it reads as a sticker lying on the water. Lifting the land is what
 * turns the coast into a coast.
 */
export const LIFT = 7;

/**
 * Fit the camera to the LAND, not to the grid.
 *
 * The grid is 13x13 and the land fills about two-thirds of it, so
 * fitting the grid wastes a third of the screen on empty sea and leaves
 * the island small enough that a six-year-old has to look for the
 * houses. Measuring the mask costs one pass over 169 booleans and is
 * done once per island.
 */
/**
 * The land's bounding box in sprite pixels.
 *
 * Returned as the actual edges rather than a width and a height,
 * because the postcard needs to CENTRE on it and a size alone is not
 * enough to do that — the first version scaled a `fit` result computed
 * for a different zoom, which put the island a long way off centre in
 * a card with a third of it empty sea.
 */
export function landBox(islandId: string):
{ minX: number; maxX: number; minY: number; maxY: number } {
  let minSx = Infinity, maxSx = -Infinity, minSy = Infinity, maxSy = -Infinity;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!isLand(islandId, x, y)) continue;
      const sx = (x - y) * (TW / 2);
      const sy = (x + y) * (TH / 2);
      minSx = Math.min(minSx, sx - TW / 2);
      maxSx = Math.max(maxSx, sx + TW / 2);
      minSy = Math.min(minSy, sy - TH / 2);
      maxSy = Math.max(maxSy, sy + TH / 2);
    }
  }
  if (!Number.isFinite(minSx)) {
    return { minX: 0, maxX: GRID * TW, minY: 0, maxY: GRID * TH };
  }
  return { minX: minSx, maxX: maxSx, minY: minSy, maxY: maxSy };
}

export function fit(cssW: number, cssH: number, islandId = 'mathe'): View {
  let minSx = Infinity, maxSx = -Infinity, minSy = Infinity, maxSy = -Infinity;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!isLand(islandId, x, y)) continue;
      const sx = (x - y) * (TW / 2);
      const sy = (x + y) * (TH / 2);
      minSx = Math.min(minSx, sx - TW / 2);
      maxSx = Math.max(maxSx, sx + TW / 2);
      minSy = Math.min(minSy, sy - TH / 2);
      maxSy = Math.max(maxSy, sy + TH / 2);
    }
  }
  if (!Number.isFinite(minSx)) { minSx = 0; maxSx = GRID * TW; minSy = 0; maxSy = GRID * TH; }

  // Headroom above for the tall things — a lighthouse is 56px and its
  // anchor is at its foot — and a little sea all round so the island
  // floats rather than being cropped.
  const padTop = 52, padBottom = 26, padSide = 26;
  const w = (maxSx - minSx) + padSide * 2;
  const h = (maxSy - minSy) + padTop + padBottom;
  const scale = Math.max(1, Math.min(6, Math.floor(Math.min(cssW / w, cssH / h))));

  const ox = (cssW / scale) / 2 - (minSx + maxSx) / 2;
  const oy = (cssH / scale) / 2 - (minSy + maxSy) / 2 + (padTop - padBottom) / 2;
  return { scale, ox, oy };
}

/**
 * The zoom the island is built at.
 *
 * Fixed, and that is the whole change. `fit` used to pick whatever
 * integer scale made the island fit the screen, which meant the island
 * could only ever be as big as one screenful — and the moment it wanted
 * to be bigger, every sprite in the game silently halved instead.
 *
 * So the zoom stops being a consequence of the island size and becomes
 * a constant, and the island is free to be bigger than the screen. What
 * pays for that is `klemme` below.
 *
 * Two, not three: at 3 the visible field is eleven tiles across, which
 * is small enough that a child loses track of where the houses are.
 */
export const NAH = 2;

/**
 * Where the camera should arrive, in sprite pixels.
 *
 * The middle of the HOUSES, not the middle of the land. On an island
 * that fitted the screen those were near enough the same point and it
 * did not matter; on one that is half a screen wider than the view, the
 * difference is whether a child opens the island looking at the Haus
 * der verliebten Zahlen or at a stretch of empty coast.
 *
 * It fell over the moment the islands grew, and the thing that noticed
 * was the suite: six checks that tap the middle of the screen to open a
 * round stopped finding a house there.
 */
export function mitte(islandId: string, sterne = Infinity): { x: number; y: number } {
  // The houses that are OPEN, not all of them. A plot that arrives in
  // three weeks should not drag the camera off the house a child can
  // play today — and on a fresh save that means arriving looking
  // straight at the Haus der verliebten Zahlen, which is the point.
  const alle = housesOn(islandId);
  const offen = alle.filter((hh) => hh.stars <= sterne);
  const h = offen.length ? offen : alle;
  if (h.length) {
    let sx = 0, sy = 0;
    for (const hh of h) {
      sx += (hh.x - hh.y) * (TW / 2);
      sy += (hh.x + hh.y) * (TH / 2);
    }
    return { x: sx / h.length, y: sy / h.length };
  }
  const b = landBox(islandId);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/**
 * How many screenfuls the island is, at the building zoom.
 *
 * Exists so the suite can assert that an island is actually bigger than
 * the screen — otherwise the whole panning camera is machinery in
 * service of nothing.
 */
export function inSchirmen(cssW: number, cssH: number, islandId: string):
{ x: number; y: number } {
  const b = landBox(islandId);
  return {
    x: (b.maxX - b.minX) / (cssW / NAH),
    y: (b.maxY - b.minY) / (cssH / NAH),
  };
}

/**
 * Clamp a camera centre so the island can never be lost.
 *
 * This is the safety rail that makes a pannable camera safe to give to
 * a six-year-old. There is no "you have scrolled into empty ocean and
 * do not know which way is back" state, because the view rectangle is
 * held inside the land — pan as hard as you like and the island is
 * still under your thumb.
 *
 * When the island is SMALLER than the view in an axis, the clamp
 * collapses to "centred", so a small island behaves exactly as it did
 * before there was a camera at all.
 */
export function klemme(
  cssW: number, cssH: number, islandId: string,
  cam: { x: number; y: number }, scale = NAH,
): { x: number; y: number } {
  const b = landBox(islandId);
  // The same breathing room `fit` uses, so the coast never sits hard
  // against the edge of the screen and the tall things have headroom.
  const padTop = 52, padBottom = 26, padSide = 26;
  const minX = b.minX - padSide, maxX = b.maxX + padSide;
  const minY = b.minY - padTop, maxY = b.maxY + padBottom;

  const halbW = (cssW / scale) / 2;
  const halbH = (cssH / scale) / 2;

  const x = maxX - minX <= halbW * 2
    ? (minX + maxX) / 2
    : Math.min(Math.max(cam.x, minX + halbW), maxX - halbW);
  const y = maxY - minY <= halbH * 2
    ? (minY + maxY) / 2
    : Math.min(Math.max(cam.y, minY + halbH), maxY - halbH);
  return { x, y };
}

/**
 * A view at the building zoom, centred on `cam` and clamped.
 *
 * Everything downstream — `tileToScreen`, `screenToTile`, the house hit
 * boxes, the particle positions — reads `ox`/`oy` and does not care how
 * they were arrived at, so the whole panning camera is this one
 * function plus the clamp above.
 */
export function blick(
  cssW: number, cssH: number, islandId: string,
  cam: { x: number; y: number }, scale = NAH,
): View {
  const c = klemme(cssW, cssH, islandId, cam, scale);
  return {
    scale,
    ox: (cssW / scale) / 2 - c.x,
    oy: (cssH / scale) / 2 - c.y,
  };
}

/** Where a view is looking, in sprite pixels. The inverse of `blick`. */
export function kamera(v: View, cssW: number, cssH: number): { x: number; y: number } {
  return { x: (cssW / v.scale) / 2 - v.ox, y: (cssH / v.scale) / 2 - v.oy };
}

export function tileToScreen(v: View, x: number, y: number): { sx: number; sy: number } {
  return {
    sx: v.ox + (x - y) * (TW / 2),
    sy: v.oy + (x + y) * (TH / 2),
  };
}

/**
 * Screen point to tile, by inverting the projection.
 *
 * Deliberately arithmetic rather than a per-pixel pick buffer: a child
 * taps with a fat finger and we want the tile whose CENTRE is nearest,
 * not the tile whose exact diamond was hit, so that a tap one pixel
 * outside a tile still does the obvious thing.
 */
export function screenToTile(v: View, px: number, py: number): { x: number; y: number } {
  const dx = px / v.scale - v.ox;
  // The land is drawn LIFT pixels above where its tile coordinate says,
  // so a finger aiming at a patch of grass is aiming LIFT pixels high.
  const dy = py / v.scale - v.oy + LIFT;
  const fx = (dx / (TW / 2) + dy / (TH / 2)) / 2;
  const fy = (dy / (TH / 2) - dx / (TW / 2)) / 2;
  return { x: Math.round(fx), y: Math.round(fy) };
}

/**
 * Paint a fire.
 *
 * Drawn straight onto the frame rather than baked, because the whole
 * point is that it never repeats — and a sprite that never repeats
 * cannot be a sprite. Everything is snapped to whole pixels in the
 * scaled space, so it is still pixel art and not a blur.
 *
 * The heat ramp goes citrus at the edges to the top of `glow` in the
 * middle, which is the same trick the palette uses everywhere: the
 * warm end of a ramp IS the light.
 */
function feuer(
  ctx: CanvasRenderingContext2D, sx: number, sy: number, time: number, seed: number,
): void {
  for (const f of life.flammen(time, seed)) {
    ctx.fillStyle = f.hitze > 0.85 ? shade(P.glow, 4)
      : f.hitze > 0.6 ? shade(P.glow, 3)
        : f.hitze > 0.35 ? shade(P.citrus, 3) : shade(P.fruit, 3);
    // An ellipse as whole-pixel rows, so it stays crisp.
    const cx = Math.round(sx + f.dx);
    const cy = Math.round(sy + f.dy);
    const h = Math.round(f.h);
    for (let j = -h; j <= h; j++) {
      const w = Math.round(f.w * Math.sqrt(Math.max(0, 1 - (j / (h + 0.5)) ** 2)));
      ctx.fillRect(cx - w, cy + j, w * 2 + 1, 1);
    }
  }
  ctx.fillStyle = shade(P.glow, 4);
  for (const s of life.funken(time, seed)) {
    ctx.fillRect(Math.round(sx + s.dx), Math.round(sy + s.dy), 1, 1);
  }
}

// ------------------------------------------------------------- drawing

export interface DrawOpts {
  islandId: string;
  /** Seconds since the app started, for the water. */
  time: number;
  /** Build mode: free tiles are shown as a soft outline. */
  building: boolean;
  /** The tile under the finger, if any. */
  hover: { x: number; y: number } | null;
  /** A house to make pulse once, because it has just arrived. */
  arriving: string | null;
}

/** Where each house ended up on screen last frame, for hit-testing. */
export interface HouseHit {
  house: HouseDef;
  /** CSS-pixel rectangle. */
  x: number; y: number; w: number; h: number;
  /** True for a plot: the house is coming, but is not there yet. */
  locked: boolean;
}

export function draw(
  ctx: CanvasRenderingContext2D,
  v: View,
  cssW: number,
  cssH: number,
  o: DrawOpts,
): HouseHit[] {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // scale(), NOT setTransform(): the caller has already put the device
  // pixel ratio on the context, and replacing the whole matrix throws
  // that away. The first version did exactly that, and the island came
  // out at half size in the top-left quarter of a retina canvas — a bug
  // that is invisible at dpr 1 and obvious on every iPad.
  ctx.scale(v.scale, v.scale);

  const w = cssW / v.scale;
  const h = cssH / v.scale;

  // Sea, flat, under everything. The animated part is only the swell
  // near the coast, because that is the only place anybody looks.
  ctx.fillStyle = atNight(shade(P.sea, 1), DIM[tageszeit()]);
  ctx.fillRect(0, 0, w, h);

  const phase = Math.floor((o.time * 2.2) % WAVE_PHASES);
  const stars = state.get().stars;
  const houses = unlockedHouses(o.islandId, stars);
  const coming = housesOn(o.islandId).filter((h) => !houses.includes(h));
  const placed = state.placedOn(o.islandId);
  const trees = sceneryOf(o.islandId);
  const treeKind = island(o.islandId).tree;

  // The wood is the child's own trees, recomputed each frame because it
  // changes the moment one is planted — and it is a filter over a list
  // that is never more than a few dozen long.
  const wald = zaehleBaeume(placed);
  life.setWood(o.islandId, wald);

  const hits: HouseHit[] = [];

  // Everything that walks. A pure function of the clock and what has
  // been built, so it costs nothing to compute afresh every frame.
  const alive = life.critters(o.islandId, o.time, placed, wald.length);

  // The Zahlenfreunde gather around the house they came out of. Only
  // on the island that house is on, obviously.
  const vz = houses.find((hh) => hh.game === 'verliebte-zahlen');
  const freunde = vz ? life.freunde(vz, o.time, state.bekanntePaare()) : [];

  // TWO PASSES, and the reason is the coastline.
  //
  // In one pass, the sea tile in FRONT of a coastal land tile is drawn
  // after it and covers exactly the rows the cliff was drawn into — so
  // the island has no edge and reads as a sticker lying on the water.
  // Water first, then land lifted above it, and the cliff survives.

  // -------------------------------------------------- pass 1: the sea
  for (let y = -3; y < GRID + 3; y++) {
    for (let x = -3; x < GRID + 3; x++) {
      if (isLand(o.islandId, x, y)) continue;
      const { sx, sy } = tileToScreen(v, x, y);
      if (sx < -TW * 2 || sx > w + TW * 2 || sy < -80 || sy > h + 80) continue;

      const ph = (x * 5 + y * 3 + phase) % WAVE_PHASES;
      const sea = bake(`sea:${ph}`, () => S.seaTile(ph));
      ctx.drawImage(sea.c, Math.round(sx - sea.ax), Math.round(sy - sea.ay));

      // Foam only on the edges that actually touch land, so the surf
      // follows the coastline rather than ringing every tile.
      //
      // Which SCREEN edge each neighbour sits on: with sx = (x-y)*16
      // and sy = (x+y)*8, tile (x, y-1) is up and to the RIGHT, not up
      // and to the left. Getting this backwards put the surf on the
      // wrong side of every tile and drew long diagonal streaks across
      // open water.
      const ur = isLand(o.islandId, x, y - 1);
      const lr = isLand(o.islandId, x + 1, y);
      const ul = isLand(o.islandId, x - 1, y);
      const ll = isLand(o.islandId, x, y + 1);
      if (ul || ur || ll || lr) {
        const key = `foam:${ul ? 1 : 0}${ur ? 1 : 0}${ll ? 1 : 0}${lr ? 1 : 0}:${ph}`;
        const f = bake(key, () => S.foamTile(ul, ur, ll, lr, ph));
        ctx.drawImage(f.c, Math.round(sx - f.ax), Math.round(sy - f.ay));
      }
    }
  }

  // A boat, if a lighthouse was built to guide it. Drawn with the sea,
  // so the island passes in front of it.
  const bt = life.boat(o.islandId, o.time, placed);
  if (bt) {
    const bs = tileToScreen(v, bt.x, bt.y);
    const b = bake('boat', () => S.boat(7));
    ctx.drawImage(b.c, Math.round(bs.sx - b.ax), Math.round(bs.sy - b.ay));
  }

  // ------------------------------------------------- pass 2: the land
  // Painter order: row by row. A land tile is occluded only by land
  // further down or further right, so y-outer x-inner is exactly right.
  //
  // Both passes still walk the whole grid — 2601 tiles at GRID 51 —
  // and skip what is off screen with a bounds test. Bounding the loops
  // to the visible band instead was written, measured, and thrown away:
  // 3.18ms before, 3.38ms after, which is noise.
  //
  // The frame did get more expensive when the islands grew, from 1.85ms
  // to 3.18ms, and the reason is not the loop. It is that an island
  // which no longer fits the screen fills the screen: about 165 land
  // tiles used to be visible and now about 430 are, so there are two
  // and a half times as many `drawImage` calls. That is real work and
  // there is nothing to reclaim. LEARNINGS.md has this exact shape
  // twice already.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!isLand(o.islandId, x, y)) continue;
      const t = tileToScreen(v, x, y);
      const sx = t.sx;
      const sy = t.sy - LIFT;
      if (sx < -TW * 2 || sx > w + TW * 2 || sy < -90 || sy > h + 90) continue;

      // Ground. The `light` step comes from a slow drifting dapple, so
      // the meadow varies without any tile shading itself — which is
      // what stops the field turning into diagonal corduroy.
      // Two octaves of value noise, drifting slowly. The coarse one
      // makes the patches, the fine one stops their edges being smooth
      // curves — which at one sample per tile would read as contour
      // lines on a map.
      const drift = o.time * 0.012;
      const dapple = noise2(x * 0.34 + drift, y * 0.34 - drift * 0.6) * 0.75
        + noise2(x * 0.9, y * 0.9) * 0.25;
      const light = dapple > 0.62 ? 1 : dapple < 0.38 ? -1 : 0;
      const sand = isSand(o.islandId, x, y);
      const ramp = sand ? P.sand : P.grass;
      const g = bake(`g:${sand ? 's' : 'g'}:${(x * 31 + y * 17) % 7}:${light}`,
        () => S.groundTile(ramp, (x * 31 + y * 17) % 7 + 1, light));
      ctx.drawImage(g.c, Math.round(sx - g.ax), Math.round(sy - g.ay));

      // Build mode: mark the free tiles, quietly. A grid of bright
      // squares would shout; this is a thin outline that reads as
      // "here is allowed" without becoming the subject of the picture.
      if (o.building && !sand
        && !coming.some((hh) => hh.x === x && hh.y === y)
        && !houses.some((hh) => hh.x === x && hh.y === y)
        && !placed.some((pp) => pp.x === x && pp.y === y)) {
        const on = o.hover && o.hover.x === x && o.hover.y === y;
        ctx.globalAlpha = on ? 0.9 : 0.32;
        ctx.strokeStyle = shade(P.foam, on ? 3 : 2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - TH / 2 + 1);
        ctx.lineTo(sx + TW / 2 - 1, sy);
        ctx.lineTo(sx, sy + TH / 2 - 1);
        ctx.lineTo(sx - TW / 2 + 1, sy);
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Anything standing on this tile, in the same painter pass so it
      // occludes correctly against the row behind.
      const tree = trees.find((tt) => tt.x === x && tt.y === y);
      const built = placed.find((pp) => pp.x === x && pp.y === y);
      const hs = houses.find((hh) => hh.x === x && hh.y === y);
      const soon = coming.find((hh) => hh.x === x && hh.y === y);

      if (soon) {
        // A plot where a house is going to be. An island with a visible
        // future is more motivating than one that looks finished.
        const b = bake(`plot:${soon.id}`, () => S.plot(soon.x * 977 + soon.y * 31));
        ctx.drawImage(b.c, Math.round(sx - b.ax), Math.round(sy - b.ay));
        hits.push({
          house: soon,
          x: (sx - b.ax) * v.scale,
          y: (sy - b.ay) * v.scale,
          w: b.c.width * v.scale,
          h: b.c.height * v.scale,
          locked: true,
        });
      } else if (hs) {
        const isArriving = o.arriving === hs.id;
        const bob = isArriving ? Math.round(Math.sin(o.time * 6) * 2) : 0;
        const b = bake(`h:${hs.roof}:${hs.id}`,
          () => S.house(hs.roof, hs.x * 977 + hs.y * 31, true, ACCENTS[hs.id] ?? P.chalk));
        ctx.drawImage(b.c, Math.round(sx - b.ax), Math.round(sy - b.ay) + bob);
        // Remember where it landed, in CSS pixels, for the tap test.
        hits.push({
          house: hs,
          x: (sx - b.ax) * v.scale,
          y: (sy - b.ay + bob) * v.scale,
          w: b.c.width * v.scale,
          h: b.c.height * v.scale,
          locked: false,
        });
      } else if (built) {
        const d = deco(built.d);
        if (d) {
          // The mill turns; everything else is a still. The fire is a
          // still too — its flame is painted on afterwards.
          const frame = d.art === 'windmill' ? Math.floor(o.time * 1.6) % 8 : 0;
          const b = decoSprite(d.art, (x * 977 + y * 31) % 97 + 1, frame);
          ctx.drawImage(b.c, Math.round(sx - b.ax), Math.round(sy - b.ay));
          if (d.art === 'campfire') feuer(ctx, sx, sy - 4, o.time, x * 31 + y);
        }
      } else if (tree) {
        const b = bake(`w:${treeKind}:${tree.seed % 64}`, () => S.wildTree(treeKind, tree.seed % 64 + 1));
        ctx.drawImage(b.c, Math.round(sx - b.ax), Math.round(sy - b.ay));
      }

      // Anything alive standing on this tile, drawn in the same pass so
      // it is occluded by the row in front of it. Its position is a
      // float; only which tile it belongs to is rounded.
      for (const c of alive) {
        if (Math.round(c.x) !== x || Math.round(c.y) !== y) continue;
        const cs = tileToScreen(v, c.x, c.y);
        const b = decoSprite(c.art, c.seed % 97 + 1);
        ctx.drawImage(b.c, Math.round(cs.sx - b.ax), Math.round(cs.sy - LIFT - b.ay));
      }
      for (const f of freunde) {
        if (Math.round(f.x) !== x || Math.round(f.y) !== y) continue;
        const fs = tileToScreen(v, f.x, f.y);
        const b = bake(`vz:${f.n}:${f.pair}:${f.frame}`,
          () => S.zahlenfreund(f.n, f.pair, f.frame));
        ctx.drawImage(b.c, Math.round(fs.sx - b.ax), Math.round(fs.sy - LIFT - b.ay));
      }
    }
  }

  // ---------------------------------------------- pass 3: what is flying
  // Birds and butterflies are in the AIR, so they are not part of the
  // painter order at all — they go over everything, offset upward by
  // their height.
  for (const f of life.butterflies(o.time, placed)) {
    const fs = tileToScreen(v, f.x, f.y);
    const b = bake(`bfly:${f.frame}:${f.seed % 4}`, () => S.butterfly(f.frame, f.seed % 4));
    ctx.drawImage(b.c, Math.round(fs.sx - b.ax), Math.round(fs.sy - LIFT - f.h - b.ay));
  }
  for (const f of life.bees(o.time, placed)) {
    const fs = tileToScreen(v, f.x, f.y);
    const b = bake(`bee:${f.frame}`, () => D.bee(f.frame));
    ctx.drawImage(b.c, Math.round(fs.sx - b.ax), Math.round(fs.sy - LIFT - f.h - b.ay));
  }
  // A bird box counts as a small wood, so birds come to an island that
  // has not grown one yet — which is the entire reason to buy one.
  const boxes = placed.filter((pp) => pp.d === 'vogelhaus').length;
  for (const f of life.birds(o.islandId, o.time, trees.length + boxes * 4)) {
    const fs = tileToScreen(v, f.x, f.y);
    const b = bake(`bird:${f.frame}`, () => S.bird(f.frame));
    ctx.drawImage(b.c, Math.round(fs.sx - b.ax), Math.round(fs.sy - LIFT - f.h - b.ay));
  }
  // Fireflies, after dark. Baked WITHOUT the night dimming — they are
  // the light, so they must not step down with everything else.
  if (tageszeit() === 'nacht') {
    const ff = cache.get('firefly') ?? (() => {
      const sp = S.firefly();
      const made = { c: sp.px.toCanvas(), ax: sp.ax, ay: sp.ay };
      cache.set('firefly', made);
      return made;
    })();
    for (const f of life.fireflies(o.islandId, o.time, trees.length)) {
      const fs = tileToScreen(v, f.x, f.y);
      ctx.drawImage(ff.c, Math.round(fs.sx - ff.ax), Math.round(fs.sy - LIFT - f.h - ff.ay));
    }
  }

  ctx.restore();
  return hits;
}

/** Drop every baked sprite. Used when the palette or the scale changes. */
export function invalidate(): void {
  cache.clear();
}
