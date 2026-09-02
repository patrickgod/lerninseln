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

// -------------------------------------------------- everything on land

if (doIt('insel')) {
  await sheet('inselsprites', `
import * as S from '../src/islands/sprites.js';
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

await browser.close();
rmSync('.contact', { recursive: true, force: true });
