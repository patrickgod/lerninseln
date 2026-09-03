// The two currencies, drawn.
//
// They were CSS circles: a yellow dot for a star and a pink dot for a
// sweet. Which is fine as a placeholder and wrong as a shipped thing —
// the whole app is hand-drawn pixels and the two numbers a child looks
// at most often were the one place that was not. A yellow dot also does
// not say "star" to anybody; it says "dot".
//
// Same palette, same rules as every other sprite: light from the upper
// left, shading by stepping along a ramp.

import { P, INK, shade } from './palette.js';
import { Px } from './px.js';

export type Icon = 'stern' | 'bonbon';

/** A five-pointed star, filled by scanline so the points stay sharp. */
function stern(): Px {
  const S = 17;
  const p = new Px(S, S);
  const c = (S - 1) / 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? c - 0.5 : (c - 0.5) * 0.44;
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  for (let y = 0; y < S; y++) {
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
      for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) {
        // Lit from the upper left like everything else, so it belongs
        // to the same world as the island behind it.
        const d = (x - c) + (y - c);
        p.set(x, y, shade(P.glow, d < -3 ? 4 : d > 3 ? 2 : 3));
      }
    }
  }
  p.outline(INK);
  return p;
}

/**
 * A wrapped sweet: a round middle with a twist at each end.
 *
 * The twists are the whole silhouette. Without them it is a pink
 * circle, which is what it was.
 */
function bonbon(): Px {
  const S = 17;
  const p = new Px(S, S);
  const c = (S - 1) / 2;

  // the twisted ends, drawn first so the body covers their roots
  for (const dir of [-1, 1]) {
    for (let i = 3; i <= 7; i++) {
      const h = Math.round(1 + (i - 3) * 0.7);
      for (let j = -h; j <= h; j++) {
        p.set(c + dir * i, c + j, shade(P.candy, j < 0 ? 3 : 1));
      }
    }
  }
  // the body
  p.ellipse(c, c, 5, 5, shade(P.candy, 2));
  p.ellipse(c - 1, c - 1, 3, 3, shade(P.candy, 3));
  p.ellipse(c - 2, c - 2, 1, 1, shade(P.candy, 4));
  p.ellipse(c + 2, c + 2, 2, 2, shade(P.candy, 1));
  // a stripe, because a sweet has a wrapper
  p.line(c - 2, c + 3, c + 3, c - 2, shade(P.candy, 4));

  p.outline(INK);
  return p;
}

const cache = new Map<string, HTMLCanvasElement>();

/** An icon at an integer scale, ready to drop into the DOM. */
export function iconCanvas(which: Icon, size: number): HTMLCanvasElement {
  const scale = Math.max(1, Math.round(size / 17));
  const key = `${which}:${scale}`;
  let src = cache.get(key);
  if (!src) {
    const px = which === 'stern' ? stern() : bonbon();
    const base = px.toCanvas();
    src = document.createElement('canvas');
    src.width = base.width * scale;
    src.height = base.height * scale;
    const ctx = src.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0, src.width, src.height);
    cache.set(key, src);
  }
  // A fresh element per call: the same canvas cannot be in the document
  // twice, and the purse is rebuilt on every screen.
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  out.className = 'icon';
  out.getContext('2d')!.drawImage(src, 0, 0);
  out.style.width = `${src.width}px`;
  out.style.height = `${src.height}px`;
  return out;
}
