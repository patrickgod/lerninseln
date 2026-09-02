// Shapes, drawn flat, for the Insel der Entdecker.
//
// Deliberately not isometric and deliberately not shaded like the
// island: a shape here is a MATHEMATICAL object, not a thing standing
// on the ground, and it has to read as the pure form. A triangle with a
// lit face and a shaded face is a wedge; a triangle in one flat colour
// with an ink edge is a triangle.
//
// The colours come from the same closed palette as everything else, so
// the cards still belong to the world — but each shape keeps its OWN
// colour across every question, which matters more than it looks: a
// child who is still learning the word "Dreieck" can hold on to
// "the green one" while they learn it, and the two facts converge.

import { P, INK, shade } from '../core/palette.js';
import { Px } from '../core/px.js';

export type Form = 'kreis' | 'dreieck' | 'quadrat' | 'rechteck' | 'stern' | 'herz';

export const FORMEN: Form[] = ['kreis', 'dreieck', 'quadrat', 'rechteck', 'stern', 'herz'];

const FARBE: Record<Form, readonly string[]> = {
  kreis: P.chalk,
  dreieck: P.backlit,
  quadrat: P.citrus,
  rechteck: P.blossom,
  stern: P.glow,
  herz: P.fruit,
};

const S = 34;

/** One shape, filled flat, with an ink edge. */
export function form(f: Form, size = S): Px {
  const p = new Px(size, size);
  const c = (size - 1) / 2;
  const r = size / 2 - 3;
  const ramp = FARBE[f];
  const fill = shade(ramp, 3);
  const edge = shade(ramp, 1);

  const put = (x: number, y: number): void => p.set(x, y, fill);

  switch (f) {
    case 'kreis': {
      for (let y = -r; y <= r; y++) {
        const half = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
        for (let x = -half; x <= half; x++) put(c + x, c + y);
      }
      break;
    }
    case 'quadrat': {
      const h = Math.round(r * 0.92);
      for (let y = -h; y <= h; y++) for (let x = -h; x <= h; x++) put(c + x, c + y);
      break;
    }
    case 'rechteck': {
      // Wide, and clearly wider than it is tall: a rectangle that is
      // nearly square is a square with a mistake in it.
      const w = Math.round(r * 1.05), h = Math.round(r * 0.55);
      for (let y = -h; y <= h; y++) for (let x = -w; x <= w; x++) put(c + x, c + y);
      break;
    }
    case 'dreieck': {
      const h = Math.round(r * 1.05);
      for (let j = 0; j <= h * 2; j++) {
        const w = Math.round((j / (h * 2)) * r * 1.1);
        for (let i = -w; i <= w; i++) put(c + i, c - h + j);
      }
      break;
    }
    case 'stern': {
      // Five points, drawn as a filled polygon by scanline. A star from
      // overlapping triangles comes out lumpy at this size.
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r : r * 0.42;
        pts.push([c + Math.cos(a) * rad, c + Math.sin(a) * rad]);
      }
      for (let y = 0; y < size; y++) {
        const xs: number[] = [];
        for (let i = 0; i < pts.length; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[(i + 1) % pts.length];
          if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
            xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
          }
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) {
          for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) put(x, y);
        }
      }
      break;
    }
    case 'herz': {
      // Two lobes and a point, from the same bitmap idea as the
      // ten-frame counter but bigger.
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const nx = x / r, ny = (y - r * 0.15) / r;
          const t = nx * nx + ny * ny - 0.6;
          if (t * t * t - nx * nx * ny * ny * ny * 0.9 <= 0) put(c + x, c + y);
        }
      }
      break;
    }
  }

  // A flat edge in the shape's own darker step, then the ink outside
  // it: the form stays pure, and the card still reads at a distance.
  const src = new Px(size, size);
  src.data.set(p.data);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!src.get(x, y)) continue;
      if (src.get(x - 1, y) && src.get(x + 1, y) && src.get(x, y - 1) && src.get(x, y + 1)) continue;
      p.set(x, y, edge);
    }
  }
  p.outline(INK);
  return p;
}

/** A canvas of a shape, ready for an answer card. */
export function formCanvas(f: Form, scale: number): HTMLCanvasElement {
  const src = form(f).toCanvas();
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

/**
 * A row of shapes with the last one missing.
 *
 * Continuing a pattern is one of the genuinely load-bearing skills in
 * early maths — it is the same reasoning that later becomes "what comes
 * next in this number sequence", years before any numbers are involved.
 */
export function musterZeile(seed: number, len = 6): { row: Form[]; answer: Form } {
  const rn = (n: number): number => {
    let h = ((seed + n) * 374761393) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const pool = FORMEN.slice();
  const a = pool[Math.floor(rn(1) * pool.length)];
  let b = pool[Math.floor(rn(2) * pool.length)];
  if (b === a) b = pool[(pool.indexOf(a) + 2) % pool.length];

  // Three kinds of pattern, in order of difficulty: ABAB, AABB, ABB.
  // Nothing longer, because a six-year-old has to hold the whole rule
  // in their head at once for it to be a pattern rather than a puzzle.
  const kind = Math.floor(rn(3) * 3);
  const unit = kind === 0 ? [a, b] : kind === 1 ? [a, a, b, b] : [a, b, b];
  const row: Form[] = [];
  for (let i = 0; i < len; i++) row.push(unit[i % unit.length]);
  const answer = unit[len % unit.length];
  return { row, answer };
}
