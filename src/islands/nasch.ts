// The third batch of things to build, and it exists because of a
// six-year-old.
//
// He looked at the cherry tree — pink blossom, a round crown, drawn as
// a cherry tree — and called it a **Marshmallowbaum**. He was not
// wrong. Pink round things on a stick ARE marshmallows if you are six,
// and the name that a child gives a thing is a better name than the one
// the adult had in mind.
//
// So the tree is called that now, and this file is the rest of the
// thought: a whole family of sweet things to put on an island, because
// what a child wants to build is not a botanically accurate orchard.
//
// The rule that keeps it from turning into a sugar bomb: the sweet
// things are ONE family among six, and they cost more than the plain
// ones. An island of nothing but candy is a worse picture than an
// island with a candy corner, and the price is what makes the corner
// happen.
//
// Same rules as everywhere else: the closed palette, light from the
// upper left, shading by stepping along a ramp, and a shaded rim rather
// than an ink outline.

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

/** The sweet ramps, so a candy corner is not all one pink. */
const ZUCKER = [P.candy, P.fruit, P.citrus, P.blossom, P.plum] as const;

// --------------------------------------------------------------- sweets

/**
 * A candy cane.
 *
 * Tall and thin, which is the point: it changes the skyline of a tile
 * without covering it, so a row of them along a path reads as bunting
 * rather than as a hedge.
 *
 * The stripes are two pixels wide and never one. A one-pixel stripe on
 * a two-pixel-wide pole is a dotted line at island scale, and a candy
 * cane whose stripes have gone is a stick.
 */
export function zuckerstange(seed: number): Sprite {
  const p = new Px(22, 44);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 11;
  const rot = ZUCKER[Math.floor(rn() * 3)];       // red, pink or orange
  const weiss = shade(P.plaster, 4);
  const hoehe = 26 + Math.floor(rn() * 5);

  const streifen = (x: number, y: number, i: number): void => {
    const hell = Math.floor(i / 2) % 2 === 0;
    p.set(x, y, hell ? weiss : shade(rot, 3));
    p.set(x + 1, y, hell ? shade(P.plaster, 3) : shade(rot, 2));
    p.set(x + 2, y, hell ? shade(P.plaster, 2) : shade(rot, 1));
  };

  for (let j = 0; j < hoehe; j++) streifen(cx - 1, baseY - j, j + 1);
  // The hook, as a quarter circle. Drawn from the top of the pole so it
  // meets it rather than floating beside it.
  const hy = baseY - hoehe;
  for (let a = 180; a >= 20; a -= 6) {
    const r = (a * Math.PI) / 180;
    const x = cx - 1 + Math.round((1 + Math.cos(r)) * 4);
    const y = hy - Math.round(Math.sin(r) * 4);
    streifen(x, y, Math.round((180 - a) / 6) + hoehe);
  }
  finish(p);
  contact(p, cx, baseY + 1, 12, 7);
  return { px: p, ...anchor(p) };
}

/**
 * Lollipop flowers.
 *
 * Round heads on thin stems, at three different heights, because three
 * things at one height is a fence and three at three heights is a
 * bunch. The swirl is two rings rather than a spiral: a real spiral is
 * four pixels of mush at this size.
 */
export function lolliblumen(seed: number): Sprite {
  const p = new Px(28, 38);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 14;
  const stiele: [number, number, number][] = [[-6, 0, 13], [0, 2, 19], [6, 1, 15]];
  for (const [dx, dy, h] of stiele) {
    const x = cx + dx, y = baseY + dy;
    for (let j = 0; j < h; j++) p.set(x, y - j, shade(P.leaf, j % 4 ? 2 : 3));
    p.set(x - 1, y - Math.round(h * 0.5), shade(P.leaf, 3));
    p.set(x + 1, y - Math.round(h * 0.7), shade(P.leaf, 2));
    const ramp = ZUCKER[Math.floor(rn() * ZUCKER.length)];
    const hy = y - h - 4;
    p.ellipse(x, hy, 4, 4, shade(ramp, 2));
    p.ellipse(x - 1, hy - 1, 3, 3, shade(ramp, 3));
    p.ellipse(x - 1, hy - 1, 1, 1, shade(P.plaster, 4));
    p.set(x + 2, hy + 2, shade(ramp, 1));
  }
  finish(p);
  contact(p, cx, baseY + 1, 20, 9);
  return { px: p, ...anchor(p) };
}

/**
 * Candyfloss on a stick.
 *
 * Two lessons in one sprite.
 *
 * Fluff is a RAGGED EDGE, not a colour: the first version was a smooth
 * pink ellipse and read as a balloon. What fixed it was chewing pixels
 * out of the outline at random and putting a few back outside it.
 *
 * And the second version read as the Marshmallowbaum — both were a
 * round pink thing on a stick, so the island had two items that were
 * one item. What separates them is SHAPE, not colour: three overlapping
 * lumps instead of one round crown, wider than it is tall, and a paper
 * cone underneath that no tree has.
 */
export function zuckerwatte(seed: number): Sprite {
  const p = new Px(30, 36);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 15;
  const ramp = rn() < 0.5 ? P.candy : P.blossom;

  for (let j = 0; j < 9; j++) p.set(cx, baseY - j, shade(P.plaster, j % 3 ? 3 : 2));
  // The paper cone, point down. Four rows is enough to read.
  for (let j = 0; j < 5; j++) {
    const half = j;
    for (let i = -half; i <= half; i++) {
      p.set(cx + i, baseY - 9 - j, shade(P.plaster, i < 0 ? 4 : 3));
    }
  }

  const cy = baseY - 19;
  const lumps: [number, number, number, number][] = [
    [-5, 1, 7, 6], [5, 1, 6, 5], [0, -3, 7, 6],
  ];
  for (const [dx, dy, rx, ry] of lumps) p.ellipse(cx + dx, cy + dy, rx, ry, shade(ramp, 2));
  for (const [dx, dy, rx, ry] of lumps) {
    p.ellipse(cx + dx - 1, cy + dy - 2, rx - 2, ry - 2, shade(ramp, 3));
  }
  p.ellipse(cx - 3, cy - 5, 3, 2, shade(ramp, 4));
  // Chew the edge, then put a little back outside it.
  for (let i = 0; i < 110; i++) {
    const a = rn() * Math.PI * 2, d = 6 + rn() * 7;
    const x = cx + Math.round(Math.cos(a) * d * 1.25);
    const y = cy + Math.round(Math.sin(a) * d * 0.8);
    if (rn() < 0.5) p.clear(x, y);
    else if (p.get(x - 1, y) || p.get(x + 1, y)) p.set(x, y, shade(ramp, rn() < 0.5 ? 3 : 2));
  }
  finish(p);
  contact(p, cx, baseY + 1, 14, 8);
  return { px: p, ...anchor(p) };
}

/**
 * A bush with wrapped sweets growing on it.
 *
 * The sweets are the same shape as the currency icon in the corner of
 * the screen, deliberately: a child who has been counting Bonbons all
 * week should recognise what is on the bush without being told.
 *
 * Three of them, not sixteen. The first version scattered small ones
 * over the whole bush and they read as berries — a sweet is a body with
 * two twisted ends, and at this size that is seven pixels across, so
 * three is all that fits and all it needs.
 */
export function bonbonbusch(seed: number): Sprite {
  const p = new Px(30, 30);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 15;
  const blobs: [number, number, number][] = [[0, 0, 8], [-6, 2, 5], [6, 2, 5], [-1, -4, 6]];
  for (const [dx, dy, r] of blobs) {
    p.ellipse(cx + dx, baseY - 8 + dy, r, Math.round(r * 0.8), shade(P.leaf, 2));
  }
  for (const [dx, dy, r] of blobs) {
    p.ellipse(cx + dx - 1, baseY - 9 + dy, Math.round(r * 0.6), Math.round(r * 0.45),
      shade(P.leaf, 3));
  }
  const stellen: [number, number][] = [[-5, -12], [3, -14], [6, -7]];
  stellen.forEach(([dx, dy], i) => {
    const ramp = ZUCKER[(i * 2 + Math.floor(rn() * 3)) % ZUCKER.length];
    const x = cx + dx, y = baseY + dy;
    p.rect(x - 1, y - 1, 3, 3, shade(ramp, 3));
    p.set(x - 1, y - 1, shade(ramp, 4));
    p.rect(x - 1, y + 1, 3, 1, shade(ramp, 1));
    // The twisted ends, which are the whole silhouette of a sweet.
    p.set(x - 2, y - 1, shade(ramp, 2));
    p.set(x - 3, y, shade(ramp, 3));
    p.set(x - 2, y + 1, shade(ramp, 1));
    p.set(x + 2, y - 1, shade(ramp, 2));
    p.set(x + 3, y, shade(ramp, 2));
    p.set(x + 2, y + 1, shade(ramp, 1));
  });
  finish(p);
  contact(p, cx, baseY + 1, 22, 10);
  return { px: p, ...anchor(p) };
}

/**
 * The gingerbread house.
 *
 * The most expensive thing on the island and the only one a child will
 * save a fortnight for, so it has to be worth arriving: biscuit walls,
 * a roof of icing scallops, sweets pressed into the sides and one warm
 * window. A rabbit turns up to nibble it - see `life.ts`.
 *
 * It is deliberately smaller than a real house. A decoration that
 * outsizes the Haus der verliebten Zahlen would make the school look
 * like the shed.
 *
 * The first version drew the roof as two slopes computed separately and
 * they did not meet: there was a hole straight down the ridge. It is
 * one triangle now, drawn as rows, which cannot come apart.
 */
export function lebkuchenhaus(): Sprite {
  const p = new Px(36, 40);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 18;
  const w = 10;
  const wandH = 13;
  const top = baseY - wandH;

  // Walls. Light from the upper LEFT, so the right third steps down.
  for (let j = 0; j < wandH; j++) {
    for (let i = -w; i <= w; i++) {
      p.set(cx + i, top + j, shade(P.amber, i < 2 ? 2 : 1));
    }
  }
  p.rect(cx - w, top, w * 2 + 1, 1, shade(P.amber, 3));       // baked edge

  // Roof: ONE triangle, drawn as rows, so the ridge cannot open up.
  const dachH = 10;
  for (let j = 0; j < dachH; j++) {
    const half = Math.round((w + 2) * (1 - j / dachH));
    for (let i = -half; i <= half; i++) {
      p.set(cx + i, top - dachH + j, shade(P.amber, i < 0 ? 1 : 0));
    }
  }
  // Icing down both slopes and along the eaves. The scallops are what
  // make it icing rather than a white line.
  for (let j = 0; j < dachH; j++) {
    const half = Math.round((w + 2) * (1 - j / dachH));
    p.set(cx - half, top - dachH + j, shade(P.plaster, 4));
    p.set(cx + half, top - dachH + j, shade(P.plaster, 3));
  }
  for (let i = -w - 2; i <= w + 2; i++) {
    p.set(cx + i, top - 1, shade(P.plaster, 4));
    if ((i + 30) % 3 === 0) p.set(cx + i, top, shade(P.plaster, 3));
  }

  // A door of chocolate and one lit window.
  p.rect(cx - 4, baseY - 9, 6, 9, shade(P.timber, 0));
  p.rect(cx - 3, baseY - 8, 4, 8, shade(P.timber, 2));
  p.set(cx, baseY - 5, shade(P.glow, 3));
  p.rect(cx + 4, top + 4, 4, 4, shade(P.timber, 0));
  p.rect(cx + 5, top + 5, 2, 2, shade(P.glow, 3));

  // Sweets pressed into the walls.
  const knoepfe: [number, number, number][] = [
    [-8, 3, 0], [-7, 9, 2], [8, 8, 1], [7, 3, 3], [-2, 11, 4],
  ];
  for (const [dx, dy, k] of knoepfe) {
    const ramp = ZUCKER[k];
    const x = cx + dx, y = top + dy;
    p.set(x, y, shade(ramp, 3));
    p.set(x - 1, y, shade(ramp, 4));
    p.set(x, y + 1, shade(ramp, 2));
    p.set(x + 1, y, shade(ramp, 2));
  }

  finish(p);
  contact(p, cx, baseY + 1, 28, 13);
  return { px: p, ...anchor(p) };
}

/**
 * A chocolate fountain.
 *
 * Two tiers and a pool, and the chocolate is the amber ramp rather than
 * a brown of its own - the palette is closed, and amber at its dark end
 * IS chocolate.
 *
 * The first version made the tiers out of stone with a trickle of
 * chocolate over them, and it read as a grey wedding cake. The tiers are
 * chocolate-covered now and the stone is only a rim, so the sprite is
 * brown from ten feet away, which is the only distance that matters.
 */
export function schokobrunnen(): Sprite {
  const p = new Px(30, 36);
  const baseY = p.h - 1 - TILE_H / 2;
  const cx = 15;

  // The pool it stands in: a stone rim with chocolate inside it.
  p.ellipse(cx, baseY - 2, 11, 5, shade(P.stone, 3));
  p.ellipse(cx, baseY - 2, 9, 4, shade(P.stone, 1));
  p.ellipse(cx, baseY - 3, 8, 3, shade(P.amber, 1));
  p.ellipse(cx - 2, baseY - 4, 5, 2, shade(P.amber, 2));

  p.rect(cx - 2, baseY - 22, 4, 20, shade(P.amber, 1));
  p.rect(cx - 2, baseY - 22, 2, 20, shade(P.amber, 2));

  // Two tiers, each a chocolate-covered plate: lit top, dark underside,
  // and chocolate going over both lips.
  for (const [dy, r] of [[-11, 9], [-18, 6]] as [number, number][]) {
    p.ellipse(cx, baseY + dy + 1, r, Math.round(r * 0.45), shade(P.amber, 0));
    p.ellipse(cx, baseY + dy, r, Math.round(r * 0.45), shade(P.amber, 2));
    p.ellipse(cx - 2, baseY + dy - 1, r - 4, Math.round(r * 0.25), shade(P.amber, 3));
    for (let sgn = -1; sgn <= 1; sgn += 2) {
      const x = cx + sgn * (r - 1);
      for (let j = 1; j < (r === 6 ? 8 : 9); j++) {
        p.set(x, baseY + dy + j, shade(P.amber, j % 3 ? 1 : 2));
        p.set(x + sgn, baseY + dy + j, shade(P.amber, 0));
      }
    }
  }
  // The little dome the chocolate comes out of.
  p.ellipse(cx, baseY - 24, 3, 3, shade(P.amber, 2));
  p.ellipse(cx - 1, baseY - 25, 2, 2, shade(P.amber, 4));

  finish(p);
  contact(p, cx, baseY + 1, 24, 11);
  return { px: p, ...anchor(p) };
}

/**
 * A sandcastle.
 *
 * The one decoration that belongs on the beach, and the reason the
 * beach became buildable at all: a sand ring that a child could look at
 * but not touch was the largest unusable part of the island.
 */
export function sandburg(seed: number): Sprite {
  const p = new Px(28, 26);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 14;
  const tuerme: [number, number][] = [[-7, 8], [0, 13], [7, 9]];
  for (const [dx, h] of tuerme) {
    const x = cx + dx;
    for (let j = 0; j < h; j++) {
      for (let i = -3; i <= 3; i++) {
        p.set(x + i, baseY - j, shade(P.sand, i < 0 ? 4 : i === 0 ? 3 : 2));
      }
    }
    // Battlements, which is the whole silhouette. Without them it is
    // three lumps.
    for (let i = -3; i <= 3; i++) {
      if ((i + 3) % 2 === 0) p.set(x + i, baseY - h - 1, shade(P.sand, i < 0 ? 4 : 3));
      p.set(x + i, baseY - h, shade(P.sand, i < 0 ? 4 : 3));
    }
  }
  p.rect(cx - 2, baseY - 6, 4, 6, shade(P.earth, 1));
  p.rect(cx - 1, baseY - 5, 2, 5, shade(P.earth, 2));
  // A shell or two, pressed in.
  for (let i = 0; i < 3; i++) {
    p.set(cx - 9 + Math.floor(rn() * 18), baseY - Math.floor(rn() * 3), shade(P.foam, 3));
  }
  finish(p);
  contact(p, cx, baseY + 1, 24, 10);
  return { px: p, ...anchor(p) };
}

/**
 * A flagpole.
 *
 * Cheap, tall, and the one thing on the list that is purely a marker.
 * A child who cannot read puts a flag where something matters.
 */
export function fahne(seed: number): Sprite {
  const p = new Px(24, 46);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 9;
  const ramp = ZUCKER[Math.floor(rn() * ZUCKER.length)];
  const h = 30;
  for (let j = 0; j < h; j++) {
    p.set(cx, baseY - j, shade(P.plaster, 3));
    p.set(cx + 1, baseY - j, shade(P.plaster, 1));
  }
  p.ellipse(cx, baseY - h - 1, 2, 2, shade(P.glow, 3));
  // The flag, with one wave in it. A straight triangle reads as a road
  // sign; the wave is what makes it cloth.
  for (let j = 0; j < 9; j++) {
    const laenge = 12 - Math.round((j / 9) * 4);
    const welle = Math.round(Math.sin(j / 2.2) * 1.4);
    for (let i = 2; i < laenge; i++) {
      p.set(cx + i, baseY - h + j + 2 + welle,
        shade(ramp, i < laenge - 3 ? (j < 4 ? 3 : 2) : 1));
    }
  }
  finish(p);
  contact(p, cx, baseY + 1, 10, 6);
  return { px: p, ...anchor(p) };
}

// -------------------------------------------------------------- animals

/**
 * A rabbit.
 *
 * NOT in the shop. It turns up when there is a gingerbread house to
 * nibble, and that is the whole point of it: a thing you cannot buy is
 * worth more than a thing you can, and a child who works out that the
 * rabbits came BECAUSE of the house has learned something a shop cannot
 * teach.
 *
 * A rabbit is EARS. The first version had two one-pixel ears a shade
 * away from the head and it read as a guinea pig - which is the sheep
 * that read as a pebble and the cat with its ears inside its outline,
 * for the third time. Two pixels wide, seven tall, two steps darker
 * than the head, and a gap of daylight between them.
 */
export function kaninchen(seed: number): Sprite {
  // 32 tall, not 26. At 26 the baseline sits at y=17 and the ears are
  // drawn from y=-3, which is off the top of the buffer: `Px.set`
  // silently drops anything outside, so the sprite came out as a rabbit
  // with no ears and read as a guinea pig for a second time. Nothing
  // reported it. The contact sheet did.
  const p = new Px(22, 32);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 11;
  const fell = rn() < 0.4 ? P.fur : P.wool;

  p.ellipse(cx + 1, baseY - 4, 6, 4, shade(fell, 2));       // body, sitting
  p.ellipse(cx, baseY - 6, 4, 3, shade(fell, 3));
  p.ellipse(cx + 6, baseY - 5, 3, 3, shade(fell, 4));       // cotton tail
  p.ellipse(cx - 4, baseY - 10, 4, 4, shade(fell, 3));      // head, forward
  p.ellipse(cx - 5, baseY - 11, 2, 2, shade(fell, 4));

  // Ears. Two pixels wide, a real gap between them, and dark enough to
  // read against the head they sit on.
  for (const dx of [-7, -3]) {
    for (let j = 0; j < 7; j++) {
      p.set(cx + dx, baseY - 20 + j, shade(fell, 1));
      p.set(cx + dx + 1, baseY - 20 + j, shade(fell, 0));
    }
    p.set(cx + dx, baseY - 21, shade(fell, 1));
    p.set(cx + dx, baseY - 18, shade(P.candy, 2));          // the inner ear
  }

  p.set(cx - 6, baseY - 11, INK);                           // eye
  p.set(cx - 8, baseY - 9, shade(P.candy, 2));              // nose
  p.set(cx - 7, baseY - 9, shade(fell, 4));
  finish(p);
  contact(p, cx, baseY + 1, 16, 8);
  return { px: p, ...anchor(p) };
}

/**
 * A hedgehog.
 *
 * Also not in the shop: it comes for the mushrooms, which are the
 * cheapest thing on the list. The first animal a child gets for free is
 * the one that teaches them that buying things changes the island.
 *
 * A hedgehog is a SPIKY OUTLINE and a pointed face, and nothing else
 * survives at this size. LEARNINGS.md remembers the first attempt as "a
 * potato with a nose", and the second one here was the same potato: the
 * spines were two pixels long and stayed inside the body, so there was
 * no spiky outline at all. They start at the body edge and reach four
 * or five pixels PAST it now, which is the whole sprite.
 */
export function igel(seed: number): Sprite {
  const p = new Px(28, 22);
  const baseY = p.h - 1 - TILE_H / 2;
  const rn = rand(seed);
  const cx = 14;
  const bx = cx + 2, by = baseY - 4;

  // Spines FIRST, so the body is drawn over their roots and they read
  // as growing out of it rather than as sitting on top of it.
  for (let i = 0; i <= 26; i++) {
    const a = Math.PI + (i / 26) * Math.PI;
    const dx = Math.cos(a), dy = Math.sin(a) * 0.72;
    const len = 9 + Math.floor(rn() * 2);
    for (let j = 0; j < len; j++) {
      p.set(bx + Math.round(dx * (2 + j)), by + Math.round(dy * (2 + j)),
        shade(P.fur, j > 4 ? 0 : 1));
    }
  }
  p.ellipse(bx, by, 6, 4, shade(P.fur, 1));
  p.ellipse(bx - 1, by - 1, 4, 2, shade(P.fur, 2));

  // Face: pale, pointed, and OUTSIDE the spines.
  p.ellipse(cx - 5, baseY - 3, 4, 2, shade(P.fur, 3));
  p.ellipse(cx - 7, baseY - 3, 2, 1, shade(P.fur, 4));
  p.set(cx - 9, baseY - 3, INK);                           // nose
  p.set(cx - 5, baseY - 4, INK);                           // eye
  p.ellipse(cx - 3, baseY - 6, 1, 1, shade(P.fur, 0));     // ear
  // Four feet, so it is standing rather than floating.
  for (const dx of [-4, 0, 4, 7]) p.set(cx + dx, baseY, shade(P.fur, 0));
  finish(p);
  contact(p, cx + 1, baseY + 1, 18, 8);
  return { px: p, ...anchor(p) };
}
