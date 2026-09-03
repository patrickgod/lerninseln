// The letters, as strokes — a writing font rather than a reading one.
//
// Every glyph here is a list of STROKES, and every stroke is a
// polyline in the direction a hand actually moves. That direction is
// the entire point of this file and the reason the app can check
// something a picture-matcher could not: a child who draws an M from
// the bottom up has produced a shape that looks perfect and a habit
// that will slow them down for years. The shape is checkable by
// anybody; the movement is only checkable while it happens.
//
// The forms are **Grundschrift** — the unjoined German primary print
// that first-graders are taught before any cursive — and the stroke
// orders are the ones the primers use:
//
//   * Everything vertical goes TOP TO BOTTOM.
//   * Round letters go ANTI-CLOCKWISE, starting at the top.
//   * A letter is split into strokes where the hand would really lift,
//     and nowhere else. `m` is three strokes rather than one long
//     retraced squiggle, because that is how it is taught and because
//     a retraced line cannot be checked in order.
//
// Coordinates are in a unit box: x from 0 (left) to 1 (right), y from
// 0 (top of the tall letters) to 1 (the baseline). Lower-case letters
// simply begin around y = 0.38, which is the x-height. Nothing here
// has a descender yet.

export interface Stroke {
  pts: [number, number][];
  /** A dot — the i's — which is touched rather than drawn. */
  dot?: boolean;
}

/** An ellipse arc, anti-clockwise, for the round letters. */
function bogen(
  cx: number, cy: number, rx: number, ry: number,
  vonGrad: number, bisGrad: number, n = 14,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((vonGrad + ((bisGrad - vonGrad) * i) / n) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

const XH = 0.38;          // where the small letters start
const MITTE = (XH + 1) / 2;

export const GLYPHS: Record<string, Stroke[]> = {
  // ------------------------------------------------------- capitals

  // Down the left stem, lift, then the V and the right stem in one.
  // Two strokes, both starting at the top, which is how Druckschrift
  // teaches it.
  M: [
    { pts: [[0.10, 0.06], [0.10, 1.00]] },
    { pts: [[0.10, 0.06], [0.50, 0.70], [0.90, 0.06], [0.90, 1.00]] },
  ],

  // One stroke: down, then along the foot.
  L: [
    { pts: [[0.18, 0.06], [0.18, 1.00], [0.86, 1.00]] },
  ],

  // Both slants START at the apex and go down — a child who draws the
  // left slant upwards has learned to push the pencil, which is the
  // habit this is trying to prevent.
  A: [
    { pts: [[0.50, 0.06], [0.12, 1.00]] },
    { pts: [[0.50, 0.06], [0.88, 1.00]] },
    { pts: [[0.24, 0.66], [0.76, 0.66]] },
  ],

  // Anti-clockwise from the top.
  O: [
    { pts: bogen(0.50, 0.53, 0.40, 0.47, -90, 270) },
  ],

  I: [
    { pts: [[0.50, 0.06], [0.50, 1.00]] },
  ],

  // The top bar, the stem and the foot in ONE movement, then the
  // middle bar. Four separate bars would be four chances to lose a
  // six-year-old.
  E: [
    { pts: [[0.86, 0.06], [0.18, 0.06], [0.18, 1.00], [0.86, 1.00]] },
    { pts: [[0.18, 0.52], [0.74, 0.52]] },
  ],

  U: [
    {
      pts: [
        [0.12, 0.06], [0.12, 0.66],
        ...bogen(0.50, 0.66, 0.38, 0.34, 180, 360, 10),
        [0.88, 0.06],
      ],
    },
  ],

  // ------------------------------------------------------ small ones

  // A circle and a stem, which is Grundschrift's `a` — not the
  // two-storey printed one, which no first-grader writes.
  a: [
    { pts: bogen(0.48, MITTE, 0.32, (1 - XH) / 2 - 0.02, -60, 300) },
    { pts: [[0.82, XH + 0.04], [0.82, 1.00]] },
  ],

  // The bar first, then round and out. One movement.
  e: [
    {
      pts: [
        [0.16, 0.70], [0.84, 0.66],
        ...bogen(0.50, MITTE, 0.34, (1 - XH) / 2 - 0.01, -20, 200, 12),
        [0.84, 0.94],
      ],
    },
  ],

  i: [
    { pts: [[0.50, XH], [0.50, 1.00]] },
    { pts: [[0.50, 0.16]], dot: true },
  ],

  l: [
    { pts: [[0.50, 0.06], [0.50, 1.00]] },
  ],

  // Three strokes: the first stem, then each arch WITH the stem it
  // leads into. One long stroke would have to retrace itself twice,
  // and a retraced line cannot be checked in order.
  m: [
    { pts: [[0.12, XH + 0.02], [0.12, 1.00]] },
    { pts: [[0.12, 0.52], [0.30, XH], [0.50, 0.52], [0.50, 1.00]] },
    { pts: [[0.50, 0.52], [0.68, XH], [0.88, 0.52], [0.88, 1.00]] },
  ],

  n: [
    { pts: [[0.16, XH + 0.02], [0.16, 1.00]] },
    { pts: [[0.16, 0.54], [0.40, XH], [0.82, 0.56], [0.82, 1.00]] },
  ],

  o: [
    { pts: bogen(0.50, MITTE, 0.34, (1 - XH) / 2 - 0.01, -90, 270) },
  ],

  // Down, round the bottom, up — and no tail, which is what
  // Grundschrift does.
  u: [
    {
      pts: [
        [0.14, XH], [0.14, 0.80],
        ...bogen(0.50, 0.80, 0.36, 0.19, 180, 360, 10),
        [0.86, XH],
      ],
    },
  ],

  s: [
    {
      pts: [
        ...bogen(0.52, XH + 0.16, 0.28, 0.16, -30, -200, 8),
        ...bogen(0.48, 1 - 0.16, 0.28, 0.16, 20, 200, 8),
      ],
    },
  ],

  t: [
    { pts: [[0.52, 0.16], [0.52, 0.88], [0.76, 1.00]] },
    { pts: [[0.22, XH], [0.82, XH]] },
  ],
};

/** Everything the writing houses can ask for. */
export function kannSchreiben(text: string): boolean {
  return [...text].every((ch) => ch === ' ' || ch in GLYPHS);
}

/** How wide a glyph is, relative to its height. Narrow letters get less. */
export function breite(ch: string): number {
  if (ch === 'i' || ch === 'l' || ch === 'I' || ch === 't') return 0.42;
  if (ch === 'm' || ch === 'M') return 1.05;
  return 0.8;
}

/**
 * The syllables and words, in the order a first-grade primer meets
 * them.
 *
 * This is the classic German Fibel sequence and it is not arbitrary:
 * M, L, A, O, I, E, U come first because between them they make real
 * words a child can read on their first day — Mama, Oma, Lea, Limo —
 * and being able to READ the thing you have just WRITTEN is what makes
 * the exercise feel like something rather than like handwriting drill.
 */
export const SILBEN: string[] = [
  'La', 'Le', 'Li', 'Lo', 'Lu',
  'Ma', 'Me', 'Mi', 'Mo', 'Mu',
  'la', 'le', 'li', 'lo', 'lu',
  'ma', 'me', 'mi', 'mo', 'mu',
  'Na', 'Ne', 'Ni', 'No', 'Nu',
  'sa', 'se', 'si', 'so', 'su',
];

/**
 * Words of exactly two syllables, built from letters the child has
 * already written one at a time.
 *
 * Every one of them is a real word a six-year-old uses, which is the
 * whole difference between this and a handwriting worksheet.
 */
export const SILBENWOERTER: { wort: string; teile: [string, string] }[] = [
  { wort: 'Mama', teile: ['Ma', 'ma'] },
  { wort: 'Oma', teile: ['O', 'ma'] },
  { wort: 'Lea', teile: ['Le', 'a'] },
  { wort: 'Lilo', teile: ['Li', 'lo'] },
  { wort: 'Limo', teile: ['Li', 'mo'] },
  { wort: 'Lili', teile: ['Li', 'li'] },
  { wort: 'Mimi', teile: ['Mi', 'mi'] },
  { wort: 'Mia', teile: ['Mi', 'a'] },
  { wort: 'Emil', teile: ['E', 'mil'] },
  { wort: 'Lama', teile: ['La', 'ma'] },
  { wort: 'Uli', teile: ['U', 'li'] },
  { wort: 'Nase', teile: ['Na', 'se'] },
  { wort: 'Sonne', teile: ['Son', 'ne'] },
  { wort: 'Salami', teile: ['Sa', 'lami'] },
];

// ------------------------------------------------------ the checkpoints

export interface Checkpoint {
  x: number;
  y: number;
}

/**
 * A stroke, resampled to evenly spaced checkpoints.
 *
 * The whole tracing check is: touch these in order, each within a
 * radius, without lifting between them. That is forgiving enough for a
 * six-year-old's motor control and strict enough that a scribble does
 * not pass — and it enforces direction and order for free, which is
 * the thing a finished picture cannot tell you.
 */
export function checkpoints(s: Stroke, abstand = 0.09): Checkpoint[] {
  if (s.dot) return [{ x: s.pts[0][0], y: s.pts[0][1] }];

  // total length first, so the spacing is even along the real path
  let len = 0;
  for (let i = 1; i < s.pts.length; i++) {
    len += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
  }
  const n = Math.max(2, Math.round(len / abstand));

  const out: Checkpoint[] = [];
  let seg = 0;
  let along = 0;
  for (let i = 0; i <= n; i++) {
    const want = (len * i) / n;
    while (seg < s.pts.length - 2) {
      const d = Math.hypot(
        s.pts[seg + 1][0] - s.pts[seg][0], s.pts[seg + 1][1] - s.pts[seg][1]);
      if (along + d >= want) break;
      along += d;
      seg++;
    }
    const a = s.pts[seg], b = s.pts[seg + 1] ?? s.pts[seg];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const k = Math.min(1, Math.max(0, (want - along) / d));
    out.push({ x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k });
  }
  return out;
}
