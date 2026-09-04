// LernInseln — the whole app.
//
// Three screens and no framework: the island picker, an island, and a
// round of tasks. Canvas draws the world, the DOM draws the buttons —
// the same split Tidegarden uses, for the same reason: the DOM is
// better at buttons and canvas is better at pixels.
//
// The order of things in here follows the order a child meets them.

import { t } from './core/i18n.js';
import * as luma from './ui/luma.js';
import { P, shade } from './core/palette.js';
import * as state from './core/state.js';
import * as audio from './core/audio.js';
import * as fx from './core/fx.js';
import { iconCanvas } from './core/icons.js';
import { tenFrameCanvas } from './core/tenframe.js';
import { wuerfelCanvas, stangeCanvas } from './games/wuerfel.js';
import { fahrzeugCanvas, pfeilCanvas, type Fahrzeug } from './games/fahrzeuge.js';
import {
  ISLANDS, GRID, island, unlockedHouses, housesOn, buildable,
  isLand, ausbauPreis, vergissLand,
  type IslandDef, type HouseDef,
} from './islands/islands.js';
import * as render from './islands/render.js';
import { deco, sortiment, neuAb, GRUPPEN } from './islands/decor.js';
import * as S from './islands/sprites.js';
import * as D from './islands/deko.js';
import { buildRound, rundenLaenge } from './games/games.js';
import type { Question, Prompt } from './games/types.js';
import { WOERTER, stem } from './games/woerter.js';
import { bildCanvas, hasBild } from './games/wortbilder.js';
import { formCanvas, type Form } from './games/formen.js';
import { makeTracer, type Tracer } from './ui/tracer.js';

const stage = document.getElementById('stage') as HTMLCanvasElement;
const fxCanvas = document.getElementById('fx') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLDivElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const ctx = stage.getContext('2d', { willReadFrequently: true })!;
const fxCtx = fxCanvas.getContext('2d', { willReadFrequently: true })!;

type Screen = 'picker' | 'island' | 'round';

let screen: Screen = 'picker';
let currentIsland = 'mathe';

/**
 * The camera, in sprite pixels, and whether we are looking at the whole
 * island or standing on it.
 *
 * The islands are bigger than the screen now, so there has to be a
 * camera. Two rules keep that from being something a six-year-old can
 * get lost in:
 *
 *   * `render.klemme` holds the view rectangle inside the land, so
 *     panning as hard as you like still leaves the island under your
 *     thumb. There is no empty-ocean state to be stranded in.
 *   * one button switches between the whole island and the place you
 *     were standing, and in the whole-island view a tap on anywhere
 *     takes you there. That is the map, and it needs no words.
 */
let cam = { x: 0, y: 0 };
let uebersicht = false;
/** Pan momentum, in sprite pixels per second. */
let schwung = { x: 0, y: 0 };
let building = false;
let holding: string | null = null;         // decoration id waiting for a tile
let hover: { x: number; y: number } | null = null;
let arriving: string | null = null;
let arrivingUntil = 0;
let houseHits: render.HouseHit[] = [];
/** The picker's live island previews, redrawn each frame. */
const thumbs: { c: HTMLCanvasElement; id: string; w: number; h: number }[] = [];
/** One DOM label per house, repositioned from the hit rects each frame. */
const houseLabels = new Map<string, { el: HTMLDivElement; w: number; h: number }>();
let view: render.View = { scale: 2, ox: 0, oy: 0 };
let started = 0;

/** The voice file stem for an i18n key. Kept in step with genvoice.mjs. */
function voiceOf(key: string): string {
  return key.replace(/\./g, '-').toLowerCase();
}

/**
 * Speak an i18n line.
 *
 * The German text goes along with the file stem so that the speech
 * fallback has something to say when the MP3 has not been generated —
 * which keeps the one rule that matters here: a child who cannot read
 * is never shown an instruction they cannot hear.
 */
function sayLine(key: string): void {
  audio.say(voiceOf(key), t(key));
}

/**
 * Say one of several, at random.
 *
 * A child will hear the praise at the end of a round dozens of times.
 * The same sentence every single time stops being praise and becomes a
 * noise the app makes, so there are three and it picks one.
 */
function sayOneOf(keys: string[]): void {
  sayLine(keys[Math.floor(Math.random() * keys.length)]);
}

/** Timers for a spoken sequence, so a new question can cancel the old. */
let speaking: number[] = [];

function stopSequence(): void {
  for (const id of speaking) clearTimeout(id);
  speaking = [];
}

/**
 * Say several words in turn, with a gap between them.
 *
 * The Haus der Reime needs this and it is not a nicety: the question is
 * spoken but the three answers are WRITTEN, and a first-grader who
 * cannot read yet has been handed a task they cannot even perceive. A
 * teacher setting this exercise says all four words out loud, so the
 * app does too.
 *
 * Each line is roughly a second; the exact figure does not matter
 * because `say` cancels whatever was playing, so a gap that is slightly
 * too short only clips a tail.
 */
function saySequence(words: string[], firstDelay = 300, gap = 1100): void {
  stopSequence();
  words.forEach((w, i) => {
    speaking.push(window.setTimeout(
      () => audio.say(`wort-${stem(w)}`, w), firstDelay + i * gap));
  });
}

/**
 * The greeting for a house: the full explanation the first time it is
 * ever opened, the short version afterwards.
 *
 * Explaining the rules again on every visit talks down to the child who
 * has just learned them — and a warm sentence is warm the first time
 * and wearing by the twentieth.
 */
function greetHouse(house: HouseDef): void {
  const heard = `heard:${house.id}`;
  if (!state.hasSeen(heard)) {
    state.markSeen(heard);
    sayLine(`${house.sayKey}Erst`);
    return;
  }
  sayLine(house.sayKey);
}

// -------------------------------------------------------------- canvas

function resize(): void {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  // The backing store is sized in DEVICE pixels and scaled down by CSS,
  // or the pixel art is blurry on every retina display there has ever
  // been. `image-rendering: pixelated` in the stylesheet does the rest.
  stage.width = Math.round(w * dpr);
  stage.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fxCanvas.width = stage.width;
  fxCanvas.height = stage.height;
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  blickSetzen();
}

/**
 * Recompute the view from the camera.
 *
 * Everything downstream reads `view.ox/oy/scale`, so this one function
 * is the whole difference between a fixed camera and a moving one.
 */
function blickSetzen(): void {
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  if (uebersicht) {
    view = render.fit(w, h, currentIsland);
  } else {
    cam = render.klemme(w, h, currentIsland, cam);
    view = render.blick(w, h, currentIsland, cam);
  }
  fx.setScale(view.scale);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

// --------------------------------------------------------- the frame

/**
 * Per-frame work timing, behind `?perf=1`.
 *
 * Measures the WORK rather than the frame rate, and the difference is
 * the whole point. The first version of the performance check timed
 * the gaps between animation frames, which in a headless browser is
 * the scheduler and the load on the machine and almost nothing to do
 * with this app: it read 17ms on an idle laptop and 35ms on a busy one
 * while the actual drawing never moved from about two milliseconds.
 *
 * Two confident theories died before anybody measured — the campfire
 * particles, then a layout flush in the label placement. Both were
 * innocent. LEARNINGS.md said this would happen and it did anyway.
 */
const perfOn = new URLSearchParams(location.search).get('perf') === '1';
const perf: Record<string, number> = { draw: 0, labels: 0, fx: 0 };
if (perfOn) (window as unknown as { __perf: typeof perf }).__perf = perf;

/**
 * What the suite needs to see about the camera, behind the same flag.
 *
 * `__zoom` is the zoom the island is BUILT at and must be 2 on every
 * island — it is a constant now rather than a consequence of the island
 * size, which is the whole reason an island may be bigger than the
 * screen. `__schirme` says how many screenfuls the island is, so the
 * suite can assert that panning is in service of something. `__kamera`
 * is where the camera is looking, for the clamp check.
 */
if (perfOn) {
  const w = () => window.innerWidth;
  const h = () => window.innerHeight;
  const dbg = window as unknown as {
    __zoom: (id: string) => number;
    __schirme: (id: string) => { x: number; y: number };
    __platz: (id: string) => number;
    __kamera: () => { x: number; y: number };
    __ueberLand: () => boolean;
    __stufe: (id: string) => number;
    __runden: (id: string) => number;
  };
  dbg.__zoom = (id: string) => render.blick(w(), h(), id, render.mitte(id)).scale;
  dbg.__schirme = (id: string) => render.inSchirmen(w(), h(), id);
  dbg.__platz = (id: string) => render.freieFelder(id, state.get().stars);
  dbg.__kamera = () => ({ ...cam });
  // Is the middle of the screen over land? This is what "the island
  // cannot be dragged away from under the child" actually means, and
  // the first version of that check asserted something else entirely
  // and passed with the clamp deleted.
  dbg.__stufe = (id: string) => state.houseLevel(id);
  dbg.__runden = (id: string) => state.roundsOf(id);
  dbg.__ueberLand = () => {
    const t = render.screenToTile(view, stage.clientWidth / 2, stage.clientHeight / 2);
    return isLand(currentIsland, t.x, t.y);
  };
}

function mark(key: string, since: number): void {
  if (!perfOn) return;
  // A rolling mean, so one slow frame during start-up does not stand
  // for the whole measurement.
  perf[key] = perf[key] * 0.9 + (performance.now() - since) * 0.1;
}

let last = 0;
function frame(now: number): void {
  if (!started) started = now;
  const time = (now - started) / 1000;
  // A tab that has been asleep hands back an enormous delta and every
  // animation lurches. The clamp matters now that particles integrate:
  // without it, coming back from a locked iPad teleports every spark
  // off the bottom of the screen in one step.
  const dt = Math.min(0.05, Math.max(0, time - last));
  last = time;

  schwungLaufen(dt);

  // The shake moves the WHOLE app — island, interface and all — because
  // a shake that only moves the world reads as the world coming loose,
  // and a shake that moves nothing at all is not a shake.
  const off = fx.shakeOffset(now);
  app.style.transform = off.x || off.y ? `translate(${off.x}px, ${off.y}px)` : '';

  if (screen === 'island') {
    const t0 = performance.now();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, stage.width, stage.height);
    houseHits = render.draw(ctx, view, stage.width / dpr, stage.height / dpr, {
      islandId: currentIsland,
      time,
      building,
      hover,
      arriving: arriving && now < arrivingUntil ? arriving : null,
    });
    mark('draw', t0);
    if (arriving && now >= arrivingUntil) arriving = null;
    const t1 = performance.now();
    placeLabels();
    mark('labels', t1);
  }

  // The picker's island previews are LIVE. They already show what the
  // child has built, so leaving them frozen made the picker the one
  // screen where the sea did not move — and it is the first screen
  // anybody sees.
  if (screen === 'picker') {
    for (const th of thumbs) {
      const tx = th.c.getContext('2d', { willReadFrequently: true })!;
      tx.setTransform(2, 0, 0, 2, 0, 0);
      tx.clearRect(0, 0, th.c.width, th.c.height);
      render.draw(tx, render.fit(th.w, th.h, th.id), th.w, th.h, {
        islandId: th.id, time, building: false, hover: null, arriving: null,
      });
    }
  }

  if (tracer) tracer.tick(time);

  const t2 = performance.now();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  fx.update(dt);
  fx.draw(fxCtx);
  mark('fx', t2);

  requestAnimationFrame(frame);
}

/** The middle of an element, in CSS pixels. For aiming particles. */
function centreOf(e: Element): { x: number; y: number } {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Put each house's label under the house it belongs to.
 *
 * The houses live on the canvas and the labels are DOM, so the two have
 * to be reconciled every frame — the alternative is drawing text into
 * the canvas, which at this pixel scale would either be a hand-rolled
 * bitmap font or a blurry mess.
 *
 * Patrick, on why the labels exist at all: "vielleicht sitzen ja eltern
 * dabei". The child navigates by the coloured sign over the door; the
 * label is for the grown-up next to them, and for the child later, when
 * they can read.
 */
function placeLabels(): void {
  if (!houseLabels.size) return;
  const seen = new Set<string>();

  // Work out where each label wants to be, then push them apart.
  //
  // The sizes were MEASURED here, once per label, every frame — and
  // reading `getBoundingClientRect` right after writing `style.top` on
  // the previous label forces the browser to flush layout, every time,
  // for every label. That alone roughly doubled the frame time on a
  // busy island, and the frame-time check is what caught it. A label's
  // size never changes after it is built, so it is measured once when
  // it is built and only written to from here.
  const want: { el: HTMLDivElement; x: number; y: number; w: number; h: number }[] = [];
  for (const hit of houseHits) {
    const label = houseLabels.get(hit.house.id);
    if (!label) continue;
    seen.add(hit.house.id);
    label.el.style.visibility = 'visible';
    want.push({
      el: label.el,
      x: Math.round(hit.x + hit.w / 2),
      // Tucked right under the doorstep, so the label sits on the tile
      // the house occupies rather than on the free ground in front.
      y: Math.round(hit.y + hit.h - 14),
      w: label.w,
      h: label.h,
    });
  }

  // Two houses on neighbouring tiles put their labels on top of each
  // other, and in portrait — where the island draws at a smaller zoom —
  // four of them stacked into an unreadable pile. Nudging the lower one
  // down is enough: the eye still associates it with the nearest house,
  // and nothing is hidden.
  want.sort((a, b) => a.y - b.y);
  for (let i = 1; i < want.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = want[j], b = want[i];
      const overlapX = Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 6;
      const overlapY = b.y < a.y + a.h + 2;
      if (overlapX && overlapY) b.y = a.y + a.h + 4;
    }
  }
  for (const w of want) {
    w.el.style.left = `${w.x}px`;
    w.el.style.top = `${w.y}px`;
  }

  // A house that did not draw this frame — scrolled off, or not there —
  // must not leave its label stranded in the corner.
  for (const [id, label] of houseLabels) {
    if (!seen.has(id)) label.el.style.visibility = 'hidden';
  }
}

// ------------------------------------------------------------- helpers

function clear(): void {
  luma.abbrechen();
  ui.replaceChildren();
  houseLabels.clear();
  thumbs.length = 0;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Wire a tap.
 *
 * `pointerdown`, not `click`: IPAD.md, and because a child who is not
 * certain a tap registered taps again — the sooner the button reacts,
 * the fewer double answers. The audio unlock rides along, because iOS
 * only resumes an AudioContext inside a real user gesture and this is
 * the only place we have one.
 */
function tap(e: HTMLElement, fn: () => void): void {
  e.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    audio.unlock();
    fn();
  });
}

function button(label: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', cls, label);
  tap(b, () => { audio.click(); fn(); });
  return b;
}

function toast(msg: string): void {
  const old = ui.querySelector('.toast');
  if (old) old.remove();
  const tEl = el('div', 'toast', msg);
  ui.appendChild(tEl);
  setTimeout(() => tEl.remove(), 2600);
}

function purse(): HTMLDivElement {
  const s = state.get();
  const wrap = el('div', 'purse');
  const star = el('div', 'coin star');
  star.appendChild(iconCanvas('stern', 34));
  star.appendChild(el('span', undefined, String(s.stars)));
  const candy = el('div', 'coin candy');
  candy.appendChild(iconCanvas('bonbon', 34));
  candy.appendChild(el('span', undefined, String(s.candy)));
  wrap.append(star, candy);
  return wrap;
}

// ------------------------------------------------------------ settings
//
// AGENTS.md rule 14: sound is optional and off-switchable in TWO TAPS,
// because this gets played in waiting rooms. Until now there was no way
// to switch it off at all, which made that rule a comment rather than a
// feature — so the gear is on the island and on the picker, and it is
// two taps from either.
//
// Deliberately small and in a corner. It is for the grown-up; a child
// who taps it finds two switches and a way back, and nothing they can
// break.

function gearButton(): HTMLButtonElement {
  const b = el('button', 'gear', '⚙');
  tap(b, () => { audio.click(); showSettings(); });
  return b;
}

/**
 * The map button: whole island, or standing on it.
 *
 * A drawn icon rather than a word, because rule 14 says no text may be
 * load-bearing and this is the only way to see the far side of an
 * island. It draws what it will GIVE you — the island diamond when you
 * are standing on it, a magnifying frame around a piece of it when you
 * are looking at the whole thing — so the button is a picture of its
 * own result rather than a symbol to be learned.
 */
function karteButton(): HTMLButtonElement {
  const b = el('button', 'gear karte');
  const c = el('canvas');
  const S = 3;
  c.width = 22 * S;
  c.height = 22 * S;
  c.style.width = `${22 * S}px`;
  c.style.height = `${22 * S}px`;
  const cc = c.getContext('2d', { willReadFrequently: true })!;
  cc.imageSmoothingEnabled = false;
  cc.scale(S, S);
  const ink = '#241d2b';
  if (uebersicht) {
    // A frame around a corner of the diamond: this takes you back in.
    cc.fillStyle = shade(P.grass, 2);
    cc.beginPath();
    cc.moveTo(11, 3); cc.lineTo(20, 9); cc.lineTo(11, 15); cc.lineTo(2, 9);
    cc.closePath(); cc.fill();
    cc.strokeStyle = ink;
    cc.lineWidth = 2;
    cc.strokeRect(7, 6, 10, 10);
  } else {
    // The whole diamond, with the houses on it as dots.
    cc.fillStyle = shade(P.sea, 2);
    cc.fillRect(1, 1, 20, 20);
    cc.fillStyle = shade(P.grass, 2);
    cc.beginPath();
    cc.moveTo(11, 3); cc.lineTo(20, 11); cc.lineTo(11, 19); cc.lineTo(2, 11);
    cc.closePath(); cc.fill();
    cc.fillStyle = shade(P.terracotta, 2);
    for (const [x, y] of [[8, 9], [14, 10], [11, 14]]) cc.fillRect(x, y, 3, 3);
  }
  b.appendChild(c);
  tap(b, () => {
    audio.whoosh();
    uebersicht = !uebersicht;
    schwung = { x: 0, y: 0 };
    blickSetzen();
    drawIslandUi();
  });
  return b;
}

function showSettings(): void {
  const sheet = el('div', 'sheet');
  sheet.appendChild(el('h2', undefined, t('app.name')));

  const rows = el('div', 'settings');

  const toggle = (label: string, on: boolean, set: (v: boolean) => void): HTMLElement => {
    const row = el('div', 'setting');
    row.appendChild(el('div', 'label', label));
    const b = el('button', on ? 'on' : 'off', on ? t('set.on') : t('set.off'));
    tap(b, () => {
      const now = !(b.className === 'on');
      set(now);
      b.className = now ? 'on' : 'off';
      b.textContent = now ? t('set.on') : t('set.off');
      // Give the change a voice, so a parent can hear that it worked —
      // but only in the direction where a sound is allowed.
      if (now) audio.click();
    });
    row.appendChild(b);
    return row;
  };

  // The name. A text field is the one place in this app where a
  // keyboard appears, which is why it lives behind the gear: it is for
  // the grown-up to fill in once.
  const nameRow = el('div', 'setting');
  nameRow.appendChild(el('div', 'label', t('set.name')));
  const nameField = el('input');
  nameField.type = 'text';
  nameField.value = state.get().name;
  nameField.placeholder = t('set.namePlaceholder');
  nameField.maxLength = 16;
  nameField.autocapitalize = 'words';
  nameField.addEventListener('change', () => state.setName(nameField.value));
  nameField.addEventListener('blur', () => state.setName(nameField.value));
  nameRow.appendChild(nameField);
  rows.appendChild(nameRow);

  rows.appendChild(toggle(t('set.sound'), state.get().sound, (v) => state.setSound(v)));
  rows.appendChild(toggle(t('set.voice'), state.get().voice, (v) => {
    state.setVoice(v);
    if (!v) audio.stopSaying();
  }));
  sheet.appendChild(rows);

  const row = el('div');
  row.appendChild(button(t('shop.close'), () => sheet.remove()));
  row.appendChild(button(t('set.postcard'), () => { sheet.remove(); showPostcard(); }));

  // Reset is behind a confirmation, and the confirmation is worded so
  // that nobody taps it by accident on the way past.
  row.appendChild(button(t('set.reset'), () => {
    const confirm = el('div', 'sheet');
    confirm.appendChild(el('h2', undefined, t('set.resetSure')));
    const r2 = el('div');
    r2.appendChild(button(t('set.resetNo'), () => confirm.remove()));
    const yes = button(t('set.resetYes'), () => {
      state.reset();
      confirm.remove();
      sheet.remove();
      showPicker();
    });
    yes.classList.add('danger');
    r2.appendChild(yes);
    confirm.appendChild(r2);
    ui.appendChild(confirm);
  }));
  sheet.appendChild(row);
  ui.appendChild(sheet);
}

/**
 * A postcard of the island, to show somebody.
 *
 * This one is for the grown-up, and it is the thing that gets a class
 * interested: a child who can show their island to a parent, and a
 * parent who can show it to another parent, is worth more than any
 * amount of in-app persuasion.
 *
 * Presented as an IMAGE in a sheet rather than as a download, because
 * on iOS `<a download>` is unreliable and a data URL cannot be opened
 * in a new tab at all — but long-pressing an `<img>` and choosing
 * "Save to Photos" has worked on every iPad ever made. The download
 * link is there too, for the desktop.
 *
 * Nothing leaves the device: the picture is drawn from the canvas that
 * is already on screen and handed straight to the operating system.
 */
function showPostcard(): void {
  // Size the card to the ISLAND rather than picking a nice round number
  // and hoping. The first version was a fixed 1200x820 and the island
  // sat in the middle of it with a third of the picture empty sea on
  // every side, which is a screenshot rather than a postcard.
  const SCALE = 4;
  const box = render.landBox(currentIsland);

  // Headroom above for the tall things — a lighthouse and a windmill
  // both stand well clear of their own tile — and much less below,
  // because nothing hangs down. Padding the two ends equally is what
  // left a third of the first card empty.
  const padTop = 62, padBottom = 24, padSide = 26;
  const band = 74;
  const w = Math.round((box.maxX - box.minX + padSide * 2) * SCALE);
  const h = Math.round((box.maxY - box.minY + padTop + padBottom) * SCALE) + band;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.imageSmoothingEnabled = false;

  // The labels are left off on purpose: a postcard is a picture, not a
  // screen.
  const v: render.View = {
    scale: SCALE,
    ox: (w / SCALE) / 2 - (box.minX + box.maxX) / 2,
    oy: ((h - band) / SCALE) / 2 - (box.minY + box.maxY) / 2 + (padTop - padBottom) / 2,
  };
  cx.save();
  render.draw(cx, v, w, h - band, {
    islandId: currentIsland,
    time: (performance.now() - started) / 1000,
    building: false,
    hover: null,
    arriving: null,
  });
  cx.restore();

  // A caption band along the bottom.
  cx.fillStyle = '#241d2b';
  cx.fillRect(0, h - band, w, band);
  cx.fillStyle = '#f8f0dc';
  cx.font = 'bold 40px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  const who = state.get().name;
  cx.fillText(who ? t('islands.titleNamed', { name: who }) : t('app.name'), w / 2, h - band / 2);

  const sheet = el('div', 'sheet');
  sheet.appendChild(el('h2', undefined, t('set.postcard')));
  const img = el('img', 'postcard');
  img.src = c.toDataURL('image/png');
  img.alt = t('app.name');
  sheet.appendChild(img);
  sheet.appendChild(el('div', 'hinweis', t('set.postcardHint')));

  const row = el('div');
  const dl = el('a', 'dl');
  dl.href = img.src;
  dl.download = 'lerninseln.png';
  dl.textContent = t('set.save');
  row.appendChild(dl);
  row.appendChild(button(t('shop.close'), () => sheet.remove()));
  sheet.appendChild(row);
  ui.appendChild(sheet);
}

// --------------------------------------------------------- the picker

function showPicker(): void {
  screen = 'picker';
  clear();
  const wrap = el('div', 'picker');
  const who = state.get().name;
  wrap.appendChild(el('h1', undefined,
    who ? t('islands.titleNamed', { name: who }) : t('islands.title')));
  // One line under the title, because the voice says the same thing and
  // a grown-up sitting next to the child should be able to read what
  // this is without being told. Patrick: "einen ganz kurzen erklärtext
  // zusätzlich zu der stimme".
  wrap.appendChild(el('p', 'lead', t('islands.lead')));

  const cards = el('div', 'cards');
  const stars = state.get().stars;
  for (const def of ISLANDS) {
    const card = el('button', 'island-card');
    card.appendChild(islandThumb(def, 260, 155));
    card.appendChild(el('div', 'name', t(def.nameKey)));
    card.appendChild(el('div', 'sub', t(def.subKey)));

    // How far along this island is, WITHOUT a number. One dot per
    // house: filled for the ones that are there, hollow for the ones
    // still coming. DESIGN.md asks for progress that is visible without
    // being numeric, and this is that — a child counts the dots or does
    // not, and either way sees there is more.
    const dots = el('div', 'houses');
    for (const h of housesOn(def.id)) {
      dots.appendChild(el('div', `hdot${h.stars <= stars ? ' open' : ''}`));
    }
    card.appendChild(dots);

    tap(card, () => {
      audio.click();
      openIsland(def.id);
    });
    cards.appendChild(card);
  }
  wrap.appendChild(cards);
  ui.appendChild(wrap);

  const corner = el('div', 'corner');
  corner.appendChild(gearButton());
  ui.appendChild(corner);

  // The one line a child who cannot read needs.
  // The first time the app is ever opened she introduces herself; every
  // time after that it is the plain line, with no face and no waiting.
  if (!luma.einmal('say.lumaHallo')) sayLine('say.pickIsland');
}

/** A small live rendering of an island, so the choice is a picture. */
function islandThumb(def: IslandDef, w: number, h: number): HTMLCanvasElement {
  const c = el('canvas');
  c.width = w * 2;
  c.height = h * 2;
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.setTransform(2, 0, 0, 2, 0, 0);
  render.draw(cx, render.fit(w, h, def.id), w, h, {
    islandId: def.id, time: 0, building: false, hover: null, arriving: null,
  });
  thumbs.push({ c, id: def.id, w, h });
  return c;
}

// --------------------------------------------------------- the island

function openIsland(id: string): void {
  currentIsland = id;
  screen = 'island';
  building = false;
  holding = null;
  // Always arrive in the middle, at building zoom. Where a child left
  // the camera three days ago is not information; where the houses are
  // is.
  uebersicht = false;
  schwung = { x: 0, y: 0 };
  cam = render.mitte(id, state.get().stars);
  resize();
  drawIslandUi();
  // On the first island ever opened she explains what it is and what the
  // houses are for, in that order, the second line following the first
  // when she leaves. After that, the island's own line.
  if (!luma.einmal('say.lumaInsel', () => { luma.einmal('say.lumaHaus'); })) {
    sayLine(island(id).sayKey);
  }
}

function drawIslandUi(): void {
  clear();
  const hud = el('div', 'hud');
  hud.appendChild(button(t('island.back'), () => showPicker()));
  hud.appendChild(gearButton());
  hud.appendChild(el('div', 'spacer'));
  hud.appendChild(purse());
  ui.appendChild(hud);

  const bar = el('div', 'hud');
  bar.appendChild(karteButton());
  bar.style.top = 'auto';
  bar.style.bottom = 'calc(var(--safe-b) + 12px)';
  bar.style.justifyContent = 'flex-end';
  bar.appendChild(el('div', 'spacer'));
  if (building) {
    bar.appendChild(button(t('island.build'), () => showShop()));
    bar.appendChild(button(t('island.buildDone'), () => {
      building = false; holding = null; drawIslandUi();
    }));
  } else {
    bar.appendChild(button(t('island.build'), () => {
      building = true; holding = null; drawIslandUi();
      if (!luma.einmal('say.lumaBauen')) sayLine('say.build');
    }));
  }
  ui.appendChild(bar);

  // One label per house, unlocked or not. `placeLabels` moves them.
  const labels = el('div', 'labels');
  const stars = state.get().stars;
  for (const h of housesOn(currentIsland)) {
    const open = h.stars <= stars;
    const label = el('div', `house-label${open ? '' : ' soon'}`);
    label.appendChild(el('div', 'name', t(h.nameKey)));
    label.appendChild(el('div', 'sub',
      open ? t(`${h.nameKey}.sub`) : t('island.fromStars', { n: h.stars })));
    label.style.visibility = 'hidden';
    labels.appendChild(label);
    houseLabels.set(h.id, { el: label, w: 160, h: 34 });
  }
  ui.appendChild(labels);

  // Measure every label ONCE, now that they are all in the document.
  // One layout flush per screen instead of one per label per frame.
  for (const entry of houseLabels.values()) {
    const r = entry.el.getBoundingClientRect();
    if (r.width) { entry.w = r.width; entry.h = r.height; }
  }

  if (building) {
    ui.appendChild(el('div', 'hint', holding ? t('shop.placeIt') : t('island.build')));
  } else {
    ui.appendChild(el('div', 'hint', t('island.pickHouse')));
  }
}

// The world takes drags as well as taps now, so a tap is "a press that
// did not move". Everything else on the island is a DOM button and is
// unaffected — the pointerdown rule in `tap()` is about answer cards,
// where the fastest possible reaction is the point.
//
// The threshold is 10 CSS pixels. A six-year-old aiming at a house
// wobbles by three or four, and anything under about eight turns half
// their taps into one-pixel pans that do nothing and feel broken.
const ZIEH_SCHWELLE = 10;

interface Zug {
  id: number;
  x0: number;
  y0: number;
  camX: number;
  camY: number;
  gezogen: boolean;
  /** Last two samples, for the throw. */
  lx: number;
  ly: number;
  lt: number;
  vx: number;
  vy: number;
}
let zug: Zug | null = null;

stage.addEventListener('pointerdown', (ev) => {
  if (screen !== 'island') return;
  audio.unlock();
  const r = stage.getBoundingClientRect();
  schwung = { x: 0, y: 0 };
  zug = {
    id: ev.pointerId,
    x0: ev.clientX - r.left,
    y0: ev.clientY - r.top,
    camX: cam.x,
    camY: cam.y,
    gezogen: false,
    lx: ev.clientX,
    ly: ev.clientY,
    lt: performance.now(),
    vx: 0,
    vy: 0,
  };
  stage.setPointerCapture(ev.pointerId);
});

stage.addEventListener('pointermove', (ev) => {
  if (screen !== 'island') return;
  const r = stage.getBoundingClientRect();
  const px = ev.clientX - r.left;
  const py = ev.clientY - r.top;

  if (!zug || zug.id !== ev.pointerId) {
    if (building) hover = render.screenToTile(view, px, py);
    return;
  }

  const dx = px - zug.x0;
  const dy = py - zug.y0;
  if (!zug.gezogen && Math.hypot(dx, dy) > ZIEH_SCHWELLE) {
    zug.gezogen = true;
    hover = null;
  }
  if (!zug.gezogen) return;
  // Panning in the overview is meaningless — the whole island is on
  // screen — so the drag is simply ignored there.
  if (uebersicht) return;

  // The world moves WITH the finger: drag right and the island comes
  // right, which means the camera goes left. Getting this backwards is
  // the single most common way a pan feels wrong, and it is a sign.
  cam = { x: zug.camX - dx / view.scale, y: zug.camY - dy / view.scale };
  blickSetzen();

  const now = performance.now();
  const dt = Math.max(8, now - zug.lt) / 1000;
  zug.vx = ((ev.clientX - zug.lx) / view.scale) / dt;
  zug.vy = ((ev.clientY - zug.ly) / view.scale) / dt;
  zug.lx = ev.clientX;
  zug.ly = ev.clientY;
  zug.lt = now;
});

function zugEnde(ev: PointerEvent): void {
  if (!zug || zug.id !== ev.pointerId) return;
  const z = zug;
  zug = null;
  if (stage.hasPointerCapture(ev.pointerId)) stage.releasePointerCapture(ev.pointerId);

  if (z.gezogen) {
    // A throw, but only if the finger was still moving when it left.
    // Without the recency test, a slow drag that stops and then lifts
    // flings the island, which reads as the app disagreeing with you.
    if (performance.now() - z.lt < 90) schwung = { x: -z.vx, y: -z.vy };
    return;
  }

  const r = stage.getBoundingClientRect();
  const px = ev.clientX - r.left;
  const py = ev.clientY - r.top;

  // In the overview, a tap is "take me there". That is the map, and it
  // is the reason the overview needs no instructions.
  if (uebersicht) {
    const w = stage.clientWidth, h = stage.clientHeight;
    cam = {
      x: px / view.scale - view.ox,
      y: py / view.scale - view.oy,
    };
    uebersicht = false;
    blickSetzen();
    audio.whoosh();
    void w; void h;
    drawIslandUi();
    return;
  }

  if (building) {
    const tile = render.screenToTile(view, px, py);
    onBuildTap(tile.x, tile.y);
    return;
  }

  // Houses are hit-tested against where they actually landed on screen,
  // not against their tile: a house is 50 pixels tall and a child aims
  // at the roof, which belongs to the tile two rows behind.
  const hit = [...houseHits].reverse().find((hh) =>
    px >= hh.x && px <= hh.x + hh.w && py >= hh.y && py <= hh.y + hh.h);
  if (!hit) return;
  if (hit.locked) {
    // Not a refusal, a promise. The plot says somebody is moving in,
    // and this says when.
    audio.click();
    toast(t('island.stillLocked', { n: hit.house.stars - state.get().stars }));
    return;
  }
  startRound(hit.house);
}

stage.addEventListener('pointerup', zugEnde);
stage.addEventListener('pointercancel', (ev) => {
  if (zug && zug.id === ev.pointerId) zug = null;
});

/** Let the throw run out. Called once a frame while on an island. */
function schwungLaufen(dt: number): void {
  if (screen !== 'island' || uebersicht || zug) return;
  if (Math.abs(schwung.x) < 4 && Math.abs(schwung.y) < 4) {
    schwung = { x: 0, y: 0 };
    return;
  }
  cam = { x: cam.x + schwung.x * dt, y: cam.y + schwung.y * dt };
  const vorher = { ...cam };
  blickSetzen();
  // The clamp moved us: we have hit the edge, so the throw stops rather
  // than grinding along it.
  if (Math.abs(vorher.x - cam.x) > 0.5) schwung.x = 0;
  if (Math.abs(vorher.y - cam.y) > 0.5) schwung.y = 0;
  const reibung = Math.pow(0.0025, dt);
  schwung = { x: schwung.x * reibung, y: schwung.y * reibung };
}

function onBuildTap(x: number, y: number): void {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;

  // Tapping something already built picks it up and gives the sweets
  // back in full. Nothing in this app is ever lost by a tap, and a
  // child who wants the sheep somewhere else should be able to move it.
  const existing = state.placedOn(currentIsland).find((p) => p.x === x && p.y === y);
  if (existing && !holding) {
    const d = deco(existing.d);
    state.removeAt(currentIsland, x, y);
    if (d) state.addCandy(d.price);
    audio.pop();
    const up = render.tileToScreen(view, x, y);
    fx.burst('staub', up.sx * view.scale, (up.sy - render.LIFT) * view.scale,
      { n: 6, speed: 70, up: 0.4, gravity: 100, life: 0.4 });
    drawIslandUi();
    return;
  }

  if (!holding) return;
  if (!buildable(currentIsland, x, y, holding)) return;
  if (state.occupied(currentIsland, x, y)) return;

  const d = deco(holding);
  if (!d) return;
  if (!state.spendCandy(d.price)) {
    toast(t('shop.tooExpensive'));
    return;
  }
  state.place({ d: d.id, i: currentIsland, x, y });
  audio.land();
  // Dust where it landed, and a small kick. Three pixels: a child
  // holding a tablet 30cm away feels that perfectly well, and anything
  // that looks dramatic in a screenshot is far too much in the hand.
  const p2 = render.tileToScreen(view, x, y);
  fx.burst('staub', p2.sx * view.scale, (p2.sy - render.LIFT) * view.scale,
    { n: 10, speed: 90, up: 0.2, gravity: 120, life: 0.5 });
  fx.shake(3);
  holding = null;
  drawIslandUi();
}

// ----------------------------------------------------------- the shop

function showShop(): void {
  const sheet = el('div', 'sheet');
  sheet.appendChild(el('h2', undefined, t('shop.title')));
  sheet.appendChild(purse());

  // Only what has turned up so far. Never a locked card, never a
  // padlock, never a condition a child who cannot read would have to
  // read. See the long comment at the top of decor.ts.
  const angebot = sortiment(state.get().stars);
  const wrap = el('div', 'shop-wrap');

  for (const g of GRUPPEN) {
    const teil = angebot.filter((d) => d.group === g);
    if (!teil.length) continue;
    wrap.appendChild(el('h3', 'shop-gruppe', t(`gruppe.${g}`)));
    const grid = el('div', 'shop-grid');
    for (const d of teil) {
      const item = el('button', 'shop-item');
      item.appendChild(decoThumb(d.art));
      item.appendChild(el('div', 'label', t(d.nameKey)));
      const price = el('div', 'price');
      price.appendChild(iconCanvas('bonbon', 22));
      price.appendChild(el('span', undefined, String(d.price)));
      item.appendChild(price);
      // "Neu" until it has been looked at once. `hasSeen` is the same
      // once-only marker the voice lines use.
      if (!state.hasSeen(`shop:${d.id}`)) {
        item.appendChild(el('div', 'neu', t('shop.neu')));
        state.markSeen(`shop:${d.id}`);
      }
      if (state.get().candy < d.price) item.disabled = true;
      tap(item, () => {
        if (state.get().candy < d.price) { toast(t('shop.tooExpensive')); return; }
        audio.pop();
        holding = d.id;
        sheet.remove();
        building = true;
        drawIslandUi();
      });
      grid.appendChild(item);
    }
    wrap.appendChild(grid);
  }

  // And then the island itself. The endgame, and the only thing in the
  // shop that is not an object: when a child has filled their island
  // they have finished the game, so the coast can be pushed outwards.
  //
  // Last in the list on purpose. It costs more than anything else and a
  // child who has just arrived should not be looking at it.
  const preis = ausbauPreis(currentIsland);
  wrap.appendChild(el('h3', 'shop-gruppe', t('shop.gruppeInsel')));
  const inselGrid = el('div', 'shop-grid');
  const karte = el('button', 'shop-item ausbau');
  karte.appendChild(inselBild());
  karte.appendChild(el('div', 'label',
    preis === null ? t('shop.ausbauFertig') : t('shop.ausbau')));
  if (preis !== null) {
    const pr = el('div', 'price');
    pr.appendChild(iconCanvas('bonbon', 22));
    pr.appendChild(el('span', undefined, String(preis)));
    karte.appendChild(pr);
    if (state.get().candy < preis) karte.disabled = true;
    tap(karte, () => {
      if (!state.ausbauen(currentIsland, preis)) { toast(t('shop.tooExpensive')); return; }
      sheet.remove();
      erdbeben();
    });
  } else {
    karte.disabled = true;
  }
  inselGrid.appendChild(karte);
  wrap.appendChild(inselGrid);

  sheet.appendChild(wrap);
  sheet.appendChild(button(t('shop.close'), () => sheet.remove()));
  ui.appendChild(sheet);
}

/** A little picture of an island growing: the coast, and a ring outside it. */
function inselBild(): HTMLCanvasElement {
  const c = el('canvas');
  const S = 3;
  c.width = 22 * S;
  c.height = 22 * S;
  c.style.width = `${22 * S}px`;
  c.style.height = `${22 * S}px`;
  const cc = c.getContext('2d', { willReadFrequently: true })!;
  cc.imageSmoothingEnabled = false;
  cc.scale(S, S);
  cc.fillStyle = shade(P.sea, 2);
  cc.fillRect(0, 0, 22, 22);
  // The island it will become, dashed, and the one it is, solid.
  cc.fillStyle = shade(P.sand, 3);
  cc.beginPath();
  cc.moveTo(11, 1); cc.lineTo(21, 11); cc.lineTo(11, 21); cc.lineTo(1, 11);
  cc.closePath(); cc.fill();
  cc.fillStyle = shade(P.grass, 2);
  cc.beginPath();
  cc.moveTo(11, 5); cc.lineTo(17, 11); cc.lineTo(11, 17); cc.lineTo(5, 11);
  cc.closePath(); cc.fill();
  cc.fillStyle = shade(P.glow, 3);
  for (const [x, y] of [[11, 2], [19, 11], [11, 19], [3, 11]]) cc.fillRect(x - 1, y - 1, 2, 2);
  return c;
}

/**
 * The island grows, and the ground says so.
 *
 * Patrick asked for "schönem juice wie Erdbeben", and an earthquake is
 * the right shape for this: it is the only moment in the app where the
 * WORLD changes rather than something being added to it, and the only
 * one that has earned two and a half seconds of a child's attention.
 *
 * Three things at once and none of them is a dialog: the screen shakes
 * hard and settles, dust comes up off the whole coast, and the new land
 * is simply there when it stops. Luma says what happened afterwards,
 * because a child who has just felt the ground move does not want to
 * read.
 */
function erdbeben(): void {
  building = false;
  holding = null;
  uebersicht = false;
  schwung = { x: 0, y: 0 };

  audio.beben();
  fx.shake(11, 2.2);

  // Dust off the coast, in waves, all the way round. Thrown from the
  // OLD coastline, so the new ring appears out of it.
  const alt = render.landBox(currentIsland);
  const wolke = (): void => {
    for (let i = 0; i < 7; i++) {
      const t = Math.random() * Math.PI * 2;
      const sx = ((alt.minX + alt.maxX) / 2 + Math.cos(t) * (alt.maxX - alt.minX) / 2 + view.ox)
        * view.scale;
      const sy = ((alt.minY + alt.maxY) / 2 + Math.sin(t) * (alt.maxY - alt.minY) / 2 + view.oy)
        * view.scale;
      fx.burst('staub', sx, sy, { n: 5, speed: 120, up: 0.5, gravity: 90, life: 1.1 });
    }
  };
  const takt = window.setInterval(wolke, 180);
  wolke();

  // Halfway through, the land actually appears. Not at the start — the
  // shake has to be a warning first, or the new coast simply blinks in.
  window.setTimeout(() => {
    vergissLand(currentIsland);
    render.vergissWald(currentIsland);
    cam = render.mitte(currentIsland, state.get().stars);
    blickSetzen();
    audio.sparkle(6);
    drawIslandUi();
  }, 1100);

  window.setTimeout(() => {
    window.clearInterval(takt);
    luma.zeige('say.beben');
  }, 2400);
}

const thumbCache = new Map<string, string>();
function decoThumb(art: string): HTMLCanvasElement {
  const c = el('canvas');
  const s = spriteFor(art);
  const scale = 2;
  c.width = s.px.w * scale;
  c.height = s.px.h * scale;
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(s.px.toCanvas(), 0, 0, c.width, c.height);
  void thumbCache;
  return c;
}

function spriteFor(art: string): S.Sprite {
  switch (art) {
    case 'pear': return S.pearTree(4);
    case 'plum': return S.plumTree(6);
    case 'berry': return D.berryBush(3);
    case 'hedge': return D.hedge(2);
    case 'sunflowers': return D.sunflowers(5);
    case 'pumpkins': return D.pumpkins(7);
    case 'mushrooms': return D.mushrooms(9);
    case 'beehive': return D.beehive();
    case 'birdbox': return D.birdBox();
    case 'campfire': return D.campfire();
    case 'windmill': return D.windmill(2);
    case 'cherry': return S.cherryTree(7);
    case 'apple': return S.appleTree(11);
    case 'pine': return S.pineTree(3);
    case 'flowers': return S.flowers(5);
    case 'veg': return S.vegPatch(9);
    case 'fence': return S.fence();
    case 'pond': return S.pond(13);
    case 'sheep': return S.sheep(2);
    case 'hen': return S.hen(4);
    case 'duck': return S.duck(6);
    case 'cat': return S.cat(8);
    case 'fox': return S.fox(10);
    case 'lamp': return S.lamp();
    case 'bench': return S.bench();
    case 'well': return S.well();
    case 'lighthouse': return S.lighthouse();
    default: return S.flowers(1);
  }
}

// ---------------------------------------------------------- the round

interface RoundState {
  house: HouseDef;
  qs: Question[];
  i: number;
  right: number;
  /** Locked while an answer animates, so a double tap cannot answer twice. */
  busy: boolean;
}

let round: RoundState | null = null;
/** The writing surface, while a writing house is open. */
let tracer: Tracer | null = null;

function startRound(house: HouseDef): void {
  screen = 'round';
  round = {
    house,
    qs: buildRound(house.game, rundenLaenge(house.game)),
    i: 0, right: 0, busy: false,
  };
  greetHouse(house);
  // The words a language round will need, fetched while the greeting
  // plays, so the first one does not arrive late.
  if (house.game === 'anlaute' || house.game === 'silben') {
    audio.preload(WOERTER.slice(0, 12).map((w) => `wort-${stem(w.wort)}`));
  }
  drawQuestion();
}

function drawQuestion(): void {
  if (!round) return;
  stopSequence();
  tracer?.destroy();
  tracer = null;
  clear();
  const q = round.qs[round.i];
  const wrap = el('div', 'round');

  const top = el('div', 'top');
  top.appendChild(button(t('round.leave'), () => {
    round = null;
    tracer?.destroy();
    tracer = null;
    screen = 'island';
    drawIslandUi();
  }));
  const pips = el('div', 'pips');
  for (let i = 0; i < round.qs.length; i++) {
    // The pip that was just filled pops once, so progress is felt and
    // not merely displayed.
    const justDone = i === round.i - 1;
    pips.appendChild(el('div',
      `pip ${i < round.i ? 'done' : i === round.i ? 'now' : ''}${justDone ? ' just' : ''}`));
  }
  top.appendChild(pips);
  top.appendChild(purse());
  wrap.appendChild(top);

  const stageQ = el('div', 'stage-q');
  stageQ.appendChild(promptView(q.prompt, q));
  wrap.appendChild(stageQ);

  // The answer cards are sized for a single digit or letter. A whole
  // word needs a wider card and a much smaller face, or "Pflaumenbaum"
  // runs off both ends of it.
  const shapey = q.choices.some((c) => c.startsWith('form:'));
  const wordy = !shapey && q.choices.some((c) => c.length > 2);
  const answers = el('div',
    `answers${shapey ? ' shapes' : wordy ? ' words' : ''}`);

  // A writing question has no cards at all — the answer is the tracing.
  // What it gets instead is a way to hear the word again and a way to
  // be shown, which are the two things a stuck six-year-old needs.
  if (q.prompt.kind === 'schreiben') {
    const p = q.prompt;
    const hoeren = button('▶', () => {
      const w = p.teile ? p.text : p.text;
      audio.say(`schreib-${w.toLowerCase()}`, w);
    }, 'speak');
    answers.appendChild(hoeren);
    answers.appendChild(button(t('round.show'), () => {
      tracer?.zeigen();
      sayLine('say.zeigen');
    }));
    setTimeout(() => audio.say(`schreib-${p.text.toLowerCase()}`, p.text), 300);
  }

  q.choices.forEach((label, idx) => {
    const b = el('button');
    if (label.startsWith('form:')) {
      // The card IS the shape. Nothing is written on it, which is the
      // whole point of this island.
      b.appendChild(formCanvas(label.slice(5) as Form, shapeScale()));
      b.setAttribute('aria-label', label.slice(5));
    } else if (label.startsWith('wuerfel:')) {
      b.appendChild(wuerfelCanvas(Number(label.slice(8)), Math.max(2, shapeScale() - 1)));
      b.setAttribute('aria-label', label.slice(8));
    } else if (label.startsWith('pfeil:')) {
      b.appendChild(pfeilCanvas(label.slice(6) === 'rechts', Math.max(2, shapeScale())));
      b.setAttribute('aria-label', label.slice(6));
    } else {
      b.textContent = label;
    }
    tap(b, () => onAnswer(idx, b, stageQ, answers));
    answers.appendChild(b);
  });
  wrap.appendChild(answers);

  ui.appendChild(wrap);
}

/** How a prompt is drawn. Nothing here is a sentence the child must read. */
function promptView(p: Prompt, q: Question): HTMLElement {
  const box = el('div', 'stage-q');
  switch (p.kind) {
    case 'tenframe': {
      if (p.n >= 0) {
        const f = el('div', 'tenframe');
        f.appendChild(tenFrameCanvas({ n: p.n, shape: counterShape() }, frameScale()));
        box.appendChild(f);
      }
      if (p.numeral) {
        const n = p.n >= 0 ? p.n : Number(q.fact.slice(3));
        box.appendChild(el('div', 'numeral', String(n)));
      }
      break;
    }
    case 'reihe': {
      const row = el('div', 'reihe');
      for (const v of p.seq) {
        row.appendChild(el('span', v === null ? 'gap' : undefined, v === null ? '?' : String(v)));
      }
      box.appendChild(row);
      break;
    }
    case 'rechnung': {
      const r = el('div', 'rechnung');
      r.append(
        el('span', undefined, String(p.a)),
        el('span', undefined, p.op),
        el('span', undefined, String(p.b)),
        el('span', undefined, '='),
        el('span', undefined, '?'),
      );
      box.appendChild(r);
      const f = el('div', 'tenframe');
      f.appendChild(tenFrameCanvas(
        p.op === '+' ? { n: p.a, extra: 0 } : { n: p.a },
        Math.max(2, frameScale() - 1)));
      box.appendChild(f);
      break;
    }
    case 'doppel': {
      const r = el('div', 'rechnung');
      r.append(
        el('span', undefined, String(p.n)),
        el('span', undefined, '+'),
        el('span', undefined, String(p.n)),
        el('span', undefined, '='),
        el('span', undefined, '?'),
      );
      box.appendChild(r);
      break;
    }
    case 'form': {
      // Nothing is drawn for the question: it is spoken, and the
      // replay button is the only thing on screen. A child who did not
      // catch it taps the speaker; a child who did looks at the cards.
      const key = `say.form${p.frage[0].toUpperCase()}${p.frage.slice(1)}`;
      const speak = el('button', 'speak', '▶');
      tap(speak, () => sayLine(key));
      box.appendChild(speak);
      setTimeout(() => sayLine(key), 240);
      break;
    }
    case 'muster': {
      const row = el('div', 'muster');
      for (const f of p.reihe) {
        const cell = el('div', 'zelle');
        cell.appendChild(formCanvas(f as Form, Math.max(2, shapeScale() - 1)));
        row.appendChild(cell);
      }
      // The gap at the end, drawn as an empty frame so the question is
      // "what goes HERE" rather than "what comes after".
      const gap = el('div', 'zelle luecke');
      gap.textContent = '?';
      row.appendChild(gap);
      box.appendChild(row);
      break;
    }
    case 'stange': {
      // The bar, and under it the two boxes the worksheet has: the part
      // that is coloured, and an empty one. The empty box is the
      // question, and it is a picture of the question rather than a
      // sentence about it.
      const bar = el('div', 'stange');
      // How long the bar is, written down. The suite has to know what
      // the picture says in order to check that the cards agree with it,
      // and counting cubes out of a canvas is not a test, it is a second
      // implementation with its own bugs.
      bar.dataset.ganz = String(p.ganz);
      bar.dataset.teil = String(p.teil);
      bar.appendChild(stangeCanvas(p.ganz, p.teil, barScale(p.ganz), p.gefuellt));
      box.appendChild(bar);
      const teile = el('div', 'teile');
      const a = el('div', 'teil rot', String(p.teil));
      const b = el('div', `teil blau${p.gefuellt ? '' : ' luecke'}`,
        p.gefuellt ? String(p.ganz - p.teil) : '?');
      teile.append(a, b);
      box.appendChild(teile);
      break;
    }
    case 'zahlenhaus': {
      const haus = el('div', 'zahlenhaus');
      const dach = el('div', 'dach');
      dach.appendChild(iconCanvas('stern', 0));   // replaced below
      dach.replaceChildren(el('span', undefined, String(p.dach)));
      haus.appendChild(dach);
      const koerper = el('div', 'stockwerke');
      for (const [links, rechts] of p.zeilen) {
        const zeile = el('div', 'stockwerk');
        zeile.appendChild(el('span', undefined, String(links)));
        zeile.appendChild(el('span', rechts === null ? 'luecke' : undefined,
          rechts === null ? '?' : String(rechts)));
        koerper.appendChild(zeile);
      }
      haus.appendChild(koerper);
      box.appendChild(haus);
      break;
    }
    case 'wuerfel': {
      box.appendChild(wuerfelCanvas(p.augen, Math.max(6, shapeScale() + 3)));
      break;
    }
    case 'wuerfelpaar': {
      // A numeral, and the empty die that wants it. The child is being
      // asked to go the other way: from the number to the shape.
      box.appendChild(el('div', 'numeral', String(p.ganz)));
      break;
    }
    case 'richtung': {
      const v = el('div', 'fahrzeug');
      v.appendChild(fahrzeugCanvas(p.art as Fahrzeug, p.rechts, Math.max(6, shapeScale() + 3)));
      box.appendChild(v);
      // Spoken, and only spoken: this house is about a word the child
      // cannot read, so the word is never on the screen.
      const speak = el('button', 'speak', '\u25B6');
      tap(speak, () => sayLine('say.wohin'));
      box.appendChild(speak);
      setTimeout(() => sayLine('say.wohin'), 240);
      break;
    }
    case 'schreiben': {
      // The word, split at the join, so the child SEES the two
      // syllables that are about to become one word.
      const kopf = el('div', 'schreib-wort');
      if (p.teile) {
        kopf.appendChild(el('span', 'silbe', p.teile[0]));
        kopf.appendChild(el('span', 'trenner', '·'));
        kopf.appendChild(el('span', 'silbe', p.teile[1]));
      } else {
        kopf.appendChild(el('span', 'silbe', p.text));
      }
      box.appendChild(kopf);

      // Sized to what is left of the screen once the header and the
      // buttons have had theirs.
      const bw = Math.min(window.innerWidth - 40, 980);
      const bh = Math.min(window.innerHeight * 0.46, 340);
      const t = makeTracer({
        text: p.text,
        w: bw,
        h: bh,
        onZug: () => audio.pop(),
        onGlyph: (gi) => {
          audio.ping(gi);
          const r = t.el.getBoundingClientRect();
          fx.burst('funke', r.left + r.width / 2, r.top + r.height / 2,
            { n: 7, speed: 130, up: 0.6, life: 0.6 });
        },
        onFertig: () => {
          // Writing has no wrong answer to give, so finishing IS the
          // right answer. The round moves on by itself.
          window.setTimeout(() => onSchreibFertig(), 420);
        },
      });
      tracer = t;
      box.appendChild(t.el);
      break;
    }
    case 'wort': {
      // The picture and the spoken word are two channels for the same
      // thing, and both are here on purpose: the sound can be off, and
      // a child who is not sure what the drawing is can tap to hear it.
      const bild = hasBild(p.wort) ? bildCanvas(p.wort, bildScale()) : null;
      if (bild) {
        const holder = el('div', 'bild');
        holder.appendChild(bild);
        box.appendChild(holder);
      }
      // In the rhyme house the answers are read out too, because they
      // are written and the child is not yet.
      const alsoRead = round !== null && round.house.game === 'reime';
      const line = alsoRead ? [p.wort, ...q.choices] : [p.wort];

      const speak = el('button', 'speak', '▶');
      tap(speak, () => saySequence(line, 0));
      box.appendChild(speak);
      if (p.zeige) box.appendChild(el('div', 'wort', p.wort));
      // Say it on arrival: the word IS the question.
      saySequence(line);
      break;
    }
  }
  return box;
}

/**
 * Hearts in the Haus der verliebten Zahlen, beads everywhere else.
 *
 * Two numbers that make ten are "verliebt" — in love — and that is the
 * whole idea the house is named after. A heart in a plain addition
 * frame would be decoration; here it IS the lesson, and a six-year-old
 * reads it without being told.
 */
function counterShape(): 'perle' | 'herz' {
  return round && round.house.game === 'verliebte-zahlen' ? 'herz' : 'perle';
}

/** A shape is 34px at 1x and should nearly fill its card. */
/**
 * How big a Steckwuerfelstange may be drawn.
 *
 * A bar of ten is ten times as wide as a bar of one, and the scale that
 * fits a five runs a ten off both sides of an iPad. Worked out from the
 * viewport rather than fixed, and capped, because a bar of four at 6x is
 * a wall of bricks.
 */
function barScale(ganz: number): number {
  const platz = Math.min(window.innerWidth * 0.86, 900);
  return Math.max(2, Math.min(5, Math.floor(platz / (ganz * 16 + 2))));
}

function shapeScale(): number {
  return Math.max(2, Math.min(6, Math.floor((window.innerHeight * 0.13) / 34)));
}

/** The word picture is 40px at 1x, and wants about a fifth of the screen. */
function bildScale(): number {
  return Math.max(2, Math.min(8, Math.floor((window.innerHeight * 0.34) / 40)));
}

function frameScale(): number {
  // The ten-frame is 67px wide at 1x. On an iPad it should be about a
  // third of the screen width, and it must be an INTEGER scale.
  const w = window.innerWidth;
  return Math.max(2, Math.min(8, Math.floor((w * 0.42) / 67)));
}

/**
 * A written word is finished.
 *
 * Writing has no wrong answer to give: the child either completed the
 * strokes or is still going. So there is no branch here, only the
 * reward — which is also why the writing houses can never end a round
 * with fewer stars than questions.
 */
function onSchreibFertig(): void {
  if (!round || round.busy) return;
  const q = round.qs[round.i];
  round.busy = true;
  round.right++;
  state.recordFact(q.fact, true);
  audio.chimeRight();
  audio.sparkle(4);
  if (tracer) {
    const r = tracer.el.getBoundingClientRect();
    fx.burst('stern', r.left + r.width / 2, r.top + r.height / 2,
      { n: 16, speed: 190, up: 0.7, life: 0.9 });
  }
  window.setTimeout(() => {
    if (!round) return;
    round.i++;
    round.busy = false;
    if (round.i >= round.qs.length) finishRound();
    else drawQuestion();
  }, 900);
}

function onAnswer(idx: number, btn: HTMLButtonElement, stageQ: HTMLElement, answers: HTMLElement): void {
  if (!round || round.busy) return;
  const q = round.qs[round.i];
  const right = idx === q.correct;
  round.busy = true;

  state.recordFact(q.fact, right);

  if (right) {
    round.right++;
    btn.classList.add('right');
    audio.chimeRight();
    audio.pop();
    // The burst comes off the CARD the child touched, not off the
    // middle of the screen, so the reaction belongs to the tap.
    const c = centreOf(btn);
    fx.burst(round.house.game === 'verliebte-zahlen' ? 'herz' : 'stern',
      c.x, c.y, { n: 12, speed: 200, up: 0.7, life: 0.85 });
    // The frame completes itself, which is the reward: the picture of
    // the fact the child has just recalled.
    if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
      const f = stageQ.querySelector('.tenframe');
      if (f) f.replaceChildren(
        tenFrameCanvas({ n: q.prompt.n, extra: 10 - q.prompt.n, shape: counterShape() }, frameScale()));
    }
    setTimeout(() => {
      if (!round) return;
      round.i++;
      round.busy = false;
      if (round.i >= round.qs.length) finishRound();
      else drawQuestion();
    }, 820);
    return;
  }

  // A miss. Nothing is taken away, nothing turns red, no buzzer. The
  // card goes back where it came from and the CORRECTION IS A PICTURE:
  // the ten-frame filling in with the partner that was actually needed.
  btn.classList.add('miss');
  audio.chimeSoft();
  const chosen = Number(btn.textContent);
  if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0 && Number.isFinite(chosen)) {
    const f = stageQ.querySelector('.tenframe');
    if (f) f.replaceChildren(
      tenFrameCanvas({ n: q.prompt.n, extra: Math.min(chosen, 10 - q.prompt.n), shape: counterShape() }, frameScale()));
  }
  setTimeout(() => {
    if (!round) return;
    btn.classList.remove('miss');
    // Show the right answer, calmly, then move on. The child never
    // reaches a screen that says they did badly.
    const good = answers.children[q.correct] as HTMLButtonElement | undefined;
    if (good) good.classList.add('right');
    if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
      const f = stageQ.querySelector('.tenframe');
      if (f) f.replaceChildren(
        tenFrameCanvas({ n: q.prompt.n, extra: 10 - q.prompt.n, shape: counterShape() }, frameScale()));
    }
    sayOneOf(['say.tryAgain1', 'say.tryAgain2', 'say.tryAgain3']);
    setTimeout(() => {
      if (!round) return;
      round.i++;
      round.busy = false;
      if (round.i >= round.qs.length) finishRound();
      else drawQuestion();
    }, 1400);
  }, 700);
}

function finishRound(): void {
  if (!round) return;
  const before = state.get().stars;
  const paareVorher = state.bekanntePaare();
  const stars = round.right;
  const perfect = round.right === round.qs.length;
  const candy = round.right + (perfect ? 5 : 2);
  state.addStars(stars);
  state.addCandy(candy);
  state.recordRound(round.house.id);
  const after = state.get().stars;

  // Did a PAIR come good? Both directions at full strength is the whole
  // definition, so this is the moment two numbers become friends — and
  // it is worth more of a fuss than a house, because it is the thing
  // the app is actually for.
  const neuePaare = state.bekanntePaare().filter((n) => !paareVorher.includes(n));

  // Did a house arrive? Announce it exactly once, and let the island
  // itself do the announcing rather than a dialog.
  const arrived = unlockedHouses(round.house.island, after)
    .filter((h) => h.stars > before && h.stars <= after && !state.hasSeen(h.id));

  audio.chimeRound();
  sayOneOf(['say.wellDone1', 'say.wellDone2', 'say.wellDone3']);

  tracer?.destroy();
  tracer = null;
  clear();
  fx.clear();
  fx.rain(window.innerWidth, perfect ? 46 : 26);

  const sheet = el('div', 'sheet');
  sheet.appendChild(el('h2', undefined, t('round.done')));

  // The purse starts on what the child had BEFORE the round, and the
  // stars fly into it one by one. Showing the new total straight away
  // and a "+7" beside it is a receipt; watching seven stars arrive is
  // the reward actually happening, and it is the difference between
  // being told you did well and seeing it.
  const purseRow = el('div', 'purse big');
  const starCoin = el('div', 'coin star');
  const starNum = el('span', undefined, String(before));
  starCoin.append(iconCanvas('stern', 40), starNum);
  const candyCoin = el('div', 'coin candy');
  const candyNum = el('span', undefined, String(state.get().candy - candy));
  candyCoin.append(iconCanvas('bonbon', 40), candyNum);
  purseRow.append(starCoin, candyCoin);
  sheet.appendChild(purseRow);

  const reward = el('div', 'reward');
  const s1 = el('div', 'coin star');
  s1.append(iconCanvas('stern', 34), el('span', undefined, `+${stars}`));
  const s2 = el('div', 'coin candy');
  s2.append(iconCanvas('bonbon', 34), el('span', undefined, `+${candy}`));
  reward.append(s1, s2);
  sheet.appendChild(reward);

  // Did the boat bring anything? This is the growing shop happening
  // where the child can see it: the actual pictures of the actual new
  // things, on the sheet where the reward already is.
  //
  // It is a delivery and not an unlock, and the difference is the whole
  // design. Nothing was ever locked, so nothing has been opened; there
  // was no condition, so none has been met. Things have simply turned
  // up, the way things turn up on an island, and the shop is bigger
  // than it was this morning.
  const geliefert = neuAb(before, after);
  if (geliefert.length) {
    const box = el('div', 'lieferung');
    box.appendChild(el('div', 'lieferung-text', t('shop.geliefert')));
    const reihe = el('div', 'lieferung-reihe');
    // Five at most. A row of nine thumbnails is an inventory screen.
    for (const d of geliefert.slice(0, 5)) reihe.appendChild(decoThumb(d.art));
    box.appendChild(reihe);
    sheet.appendChild(box);
  }

  const house = round.house;
  const row = el('div');
  row.appendChild(button(t('round.again'), () => startRound(house)));
  row.appendChild(button(t('round.toIsland'), () => {
    round = null;
    screen = 'island';
    if (neuePaare.length) {
      // Announced before the house, because it is the better news.
      const n = neuePaare[0];
      toast(t('island.newFriend', { a: n, b: 10 - n }));
      setTimeout(() => {
        audio.sparkle(6);
        fx.burst('herz', window.innerWidth / 2, window.innerHeight / 2,
          { n: 18, speed: 190, up: 0.8, life: 1.1 });
        if (!arrived.length) luma.zeige('say.newFriend');
      }, 320);
    }
    if (arrived.length) {
      arriving = arrived[0].id;
      arrivingUntil = performance.now() + 2400;
      for (const h of arrived) state.markSeen(h.id);
      // Look at it. On an island that fits the screen this did nothing;
      // on one that is bigger than the screen, a house can arrive in a
      // corner the child is not looking at, and the biggest thing that
      // happens in this app happens off-camera.
      uebersicht = false;
      schwung = { x: 0, y: 0 };
      cam = {
        x: (arrived[0].x - arrived[0].y) * 16,
        y: (arrived[0].x + arrived[0].y) * 8,
      };
      blickSetzen();
      drawIslandUi();
      toast(t('island.newHouse'));
      // A house arriving is the biggest thing that happens in this app,
      // so it gets the biggest reaction it is allowed: dust, sparks, a
      // real thunk and six pixels of kick.
      const h0 = arrived[0];
      const hp = render.tileToScreen(view, h0.x, h0.y);
      const hx = hp.sx * view.scale;
      const hy = (hp.sy - render.LIFT) * view.scale;
      setTimeout(() => {
        audio.land();
        fx.shake(6, 0.4);
        fx.burst('staub', hx, hy, { n: 20, speed: 150, up: 0.15, gravity: 160, life: 0.7 });
        fx.burst('funke', hx, hy - 40, { n: 14, speed: 130, up: 0.8, life: 0.9 });
        audio.sparkle(5);
        luma.zeige('say.newHouse');
      }, 260);
    } else {
      drawIslandUi();
    }
  }));
  sheet.appendChild(row);
  ui.appendChild(sheet);
  round = null;

  // Now that the sheet is in the document it has a position, so the
  // flight can be aimed. Capped at eight of each: ten stars flying one
  // after another is a queue, and a child waits for it rather than
  // enjoying it.
  requestAnimationFrame(() => {
    flyReward('stern', s1, starCoin, starNum, stars, before, 0.28);
    flyReward('funke', s2, candyCoin, candyNum, candy,
      state.get().candy - candy, 0.55);
  });
}

/**
 * Fly a reward into its counter, and count the counter up as they land.
 *
 * The number does not simply become the new total: each arrival adds
 * its share, so the digits climb in step with the things hitting them.
 */
function flyReward(
  kind: 'stern' | 'funke',
  from: Element, to: Element, num: HTMLElement,
  amount: number, start: number, delay: number,
): void {
  if (amount <= 0) { num.textContent = String(start); return; }
  const shots = Math.min(8, amount);
  const a = centreOf(from);
  const b = centreOf(to);
  let landed = 0;
  for (let i = 0; i < shots; i++) {
    fx.fly(kind, a, b, delay + i * 0.09, () => {
      landed++;
      // Share the amount out over the shots, and make the last one
      // land on the exact total so the arithmetic is never visibly
      // wrong by a rounding error.
      const shown = landed >= shots
        ? start + amount
        : start + Math.round((amount * landed) / shots);
      num.textContent = String(shown);
      audio.ping(i);
      fx.burst(kind, b.x, b.y, { n: 4, speed: 90, up: 0.3, life: 0.4 });
      to.classList.remove('bump');
      void (to as HTMLElement).offsetWidth;
      to.classList.add('bump');
    });
  }
}

// ------------------------------------------------------------- startup

// `?zeit=nacht` pins the time of day. For the screenshot harness, and
// for anybody who wants to see the island at midnight at four in the
// afternoon.
{
  const z = new URLSearchParams(location.search).get('zeit');
  if (z === 'morgen' || z === 'tag' || z === 'abend' || z === 'nacht') {
    render.forceTime(z);
  }
}

state.init();
resize();
requestAnimationFrame(frame);
showPicker();

// Offline is a feature, not a nicety: tablets are used in cars and on
// trains. Registration is deliberately late and deliberately silent —
// a failure here must never stop the app from starting.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* silent */ });
  });
}
