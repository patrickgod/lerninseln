// Pictures for the words on the Insel der Sprache.
//
// The Anlaute house asks "which letter does this word start with", and
// until now the only way to know WHICH word was to hear it. That is a
// dependency on the sound being on, in an app that is explicitly meant
// to be played in a waiting room and in a classroom — and AGENTS.md
// rule 14 says sound must be switchable off in two taps. An exercise
// that stops working when you use that switch is a broken exercise.
//
// So: a picture. The child sees an apple, hears "Apfel", and taps the
// A. Two channels for the same word, which is also better teaching than
// either one alone.
//
// These are drawn FRONT-ON, not isometric. The island is a world you
// look into; a word card is an object held up in front of you, and
// borrowing the island's projection here would make the apple look like
// it was lying on the ground.
//
// Everything else follows the same rules as the island: the closed
// palette, light from the upper left, shading by stepping along a ramp,
// and the rim shaded rather than outlined in ink.

import { P, INK, shade, stepDown, mixSnap } from '../core/palette.js';
import { Px } from '../core/px.js';

const S = 40;

function frame(): Px {
  return new Px(S, S);
}

function finish(p: Px): Px {
  p.rim(stepDown, INK);
  p.antialias(mixSnap);
  return p;
}

/** A filled disc, from an explicit radius table so it is never lumpy. */
function disc(p: Px, cx: number, cy: number, r: number, hex: string): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
    for (let x = -half; x <= half; x++) p.set(cx + x, cy + y, hex);
  }
}

/** Light upper-left, dark lower-right, on any blob already drawn. */
function model(p: Px, cx: number, cy: number, r: number, ramp: readonly string[]): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (!p.get(cx + x, cy + y)) continue;
      const d = (x + y) / (r * 1.6);
      const step = d < -0.45 ? 3 : d > 0.45 ? 1 : 2;
      p.set(cx + x, cy + y, shade(ramp, step));
    }
  }
  p.set(cx - Math.round(r * 0.45), cy - Math.round(r * 0.5), shade(ramp, 4));
  p.set(cx - Math.round(r * 0.45) + 1, cy - Math.round(r * 0.5), shade(ramp, 4));
}

// ------------------------------------------------------------- the set

export function apfel(): Px {
  const p = frame();
  // Two overlapping lobes with a dip at the top: an apple is not a
  // circle, and the dip is the whole difference between an apple and a
  // tomato at forty pixels.
  disc(p, 16, 23, 10, shade(P.fruit, 2));
  disc(p, 24, 23, 10, shade(P.fruit, 2));
  for (let x = 17; x <= 23; x++) { p.clear(x, 12); p.clear(x, 13); }
  model(p, 20, 23, 13, P.fruit);
  for (let y = 0; y < 6; y++) p.set(20, 12 - y, shade(P.timber, 1));
  p.ellipse(24, 9, 4, 2, shade(P.leaf, 3));
  p.ellipse(24, 8, 3, 1, shade(P.leaf, 4));
  return finish(p);
}

export function ball(): Px {
  const p = frame();
  disc(p, 20, 21, 14, shade(P.plaster, 3));
  model(p, 20, 21, 14, P.plaster);
  // Two coloured panels — a plain sphere reads as a moon, and the
  // panels are what make it a ball.
  for (let y = -14; y <= 14; y++) {
    for (let x = -14; x <= 14; x++) {
      if (!p.get(20 + x, 21 + y)) continue;
      const band = Math.abs(x + y * 0.3);
      if (band > 4 && band < 9) {
        const d = (x + y) / 22;
        p.set(20 + x, 21 + y, shade(P.fruit, d < -0.3 ? 3 : d > 0.3 ? 1 : 2));
      }
    }
  }
  return finish(p);
}

export function ente(): Px {
  const p = frame();
  // body
  p.ellipse(21, 25, 11, 7, shade(P.wool, 3));
  model(p, 21, 25, 11, P.wool);
  // neck and head
  p.ellipse(13, 14, 5, 5, shade(P.pine, 3));
  p.rect(11, 14, 6, 8, shade(P.pine, 2));
  p.ellipse(12, 13, 3, 3, shade(P.pine, 4));
  // bill, the one saturated accent
  p.rect(4, 14, 6, 3, shade(P.citrus, 3));
  p.rect(4, 16, 6, 1, shade(P.citrus, 2));
  p.set(12, 12, INK);
  // A tail is a WEDGE off the back of the body. The first version was a
  // one-pixel diagonal line, which read as an aerial.
  for (let i = 0; i < 7; i++) {
    const h = 4 - Math.round(i * 0.5);
    for (let j = -h; j <= h; j++) p.set(30 + i, 20 + j, shade(P.wool, j < 0 ? 3 : 2));
  }
  return finish(p);
}

export function fisch(): Px {
  const p = frame();
  p.ellipse(19, 20, 12, 7, shade(P.sea, 3));
  model(p, 19, 20, 12, P.sea);
  // tail
  for (let i = 0; i < 8; i++) {
    for (let j = -i; j <= i; j++) p.set(31 + i, 20 + j, shade(P.sea, j < 0 ? 3 : 2));
  }
  // fin and eye
  p.ellipse(19, 13, 5, 3, shade(P.foam, 1));
  p.set(11, 18, INK);
  p.set(10, 18, shade(P.foam, 3));
  // a couple of scales, dithered so they do not become a grid
  for (let i = 0; i < 6; i++) p.set(18 + (i % 3) * 4, 20 + ((i / 3) | 0) * 4 - 2, shade(P.foam, 1));
  return finish(p);
}

export function haus(): Px {
  const p = frame();
  p.rect(9, 20, 22, 15, shade(P.plaster, 3));
  p.rect(21, 20, 10, 15, shade(P.plaster, 2));
  // gable roof, front-on: two slopes meeting at a ridge
  for (let i = 0; i <= 13; i++) {
    for (let x = 6 + i; x <= 34 - i; x++) p.set(x, 20 - i, shade(P.terracotta, x < 20 ? 3 : 2));
  }
  p.rect(16, 26, 8, 9, shade(P.timber, 1));
  p.rect(17, 27, 6, 8, shade(P.timber, 2));
  p.set(22, 31, shade(P.glow, 4));
  p.rect(10, 23, 5, 5, shade(P.glow, 3));
  p.rect(26, 23, 4, 4, shade(P.glow, 3));
  return finish(p);
}

export function igel(): Px {
  const p = frame();
  // body
  p.ellipse(22, 24, 12, 8, shade(P.timber, 2));
  model(p, 22, 24, 12, P.timber);
  // spines: short strokes all round the upper silhouette, which is the
  // only thing that separates a hedgehog from a potato
  // The spines run from the snout right round to the tail, and they are
  // LONG. The first version put a short fringe on the upper left only,
  // which left a smooth brown lump — a potato with a nose.
  for (let i = 0; i <= 30; i++) {
    const a = Math.PI * 1.08 + (i / 30) * Math.PI * 0.92;
    const x = 22 + Math.round(Math.cos(a) * 12);
    const y = 24 + Math.round(Math.sin(a) * 8);
    const len = 5 + (i % 3);
    const dx = Math.round(Math.cos(a) * len), dy = Math.round(Math.sin(a) * len);
    p.line(x, y, x + dx, y + dy, shade(P.timber, i % 2 ? 0 : 1));
    p.set(x + dx, y + dy, INK);
  }
  // snout
  p.ellipse(9, 27, 5, 4, shade(P.fur, 3));
  p.set(5, 27, INK);
  p.set(9, 25, INK);
  return finish(p);
}

export function katze(): Px {
  const p = frame();

  // Ears FIRST, so the head covers their roots and they read as
  // attached rather than as two hats. They also have to clear the head
  // outline entirely: the first version tucked them inside the circle,
  // where they vanished, and all that was left was a round brown face
  // with crossed whiskers over it that looked like an animal in pain.
  for (const [ex, lit] of [[12, 3], [28, 1]] as [number, number][]) {
    for (let j = 0; j <= 10; j++) {
      const half = Math.round((10 - j) * 0.55);
      for (let i = -half; i <= half; i++) p.set(ex + i, 18 - j, shade(P.fur, lit));
    }
    for (let j = 1; j <= 6; j++) {
      const half = Math.round((6 - j) * 0.5);
      for (let i = -half; i <= half; i++) p.set(ex + i, 17 - j, shade(P.blossom, 2));
    }
  }

  disc(p, 20, 23, 12, shade(P.fur, 2));
  model(p, 20, 23, 12, P.fur);

  // Whiskers, drawn from the muzzle OUTWARD and past the head. Inside
  // the silhouette they read as scars; outside it they read as cat.
  for (const dx of [-1, 1]) {
    p.line(20 + dx * 9, 27, 20 + dx * 18, 24, shade(P.wool, 3));
    p.line(20 + dx * 9, 30, 20 + dx * 18, 32, shade(P.wool, 3));
  }

  // muzzle, nose, and a small closed smile
  p.ellipse(17, 28, 5, 3, shade(P.fur, 3));
  p.ellipse(23, 28, 5, 3, shade(P.fur, 3));
  p.set(20, 26, shade(P.blossom, 1));
  p.set(19, 26, shade(P.blossom, 2));
  p.set(21, 26, shade(P.blossom, 2));
  p.set(20, 27, shade(P.blossom, 1));
  p.line(20, 28, 17, 30, INK);
  p.line(20, 28, 23, 30, INK);

  // Eyes: big, round, and calm. A slit pupil on a picture for a
  // six-year-old reads as a predator.
  for (const ex of [15, 25]) {
    p.ellipse(ex, 21, 3, 3, shade(P.backlit, 3));
    p.ellipse(ex, 21, 2, 2, shade(P.backlit, 4));
    p.ellipse(ex, 21, 1, 2, INK);
    p.set(ex - 1, 20, shade(P.wool, 4));
  }
  return finish(p);
}

export function mond(): Px {
  const p = frame();
  // A crescent, made by cutting one disc out of another. Drawn as a
  // subtraction rather than as a drawn shape, so the inner edge is a
  // true arc.
  disc(p, 19, 20, 14, shade(P.glow, 3));
  model(p, 19, 20, 14, P.glow);
  for (let y = -16; y <= 16; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 196 - y * y)));
    for (let x = -half; x <= half; x++) p.clear(28 + x, 18 + y);
  }
  return finish(p);
}

export function rose(): Px {
  const p = frame();
  for (let y = 0; y < 14; y++) p.set(20, 36 - y, shade(P.leaf, y % 2 ? 2 : 3));
  // Leaves taper to a point AND start at the stem. Two ellipses beside
  // a stem are two green sausages; two tapers that begin somewhere else
  // entirely, which is what the second attempt drew, are two green
  // stamps floating in the air.
  for (const [ly, dir, lit] of [[27, -1, 3], [31, 1, 2]] as [number, number, number][]) {
    for (let i = 0; i <= 9; i++) {
      const h = Math.round(3.2 * Math.sin((i / 9) * Math.PI));
      const x = 20 + dir * i;
      const y = ly - Math.round(i * 0.35);
      for (let j = -h; j <= h; j++) p.set(x, y + j, shade(P.leaf, lit));
      if (h > 0) p.set(x, y - h, shade(P.leaf, lit + 1));
    }
  }
  // the bloom: three rings of petals, darkening inward
  disc(p, 20, 15, 11, shade(P.blossom, 2));
  model(p, 20, 15, 11, P.blossom);
  disc(p, 20, 15, 7, shade(P.blossom, 1));
  disc(p, 20, 15, 4, shade(P.fruit, 2));
  disc(p, 20, 15, 2, shade(P.fruit, 1));
  return finish(p);
}

export function sonne(): Px {
  const p = frame();
  // rays first, so the disc draws over their roots
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x0 = 20 + Math.round(Math.cos(a) * 11), y0 = 20 + Math.round(Math.sin(a) * 11);
    const x1 = 20 + Math.round(Math.cos(a) * 18), y1 = 20 + Math.round(Math.sin(a) * 18);
    p.line(x0, y0, x1, y1, shade(P.glow, 3));
    p.line(x0 + 1, y0, x1 + 1, y1, shade(P.glow, 2));
  }
  disc(p, 20, 20, 11, shade(P.glow, 3));
  model(p, 20, 20, 11, P.glow);
  return finish(p);
}

export function uhr(): Px {
  const p = frame();
  disc(p, 20, 21, 15, shade(P.stone, 2));
  model(p, 20, 21, 15, P.stone);
  disc(p, 20, 21, 12, shade(P.plaster, 4));
  // four marks and two hands — any more detail is mud at this size
  for (const [dx, dy] of [[0, -9], [9, 0], [0, 9], [-9, 0]] as [number, number][]) {
    p.set(20 + dx, 21 + dy, INK);
    p.set(20 + Math.round(dx * 0.85), 21 + Math.round(dy * 0.85), INK);
  }
  p.line(20, 21, 20, 13, INK);
  p.line(20, 21, 26, 24, INK);
  p.set(20, 21, shade(P.fruit, 2));
  return finish(p);
}

export function zitrone(): Px {
  const p = frame();
  p.ellipse(20, 21, 14, 9, shade(P.glow, 3));
  model(p, 20, 21, 14, P.glow);
  // the two nubs at the ends, which are what say lemon and not egg
  p.ellipse(5, 21, 2, 2, shade(P.glow, 2));
  p.ellipse(35, 21, 2, 2, shade(P.glow, 2));
  p.ellipse(15, 16, 4, 2, shade(P.glow, 4));
  p.ellipse(28, 12, 4, 2, shade(P.leaf, 3));
  return finish(p);
}

/**
 * The words that have a picture.
 *
 * The Anlaute house draws only from this list, so the exercise never
 * shows a word it cannot illustrate. The twelve here were picked to
 * spread across the alphabet — A B E F H I K M R S U Z — rather than
 * for being the easiest to draw, because the point of the house is the
 * FIRST SOUND and twelve words that all start with B would teach
 * nothing.
 */
export const BILDER: Record<string, () => Px> = {
  Apfel: apfel,
  Ball: ball,
  Ente: ente,
  Fisch: fisch,
  Haus: haus,
  Igel: igel,
  Katze: katze,
  Mond: mond,
  Rose: rose,
  Sonne: sonne,
  Uhr: uhr,
  Zitrone: zitrone,
};

export function hasBild(wort: string): boolean {
  return wort in BILDER;
}

/** A canvas ready for the DOM, at an integer scale. */
export function bildCanvas(wort: string, scale: number): HTMLCanvasElement | null {
  const make = BILDER[wort];
  if (!make) return null;
  const src = make().toCanvas();
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
