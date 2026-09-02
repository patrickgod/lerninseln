// Every sprite on an island, drawn in code.
//
// The generators take a seed and a few parameters, so one function
// makes a family of things rather than one thing. That is the point of
// doing it in code at all: variety is free, and the taste decision
// becomes CHOOSING among generated variants rather than describing one
// from nothing.
//
// The anatomy every generator agrees on, because a scene falls apart
// the moment two sprites disagree:
//
//   * Isometric, 32x16 tiles, 2:1.
//   * Light comes from the upper LEFT. Always. No generator picks.
//   * Shading is a step along the object's own ramp, never a multiply.
//   * The anchor is the centre of the tile diamond the sprite stands
//     on, so the renderer never has to know how tall anything is.

import { P, INK, shade, stepDown, mixSnap, type Ramp } from '../core/palette.js';
import { Px, rand } from '../core/px.js';

export const TILE_W = 32;
export const TILE_H = 16;

/** A drawn thing, plus the pixel in it that lands on the tile centre. */
export interface Sprite {
  px: Px;
  ax: number;
  ay: number;
}

/**
 * Finish a sprite the way a pixel artist does: shade the lit edges with
 * the object's own darker step, ink only the edges turned away, then
 * soften the inside corners.
 *
 * A uniform black outline is the loudest "drawn in Paint" signal there
 * is — it flattens everything to a sticker and throws away the light.
 */
function finish(p: Px): void {
  p.rim(stepDown, INK);
  p.antialias(mixSnap);
}

/** Where the tile diamond sits inside an object buffer. */
function anchor(p: Px): { ax: number; ay: number } {
  return { ax: (p.w / 2) | 0, ay: p.h - 1 - TILE_H / 2 };
}

// --------------------------------------------------------------- ground

/**
 * One ground tile top: a diamond with scattered speckle.
 *
 * Deliberately almost FLAT. Shading each tile light on its upper-left
 * and dark on its lower-right is correct for one diamond and disastrous
 * for a field of them — the shading repeats on every tile and the
 * meadow turns into diagonal corduroy. All the large-scale variation
 * has to come from something that does not repeat, which here is the
 * `light` step the renderer picks from a drifting dapple field.
 */
export function groundTile(ramp: Ramp, seed: number, light = 0): Sprite {
  const p = new Px(TILE_W, TILE_H + 12);
  const top = TILE_H / 2 + 2;

  // The skirt first, so the tile top draws over its own top edge. The
  // island is a raised plate and every tile carries the few pixels of
  // earth below it; interior tiles have theirs covered by the tile in
  // front, so this costs nothing and turns the coast into a low cliff
  // instead of a sticker.
  for (let x = 0; x < TILE_W; x++) {
    const dx = Math.abs(x - TILE_W / 2);
    const edgeY = Math.round(top + TILE_H / 2 - (dx * TILE_H) / TILE_W);
    for (let j = 0; j < 8; j++) {
      // Left half catches the light, right half is turned away, and the
      // last two rows go to the wet dark at the waterline.
      const step = x < TILE_W / 2 ? 2 : 0;
      p.set(x, edgeY + j, shade(P.earth, j > 5 ? 0 : j > 3 ? step - 1 : step));
    }
  }

  p.diamond(TILE_W / 2, top, TILE_W, TILE_H, shade(ramp, 2 + light));

  const r = rand(seed);
  for (let i = 0; i < 11; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = Math.round(TILE_W / 2 + Math.cos(a) * d * (TILE_W / 2 - 3));
    const y = Math.round(top + Math.sin(a) * d * (TILE_H / 2 - 2));
    if (!p.get(x, y)) continue;
    const bright = r();
    p.set(x, y, shade(ramp, 2 + light + (bright < 0.45 ? -1 : bright < 0.85 ? 1 : 2)));
    if (bright > 0.85 && p.get(x, y - 1)) p.set(x, y - 1, shade(ramp, 3 + light));
  }
  return { px: p, ax: TILE_W / 2, ay: top };
}

/**
 * Open water.
 *
 * Deliberately almost flat. The first version put a dithered swell
 * across every tile and the open sea turned into a field of scratchy
 * chevrons — the pattern repeated per tile, so the tile grid became the
 * texture. What is left is a sparse scatter of lighter pixels whose
 * position depends on the tile's own phase, which reads as light on
 * water without the eye ever finding a repeat.
 */
export function seaTile(phase: number): Sprite {
  const p = new Px(TILE_W, TILE_H + 10);
  const top = TILE_H / 2 + 2;
  p.diamond(TILE_W / 2, top, TILE_W, TILE_H, shade(P.sea, 1));
  const r = rand(phase * 2654435761 + 7);
  for (let i = 0; i < 3; i++) {
    const x = Math.round(4 + r() * (TILE_W - 8));
    const y = Math.round(top - 4 + r() * 8);
    if (!p.get(x, y)) continue;
    p.set(x, y, shade(P.sea, 2));
    if (p.get(x + 1, y)) p.set(x + 1, y, shade(P.sea, 2));
  }
  return { px: p, ax: TILE_W / 2, ay: top };
}

/**
 * Foam, drawn over a water tile on the edges that actually touch land.
 *
 * The first version foamed the whole rim of every coastal tile and
 * produced a ring of chevrons around the island — a per-tile decoration
 * pretending to be a coastline. This one takes the four neighbours and
 * draws only along the edges where there is something to break on, so
 * the foam follows the shape of the land rather than the shape of the
 * grid.
 */
export function foamTile(ul: boolean, ur: boolean, ll: boolean, lr: boolean, phase: number): Sprite {
  const p = new Px(TILE_W, TILE_H + 10);
  const top = TILE_H / 2 + 2;
  const cx = TILE_W / 2;

  // The four edges of the diamond, each as a run of points from one
  // corner to the next.
  const edges: [boolean, number, number, number, number][] = [
    [ul, cx - TILE_W / 2, top, cx, top - TILE_H / 2],
    [ur, cx, top - TILE_H / 2, cx + TILE_W / 2, top],
    [ll, cx - TILE_W / 2, top, cx, top + TILE_H / 2],
    [lr, cx, top + TILE_H / 2, cx + TILE_W / 2, top],
  ];

  for (const [on, x0, y0, x1, y1] of edges) {
    if (!on) continue;
    const steps = Math.abs(x1 - x0);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      // Thickness breathes along the edge, so the line is surf and not
      // a stroke. One pixel of drift per phase is enough to read as
      // motion at this size.
      const th = 1 + (Math.sin(i * 0.9 + phase * 0.8) > 0.25 ? 1 : 0);
      for (let k = 0; k < th; k++) {
        // pull the foam INWARD, towards the tile centre
        const dx = Math.sign(cx - x) * Math.round(k * 0.9);
        const dy = Math.sign(top - y) * Math.round(k * 0.45);
        p.set(x + dx, y + dy, shade(P.foam, k === 0 ? 2 : 1));
      }
    }
  }
  return { px: p, ax: TILE_W / 2, ay: top };
}

// ------------------------------------------------------------- helpers

/** The footprint diamond an object stands on, for its ground shadow. */
function contact(p: Px, cx: number, cy: number, w = 22, h = 11): void {
  for (let y = -h / 2; y < h / 2; y++) {
    const f = 1 - Math.abs(y + 0.5) / (h / 2);
    const half = Math.floor((w / 2) * f);
    for (let x = -half; x < half; x++) {
      p.blend(cx + x, cy + y, INK, 0.22 * (1 - Math.abs(x) / Math.max(1, half)) + 0.05);
    }
  }
}

/** A trunk: two pixels wide, lit on the left, rooted in a small flare. */
function trunk(p: Px, cx: number, baseY: number, h: number, ramp: Ramp = P.timber): void {
  for (let y = 0; y < h; y++) {
    p.set(cx - 1, baseY - y, shade(ramp, 2));
    p.set(cx, baseY - y, shade(ramp, 1));
  }
  p.set(cx - 2, baseY, shade(ramp, 1));
  p.set(cx + 1, baseY, shade(ramp, 0));
}

/**
 * A canopy: overlapping blobs rather than one ellipse.
 *
 * One ellipse reads as a lollipop. Three or four offset blobs of the
 * same ramp, lit from the upper left, read as a tree — and the seed
 * makes each one different for free.
 */
function canopy(p: Px, cx: number, cy: number, r: number, ramp: Ramp, seed: number): void {
  const rn = rand(seed);
  const blobs: [number, number, number][] = [[0, 0, r]];
  for (let i = 0; i < 3; i++) {
    blobs.push([
      Math.round((rn() - 0.5) * r * 1.3),
      Math.round((rn() - 0.5) * r * 0.9),
      Math.round(r * (0.55 + rn() * 0.3)),
    ]);
  }
  // mid tone first, so the shape exists
  for (const [dx, dy, br] of blobs) p.ellipse(cx + dx, cy + dy, br, Math.round(br * 0.82), shade(ramp, 2));
  // shadow underside
  for (const [dx, dy, br] of blobs) {
    p.ellipse(cx + dx + Math.round(br * 0.25), cy + dy + Math.round(br * 0.35), Math.round(br * 0.7),
      Math.round(br * 0.5), shade(ramp, 1));
  }
  // light from upper left
  for (const [dx, dy, br] of blobs) {
    p.ellipse(cx + dx - Math.round(br * 0.3), cy + dy - Math.round(br * 0.35), Math.round(br * 0.52),
      Math.round(br * 0.4), shade(ramp, 3));
  }
  // a couple of catchlights, so the crown is not a flat disc
  p.ellipse(cx - Math.round(r * 0.45), cy - Math.round(r * 0.5), Math.max(1, Math.round(r * 0.25)),
    Math.max(1, Math.round(r * 0.2)), shade(ramp, 4));
}

// --------------------------------------------------------------- trees

export function cherryTree(seed: number): Sprite {
  const p = new Px(32, 44);
  const baseY = p.h - 1 - TILE_H / 2;
  trunk(p, 16, baseY, 12);
  canopy(p, 16, baseY - 20, 9, P.blossom, seed);
  // fallen petals, so the tree has been standing there a while
  const rn = rand(seed ^ 0x5a5a);
  for (let i = 0; i < 5; i++) {
    p.set(16 + Math.round((rn() - 0.5) * 18), baseY + Math.round((rn() - 0.5) * 6), shade(P.blossom, 3));
  }
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 16, baseY + 1);
  return { px: p, ...anchor(p) };
}

export function appleTree(seed: number): Sprite {
  const p = new Px(32, 44);
  const baseY = p.h - 1 - TILE_H / 2;
  trunk(p, 16, baseY, 11);
  canopy(p, 16, baseY - 19, 9, P.leaf, seed);
  // Fruit is two pixels and it has to be the most saturated thing on
  // the tree or it vanishes into the leaves.
  const rn = rand(seed ^ 0x1234);
  for (let i = 0; i < 7; i++) {
    const a = rn() * Math.PI * 2, d = Math.sqrt(rn()) * 8;
    const x = 16 + Math.round(Math.cos(a) * d);
    const y = baseY - 19 + Math.round(Math.sin(a) * d * 0.8);
    if (!p.get(x, y)) continue;
    p.set(x, y, shade(P.fruit, 2));
    p.set(x, y + 1, shade(P.fruit, 1));
    p.set(x - 1, y, shade(P.fruit, 3));
  }
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 16, baseY + 1);
  return { px: p, ...anchor(p) };
}

export function pineTree(seed: number): Sprite {
  const p = new Px(32, 46);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  trunk(p, 16, baseY, 8, P.timber);
  // Three skirts, widest at the bottom, each one a flattened triangle.
  let y = baseY - 6;
  for (let tier = 0; tier < 3; tier++) {
    const w = 11 - tier * 3;
    const h = 9 - tier;
    for (let j = 0; j < h; j++) {
      const half = Math.round((w * (h - j)) / h);
      for (let i = -half; i <= half; i++) {
        const lit = i < -half * 0.2 ? 3 : i > half * 0.35 ? 1 : 2;
        p.set(16 + i, y - j, shade(P.pine, lit));
      }
    }
    y -= h - 2 + Math.round(rn());
  }
  p.set(16, y - 2, shade(P.pine, 3));
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 16, baseY + 1, 18, 9);
  return { px: p, ...anchor(p) };
}

/** The island's own background trees, so it is not bald before the shop. */
export function wildTree(kind: 'leaf' | 'pine', seed: number): Sprite {
  if (kind === 'pine') return pineTree(seed);
  const p = new Px(32, 40);
  const baseY = p.h - 1 - TILE_H / 2;
  trunk(p, 16, baseY, 9);
  canopy(p, 16, baseY - 16, 7 + (seed % 3), P.leaf, seed);
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 16, baseY + 1, 18, 9);
  return { px: p, ...anchor(p) };
}

// -------------------------------------------------------------- garden

export function flowers(seed: number): Sprite {
  const p = new Px(32, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  // A bed of earth, then flowers standing in it.
  p.diamond(16, baseY, 20, 10, shade(P.earth, 1));
  const hues: Ramp[] = [P.fruit, P.citrus, P.plum, P.blossom, P.glow];
  for (let i = 0; i < 12; i++) {
    const a = rn() * Math.PI * 2, d = Math.sqrt(rn());
    const x = 16 + Math.round(Math.cos(a) * d * 8);
    const y = baseY + Math.round(Math.sin(a) * d * 4);
    const h = 3 + Math.round(rn() * 2);
    for (let j = 0; j < h; j++) p.set(x, y - j, shade(P.leaf, 3));
    const hue = hues[Math.floor(rn() * hues.length)];
    p.set(x, y - h, shade(hue, 3));
    p.set(x - 1, y - h, shade(hue, 2));
    p.set(x + 1, y - h, shade(hue, 2));
    p.set(x, y - h - 1, shade(hue, 4));
  }
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 16, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

export function vegPatch(seed: number): Sprite {
  const p = new Px(32, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  p.diamond(16, baseY, 24, 12, shade(P.earth, 1));
  // Four furrows along the isometric grain, so the patch reads as dug.
  for (let row = -1; row <= 2; row++) {
    for (let i = -9; i <= 9; i++) {
      const x = 16 + i;
      const y = baseY + Math.round(i * 0.5) + row * 3 - 2;
      p.set(x, y, shade(P.earth, 2));
      if ((i & 1) === 0) {
        const g = rn();
        if (g > 0.45) {
          p.set(x, y - 1, shade(P.leaf, 3));
          p.set(x, y - 2, shade(P.leaf, 4));
          if (g > 0.85) p.set(x, y - 2, shade(P.citrus, 3));
        }
      }
    }
  }
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 16, baseY + 1, 22, 11);
  return { px: p, ...anchor(p) };
}

export function fence(): Sprite {
  const p = new Px(36, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 18;

  // A fence runs along ONE isometric axis. The first version drew posts
  // outward in both directions from the centre, which is not a fence —
  // it is a V, and it looked like a dropped stick.
  const posts: [number, number][] = [];
  for (let i = -2; i <= 2; i++) posts.push([cx + i * 8, baseY - i * 4]);

  // Rails first, so the posts stand in front of them.
  for (let k = 0; k < posts.length - 1; k++) {
    const [x0, y0] = posts[k];
    const [x1, y1] = posts[k + 1];
    p.line(x0, y0 - 7, x1, y1 - 7, shade(P.timber, 3));
    p.line(x0, y0 - 6, x1, y1 - 6, shade(P.timber, 2));
    p.line(x0, y0 - 3, x1, y1 - 3, shade(P.timber, 3));
    p.line(x0, y0 - 2, x1, y1 - 2, shade(P.timber, 1));
  }
  for (const [x, y] of posts) {
    for (let j = 0; j < 10; j++) {
      p.set(x - 1, y - j, shade(P.timber, 3));
      p.set(x, y - j, shade(P.timber, 1));
    }
    p.set(x - 1, y - 10, shade(P.timber, 4));
  }
  finish(p);
  contact(p, cx, baseY + 1, 26, 13);
  return { px: p, ...anchor(p) };
}

export function pond(seed: number): Sprite {
  const p = new Px(32, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  p.diamond(16, baseY, 26, 13, shade(P.earth, 1));
  p.diamond(16, baseY, 21, 10, shade(P.sea, 1));
  p.diamond(16, baseY - 1, 15, 7, shade(P.sea, 2));
  // Two reeds and a lily, so it is a pond and not a puddle.
  for (let i = 0; i < 3; i++) {
    const x = 16 + Math.round((rn() - 0.5) * 20);
    const y = baseY + Math.round((rn() - 0.5) * 6);
    for (let j = 0; j < 4 + Math.round(rn() * 3); j++) p.set(x, y - j, shade(P.leaf, 3));
  }
  p.ellipse(14, baseY - 1, 2, 1, shade(P.leaf, 3));
  p.set(14, baseY - 2, shade(P.blossom, 4));
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 16, baseY + 1, 24, 12);
  return { px: p, ...anchor(p) };
}

// ------------------------------------------------------------- animals

/**
 * The shared body plan.
 *
 * The first version was an ellipse with two dark pixels for legs, and
 * at 20 pixels across every animal came out as the same grey lump —
 * Tidegarden's sheep-that-read-as-white-pebbles, repeated. What makes a
 * small animal legible is not detail, it is SILHOUETTE: four visible
 * legs with daylight between them, a head that breaks the body outline,
 * and one saturated accent. So the bodies here are bigger, the legs are
 * two pixels wide and three tall, and every animal gets one feature
 * that no other animal has.
 */
function critter(
  p: Px, cx: number, baseY: number, body: Ramp, w: number, h: number,
): void {
  // legs, drawn first so the body sits over their tops
  for (const lx of [-Math.round(w * 0.6), -Math.round(w * 0.15),
                    Math.round(w * 0.25), Math.round(w * 0.65)]) {
    for (let j = 0; j < 3; j++) {
      p.set(cx + lx, baseY - j, shade(body, 1));
      p.set(cx + lx + 1, baseY - j, shade(body, 0));
    }
  }
  const cy = baseY - 3 - h;
  p.ellipse(cx, cy, w, h, shade(body, 2));
  // turned away from the light
  p.ellipse(cx + Math.round(w * 0.3), cy + Math.round(h * 0.4),
    Math.round(w * 0.65), Math.round(h * 0.6), shade(body, 1));
  // catching it
  p.ellipse(cx - Math.round(w * 0.3), cy - Math.round(h * 0.35),
    Math.round(w * 0.55), Math.round(h * 0.5), shade(body, 3));
}

export function sheep(seed: number): Sprite {
  const p = new Px(30, 28);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 16;
  critter(p, cx, baseY, P.wool, 8, 5);
  // Fleece: bumps that break the silhouette. This is the entire
  // difference between a sheep and a white pebble.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * 0.9 + rn() * Math.PI * 1.2;
    p.ellipse(cx + Math.round(Math.cos(a) * 8), baseY - 8 + Math.round(Math.sin(a) * 5),
      2, 2, shade(P.wool, rn() > 0.5 ? 3 : 4));
  }
  // Head: dark, and OUTSIDE the fleece, which is what says sheep.
  p.ellipse(cx - 10, baseY - 7, 3, 2, shade(P.stone, 1));
  p.set(cx - 12, baseY - 8, shade(P.stone, 0));
  p.set(cx - 13, baseY - 7, shade(P.stone, 2));
  finish(p);
  contact(p, cx, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

export function hen(seed: number): Sprite {
  const p = new Px(24, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 12;
  critter(p, cx, baseY, P.plaster, 5, 4);
  // head on a neck, comb, beak, and a tail that cocks up
  p.ellipse(cx - 6, baseY - 12, 3, 3, shade(P.plaster, 4));
  p.set(cx - 6, baseY - 15, shade(P.fruit, 2));
  p.set(cx - 7, baseY - 15, shade(P.fruit, 3));
  p.set(cx - 5, baseY - 15, shade(P.fruit, 1));
  p.set(cx - 9, baseY - 12, shade(P.citrus, 3));
  p.set(cx - 10, baseY - 12, shade(P.citrus, 2));
  p.set(cx - 8, baseY - 13, INK);
  for (let i = 0; i < 4; i++) p.set(cx + 7 + i, baseY - 10 - i, shade(P.plaster, 1));
  for (let i = 0; i < 3; i++) p.set(cx + 7 + i, baseY - 9 - i, shade(P.plaster, 2));
  void seed;
  finish(p);
  contact(p, cx, baseY + 1, 16, 8);
  return { px: p, ...anchor(p) };
}

export function duck(seed: number): Sprite {
  const p = new Px(24, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 12;
  critter(p, cx, baseY, P.wool, 6, 4);
  // The green head and the flat orange bill: two accents, and nothing
  // else in the game has either.
  p.ellipse(cx - 6, baseY - 12, 3, 3, shade(P.pine, 3));
  p.ellipse(cx - 6, baseY - 13, 2, 2, shade(P.pine, 4));
  p.rect(cx - 11, baseY - 12, 4, 2, shade(P.citrus, 3));
  p.set(cx - 11, baseY - 11, shade(P.citrus, 2));
  p.set(cx - 7, baseY - 13, INK);
  for (let i = 0; i < 4; i++) p.set(cx + 6 + i, baseY - 9, shade(P.wool, 1));
  void seed;
  finish(p);
  contact(p, cx, baseY + 1, 16, 8);
  return { px: p, ...anchor(p) };
}

export function cat(seed: number): Sprite {
  const p = new Px(28, 28);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 13;
  critter(p, cx, baseY, P.fur, 7, 4);
  // head with two triangular ears, and the curled tail
  p.ellipse(cx - 7, baseY - 11, 4, 3, shade(P.fur, 3));
  p.set(cx - 10, baseY - 15, shade(P.fur, 2));
  p.set(cx - 9, baseY - 14, shade(P.fur, 3));
  p.set(cx - 5, baseY - 15, shade(P.fur, 1));
  p.set(cx - 6, baseY - 14, shade(P.fur, 2));
  p.set(cx - 9, baseY - 11, shade(P.backlit, 3));
  p.set(cx - 6, baseY - 11, shade(P.backlit, 3));
  p.line(cx + 7, baseY - 6, cx + 12, baseY - 12, shade(P.fur, 1));
  p.line(cx + 8, baseY - 6, cx + 13, baseY - 12, shade(P.fur, 2));
  p.set(cx + 12, baseY - 14, shade(P.fur, 3));
  void seed;
  finish(p);
  contact(p, cx, baseY + 1, 18, 9);
  return { px: p, ...anchor(p) };
}

export function fox(seed: number): Sprite {
  const p = new Px(32, 28);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 14;
  critter(p, cx, baseY, P.citrus, 7, 4);
  // The pointed snout, the black socks and the white-tipped brush.
  p.ellipse(cx - 8, baseY - 11, 4, 3, shade(P.citrus, 3));
  p.set(cx - 12, baseY - 10, INK);
  p.set(cx - 11, baseY - 10, shade(P.citrus, 2));
  p.set(cx - 11, baseY - 15, shade(P.citrus, 1));
  p.set(cx - 10, baseY - 14, shade(P.citrus, 2));
  p.set(cx - 6, baseY - 15, shade(P.citrus, 1));
  p.set(cx - 7, baseY - 14, shade(P.citrus, 2));
  p.set(cx - 10, baseY - 11, INK);
  p.ellipse(cx + 11, baseY - 8, 5, 3, shade(P.citrus, 2));
  p.ellipse(cx + 10, baseY - 9, 4, 2, shade(P.citrus, 3));
  p.ellipse(cx + 15, baseY - 10, 2, 2, shade(P.wool, 4));
  void seed;
  finish(p);
  contact(p, cx, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

// ------------------------------------------------------------- village

export function lamp(): Sprite {
  const p = new Px(16, 34);
  const baseY = p.h - 1 - TILE_H / 2;
  for (let y = 0; y < 16; y++) p.set(8, baseY - y, shade(P.stone, y > 10 ? 2 : 1));
  p.rect(6, baseY - 22, 5, 5, shade(P.glow, 3));
  p.rect(7, baseY - 21, 3, 3, shade(P.glow, 4));
  p.line(6, baseY - 23, 10, baseY - 23, shade(P.slate, 1));
  p.set(8, baseY - 24, shade(P.slate, 2));
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 8, baseY + 1, 10, 5);
  return { px: p, ...anchor(p) };
}

export function bench(): Sprite {
  const p = new Px(28, 24);
  const baseY = p.h - 1 - TILE_H / 2;
  // seat along the iso grain
  for (let i = -8; i <= 8; i++) {
    const y = baseY - 4 + Math.round(i * 0.5);
    p.set(14 + i, y, shade(P.timber, 3));
    p.set(14 + i, y + 1, shade(P.timber, 2));
    p.set(14 + i, y - 4, shade(P.timber, 3));  // backrest
    p.set(14 + i, y - 3, shade(P.timber, 2));
  }
  for (const i of [-7, 7]) {
    const y = baseY - 4 + Math.round(i * 0.5);
    for (let j = 0; j < 4; j++) p.set(14 + i, y + 2 + j, shade(P.timber, 1));
  }
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 14, baseY + 1, 20, 9);
  return { px: p, ...anchor(p) };
}

export function well(): Sprite {
  const p = new Px(28, 34);
  const baseY = p.h - 1 - TILE_H / 2;
  // stone drum
  p.diamond(14, baseY - 4, 18, 9, shade(P.stone, 2));
  for (let y = 0; y < 5; y++) {
    for (let x = -9; x <= 9; x++) {
      const f = 1 - Math.abs(x) / 9;
      if (y > 4 * f) continue;
      p.set(14 + x, baseY - 3 + y, shade(P.stone, x < 0 ? 2 : 1));
    }
  }
  p.diamond(14, baseY - 5, 12, 6, shade(P.sea, 1));
  // posts and a little roof
  for (const dx of [-7, 7]) for (let j = 0; j < 11; j++) p.set(14 + dx, baseY - 6 - j, shade(P.timber, dx < 0 ? 3 : 1));
  for (let i = 0; i <= 9; i++) {
    p.line(14 - 10 + i, baseY - 18 + i, 14 + 10 - i, baseY - 18 + i, shade(P.terracotta, i < 4 ? 3 : 2));
  }
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 14, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

export function lighthouse(): Sprite {
  const p = new Px(28, 56);
  const baseY = p.h - 1 - TILE_H / 2;
  // Tapered tower, banded red and white — the bands are what make it
  // legible at a glance, so they are wide.
  for (let y = 0; y < 34; y++) {
    const w = Math.round(7 - (y / 34) * 3);
    const band = Math.floor(y / 7) % 2 === 0;
    const ramp = band ? P.plaster : P.fruit;
    for (let x = -w; x <= w; x++) {
      const lit = x < -w * 0.3 ? 3 : x > w * 0.4 ? 1 : 2;
      p.set(14 + x, baseY - y, shade(ramp, lit));
    }
  }
  // gallery and lamp room
  p.rect(8, baseY - 37, 13, 2, shade(P.slate, 2));
  p.rect(10, baseY - 42, 9, 5, shade(P.glow, 3));
  p.rect(11, baseY - 41, 7, 3, shade(P.glow, 4));
  for (let i = 0; i <= 5; i++) p.line(14 - 6 + i, baseY - 43 + i, 14 + 6 - i, baseY - 43 + i, shade(P.slate, 1));
  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, 14, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

// --------------------------------------------------------------- house

/**
 * A house.
 *
 * The anatomy, top to bottom, because everything else follows it: the
 * roof is two parallelograms meeting at a ridge, and in isometric the
 * left one catches the light and the right one does not; the two
 * visible walls are a light face and a dark face; the base sits on the
 * tile diamond.
 */
export function house(
  roof: 'terracotta' | 'slate' | 'thatch',
  seed: number,
  lit: boolean,
  accent: Ramp = P.chalk,
): Sprite {
  const p = new Px(44, 52);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 22;

  // The footprint is a diamond half this wide and half as tall again,
  // so the house sits INSIDE its tile with a margin rather than
  // overhanging its neighbours.
  const hw = 12;
  const hh = hw / 2;
  const wallH = 13 + Math.round(rn() * 3);


  // ------------------------------------------------------------ walls
  // Bottom edge of the wall follows the near two edges of the diamond;
  // the top edge is that line lifted by wallH. Left face lit, right
  // face turned away — TWO steps apart, because one is not enough at
  // this size and the corner disappears.
  const wall = P.plaster;
  for (let x = -hw; x <= hw; x++) {
    const yBot = baseY + Math.round(hh * (1 - Math.abs(x) / hw));
    const col = x < 0 ? shade(wall, 3) : x === 0 ? shade(wall, 2) : shade(wall, 1);
    for (let j = 0; j < wallH; j++) p.set(cx + x, yBot - j, col);
  }

  // ------------------------------------------------------------- roof
  // A hip roof, laid down as a stack of shrinking diamonds from the
  // eaves to the apex. Each pixel takes its shade from WHICH of the
  // four roof planes it is on, found from the diamond's diagonals — so
  // the roof gets four properly-lit faces rather than a flat cap.
  const R = P[roof];
  const eavesW = hw + 3;
  const roofH = 11;
  const eavesY = baseY - wallH;
  for (let step = 0; step <= roofH; step++) {
    const t = step / roofH;
    const w = Math.round(eavesW * (1 - t * 0.92));
    const h = Math.max(1, Math.round((w / 2)));
    const cy = eavesY - step;
    for (let y = -h; y <= h; y++) {
      const half = Math.floor(w * (1 - Math.abs(y) / (h + 0.5)));
      for (let x = -half; x <= half; x++) {
        const u = x / Math.max(1, w) + y / Math.max(1, h);
        const v = x / Math.max(1, w) - y / Math.max(1, h);
        // SW plane faces the light, SE is turned away, the two back
        // planes only peek above the ridge.
        const face = v < -Math.abs(u) ? 3 : u > Math.abs(v) ? 1 : v > Math.abs(u) ? 2 : 4;
        p.set(cx + x, cy + y, shade(R, face));
      }
    }
  }

  // ------------------------------------------------------- door, sign
  // The door is on the lit face and it is BIG: it is the thing a child
  // aims at, and the whole house is the tap target anyway.
  const doorX = cx - 6;
  const doorBotY = baseY + Math.round(hh * (1 - 6 / hw));
  p.rect(doorX - 2, doorBotY - 10, 6, 11, shade(P.timber, 1));
  p.rect(doorX - 1, doorBotY - 9, 4, 10, shade(P.timber, 2));
  p.set(doorX + 2, doorBotY - 5, shade(P.glow, 4));

  // A window on the shaded face, warm if somebody is home.
  const win = lit ? P.glow : P.sky;
  const wx = cx + 6;
  const wBotY = baseY + Math.round(hh * (1 - 6 / hw));
  p.rect(wx - 2, wBotY - wallH + 3, 5, 5, shade(P.timber, 0));
  p.rect(wx - 1, wBotY - wallH + 4, 3, 3, shade(win, lit ? 4 : 2));

  // The sign board over the door, in the house's own accent colour.
  // A first-grader cannot read the name, so the COLOUR is the name —
  // and it is the same colour the house's round uses on its cards.
  p.rect(cx - 4, eavesY - 2, 9, 4, shade(accent, 2));
  p.rect(cx - 3, eavesY - 1, 7, 2, shade(accent, 3));
  p.set(cx - 3, eavesY - 2, shade(accent, 4));

  finish(p);
  // The ground shadow goes on AFTER the rim. Drawn before it, the
  // ink outline traces the shadow itself and every tree stands in a
  // little black box — which is exactly what the first build did.
  contact(p, cx, baseY + 2, hw * 2 + 4, hh * 2 + 3);
  return { px: p, ...anchor(p) };
}

/**
 * A building plot: where a house is going to be, but is not yet.
 *
 * Worth drawing rather than leaving empty, because an island with a
 * visible future is more motivating than one that looks finished. It is
 * a GOAL, not a judgement — a marked-out plot with a signpost says
 * "somebody is moving in here", where a locked door with a padlock
 * would say "you are not good enough yet", and this app does not say
 * that.
 *
 * Deliberately quiet: pegs, string, a little earth. ART-DIRECTION's
 * rule is that things ARRIVE rather than alert, so the plot must not
 * out-shout the houses that are actually there.
 */
export function plot(seed: number): Sprite {
  const p = new Px(40, 40);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 20;
  const rn = rand(seed);

  // A patch of turned earth, one tile across.
  p.diamond(cx, baseY, 26, 13, shade(P.earth, 1));
  for (let i = 0; i < 22; i++) {
    const a = rn() * Math.PI * 2, d = Math.sqrt(rn());
    p.set(cx + Math.round(Math.cos(a) * d * 11), baseY + Math.round(Math.sin(a) * d * 5),
      shade(P.earth, rn() > 0.5 ? 2 : 0));
  }

  // Four corner pegs with string between them, which is what a marked
  // -out plot actually looks like.
  const pegs: [number, number][] = [
    [cx - 12, baseY], [cx, baseY - 6], [cx + 12, baseY], [cx, baseY + 6],
  ];
  for (let k = 0; k < 4; k++) {
    const [x0, y0] = pegs[k];
    const [x1, y1] = pegs[(k + 1) % 4];
    p.line(x0, y0 - 5, x1, y1 - 5, shade(P.dry, 2));
  }
  for (const [x, y] of pegs) {
    for (let j = 0; j < 6; j++) {
      p.set(x, y - j, shade(P.timber, 2));
      p.set(x + 1, y - j, shade(P.timber, 0));
    }
  }

  // A signpost, and a star on it: the thing you are working towards.
  const sx = cx + 7;
  for (let j = 0; j < 13; j++) {
    p.set(sx, baseY - 2 - j, shade(P.timber, 2));
    p.set(sx + 1, baseY - 2 - j, shade(P.timber, 0));
  }
  p.rect(sx - 5, baseY - 22, 12, 9, shade(P.plaster, 3));
  p.rect(sx - 4, baseY - 21, 10, 7, shade(P.plaster, 4));
  // a five-pointed star, small, drawn as a plus with corners
  const gx = sx + 1, gy = baseY - 17;
  p.line(gx - 3, gy, gx + 3, gy, shade(P.glow, 3));
  p.line(gx, gy - 3, gx, gy + 3, shade(P.glow, 3));
  p.set(gx - 2, gy - 2, shade(P.glow, 2));
  p.set(gx + 2, gy - 2, shade(P.glow, 2));
  p.set(gx - 2, gy + 2, shade(P.glow, 2));
  p.set(gx + 2, gy + 2, shade(P.glow, 2));
  p.set(gx, gy, shade(P.glow, 4));

  finish(p);
  contact(p, cx, baseY + 1, 26, 13);
  return { px: p, ...anchor(p) };
}
