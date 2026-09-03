// The writing surface.
//
// A child follows a letter with their finger and the app checks that
// they followed it — in the right order, in the right direction, and
// through the whole of it.
//
// WHY TRACING AND NOT RECOGNITION
//
// The obvious alternative is to let the child write freely and then
// classify what they drew. It is the wrong choice here for two reasons,
// and the second matters more than the first.
//
// The first: a classifier has to guess, and a six-year-old's letters
// vary enormously. Every guess it gets wrong is the app telling a child
// they wrote it badly when they did not — which AGENTS.md rule 9
// forbids outright, and rightly, because that lesson sticks.
//
// The second: a finished letter cannot tell you HOW it was made. An M
// drawn from the bottom up looks identical to one drawn correctly and
// is a habit that will slow the child down for years. Direction and
// stroke order are the actual content of first-grade writing, and they
// only exist while the pencil is moving. Tracing is the only way to see
// them.
//
// HOW THE CHECK WORKS
//
// Each stroke is a run of checkpoints along the path. The child must
// touch them IN ORDER, each within a radius, with the finger down. That
// is forgiving enough for six-year-old motor control — nobody has to be
// accurate, only to go the right way — and strict enough that a
// scribble across the letter does not pass, because a scribble does not
// visit the checkpoints in order.
//
// There is no failure state. Straying does nothing at all; the stroke
// simply does not advance. The child can take as long as they like and
// can ask to be shown.

import { GLYPHS, breite, checkpoints, type Checkpoint } from '../games/schrift.js';

interface Zug {
  /** Checkpoints in page coordinates. */
  cps: Checkpoint[];
  /** The full path, for drawing. */
  pfad: Checkpoint[];
  dot: boolean;
  /** Which glyph this stroke belongs to. */
  glyph: number;
}

export interface Tracer {
  el: HTMLCanvasElement;
  /** Driven by the app's single animation loop. */
  tick(time: number): void;
  /** Animate the current stroke, for a child who is stuck. */
  zeigen(): void;
  fertig(): boolean;
  destroy(): void;
}

export interface TracerOpts {
  text: string;
  /** CSS pixels available. */
  w: number;
  h: number;
  /** A stroke was finished. */
  onZug?: () => void;
  /** A whole letter was finished. */
  onGlyph?: (index: number) => void;
  /** The whole word is written. */
  onFertig?: () => void;
}

const FARBE = {
  linie: '#c9dcec',
  strasse: '#dce7f2',
  gemacht: '#8fb0d1',
  tinte: '#3f5c85',
  start: '#c93a44',
  ink: '#241d2b',
};

export function makeTracer(o: TracerOpts): Tracer {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const el = document.createElement('canvas');
  el.className = 'tracer';
  el.width = Math.round(o.w * dpr);
  el.height = Math.round(o.h * dpr);
  el.style.width = `${o.w}px`;
  el.style.height = `${o.h}px`;
  const ctx = el.getContext('2d')!;

  // ------------------------------------------------------------ layout
  const chars = [...o.text];
  const einheiten = chars.reduce((a, c) => a + breite(c) + 0.16, 0);
  // The letters get as big as the box allows, and no bigger: a huge
  // letter is easier to trace but a whole word has to fit beside it.
  const hoehe = Math.min(o.h - 46, (o.w - 40) / einheiten);
  const gesamt = einheiten * hoehe;
  let cursor = (o.w - gesamt) / 2;
  const oben = (o.h - hoehe) / 2 - 6;

  const zuege: Zug[] = [];
  const glyphBoxen: { x: number; w: number }[] = [];

  chars.forEach((ch, gi) => {
    const bw = breite(ch) * hoehe;
    glyphBoxen.push({ x: cursor, w: bw });
    for (const stroke of GLYPHS[ch] ?? []) {
      const zu = (p: Checkpoint): Checkpoint => ({
        x: cursor + p.x * bw,
        y: oben + p.y * hoehe,
      });
      zuege.push({
        cps: checkpoints(stroke, stroke.dot ? 1 : 0.085).map(zu),
        pfad: checkpoints(stroke, 0.02).map(zu),
        dot: !!stroke.dot,
        glyph: gi,
      });
    }
    cursor += bw + 0.16 * hoehe;
  });

  // ------------------------------------------------------------- state
  let zug = 0;
  let cp = 0;
  let unten = false;
  /** Engaged: the finger arrived at the start and has not lifted since. */
  let dran = false;
  /** What the child has actually drawn, for the current stroke. */
  let tinte: Checkpoint[] = [];
  /** Everything they have drawn so far, kept so the word builds up. */
  const alteTinte: Checkpoint[][] = [];
  let zeigenBis = 0;
  let zeit = 0;

  // Generous, and scaled to the letter: a sixth of the letter height is
  // about a fingertip on an iPad, which is the right unit here.
  const radius = () => Math.max(26, hoehe * 0.17);

  function punkt(ev: PointerEvent): Checkpoint {
    const r = el.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function nah(a: Checkpoint, b: Checkpoint, r: number): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) <= r;
  }

  function fortschritt(p: Checkpoint): void {
    const z = zuege[zug];
    if (!z) return;

    if (!dran) {
      // A stroke only begins at its beginning. Landing in the middle of
      // a letter does nothing, which is what stops a child colouring it
      // in and being told they wrote it.
      if (nah(p, z.cps[0], radius() * 1.15)) {
        dran = true;
        cp = 1;
        tinte = [p];
        if (z.dot) zugFertig();
      }
      return;
    }

    tinte.push(p);

    // Consume every checkpoint the finger has reached, so a quick swipe
    // along a straight stem does not get stuck behind its own
    // checkpoints.
    let bewegt = true;
    while (bewegt && cp < z.cps.length) {
      bewegt = false;
      if (nah(p, z.cps[cp], radius())) { cp++; bewegt = true; }
    }
    if (cp >= z.cps.length) zugFertig();
  }

  function zugFertig(): void {
    const z = zuege[zug];
    alteTinte.push(tinte.length > 1 ? tinte : z.pfad);
    tinte = [];
    dran = false;
    cp = 0;
    const warGlyph = z.glyph;
    zug++;
    o.onZug?.();
    if (!zuege[zug] || zuege[zug].glyph !== warGlyph) o.onGlyph?.(warGlyph);
    if (zug >= zuege.length) o.onFertig?.();
  }

  // ------------------------------------------------------------- input
  const down = (ev: PointerEvent): void => {
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    unten = true;
    fortschritt(punkt(ev));
  };
  const move = (ev: PointerEvent): void => {
    if (!unten) return;
    ev.preventDefault();
    fortschritt(punkt(ev));
  };
  const up = (ev: PointerEvent): void => {
    unten = false;
    // Lifting mid-stroke is not a failure and is not punished — but the
    // stroke does start again, because the point of the exercise is one
    // continuous movement. What was drawn stays on screen so the child
    // can see what happened.
    if (dran) { dran = false; cp = 0; tinte = []; }
    try { el.releasePointerCapture(ev.pointerId); } catch { /* gone */ }
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  // ----------------------------------------------------------- drawing

  function linie(pts: Checkpoint[], breiteP: number, farbe: string): void {
    if (pts.length < 2) return;
    ctx.strokeStyle = farbe;
    ctx.lineWidth = breiteP;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function draw(): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, o.w, o.h);

    // The three writing lines, exactly as in an exercise book. They are
    // most of what tells a child how tall a letter is.
    ctx.strokeStyle = FARBE.linie;
    ctx.lineWidth = 2;
    for (const [y, dash] of [[0, true], [0.38, true], [1, false]] as [number, boolean][]) {
      ctx.setLineDash(dash ? [8, 8] : []);
      ctx.beginPath();
      ctx.moveTo(12, oben + y * hoehe);
      ctx.lineTo(o.w - 12, oben + y * hoehe);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const dick = Math.max(12, hoehe * 0.14);

    // Every stroke as a pale road, so the whole word is visible from
    // the start and the child knows what they are making.
    for (let i = 0; i < zuege.length; i++) {
      const z = zuege[i];
      if (z.dot) {
        ctx.fillStyle = i < zug ? FARBE.gemacht : FARBE.strasse;
        ctx.beginPath();
        ctx.arc(z.cps[0].x, z.cps[0].y, dick * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else {
        linie(z.pfad, dick, i < zug ? FARBE.gemacht : FARBE.strasse);
      }
    }

    // What the child has actually written, on top, in ink.
    for (const t of alteTinte) linie(t, dick * 0.55, FARBE.tinte);
    if (tinte.length > 1) linie(tinte, dick * 0.55, FARBE.tinte);

    // Where to start the next stroke: a red dot that breathes, and an
    // arrow saying which way. No words — a first-grader could not read
    // "start here" anyway.
    const z = zuege[zug];
    if (z) {
      const puls = 1 + Math.sin(zeit * 4) * 0.12;
      const a = z.cps[0];
      ctx.fillStyle = FARBE.start;
      ctx.beginPath();
      ctx.arc(a.x, a.y, dick * 0.42 * puls, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = FARBE.ink;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (!z.dot && z.pfad.length > 4) {
        const b = z.pfad[Math.min(z.pfad.length - 1, 6)];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const tip = { x: a.x + Math.cos(ang) * dick * 1.5, y: a.y + Math.sin(ang) * dick * 1.5 };
        ctx.fillStyle = FARBE.start;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x + Math.cos(ang + 2.5) * dick * 0.6, tip.y + Math.sin(ang + 2.5) * dick * 0.6);
        ctx.lineTo(tip.x + Math.cos(ang - 2.5) * dick * 0.6, tip.y + Math.sin(ang - 2.5) * dick * 0.6);
        ctx.closePath();
        ctx.fill();
      }

      // The "show me" run: a bead travelling the stroke.
      if (zeit < zeigenBis) {
        const k = 1 - (zeigenBis - zeit) / 1.4;
        const p = z.pfad[Math.min(z.pfad.length - 1, Math.floor(k * z.pfad.length))];
        ctx.fillStyle = FARBE.start;
        ctx.beginPath();
        ctx.arc(p.x, p.y, dick * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = FARBE.ink;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  /**
   * A debug hook, behind the same `?perf=1` flag as the frame timers.
   *
   * The verification suite has to be able to WRITE, and the only
   * honest way to check a tracing widget is to drive a real drag along
   * a real stroke. Recomputing the layout in the test would be testing
   * a copy of the maths rather than the maths — so the widget hands
   * out the path it is actually asking for.
   */
  if (new URLSearchParams(location.search).get('perf') === '1') {
    (window as unknown as { __zug: () => Checkpoint[] }).__zug =
      () => (zuege[zug]?.pfad ?? []).map((p) => ({ x: p.x, y: p.y }));
  }

  return {
    el,
    tick(t: number): void { zeit = t; draw(); },
    zeigen(): void { zeigenBis = zeit + 1.4; },
    fertig(): boolean { return zug >= zuege.length; },
    destroy(): void {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    },
  };
}
