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

import { P, shade } from '../core/palette.js';
import { GRID, isLand, isSand, island, unlockedHouses, type HouseDef } from './islands.js';
import * as S from './sprites.js';
import * as state from '../core/state.js';
import { deco } from './decor.js';

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
};

function bake(key: string, make: () => S.Sprite): Baked {
  const hit = cache.get(key);
  if (hit) return hit;
  const s = make();
  const out = { c: s.px.toCanvas(), ax: s.ax, ay: s.ay };
  cache.set(key, out);
  return out;
}

/** The sprite a decoration id draws as. */
function decoSprite(art: string, seed: number): Baked {
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
      case 'lamp': return S.lamp();
      case 'bench': return S.bench();
      case 'well': return S.well();
      case 'lighthouse': return S.lighthouse();
      default: return S.flowers(seed);
    }
  });
}

// ------------------------------------------------------------ scenery

/**
 * The island's own trees, before the child has bought anything.
 *
 * Deterministic from the island seed, so the wood is in the same place
 * every visit — and deliberately sparse near the middle, where the
 * houses and the child's own building go.
 */
function scenery(islandId: string): { x: number; y: number; seed: number }[] {
  const def = island(islandId);
  let a = (def.seed * 2654435761) >>> 0;
  const rn = (): number => {
    a ^= a << 13; a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5; a >>>= 0;
    return a / 4294967296;
  };
  const out: { x: number; y: number; seed: number }[] = [];
  const c = (GRID - 1) / 2;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!isLand(islandId, x, y) || isSand(islandId, x, y)) continue;
      const d = Math.sqrt((x - c) ** 2 + (y - c) ** 2) / c;
      // Nothing in the middle third; the density rises towards the coast.
      if (rn() > 0.10 + d * d * 0.72) continue;
      out.push({ x, y, seed: (x * 73856093) ^ (y * 19349663) ^ def.seed });
    }
  }
  return out;
}

const sceneryCache = new Map<string, { x: number; y: number; seed: number }[]>();
function sceneryOf(islandId: string): { x: number; y: number; seed: number }[] {
  let s = sceneryCache.get(islandId);
  if (!s) { s = scenery(islandId); sceneryCache.set(islandId, s); }
  return s;
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
  ctx.fillStyle = shade(P.sea, 1);
  ctx.fillRect(0, 0, w, h);

  const phase = Math.floor((o.time * 2.2) % WAVE_PHASES);
  const stars = state.get().stars;
  const houses = unlockedHouses(o.islandId, stars);
  const placed = state.placedOn(o.islandId);
  const trees = sceneryOf(o.islandId);
  const treeKind = island(o.islandId).tree;

  const hits: HouseHit[] = [];

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

  // ------------------------------------------------- pass 2: the land
  // Painter order: row by row. A land tile is occluded only by land
  // further down or further right, so y-outer x-inner is exactly right.
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
      const dapple = Math.sin(x * 0.7 + y * 0.4 + o.time * 0.08) + Math.sin(x * 0.3 - y * 0.9);
      const light = dapple > 1.1 ? 1 : dapple < -1.1 ? -1 : 0;
      const sand = isSand(o.islandId, x, y);
      const ramp = sand ? P.sand : P.grass;
      const g = bake(`g:${sand ? 's' : 'g'}:${(x * 31 + y * 17) % 7}:${light}`,
        () => S.groundTile(ramp, (x * 31 + y * 17) % 7 + 1, light));
      ctx.drawImage(g.c, Math.round(sx - g.ax), Math.round(sy - g.ay));

      // Build mode: mark the free tiles, quietly. A grid of bright
      // squares would shout; this is a thin outline that reads as
      // "here is allowed" without becoming the subject of the picture.
      if (o.building && !sand
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

      if (hs) {
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
        });
      } else if (built) {
        const d = deco(built.d);
        if (d) {
          const b = decoSprite(d.art, (x * 977 + y * 31) % 97 + 1);
          ctx.drawImage(b.c, Math.round(sx - b.ax), Math.round(sy - b.ay));
        }
      } else if (tree) {
        const b = bake(`w:${treeKind}:${tree.seed % 64}`, () => S.wildTree(treeKind, tree.seed % 64 + 1));
        ctx.drawImage(b.c, Math.round(sx - b.ax), Math.round(sy - b.ay));
      }
    }
  }

  ctx.restore();
  return hits;
}

/** Drop every baked sprite. Used when the palette or the scale changes. */
export function invalidate(): void {
  cache.clear();
}
