// Dice faces and cube sticks.
//
// Two pictures out of the real homework, drawn the way the ten-frame is
// drawn: as pixels, on the closed palette, so they belong to the same
// world as the island rather than looking like a spreadsheet next to a
// hand-drawn cherry tree.
//
// ---------------------------------------------------------------------
//
// WHY A DIE AND NOT ANOTHER TEN-FRAME
//
// A dice face is not a picture of a number, it is a SHAPE that means a
// number. That is the whole skill — subitising — and it is the one
// thing in first-grade arithmetic that must not be counted. A child who
// counts the pips on a five has not learned the five.
//
// So the pips sit in the canonical positions and never anywhere else.
// A "randomly arranged" five would be a different and much worse
// exercise, and it is the reason the layout below is a table rather
// than a loop.
//
// WHY A BAR AS WELL AS A FRAME
//
// The Steckwürfelstange is the second picture of the same idea. The
// ten-frame says "five and five"; the bar says "this long, split here".
// A child who only ever sees one representation has learned the
// representation rather than the number, which is exactly why the
// worksheet uses cubes and the app so far did not.

import { P, INK, shade } from '../core/palette.js';
import { Px } from '../core/px.js';

// ------------------------------------------------------------- the die

// 34, not 30. At 30 the three pips of a diagonal three were seven
// pixels apart and seven pixels wide, so they ran into each other and
// the three read as a smear. A dice face is a SHAPE that means a
// number; a shape whose parts touch is a different shape.
const W = 34;
const PIP = 4;

/**
 * Where the pips go, per number. The canonical arrangement and no
 * other: these are the shapes a child is learning to recognise, and an
 * unconventional four is a four they have to count.
 *
 * Coordinates are ninths of the face, so the layout is readable here
 * and the size is decided in one place.
 */
const A = 1.4, B = 4, C = 6.6;      // corner, middle, far corner
const AUGEN: Record<number, [number, number][]> = {
  0: [],
  1: [[B, B]],
  2: [[A, A], [C, C]],
  3: [[A, A], [B, B], [C, C]],
  4: [[A, A], [C, A], [A, C], [C, C]],
  5: [[A, A], [C, A], [B, B], [A, C], [C, C]],
  6: [[A, A], [C, A], [A, B], [C, B], [A, C], [C, C]],
};

export function wuerfel(augen: number, leer = false): Px {
  const p = new Px(W, W);
  // The face: a pale square with a rounded look, made by clipping the
  // four corners rather than by drawing a curve. One pixel of corner is
  // all a 30-pixel square can carry.
  p.rect(0, 0, W, W, INK);
  p.rect(1, 1, W - 2, W - 2, shade(P.plaster, 4));
  p.rect(1, 1, W - 2, 2, shade(P.plaster, 4));
  p.rect(1, W - 4, W - 2, 3, shade(P.plaster, 2));
  p.rect(W - 4, 1, 3, W - 2, shade(P.plaster, 3));
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, W - 1], [W - 1, W - 1]] as [number, number][]) {
    p.clear(x, y);
  }

  if (leer) return p;

  for (const [gx, gy] of AUGEN[augen] ?? []) {
    const cx = Math.round((gx / 8) * (W - 10)) + 5;
    const cy = Math.round((gy / 8) * (W - 10)) + 5;
    p.ellipse(cx, cy, PIP / 2 + 1, PIP / 2 + 1, INK);
    p.ellipse(cx, cy, PIP / 2, PIP / 2, shade(P.chalk, 1));
    // One lit pixel on the upper left of every pip, the same light that
    // falls on everything else in this game.
    p.set(cx - 1, cy - 1, shade(P.chalk, 3));
  }
  return p;
}

// ------------------------------------------------------- the cube stick

const ZELLE = 16;

/**
 * A Steckwürfelstange: `ganz` cubes in a row, the first `teil` of them
 * in one colour and the rest in another.
 *
 * `teil < 0` leaves the whole bar uncoloured, which is the empty bar
 * the worksheet hands a child before they pick up the pencils.
 *
 * The two colours are the fruit ramp and the chalk ramp — red and blue,
 * the two crayons a six-year-old actually reaches for, and the two that
 * stay farthest apart for a child who cannot tell green from brown.
 */
export function stange(ganz: number, teil: number, zweite = true): Px {
  const p = new Px(ganz * ZELLE + 2, ZELLE + 2);
  for (let i = 0; i < ganz; i++) {
    const x = i * ZELLE + 1;
    const gefaerbt = teil >= 0 && i < teil;
    const rest = teil >= 0 && zweite;
    const ramp = gefaerbt ? P.fruit : rest ? P.chalk : P.plaster;

    p.rect(x, 1, ZELLE, ZELLE, INK);
    p.rect(x + 1, 2, ZELLE - 2, ZELLE - 2, shade(ramp, gefaerbt || rest ? 2 : 4));
    // A cube, not a square: a lit top-left edge and a shaded bottom
    // right, which is what makes a row of them read as a stack of
    // bricks rather than as a table.
    p.rect(x + 1, 2, ZELLE - 2, 2, shade(ramp, gefaerbt || rest ? 3 : 4));
    p.rect(x + 1, ZELLE - 2, ZELLE - 2, 2, shade(ramp, gefaerbt || rest ? 1 : 2));
    p.rect(x + ZELLE - 3, 2, 2, ZELLE - 2, shade(ramp, gefaerbt || rest ? 1 : 3));
    // The stud on top, so it is a plug-in cube.
    p.rect(x + 5, 4, 5, 3, shade(ramp, gefaerbt || rest ? 3 : 4));
    p.rect(x + 5, 6, 5, 1, shade(ramp, gefaerbt || rest ? 1 : 2));
  }
  return p;
}

// ---------------------------------------------------------------- canvas

function canvasOf(px: Px, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = px.w * scale;
  c.height = px.h * scale;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(px.toCanvas(), 0, 0, c.width, c.height);
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  return c;
}

export function wuerfelCanvas(augen: number, scale: number): HTMLCanvasElement {
  return canvasOf(wuerfel(augen), scale);
}

export function stangeCanvas(
  ganz: number, teil: number, scale: number, zweite = true,
): HTMLCanvasElement {
  return canvasOf(stange(ganz, teil, zweite), scale);
}
