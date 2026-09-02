// The Zehnerfeld — the ten-frame.
//
// This is the visual spine of every game in the box, so it is worth
// making properly once. Two rows of five, filled from the top left,
// which is the arrangement a German first-grade teacher uses and the
// reason a child can see "three missing" without counting: the gap in a
// row of five is a SHAPE, not a quantity.
//
// Drawn as pixels rather than as CSS boxes so that it belongs to the
// same world as the island. A crisp rounded-rect grid would look like a
// spreadsheet next to a hand-drawn cherry tree.

import { P, INK, shade } from './palette.js';
import { Px } from './px.js';

const CELL = 13;
const PAD = 2;

export interface FrameOpts {
  /** How many counters. */
  n: number;
  /**
   * A second quantity drawn in a different colour on top of the first —
   * this is how the correction is shown: the frame completing itself
   * with the right partner, so the correction is a picture rather than
   * a scolding.
   */
  extra?: number;
  /** Draw the counters at all, or only the empty frame. */
  filled?: boolean;
  /**
   * What a counter looks like.
   *
   * `herz` for the Haus der verliebten Zahlen, where the whole idea is
   * that two numbers are in love and the pair completes each other, and
   * `perle` everywhere else. A heart in a plain addition frame would be
   * decoration; a heart in THIS frame is the metaphor the house is
   * named after, and a six-year-old will read it without being told.
   */
  shape?: 'perle' | 'herz';
}

export function tenFrame(o: FrameOpts): Px {
  const w = CELL * 5 + PAD * 2 + 1;
  const h = CELL * 2 + PAD * 2 + 1;
  const p = new Px(w, h);

  // The frame itself: a single ink grid on a pale ground. The ground is
  // the lightest chalk step, so the whole object reads as one material.
  p.rect(0, 0, w, h, shade(P.chalk, 4));
  for (let c = 0; c <= 5; c++) {
    const x = PAD + c * CELL;
    for (let y = PAD; y <= PAD + CELL * 2; y++) p.set(x, y, INK);
  }
  for (let r = 0; r <= 2; r++) {
    const y = PAD + r * CELL;
    for (let x = PAD; x <= PAD + CELL * 5; x++) p.set(x, y, INK);
  }
  // The middle line is heavier, because five-and-five is the point of
  // the frame and the eye has to find it without being told.
  const mid = PAD + CELL;
  for (let x = PAD; x <= PAD + CELL * 5; x++) p.set(x, mid + 1, INK);

  if (o.filled === false) return p;

  // Two counter shapes, both drawn from an explicit table rather than
  // from the scanline ellipse. At radius four the rasteriser produces a
  // lumpy, slightly asymmetric blob, and ten of them side by side make
  // the frame look hand-shaken.
  //
  // Half-widths per row for the disc; a bitmap for the heart, because a
  // heart is not a function of its row and trying to make it one gives
  // you a spade.
  const DISC = [1, 3, 3, 4, 4, 4, 3, 3, 1];
  const HERZ = [
    '.##...##.',
    '#########',
    '#########',
    '#########',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
  ];

  const counter = (i: number, ramp: readonly string[], shape: 'perle' | 'herz'): void => {
    const col = i % 5, row = Math.floor(i / 5);
    const cx = PAD + col * CELL + Math.floor(CELL / 2);
    const cy = PAD + row * CELL + Math.floor(CELL / 2) + (row === 1 ? 1 : 0);

    // Light upper-left, shade lower-right — the same rule as every
    // sprite on the island, so the counters belong to the same world.
    //
    // The band is narrow on purpose. A wide diagonal split across nine
    // pixels does not read as a lit form, it reads as a coin lying at
    // an angle, and ten of those in a row made the frame look like it
    // was sliding off the screen.
    const lit = (dx: number, dy: number): number =>
      dx + dy <= -5 ? 3 : dx + dy >= 5 ? 1 : 2;

    if (shape === 'herz') {
      for (let j = 0; j < HERZ.length; j++) {
        const dy = j - 4;
        for (let k = 0; k < HERZ[j].length; k++) {
          if (HERZ[j][k] !== '#') continue;
          const dx = k - 4;
          p.set(cx + dx, cy + dy, shade(ramp, lit(dx, dy)));
        }
      }
      // The catchlight sits on the left lobe, which is where a rounded
      // thing lit from the upper left actually catches it.
      p.set(cx - 3, cy - 3, shade(ramp, 4));
      p.set(cx - 2, cy - 3, shade(ramp, 4));
      p.set(cx - 3, cy - 2, shade(ramp, 4));
      return;
    }

    for (let j = 0; j < DISC.length; j++) {
      const dy = j - 4;
      for (let dx = -DISC[j]; dx <= DISC[j]; dx++) {
        p.set(cx + dx, cy + dy, shade(ramp, lit(dx, dy)));
      }
    }
    p.set(cx - 2, cy - 2, shade(ramp, 4));
  };

  const shape = o.shape ?? 'perle';
  const n = Math.max(0, Math.min(10, o.n));
  // Hearts are the colour of a heart. Beads take the learning blue.
  for (let i = 0; i < n; i++) counter(i, shape === 'herz' ? P.blossom : P.chalk, shape);

  const extra = Math.max(0, Math.min(10 - n, o.extra ?? 0));
  for (let i = 0; i < extra; i++) counter(n + i, P.fruit, shape);

  return p;
}

/** A canvas ready to be put in the DOM, at integer scale. */
export function tenFrameCanvas(o: FrameOpts, scale: number): HTMLCanvasElement {
  const src = tenFrame(o).toCanvas();
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  return c;
}
