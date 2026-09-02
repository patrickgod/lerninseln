// The second batch of things to build.
//
// Patrick's original brief asked for "viele bunte assets wie
// kirschbäume, fruchtbäume, etc", and sixteen things is not many for an
// island a child is meant to keep shaping for weeks.
//
// Its own module because `sprites.ts` had passed a thousand lines and
// the ground tiles, the houses and the animals in there are the SPINE —
// everything else on the island is drawn relative to them. This file is
// the leaves: things a child buys, none of which anything else depends
// on, and which will keep being added to.
//
// The last four are the interesting ones. A beehive, a bird box, a
// campfire and a windmill all CHANGE something about the island rather
// than merely standing on it: bees, birds, a light after dark, and
// sails that turn. A decoration that does something is worth three that
// do not.
//
// Same rules as everywhere: the closed palette, light from the upper
// left, shading by stepping along a ramp, and the rim shaded rather
// than outlined in ink.

import { P, INK, shade, stepDown, mixSnap } from '../core/palette.js';
import { Px, rand } from '../core/px.js';
import { TILE_H, type Sprite } from './sprites.js';

function finish(p: Px): void {
  p.rim(stepDown, INK);
  p.antialias(mixSnap);
}

function anchor(p: Px): { ax: number; ay: number } {
  return { ax: (p.w / 2) | 0, ay: p.h - 1 - TILE_H / 2 };
}

/** The soft contact shadow. Always AFTER `finish`, or the rim traces it. */
function contact(p: Px, cx: number, cy: number, w = 22, h = 11): void {
  for (let y = -h / 2; y < h / 2; y++) {
    const f = 1 - Math.abs(y + 0.5) / (h / 2);
    const half = Math.floor((w / 2) * f);
    for (let x = -half; x < half; x++) {
      p.blend(cx + x, cy + y, INK, 0.22 * (1 - Math.abs(x) / Math.max(1, half)) + 0.05);
    }
  }
}

// ------------------------------------------------------------- growing

export function berryBush(seed: number): Sprite {
  const p = new Px(28, 28);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 14;
  const blobs: [number, number, number][] = [[0, 0, 7], [-5, 2, 5], [5, 2, 5], [-2, -3, 5]];
  for (const [dx, dy, r] of blobs) {
    p.ellipse(cx + dx, baseY - 6 + dy, r, Math.round(r * 0.8), shade(P.leaf, 2));
  }
  for (const [dx, dy, r] of blobs) {
    p.ellipse(cx + dx - 1, baseY - 7 + dy, Math.round(r * 0.6), Math.round(r * 0.45),
      shade(P.leaf, 3));
  }
  // Berries have to be the most saturated thing on the bush or they
  // disappear into it, exactly like fruit on a tree.
  for (let i = 0; i < 16; i++) {
    const a = rn() * Math.PI * 2, d = Math.sqrt(rn()) * 9;
    const x = cx + Math.round(Math.cos(a) * d);
    const y = baseY - 6 + Math.round(Math.sin(a) * d * 0.7);
    if (!p.get(x, y)) continue;
    p.set(x, y, shade(P.plum, 3));
    p.set(x - 1, y, shade(P.plum, 4));
  }
  finish(p);
  contact(p, cx, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

export function sunflowers(seed: number): Sprite {
  const p = new Px(28, 42);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 14;
  // Tall, and that is the point. Everything else on the island is low,
  // so one thin tall plant changes the skyline of a whole tile.
  for (let i = 0; i < 4; i++) {
    const x = cx + Math.round((rn() - 0.5) * 14);
    const y = baseY + Math.round((rn() - 0.5) * 5);
    const h = 15 + Math.round(rn() * 7);
    for (let j = 0; j < h; j++) p.set(x, y - j, shade(P.leaf, j % 3 ? 2 : 3));
    p.ellipse(x - 3, y - Math.round(h * 0.55), 3, 2, shade(P.leaf, 3));
    p.ellipse(x + 3, y - Math.round(h * 0.35), 3, 2, shade(P.leaf, 2));
    p.ellipse(x, y - h - 2, 4, 4, shade(P.glow, 3));
    p.ellipse(x - 1, y - h - 3, 3, 3, shade(P.glow, 4));
    p.ellipse(x, y - h - 2, 2, 2, shade(P.timber, 1));
  }
  finish(p);
  contact(p, cx, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

export function pumpkins(seed: number): Sprite {
  const p = new Px(30, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 15;
  p.diamond(cx, baseY, 24, 12, shade(P.earth, 1));
  for (let i = -10; i <= 10; i++) {
    p.set(cx + i, baseY + Math.round(Math.sin(i * 0.6) * 3), shade(P.leaf, 2));
  }
  for (let i = 0; i < 4; i++) {
    const x = cx + Math.round((rn() - 0.5) * 18);
    const y = baseY + Math.round((rn() - 0.5) * 7);
    const r = 3 + Math.round(rn() * 1.5);
    p.ellipse(x, y - r + 1, r, Math.round(r * 0.85), shade(P.citrus, 2));
    p.ellipse(x - 1, y - r, Math.round(r * 0.6), Math.round(r * 0.5), shade(P.citrus, 3));
    // the ribs, which are what makes it a pumpkin and not an orange
    p.set(x, y - r + 1 - Math.round(r * 0.6), shade(P.citrus, 1));
    p.set(x + Math.round(r * 0.6), y - r + 1, shade(P.citrus, 1));
    p.set(x, y - r * 2 + 1, shade(P.leaf, 2));
  }
  finish(p);
  contact(p, cx, baseY + 1, 24, 12);
  return { px: p, ...anchor(p) };
}

export function hedge(seed: number): Sprite {
  const p = new Px(36, 28);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 18;
  // Runs along one isometric axis, like the fence, and is CLIPPED FLAT
  // on top — a hedge that is bumpy on top is a row of bushes.
  for (let i = -10; i <= 10; i++) {
    const x = cx + i;
    const y = baseY - Math.round(i * 0.5);
    const h = 9 + (rn() > 0.8 ? 1 : 0);
    for (let j = 0; j < h; j++) {
      const lit = j > h - 3 ? 3 : i < 0 ? 2 : 1;
      p.set(x, y - j, shade(P.pine, lit));
    }
  }
  for (let i = 0; i < 16; i++) {
    const ix = Math.round((rn() - 0.5) * 20);
    p.set(cx + ix, baseY - Math.round(ix * 0.5) - 8 - Math.round(rn() * 2), shade(P.pine, 4));
  }
  finish(p);
  contact(p, cx, baseY + 1, 26, 13);
  return { px: p, ...anchor(p) };
}

export function mushrooms(seed: number): Sprite {
  const p = new Px(26, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 13;

  // Three, well apart, and each one drawn stem-then-cap with a dark
  // gill line under the cap. The first version scattered five small
  // ones close together and they merged into a single red slab — at
  // this size, three things you can count beats five you cannot.
  const spots: [number, number, number][] = [[-7, 2, 4], [1, -1, 5], [7, 3, 3]];
  for (const [dx, dy, r] of spots) {
    const x = cx + dx + Math.round((rn() - 0.5) * 2);
    const y = baseY + dy;
    const h = r + 2;
    // stem
    for (let j = 0; j < h; j++) {
      p.set(x, y - j, shade(P.plaster, 4));
      p.set(x + 1, y - j, shade(P.plaster, 2));
    }
    // the gill line: one dark row under the cap, which is what stops
    // the cap floating
    p.line(x - r + 1, y - h, x + r, y - h, shade(P.plaster, 1));
    // cap
    for (let j = 0; j <= r - 1; j++) {
      const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (j / r) ** 2)));
      for (let i = -w; i <= w; i++) {
        p.set(x + i, y - h - j, shade(P.fruit, i < -w * 0.3 ? 3 : i > w * 0.4 ? 1 : 2));
      }
    }
    // white flecks
    p.set(x - 1, y - h - Math.round(r * 0.5), shade(P.plaster, 4));
    p.set(x + Math.round(r * 0.5), y - h - 1, shade(P.plaster, 4));
  }
  finish(p);
  contact(p, cx, baseY + 1, 20, 10);
  return { px: p, ...anchor(p) };
}

// ------------------------------------------------ things that DO things

export function beehive(): Sprite {
  const p = new Px(24, 34);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 12;
  for (const dx of [-5, 4]) {
    for (let j = 0; j < 4; j++) p.set(cx + dx, baseY - j, shade(P.timber, 1));
  }
  // The classic stacked skep: three tapering rings with a shadow line
  // between them, which is the whole silhouette.
  let y = baseY - 4;
  for (let tier = 0; tier < 3; tier++) {
    const w = 8 - tier * 2;
    for (let j = 0; j < 5; j++) {
      for (let i = -w; i <= w; i++) {
        const lit = i < -w * 0.35 ? 3 : i > w * 0.4 ? 1 : 2;
        p.set(cx + i, y - j, shade(P.thatch, j === 0 ? lit - 1 : lit));
      }
    }
    y -= 5;
  }
  p.ellipse(cx, y + 1, 3, 2, shade(P.thatch, 4));
  p.rect(cx - 2, baseY - 6, 4, 2, INK);
  finish(p);
  contact(p, cx, baseY + 1, 18, 9);
  return { px: p, ...anchor(p) };
}

export function birdBox(): Sprite {
  const p = new Px(20, 42);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 10;
  for (let j = 0; j < 20; j++) {
    p.set(cx, baseY - j, shade(P.timber, 2));
    p.set(cx + 1, baseY - j, shade(P.timber, 0));
  }
  p.rect(cx - 5, baseY - 32, 12, 11, shade(P.timber, 3));
  p.rect(cx + 1, baseY - 32, 6, 11, shade(P.timber, 1));
  for (let i = 0; i <= 7; i++) {
    p.line(cx - 7 + i, baseY - 33 - i, cx + 8 - i, baseY - 33 - i,
      shade(P.terracotta, i < 3 ? 3 : 2));
  }
  p.ellipse(cx, baseY - 27, 3, 3, INK);
  p.line(cx - 3, baseY - 23, cx + 3, baseY - 23, shade(P.timber, 1));
  finish(p);
  contact(p, cx, baseY + 1, 12, 6);
  return { px: p, ...anchor(p) };
}

/**
 * A campfire, in two frames.
 *
 * The one decoration that is BETTER after dark, which is the whole
 * reason for having a day and a night at all: something the child owns
 * that behaves differently depending on when they play.
 */
export function campfire(frame: number): Sprite {
  const p = new Px(26, 30);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 13;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.ellipse(cx + Math.round(Math.cos(a) * 9), baseY + Math.round(Math.sin(a) * 4),
      2, 2, shade(P.stone, i % 2 ? 2 : 3));
  }
  p.line(cx - 5, baseY - 2, cx + 5, baseY - 4, shade(P.timber, 2));
  p.line(cx - 5, baseY - 4, cx + 5, baseY - 2, shade(P.timber, 1));
  const lean = frame === 0 ? 0 : 1;
  for (let j = 0; j < 11; j++) {
    const w = Math.round(4 * Math.sin((1 - j / 11) * Math.PI * 0.8));
    for (let i = -w; i <= w; i++) {
      const hot = j > 6 || Math.abs(i) < w * 0.4;
      p.set(cx + i + Math.round((j / 11) * lean * 2), baseY - 4 - j,
        shade(hot ? P.glow : P.citrus, hot ? 4 : 2));
    }
  }
  finish(p);
  contact(p, cx, baseY + 1, 22, 11);
  return { px: p, ...anchor(p) };
}

/** A windmill, with sails that actually turn. Eight frames. */
export function windmill(frame: number): Sprite {
  const p = new Px(38, 58);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 19;

  for (let j = 0; j < 26; j++) {
    const w = Math.round(8 - (j / 26) * 3);
    for (let i = -w; i <= w; i++) {
      const lit = i < -w * 0.3 ? 3 : i > w * 0.4 ? 1 : 2;
      p.set(cx + i, baseY - j, shade(P.plaster, lit));
    }
  }
  p.rect(cx - 2, baseY - 8, 5, 9, shade(P.timber, 1));
  p.rect(cx + 3, baseY - 18, 4, 4, shade(P.glow, 3));

  for (let j = 0; j <= 6; j++) {
    const w = 7 - j;
    for (let i = -w; i <= w; i++) p.set(cx + i, baseY - 27 - j, shade(P.slate, i < 0 ? 3 : 1));
  }

  // Four arms on a hub. The cloth is drawn offset to ONE side of each
  // arm, which is what makes a windmill look like it is catching wind
  // rather than like a ceiling fan.
  const hubY = baseY - 30;
  const a0 = (frame / 8) * Math.PI / 2;
  for (let k = 0; k < 4; k++) {
    const a = a0 + (k / 4) * Math.PI * 2;
    const ex = cx + Math.round(Math.cos(a) * 15);
    const ey = hubY + Math.round(Math.sin(a) * 15);
    p.line(cx, hubY, ex, ey, shade(P.timber, 2));
    const ox = Math.round(Math.cos(a + Math.PI / 2) * 2);
    const oy = Math.round(Math.sin(a + Math.PI / 2) * 2);
    p.line(cx + ox, hubY + oy, ex + ox, ey + oy, shade(P.plaster, 4));
  }
  p.ellipse(cx, hubY, 2, 2, shade(P.timber, 0));

  finish(p);
  contact(p, cx, baseY + 1, 22, 11);
  return { px: p, ...anchor(p) };
}

/** A bee. Two frames, and never more than a few pixels. */
export function bee(frame: number): Sprite {
  const p = new Px(7, 7);
  p.set(3, 4, shade(P.glow, 2));
  p.set(4, 4, INK);
  p.set(2, 4, shade(P.glow, 3));
  p.set(3, 3, frame === 0 ? shade(P.plaster, 4) : shade(P.plaster, 3));
  p.set(2, 3, shade(P.plaster, 4));
  return { px: p, ax: 3, ay: 4 };
}
