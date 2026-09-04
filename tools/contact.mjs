// Contact sheets. Look at the sprites, all of them, side by side.
//
//   node tools/contact.mjs            # both sheets
//   node tools/contact.mjs woerter    # the word pictures
//   node tools/contact.mjs insel      # everything on an island
//
// Exists for one reason: AGENTS.md rule 2. Sprites that have never been
// looked at are sprites that are probably wrong, and looking at them
// one at a time inside the game is a slow way to find out that the
// hedgehog reads as a potato — or that the fox, at the scale the island
// actually draws it, is an orange sausage.
//
// Tidegarden has `src/pixel/preview.ts` for exactly this. Same idea,
// smaller footprint: bundle the sprite modules on their own, draw
// everything they export onto one canvas, screenshot it.

import esbuild from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const want = process.argv.slice(2);
const doIt = (n) => want.length === 0 || want.includes(n);

mkdirSync('shots', { recursive: true });
mkdirSync('.contact', { recursive: true });

const browser = await chromium.launch();

async function sheet(name, source) {
  writeFileSync('.contact/entry.ts', source);
  await esbuild.build({
    entryPoints: ['.contact/entry.ts'],
    bundle: true,
    outfile: '.contact/bundle.js',
    // IIFE, not ESM: a module script loaded over file:// is blocked by
    // CORS, and standing up a web server for one screenshot is silly.
    format: 'iife',
    logLevel: 'error',
  });
  writeFileSync('.contact/index.html',
    '<!doctype html><meta charset="utf-8">'
    + '<body style="margin:0;background:#173a5c">'
    + '<script src="bundle.js"></script>');

  const page = await browser.newPage({ deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.goto(`file://${process.cwd().replace(/\\/g, '/')}/.contact/index.html`);
  await page.waitForFunction(() => window.ready === true, { timeout: 15000 });
  await page.locator('canvas').screenshot({ path: `shots/${name}.png` });
  await page.close();
  console.log(`  shots/${name}.png`);
}

// ------------------------------------------------------ the word cards

if (doIt('woerter')) {
  await sheet('wortbilder', `
import { BILDER } from '../src/games/wortbilder.js';

const SCALE = 5, COLS = 4, CELL = 40 * SCALE, LABEL = 26;
const names = Object.keys(BILDER);
const rows = Math.ceil(names.length / COLS);

const c = document.createElement('canvas');
c.width = COLS * (CELL + 16) + 16;
c.height = rows * (CELL + LABEL + 16) + 16;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#bcd9e8';
ctx.fillRect(0, 0, c.width, c.height);

names.forEach((name, i) => {
  const col = i % COLS, row = (i / COLS) | 0;
  const x = 16 + col * (CELL + 16);
  const y = 16 + row * (CELL + LABEL + 16);
  ctx.fillStyle = '#f8f0dc';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.drawImage(BILDER[name]().toCanvas(), x, y, CELL, CELL);
  ctx.fillStyle = '#241d2b';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, x + CELL / 2, y + CELL + 20);
});

(window as any).ready = true;
`);
}

// ------------------------------------------------------- the alphabet

if (doIt('schrift')) {
  await sheet('schrift', `
import { GLYPHS, checkpoints } from '../src/games/schrift.js';

// Each letter with its strokes NUMBERED and ARROWED. The direction is
// the whole content of this font — a letter drawn bottom-up looks
// perfect and is wrong — so the sheet has to show the direction, not
// the shape.
const CELL = 150, COLS = 7, LABEL = 30, PAD = 14;
const names = Object.keys(GLYPHS);
const rows = Math.ceil(names.length / COLS);

const c = document.createElement('canvas');
c.width = COLS * CELL + PAD;
c.height = rows * (CELL + LABEL) + PAD;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.fillStyle = '#f8f0dc';
ctx.fillRect(0, 0, c.width, c.height);

const FARBE = ['#c93a44', '#3f5c85', '#4d8244', '#8f5423'];

names.forEach((ch, i) => {
  const col = i % COLS, row = (i / COLS) | 0;
  const ox = PAD + col * CELL + 24;
  const oy = PAD + row * (CELL + LABEL) + 12;
  const S = CELL - 60;

  // writing lines: top, x-height, baseline
  ctx.strokeStyle = '#c9dcec';
  ctx.lineWidth = 2;
  for (const y of [0, 0.38, 1]) {
    ctx.beginPath();
    ctx.moveTo(ox - 8, oy + y * S);
    ctx.lineTo(ox + S + 8, oy + y * S);
    ctx.stroke();
  }

  GLYPHS[ch].forEach((stroke, si) => {
    const col2 = FARBE[si % FARBE.length];
    const cps = checkpoints(stroke, 0.06);
    ctx.strokeStyle = col2;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    cps.forEach((p, k) => {
      const x = ox + p.x * S, y = oy + p.y * S;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // where the hand starts
    const a = cps[0];
    ctx.fillStyle = '#241d2b';
    ctx.beginPath();
    ctx.arc(ox + a.x * S, oy + a.y * S, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8f0dc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(si + 1), ox + a.x * S, oy + a.y * S + 1);

    // and where it ends up
    if (cps.length > 1) {
      const z = cps[cps.length - 1], y2 = cps[cps.length - 2];
      const ang = Math.atan2(z.y - y2.y, z.x - y2.x);
      const zx = ox + z.x * S, zy = oy + z.y * S;
      ctx.fillStyle = col2;
      ctx.beginPath();
      ctx.moveTo(zx + Math.cos(ang) * 13, zy + Math.sin(ang) * 13);
      ctx.lineTo(zx + Math.cos(ang + 2.5) * 12, zy + Math.sin(ang + 2.5) * 12);
      ctx.lineTo(zx + Math.cos(ang - 2.5) * 12, zy + Math.sin(ang - 2.5) * 12);
      ctx.closePath();
      ctx.fill();
    }
  });

  ctx.fillStyle = '#241d2b';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch + '  (' + GLYPHS[ch].length + ')', ox + S / 2, oy + S + 34);
});

(window as any).ready = true;
`);
}

// ------------------------------------------------------------- shapes

if (doIt('formen')) {
  await sheet('formen', `
import { FORMEN, form } from '../src/games/formen.js';

const SCALE = 6, COLS = 3, CELL = 34 * SCALE, LABEL = 30;
const rows = Math.ceil(FORMEN.length / COLS);
const c = document.createElement('canvas');
c.width = COLS * (CELL + 20) + 20;
c.height = rows * (CELL + LABEL + 20) + 20;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#bcd9e8';
ctx.fillRect(0, 0, c.width, c.height);

FORMEN.forEach((f, i) => {
  const col = i % COLS, row = (i / COLS) | 0;
  const x = 20 + col * (CELL + 20);
  const y = 20 + row * (CELL + LABEL + 20);
  ctx.fillStyle = '#f8f0dc';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.drawImage(form(f).toCanvas(), x, y, CELL, CELL);
  ctx.fillStyle = '#241d2b';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(f, x + CELL / 2, y + CELL + 24);
});

(window as any).ready = true;
`);
}

// -------------------------------------------------- everything on land

if (doIt('insel')) {
  await sheet('inselsprites', `
import * as S from '../src/islands/sprites.js';
import * as D from '../src/islands/deko.js';
import { P } from '../src/core/palette.js';

// Drawn at the scale the island actually uses, on the ground tile they
// actually stand on, with a house beside every one of them for scale.
// Judging a sprite on its own at 8x is how you end up with a fox the
// size of a cottage.
const SCALE = 4;
const CELL_W = 150, CELL_H = 165, COLS = 5, LABEL = 26;

const items: [string, () => S.Sprite][] = [
  ['haus', () => S.house('terracotta', 3, true)],
  ['bauplatz', () => S.plot(3)],
  ['kirschbaum', () => S.cherryTree(7)],
  ['apfelbaum', () => S.appleTree(11)],
  ['tanne', () => S.pineTree(3)],
  ['wildbaum', () => S.wildTree('leaf', 5)],
  ['blumenbeet', () => S.flowers(5)],
  ['gemuesebeet', () => S.vegPatch(9)],
  ['zaun', () => S.fence()],
  ['teich', () => S.pond(13)],
  ['schaf', () => S.sheep(2)],
  ['huhn', () => S.hen(4)],
  ['ente', () => S.duck(6)],
  ['katze', () => S.cat(8)],
  ['fuchs', () => S.fox(10)],
  ['laterne', () => S.lamp()],
  ['bank', () => S.bench()],
  ['brunnen', () => S.well()],
  ['leuchtturm', () => S.lighthouse()],
  ['boot', () => S.boat(7)],
  ['vogel', () => S.bird(0)],
  ['falter', () => S.butterfly(0, 1)],
  ['birnbaum', () => S.pearTree(4)],
  ['pflaumenbaum', () => S.plumTree(6)],
  ['beerenbusch', () => D.berryBush(3)],
  ['hecke', () => D.hedge(2)],
  ['sonnenblumen', () => D.sunflowers(5)],
  ['kuerbisse', () => D.pumpkins(7)],
  ['pilze', () => D.mushrooms(9)],
  ['bienenstock', () => D.beehive()],
  ['vogelhaus', () => D.birdBox()],
  ['feuerstelle', () => D.campfire(0)],
  ['windmuehle', () => D.windmill(2)],
  ['biene', () => D.bee(0)],
  ['freund-3', () => S.zahlenfreund(3, 3)],
  ['freund-7', () => S.zahlenfreund(7, 3)],
];

const rows = Math.ceil(items.length / COLS);
const c = document.createElement('canvas');
c.width = COLS * CELL_W + 16;
c.height = rows * (CELL_H + LABEL) + 16;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

ctx.fillStyle = '#3f6c3a';
ctx.fillRect(0, 0, c.width, c.height);

const ground = S.groundTile(P.grass, 3, 0);
const house = S.house('slate', 9, false);

items.forEach(([name, make], i) => {
  const col = i % COLS, row = (i / COLS) | 0;
  const cx = 8 + col * CELL_W + CELL_W / 2;
  const baseY = 8 + row * (CELL_H + LABEL) + CELL_H - 34;

  // the tile it stands on
  const g = ground.px.toCanvas();
  ctx.drawImage(g,
    Math.round(cx - ground.ax * SCALE), Math.round(baseY - ground.ay * SCALE),
    g.width * SCALE, g.height * SCALE);

  // a house behind it, faint, purely for scale
  ctx.globalAlpha = 0.25;
  const hc = house.px.toCanvas();
  ctx.drawImage(hc,
    Math.round(cx - house.ax * SCALE + 46), Math.round(baseY - house.ay * SCALE),
    hc.width * SCALE, hc.height * SCALE);
  ctx.globalAlpha = 1;

  const s = make();
  const sc = s.px.toCanvas();
  ctx.drawImage(sc,
    Math.round(cx - s.ax * SCALE), Math.round(baseY - s.ay * SCALE),
    sc.width * SCALE, sc.height * SCALE);

  ctx.fillStyle = '#f8f0dc';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name + '  ' + s.px.w + 'x' + s.px.h,
    cx, 8 + row * (CELL_H + LABEL) + CELL_H + 14);
});

(window as any).ready = true;
`);
}

if (doIt('nasch')) {
  await sheet('naschsprites', `
import * as S from '../src/islands/sprites.js';
import * as N from '../src/islands/nasch.js';
import { P } from '../src/core/palette.js';

// The sweet family, at the scale the island draws it, on the ground it
// stands on, with a house behind for scale. Two seeds of each of the
// random ones, because a generator that makes one good sprite and one
// bad one is worse than one that always makes the same sprite.
const SCALE = 4;
const CELL_W = 150, CELL_H = 175, COLS = 5, LABEL = 26;

const items: [string, () => S.Sprite][] = [
  ['zuckerstange a', () => N.zuckerstange(3)],
  ['zuckerstange b', () => N.zuckerstange(12)],
  ['lolliblumen a', () => N.lolliblumen(5)],
  ['lolliblumen b', () => N.lolliblumen(21)],
  ['zuckerwatte a', () => N.zuckerwatte(7)],
  ['zuckerwatte b', () => N.zuckerwatte(31)],
  ['bonbonbusch a', () => N.bonbonbusch(9)],
  ['bonbonbusch b', () => N.bonbonbusch(44)],
  ['lebkuchenhaus', () => N.lebkuchenhaus()],
  ['schokobrunnen', () => N.schokobrunnen()],
  ['sandburg a', () => N.sandburg(4)],
  ['sandburg b', () => N.sandburg(18)],
  ['fahne a', () => N.fahne(6)],
  ['fahne b', () => N.fahne(26)],
  ['kaninchen a', () => N.kaninchen(2)],
  ['kaninchen b', () => N.kaninchen(15)],
  ['igel a', () => N.igel(8)],
  ['igel b', () => N.igel(23)],
  ['marshmallowbaum', () => S.cherryTree(7)],
  ['haus (Massstab)', () => S.house('terracotta', 3, true)],
];

const rows = Math.ceil(items.length / COLS);
const c = document.createElement('canvas');
c.width = COLS * CELL_W + 16;
c.height = rows * (CELL_H + LABEL) + 16;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

ctx.fillStyle = '#3f6c3a';
ctx.fillRect(0, 0, c.width, c.height);

const ground = S.groundTile(P.grass, 3, 0);
const house = S.house('slate', 9, false);

items.forEach(([name, make], i) => {
  const col = i % COLS, row = (i / COLS) | 0;
  const cx = 8 + col * CELL_W + CELL_W / 2;
  const baseY = 8 + row * (CELL_H + LABEL) + CELL_H - 34;

  const g = ground.px.toCanvas();
  ctx.drawImage(g,
    Math.round(cx - ground.ax * SCALE), Math.round(baseY - ground.ay * SCALE),
    g.width * SCALE, g.height * SCALE);

  ctx.globalAlpha = 0.25;
  const hc = house.px.toCanvas();
  ctx.drawImage(hc,
    Math.round(cx - house.ax * SCALE + 46), Math.round(baseY - house.ay * SCALE),
    hc.width * SCALE, hc.height * SCALE);
  ctx.globalAlpha = 1;

  const s = make();
  const sc = s.px.toCanvas();
  ctx.drawImage(sc,
    Math.round(cx - s.ax * SCALE), Math.round(baseY - s.ay * SCALE),
    sc.width * SCALE, sc.height * SCALE);

  ctx.fillStyle = '#f8f0dc';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name + '  ' + s.px.w + 'x' + s.px.h,
    cx, 8 + row * (CELL_H + LABEL) + CELL_H + 14);
});

(window as any).ready = true;
`);
}

if (doIt('hausaufgaben')) {
  await sheet('hausaufgaben', `
import { wuerfel, stange } from '../src/games/wuerfel.js';
import { fahrzeug, pfeil, FAHRZEUGE } from '../src/games/fahrzeuge.js';

// The pictures out of the real homework, at the size a child will see
// them. The vehicles have ONE job — to point — so they are drawn facing
// both ways, side by side, and if a pair is hard to tell apart at a
// glance the sprite is wrong.
const S = 4;
const c = document.createElement('canvas');
c.width = 1180;
c.height = 980;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#f8f0dc';
ctx.fillRect(0, 0, c.width, c.height);
ctx.fillStyle = '#241d2b';
ctx.font = 'bold 18px sans-serif';
ctx.textAlign = 'left';

const put = (px: any, x: number, y: number, s = S) => {
  const cv = px.toCanvas();
  ctx.drawImage(cv, x, y, cv.width * s, cv.height * s);
};

ctx.fillText('Würfelbilder 0..6', 20, 30);
for (let n = 0; n <= 6; n++) put(wuerfel(n), 20 + n * 132, 44, 4);

ctx.fillText('Steckwürfelstangen — immer 5, jede Zerlegung', 20, 210);
for (let t = 0; t <= 5; t++) put(stange(5, t), 20, 226 + t * 42, 2);

ctx.fillText('immer 6, und eine leere Stange', 460, 210);
for (let t = 0; t <= 6; t++) put(stange(6, t), 460, 226 + t * 42, 2);
put(stange(5, -1), 460, 226 + 7 * 42, 2);

ctx.fillText('Fahrzeuge: links | rechts — muss auf einen Blick zeigen', 20, 520);
FAHRZEUGE.forEach((f, i) => {
  const x = 20 + (i % 3) * 380;
  const y = 540 + ((i / 3) | 0) * 190;
  // The colour of an answer card, because that is what they sit on.
  ctx.fillStyle = '#f8f0dc';
  ctx.fillRect(x, y, 350, 120);
  ctx.strokeStyle = '#241d2b';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 350, 120);
  ctx.fillStyle = '#241d2b';
  put(fahrzeug(f, false), x + 4, y + 6, 4);
  put(fahrzeug(f, true), x + 180, y + 6, 4);
  ctx.fillText(f, x + 6, y + 138);
});

ctx.fillText('Pfeile', 20, 930);
put(pfeil(false), 90, 900, 3);
put(pfeil(true), 230, 900, 3);

(window as any).ready = true;
`);
}

await browser.close();
rmSync('.contact', { recursive: true, force: true });
