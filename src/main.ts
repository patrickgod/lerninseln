// LernInseln — the whole app.
//
// Three screens and no framework: the island picker, an island, and a
// round of tasks. Canvas draws the world, the DOM draws the buttons —
// the same split Tidegarden uses, for the same reason: the DOM is
// better at buttons and canvas is better at pixels.
//
// The order of things in here follows the order a child meets them.

import { t } from './core/i18n.js';
import * as state from './core/state.js';
import * as audio from './core/audio.js';
import { tenFrameCanvas } from './core/tenframe.js';
import {
  ISLANDS, GRID, island, unlockedHouses, nextHouse, buildable,
  type IslandDef, type HouseDef,
} from './islands/islands.js';
import * as render from './islands/render.js';
import { DECOR, deco } from './islands/decor.js';
import * as S from './islands/sprites.js';
import { buildRound } from './games/games.js';
import type { Question, Prompt } from './games/types.js';
import { WOERTER, stem } from './games/woerter.js';

const QUESTIONS_PER_ROUND = 10;

const stage = document.getElementById('stage') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const ctx = stage.getContext('2d', { willReadFrequently: true })!;

type Screen = 'picker' | 'island' | 'round';

let screen: Screen = 'picker';
let currentIsland = 'mathe';
let building = false;
let holding: string | null = null;         // decoration id waiting for a tile
let hover: { x: number; y: number } | null = null;
let arriving: string | null = null;
let arrivingUntil = 0;
let houseHits: render.HouseHit[] = [];
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
  view = render.fit(w, h, currentIsland);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

// --------------------------------------------------------- the frame

let last = 0;
function frame(now: number): void {
  if (!started) started = now;
  const time = (now - started) / 1000;
  // A tab that has been asleep hands back an enormous delta and every
  // animation lurches. Nothing here integrates, but the clamp is here
  // so that the moment something does, it is already correct.
  last = Math.min(last + 0.1, time);

  if (screen === 'island') {
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
    if (arriving && now >= arrivingUntil) arriving = null;
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------- helpers

function clear(): void {
  ui.replaceChildren();
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
  star.appendChild(el('i'));
  star.appendChild(el('span', undefined, String(s.stars)));
  const candy = el('div', 'coin candy');
  candy.appendChild(el('i'));
  candy.appendChild(el('span', undefined, String(s.candy)));
  wrap.append(star, candy);
  return wrap;
}

// --------------------------------------------------------- the picker

function showPicker(): void {
  screen = 'picker';
  clear();
  const wrap = el('div', 'picker');
  wrap.appendChild(el('h1', undefined, t('islands.title')));

  const cards = el('div', 'cards');
  for (const def of ISLANDS) {
    const card = el('button', 'island-card');
    card.appendChild(islandThumb(def, 200, 120));
    card.appendChild(el('div', 'name', t(def.nameKey)));
    card.appendChild(el('div', 'sub', t(def.subKey)));
    tap(card, () => {
      audio.click();
      openIsland(def.id);
    });
    cards.appendChild(card);
  }
  wrap.appendChild(cards);
  ui.appendChild(wrap);

  // The one line a child who cannot read needs.
  sayLine('say.pickIsland');
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
  const v = render.fit(w, h, def.id);
  render.draw(cx, v, w, h, {
    islandId: def.id, time: 0, building: false, hover: null, arriving: null,
  });
  return c;
}

// --------------------------------------------------------- the island

function openIsland(id: string): void {
  currentIsland = id;
  screen = 'island';
  building = false;
  holding = null;
  resize();
  drawIslandUi();
  sayLine(island(id).sayKey);
}

function drawIslandUi(): void {
  clear();
  const hud = el('div', 'hud');
  hud.appendChild(button(t('island.back'), () => showPicker()));
  hud.appendChild(el('div', 'spacer'));
  hud.appendChild(purse());
  ui.appendChild(hud);

  const bar = el('div', 'hud');
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
      sayLine('say.build');
    }));
  }
  ui.appendChild(bar);

  if (building) {
    const hint = el('div', 'hint',
      holding ? t('shop.placeIt') : t('island.build'));
    ui.appendChild(hint);
  } else {
    const next = nextHouse(currentIsland, state.get().stars);
    if (next) {
      const need = next.stars - state.get().stars;
      ui.appendChild(el('div', 'hint', t('island.needStars', { n: need })));
    }
  }
}

// Taps on the world. The canvas is under the UI layer, which does not
// catch pointer events except on its actual buttons, so this sees every
// tap that was not a button.
stage.addEventListener('pointerdown', (ev) => {
  if (screen !== 'island') return;
  audio.unlock();
  const r = stage.getBoundingClientRect();
  const px = ev.clientX - r.left;
  const py = ev.clientY - r.top;

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
  if (hit) startRound(hit.house);
});

stage.addEventListener('pointermove', (ev) => {
  if (screen !== 'island' || !building) return;
  const r = stage.getBoundingClientRect();
  hover = render.screenToTile(view, ev.clientX - r.left, ev.clientY - r.top);
});

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
    audio.click();
    drawIslandUi();
    return;
  }

  if (!holding) return;
  if (!buildable(currentIsland, x, y, state.get().stars)) return;
  if (state.occupied(currentIsland, x, y)) return;

  const d = deco(holding);
  if (!d) return;
  if (!state.spendCandy(d.price)) {
    toast(t('shop.tooExpensive'));
    return;
  }
  state.place({ d: d.id, i: currentIsland, x, y });
  audio.thunk();
  holding = null;
  drawIslandUi();
}

// ----------------------------------------------------------- the shop

function showShop(): void {
  const sheet = el('div', 'sheet');
  sheet.appendChild(el('h2', undefined, t('shop.title')));
  sheet.appendChild(purse());

  const grid = el('div', 'shop-grid');
  for (const d of DECOR) {
    const item = el('button', 'shop-item');
    item.appendChild(decoThumb(d.art));
    item.appendChild(el('div', 'label', t(d.nameKey)));
    const price = el('div', 'price');
    price.appendChild(el('i'));
    price.appendChild(el('span', undefined, String(d.price)));
    item.appendChild(price);
    if (state.get().candy < d.price) item.disabled = true;
    tap(item, () => {
      if (state.get().candy < d.price) { toast(t('shop.tooExpensive')); return; }
      audio.click();
      holding = d.id;
      sheet.remove();
      building = true;
      drawIslandUi();
    });
    grid.appendChild(item);
  }
  sheet.appendChild(grid);
  sheet.appendChild(button(t('shop.close'), () => sheet.remove()));
  ui.appendChild(sheet);
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

function startRound(house: HouseDef): void {
  screen = 'round';
  round = { house, qs: buildRound(house.game, QUESTIONS_PER_ROUND), i: 0, right: 0, busy: false };
  sayLine(house.sayKey);
  // The words a language round will need, fetched while the greeting
  // plays, so the first one does not arrive late.
  if (house.game === 'anlaute' || house.game === 'silben') {
    audio.preload(WOERTER.slice(0, 12).map((w) => `wort-${stem(w.wort)}`));
  }
  drawQuestion();
}

function drawQuestion(): void {
  if (!round) return;
  clear();
  const q = round.qs[round.i];
  const wrap = el('div', 'round');

  const top = el('div', 'top');
  top.appendChild(button(t('round.leave'), () => {
    round = null;
    screen = 'island';
    drawIslandUi();
  }));
  const pips = el('div', 'pips');
  for (let i = 0; i < round.qs.length; i++) {
    pips.appendChild(el('div', `pip ${i < round.i ? 'done' : i === round.i ? 'now' : ''}`));
  }
  top.appendChild(pips);
  top.appendChild(purse());
  wrap.appendChild(top);

  const stageQ = el('div', 'stage-q');
  stageQ.appendChild(promptView(q.prompt, q));
  wrap.appendChild(stageQ);

  const answers = el('div', 'answers');
  q.choices.forEach((label, idx) => {
    const b = el('button', undefined, label);
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
        f.appendChild(tenFrameCanvas({ n: p.n }, frameScale()));
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
    case 'wort': {
      const speak = el('button', 'speak', '▶');
      tap(speak, () => audio.say(`wort-${stem(p.wort)}`, p.wort));
      box.appendChild(speak);
      if (p.zeige) box.appendChild(el('div', 'wort', p.wort));
      // Say it once on arrival: the word IS the question.
      setTimeout(() => audio.say(`wort-${stem(p.wort)}`, p.wort), 260);
      break;
    }
  }
  return box;
}

function frameScale(): number {
  // The ten-frame is 67px wide at 1x. On an iPad it should be about a
  // third of the screen width, and it must be an INTEGER scale.
  const w = window.innerWidth;
  return Math.max(2, Math.min(8, Math.floor((w * 0.42) / 67)));
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
    // The frame completes itself, which is the reward: the picture of
    // the fact the child has just recalled.
    if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
      const f = stageQ.querySelector('.tenframe');
      if (f) f.replaceChildren(
        tenFrameCanvas({ n: q.prompt.n, extra: 10 - q.prompt.n }, frameScale()));
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
      tenFrameCanvas({ n: q.prompt.n, extra: Math.min(chosen, 10 - q.prompt.n) }, frameScale()));
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
        tenFrameCanvas({ n: q.prompt.n, extra: 10 - q.prompt.n }, frameScale()));
    }
    sayLine('say.tryAgain');
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
  const stars = round.right;
  const perfect = round.right === round.qs.length;
  const candy = round.right + (perfect ? 5 : 2);
  state.addStars(stars);
  state.addCandy(candy);
  const after = state.get().stars;

  // Did a house arrive? Announce it exactly once, and let the island
  // itself do the announcing rather than a dialog.
  const arrived = unlockedHouses(round.house.island, after)
    .filter((h) => h.stars > before && h.stars <= after && !state.hasSeen(h.id));

  audio.chimeRound();
  sayLine('say.wellDone');

  clear();
  const sheet = el('div', 'sheet');
  sheet.appendChild(el('h2', undefined, t('round.done')));
  const reward = el('div', 'reward');
  const s1 = el('div', 'coin star');
  s1.append(el('i'), el('span', undefined, `+${stars}`));
  const s2 = el('div', 'coin candy');
  s2.append(el('i'), el('span', undefined, `+${candy}`));
  reward.append(s1, s2);
  sheet.appendChild(reward);

  const house = round.house;
  const row = el('div');
  row.appendChild(button(t('round.again'), () => startRound(house)));
  row.appendChild(button(t('round.toIsland'), () => {
    round = null;
    screen = 'island';
    if (arrived.length) {
      arriving = arrived[0].id;
      arrivingUntil = performance.now() + 2400;
      for (const h of arrived) state.markSeen(h.id);
      audio.thunk();
      drawIslandUi();
      toast(t('island.newHouse'));
    } else {
      drawIslandUi();
    }
  }));
  sheet.appendChild(row);
  ui.appendChild(sheet);
  round = null;
}

// ------------------------------------------------------------- startup

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
