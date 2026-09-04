// Vehicles, in profile, facing one way.
//
// From the homework sheet: "Kreise alle Fahrzeuge, die nach rechts
// fahren, rot ein." Left and right is spatial reasoning and it sits in
// the same first-grade strand as the numbers — and it asks for no
// counting at all, which is exactly why it belongs on the Insel der
// Entdecker with the shapes and the patterns.
//
// It also matters for a reason the worksheet does not say out loud: a
// child who is slow with sums can be quick at this. Every house so far
// on the maths island rewards the same kind of thinking. This one
// rewards a different kind, and it pays the same stars.
//
// ---------------------------------------------------------------------
//
// THE ONE THING THESE SPRITES HAVE TO DO
//
// Point. Unmistakably, at a glance, at twelve millimetres on an iPad.
//
// Everything else about them is decoration and everything else was cut
// when it got in the way. What makes a side view point is a FRONT: a
// nose, a windscreen raked one way, a bumper that is not the same as
// the back. A symmetrical van with a wheel at each end does not point,
// and no amount of detail elsewhere will save it — the first bus here
// was exactly that and it had to be redrawn with a snout.
//
// They are drawn facing RIGHT and mirrored for left, so the two
// directions can never disagree about anything except the direction.

import { P, INK, shade, stepDown, mixSnap } from '../core/palette.js';
import { Px } from '../core/px.js';

export type Fahrzeug = 'auto' | 'bus' | 'zug' | 'rakete' | 'boot' | 'flugzeug';

export const FAHRZEUGE: Fahrzeug[] = ['auto', 'bus', 'zug', 'rakete', 'boot', 'flugzeug'];

const W = 40;
const H = 26;

function finish(p: Px): void {
  p.rim(stepDown, INK);
  p.antialias(mixSnap);
}

/** A wheel: dark tyre, pale hub, and a shine on the upper left. */
function rad(p: Px, cx: number, cy: number, r: number): void {
  p.ellipse(cx, cy, r, r, INK);
  p.ellipse(cx, cy, r - 1, r - 1, shade(P.stone, 0));
  p.ellipse(cx, cy, r - 2, r - 2, shade(P.stone, 3));
  p.set(cx - 1, cy - 1, shade(P.stone, 4));
}

function auto(p: Px, ramp = P.fruit): void {
  const y = 18;
  // Body, with the roof set back so the bonnet is in front. That set-
  // back is the whole direction cue.
  p.rect(6, y - 6, 30, 6, shade(ramp, 2));
  p.rect(6, y - 6, 30, 2, shade(ramp, 3));
  p.rect(6, y - 1, 30, 1, shade(ramp, 1));
  p.rect(11, y - 12, 14, 6, shade(ramp, 2));
  p.rect(11, y - 12, 14, 2, shade(ramp, 3));
  // Windscreen, raked forward.
  p.rect(19, y - 11, 5, 4, shade(P.chalk, 3));
  p.rect(13, y - 11, 5, 4, shade(P.chalk, 2));
  // Bonnet and a headlight at the front.
  p.rect(25, y - 8, 11, 3, shade(ramp, 2));
  p.rect(34, y - 5, 2, 2, shade(P.glow, 4));
  rad(p, 12, y, 4);
  rad(p, 29, y, 4);
}

function bus(p: Px): void {
  const y = 19;
  p.rect(3, y - 15, 34, 15, shade(P.citrus, 2));
  p.rect(3, y - 15, 34, 2, shade(P.citrus, 3));
  p.rect(3, y - 2, 34, 2, shade(P.citrus, 1));
  // Windows in a row, and then a bigger one at the FRONT that is raked.
  for (let i = 0; i < 4; i++) p.rect(5 + i * 6, y - 12, 4, 5, shade(P.chalk, 3));
  p.rect(30, y - 12, 5, 6, shade(P.chalk, 4));
  p.rect(35, y - 11, 1, 5, shade(P.chalk, 3));
  // A snout: the nose sticks out past the windscreen and is what makes
  // it point. Without it this was a brick with wheels.
  p.rect(36, y - 7, 2, 5, shade(P.citrus, 1));
  p.rect(36, y - 5, 2, 2, shade(P.glow, 4));
  rad(p, 10, y, 4);
  rad(p, 30, y, 4);
}

function lok(p: Px): void {
  const y = 19;
  // A bicycle was here and it did not work. Twice. At forty pixels the
  // wheels are six across and the frame is a scribble, and the only
  // things that could point — handlebars and saddle — are two brown
  // marks a millimetre apart on a real iPad. Mirrored, they were
  // indistinguishable, and a question a child cannot answer from the
  // picture is a broken question rather than a hard one.
  //
  // A locomotive points with its whole body: chimney at the front, cab
  // at the back, and a cowcatcher that only one end has.
  p.rect(4, y - 10, 26, 10, shade(P.leaf, 2));
  p.rect(4, y - 10, 26, 2, shade(P.leaf, 3));
  p.rect(4, y - 2, 26, 2, shade(P.leaf, 1));
  // Boiler: a cylinder out in front of the cab.
  p.rect(18, y - 12, 14, 10, shade(P.leaf, 2));
  p.rect(18, y - 12, 14, 3, shade(P.leaf, 3));
  p.rect(30, y - 12, 2, 10, shade(P.leaf, 0));
  // Cab, at the BACK, with a window.
  p.rect(5, y - 17, 12, 7, shade(P.fruit, 2));
  p.rect(5, y - 17, 12, 2, shade(P.fruit, 3));
  p.rect(8, y - 15, 6, 4, shade(P.chalk, 3));
  // Chimney, at the FRONT, with smoke going backwards over the cab.
  p.rect(25, y - 18, 5, 6, shade(P.fruit, 1));
  p.rect(24, y - 19, 7, 2, shade(P.fruit, 2));
  for (let i = 0; i < 4; i++) {
    p.ellipse(22 - i * 5, y - 21 - i, 2 + i, 2 + i, shade(P.stone, 4 - i));
  }
  // Cowcatcher: the one shape only the front has.
  for (let j = 0; j < 5; j++) p.rect(32 + Math.floor(j / 2), y - 5 + j, 4 - j, 1,
    shade(P.stone, 1));
  p.rect(31, y - 6, 2, 5, shade(P.glow, 4));
  rad(p, 10, y, 4);
  rad(p, 20, y, 4);
  rad(p, 28, y, 3);
}

function rakete(p: Px): void {
  const y = 14;
  // The body was the plaster ramp, which is the same cream as an answer
  // card — so on a card the rocket was an outline with a red nose and
  // nothing in between. The contact sheet showed it because its cells
  // are the same value as a card. It is stone now.
  p.rect(11, y - 5, 18, 11, shade(P.stone, 4));
  p.rect(11, y - 5, 18, 3, shade(P.stone, 3));
  p.rect(11, y + 3, 18, 3, shade(P.stone, 1));
  // A solid pointed nose, and it is the only red thing on the sprite.
  for (let i = 0; i < 10; i++) {
    const h = 6 - Math.floor(i * 0.6);
    p.rect(29 + i, y - h, 1, h * 2, shade(P.fruit, i < 4 ? 3 : 2));
  }
  p.ellipse(20, y, 3, 3, INK);
  p.ellipse(20, y, 2, 2, shade(P.chalk, 3));
  p.set(19, y - 1, shade(P.chalk, 4));
  // Fins at the BACK, solid and two steps down the same ramp so they
  // read as part of the rocket rather than as a wireframe.
  for (let j = 0; j < 7; j++) {
    p.rect(11 - j, y - 5 - j, 5 + j, 1, shade(P.stone, 1));
    p.rect(11 - j, y + 5 + j, 5 + j, 1, shade(P.stone, 1));
  }
  for (let i = 0; i < 6; i++) {
    p.rect(4 - i, y - 2 + Math.floor(i / 2), 2, 5 - i, shade(P.glow, 4 - (i % 3)));
  }
}

function boot(p: Px): void {
  const y = 21;
  // A hull with a RAKED bow and a flat transom: the right end leans
  // forward and the left end is cut straight down. That asymmetry is
  // the whole cue, and the first version had a symmetrical wedge.
  for (let j = 0; j < 7; j++) {
    const x0 = 7 + j;
    const x1 = 34 - Math.floor(j * 0.4);
    p.rect(x0, y - 6 + j, x1 - x0, 1, shade(P.timber, j < 2 ? 3 : 2));
  }
  p.rect(7, y - 7, 28, 2, shade(P.timber, 4));
  for (let j = 0; j < 5; j++) p.rect(34 - j, y - 12 + j, 2, 6, shade(P.timber, 3));
  // Cabin at the BACK third, windows facing forward.
  p.rect(9, y - 15, 12, 9, shade(P.plaster, 4));
  p.rect(9, y - 15, 12, 2, shade(P.plaster, 3));
  p.rect(12, y - 13, 3, 3, shade(P.chalk, 3));
  p.rect(17, y - 13, 3, 3, shade(P.chalk, 3));
  // A pennant streaming BACKWARDS off the mast.
  p.rect(23, y - 18, 2, 12, shade(P.timber, 1));
  for (let j = 0; j < 6; j++) p.rect(17 + j, y - 18 + Math.floor(j / 2), 6, 1, shade(P.fruit, 3));
}

function flugzeug(p: Px): void {
  const y = 14;
  // Fuselage, nose at the right, tail fin at the left.
  p.ellipse(21, y, 16, 4, shade(P.stone, 4));
  p.ellipse(19, y + 2, 15, 2, shade(P.stone, 2));
  p.ellipse(19, y - 1, 15, 3, shade(P.plaster, 4));
  p.rect(34, y - 2, 4, 4, shade(P.stone, 4));
  p.ellipse(37, y, 2, 2, shade(P.chalk, 2));      // the nose, dark
  for (let i = 0; i < 5; i++) p.rect(11 + i * 4, y - 2, 3, 3, shade(P.chalk, 3));
  // Tail fin, swept BACK — the one line that says which way it flies.
  for (let j = 0; j < 9; j++) p.rect(5 + Math.floor(j * 0.7), y - 3 - j, 6 - j / 2, 1,
    shade(P.fruit, 2));
  p.rect(14, y + 2, 14, 5, shade(P.stone, 2));    // wing, below and behind
  p.rect(14, y + 6, 14, 1, shade(P.stone, 0));
}

const ZEICHNER: Record<Fahrzeug, (p: Px) => void> = {
  auto: (p) => auto(p),
  bus,
  zug: lok,
  rakete,
  boot,
  flugzeug,
};

/**
 * One vehicle, facing `rechts` or not.
 *
 * Mirrored rather than drawn twice, so the two directions cannot
 * disagree about anything except the direction — which is the only
 * thing the child is being asked about, and the only thing a second
 * drawing could get subtly wrong.
 */
export function fahrzeug(art: Fahrzeug, rechts: boolean): Px {
  const p = new Px(W, H);
  ZEICHNER[art](p);
  finish(p);
  if (rechts) return p;

  const m = new Px(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = (y * W + x) * 4;
      const d = (y * W + (W - 1 - x)) * 4;
      m.data[d] = p.data[s];
      m.data[d + 1] = p.data[s + 1];
      m.data[d + 2] = p.data[s + 2];
      m.data[d + 3] = p.data[s + 3];
    }
  }
  return m;
}

export function fahrzeugCanvas(art: Fahrzeug, rechts: boolean, scale: number): HTMLCanvasElement {
  const px = fahrzeug(art, rechts);
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

/** A big arrow, for the two answer cards. Drawn, never written. */
export function pfeil(rechts: boolean): Px {
  const p = new Px(W, H);
  const y = 13;
  p.rect(4, y - 4, 24, 9, shade(P.glow, 2));
  p.rect(4, y - 4, 24, 3, shade(P.glow, 3));
  for (let j = 0; j < 11; j++) {
    p.rect(27 + j, y - 11 + j, 1, 23 - j * 2, shade(P.glow, j < 4 ? 3 : 2));
  }
  finish(p);
  if (rechts) return p;
  const m = new Px(W, H);
  for (let yy = 0; yy < H; yy++) {
    for (let x = 0; x < W; x++) {
      const s = (yy * W + x) * 4;
      const d = (yy * W + (W - 1 - x)) * 4;
      m.data[d] = p.data[s];
      m.data[d + 1] = p.data[s + 1];
      m.data[d + 2] = p.data[s + 2];
      m.data[d + 3] = p.data[s + 3];
    }
  }
  return m;
}

export function pfeilCanvas(rechts: boolean, scale: number): HTMLCanvasElement {
  const px = pfeil(rechts);
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
