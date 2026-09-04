// Luma, the fairy.
//
// Carried over from Funkelwelt, where she was designed, and she brings
// her reason with her: she is the only character who explains
// anything, she says it out loud, and she says each thing once.
//
// Patrick asked for her here after the second playtest: "ich finde es
// eine schoene idee dass sie die kinder begleitet." On an island that
// is now bigger than the screen and starts empty, somebody who says
// what a house is for is worth more than she was on a small one.
//
// The original note:
//
// The fairy who carries the map of what is still dark, and the only
// character in the game who explains anything. KONZEPT.md gives her one
// job and one constraint: she appears at the bottom of the screen with a
// portrait and a text box, JRPG-style, and she says everything out loud
// — and she must not talk too much, because text-heavy is exactly what
// makes children stop listening.
//
// THIS IS A PLACEHOLDER, deliberately. PLAN.md item 2 says Patrick wants
// to make her with Gemini, and that is the right call: she is the one
// character a child will look at for minutes at a time and a drawn
// portrait will beat a coded one. What this is for is to stop her being
// a blank rectangle in the meantime, and to settle everything AROUND her
// — the box, the framing, the timing, the once-only rule — so that the
// artwork is the only thing left to swap.
//
// She is drawn to the same rules as everything else: closed palette,
// shading by stepping along a ramp, light from the upper left. What she
// is made of is the `glow` ramp, which in this project is reserved for
// lit things — lanterns, windows, coins. That is the point of her.

import { P, INK, shade, stepDown, mixSnap } from '../core/palette.js';
import { Px } from '../core/px.js';

export const PW = 46;
export const PH = 46;

/**
 * Her portrait, head and shoulders.
 *
 * The second attempt. The first one had three faults and the contact
 * sheet showed all three at once:
 *
 *   * a dithered glow disc behind her, which on a nearly-black box read
 *     as orange speckle — flecks of dirt rather than light. Dithering
 *     works for the lantern because the two steps it mixes are both
 *     ground colours; against black there is nothing to mix WITH. She
 *     has sparks now instead, which are shapes rather than noise.
 *   * wings bigger than her head, so she wore a bonnet.
 *   * a fringe sitting on her eyebrows. Exactly the fault the adventurer
 *     had, in exactly the same place: no forehead. Four pixels of skin
 *     between hair and eyes is the difference between a face and a hat.
 */
export function portrait(): Px {
  const haut = P.skin;
  const fig = new Px(PW, PH);
  const cx = 23;
  const cy = 24;

  // ------------------------------------------------------------- wings
  // Behind everything, and small: they are a cue in the silhouette, not
  // a feature of the face. Pale, because they are made of light.
  for (const s of [-1, 1]) {
    fig.ellipse(cx + s * 14, cy - 7, 6, 8, shade(P.foam, 1));
    fig.ellipse(cx + s * 13, cy + 4, 5, 6, shade(P.foam, 0));
    fig.ellipse(cx + s * 13, cy - 8, 4, 5, shade(P.foam, 2));
  }

  // ---------------------------------------------------- neck, shoulders
  // She is a portrait, not a floating head — and the first version put
  // the shoulders four pixels clear of the hair, which made them a
  // separate blue pebble she was hovering over. A neck, and shoulders
  // that overlap what is above them.
  fig.rect(cx - 4, cy + 8, 8, 8, shade(haut, 1));
  fig.rect(cx - 4, cy + 8, 3, 8, shade(haut, 2));
  fig.ellipse(cx, PH + 1, 16, 10, shade(P.chalk, 2));
  fig.ellipse(cx - 5, PH - 1, 10, 7, shade(P.chalk, 3));

  // -------------------------------------------------------- hair, back
  fig.ellipse(cx, cy, 12, 13, shade(P.glow, 1));
  fig.ellipse(cx - 3, cy - 3, 10, 10, shade(P.glow, 2));

  // ------------------------------------------------------------- face
  fig.ellipse(cx, cy, 9, 10, shade(haut, 2));
  fig.ellipse(cx - 3, cy - 3, 6, 6, shade(haut, 3));

  // ------------------------------------------------------- hair, front
  // The fringe bottoms out at cy - 3. The eyes start at cy + 1. Those
  // four pixels are the whole reason she has a face.
  fig.ellipse(cx, cy - 8, 10, 5, shade(P.glow, 3));
  fig.ellipse(cx - 3, cy - 10, 7, 4, shade(P.glow, 4));
  fig.rect(cx - 12, cy - 8, 3, 18, shade(P.glow, 2));
  fig.rect(cx + 9, cy - 8, 3, 18, shade(P.glow, 1));
  fig.ellipse(cx - 11, cy + 9, 3, 3, shade(P.glow, 2));
  fig.ellipse(cx + 10, cy + 9, 3, 3, shade(P.glow, 1));

  // -------------------------------------------------------------- face
  // Big eyes, because at forty-six pixels the eyes ARE the expression
  // and everything else is decoration.
  for (const s of [-1, 1]) {
    fig.rect(cx + s * 4 - 1, cy + 1, 3, 4, INK);
    fig.set(cx + s * 4 - 1, cy + 1, shade(P.plaster, 4));
    fig.set(cx + s * 4, cy + 4, shade(P.chalk, 3));
  }
  for (const x of [cx - 7, cx - 6, cx + 5, cx + 6]) fig.set(x, cy + 5, shade(P.blossom, 3));
  // A smile: three pixels, turned up at both ends, in the darkest step
  // of the fruit ramp. A brighter red at this size is a wound.
  fig.rect(cx - 1, cy + 8, 3, 1, shade(P.fruit, 0));
  fig.set(cx - 2, cy + 7, shade(P.fruit, 0));
  fig.set(cx + 2, cy + 7, shade(P.fruit, 0));

  fig.rim(stepDown, INK);
  fig.antialias(mixSnap);

  // ------------------------------------------------------------ sparks
  // Five of them, as shapes rather than as a haze. This is the cue that
  // she is a light rather than a small girl, and it is the one thing in
  // the portrait that survives being shrunk.
  const p = new Px(PW, PH);
  p.draw(fig, 0, 0);
  for (const [x, y, gross] of [
    [cx + 12, 4, 1], [4, 12, 0], [41, 16, 0], [3, 33, 0], [40, 36, 1],
  ] as [number, number, number][]) {
    const r = gross ? 2 : 1;
    p.line(x - r, y, x + r, y, shade(P.glow, 3));
    p.line(x, y - r, x, y + r, shade(P.glow, 3));
    p.set(x, y, shade(P.plaster, 4));
  }

  return p;
}

// ------------------------------------------------------- the companion

export const KW = 13;
export const KH = 13;

/**
 * Luma as she is in the WORLD: a mote of light at the child's shoulder.
 *
 * Navi's job, and Navi's size. Patrick asked for "a cute little light
 * bubble, tiny" and tiny is the whole design — she is thirteen pixels
 * across against an eighteen-pixel adventurer, so she reads as a
 * companion rather than as a second character. Anything bigger and the
 * child is walking two people around.
 *
 * DRAWN IN CODE, not generated, and she is the clearest case for where
 * that line falls: at thirteen pixels a generated sprite comes back as
 * a smudge, and the whole of her is four pixels of core and a wing.
 *
 * `frame` 0..3 flutters the wings. Nothing else about her moves — the
 * drifting is done by the world, which knows where the child is.
 */
export function kugel(frame: number): Px {
  const p = new Px(KW, KH);
  const c = 6;

  // Wings first, behind. They beat on a four-frame cycle, and they are
  // pale enough to read as light rather than as an insect.
  const spanne = [4, 3, 2, 3][frame % 4];
  for (const s of [-1, 1]) {
    p.ellipse(c + s * 3, c - 2, 2, spanne, shade(P.foam, 1));
    p.ellipse(c + s * 3, c - 3, 1, Math.max(1, spanne - 2), shade(P.foam, 3));
  }

  // The mote. Three steps of glow from the middle out, so she is a
  // little sun rather than a dot: at this size the falloff IS the
  // silhouette.
  p.ellipse(c, c, 4, 4, shade(P.glow, 1));
  p.ellipse(c, c, 3, 3, shade(P.glow, 2));
  p.ellipse(c, c, 2, 2, shade(P.glow, 3));
  p.rect(c - 1, c - 1, 2, 2, shade(P.glow, 4));
  p.set(c - 1, c - 1, shade(P.plaster, 4));

  // Four little rays, alternating with the wingbeat. Without them she
  // is a bead; with them she is giving off light.
  const lang = frame % 2 === 0 ? 6 : 5;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
    p.set(c + dx * (lang - 1), c + dy * (lang - 1), shade(P.glow, 2));
    p.set(c + dx * (lang - 2), c + dy * (lang - 2), shade(P.glow, 3));
  }
  return p;
}

let zwischen: HTMLCanvasElement | null = null;

/** Her portrait as a canvas at an integer scale, built once. */
export function portraitCanvas(scale: number): HTMLCanvasElement {
  if (!zwischen) zwischen = portrait().toCanvas();
  const c = document.createElement('canvas');
  c.width = PW * scale;
  c.height = PH * scale;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(zwischen, 0, 0, c.width, c.height);
  c.className = 'icon';
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  return c;
}
