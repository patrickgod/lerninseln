// A contact sheet of the word pictures.
//
//   node tools/contact.mjs
//
// Exists for one reason: AGENTS.md rule 2. Twelve sprites that have
// never been looked at are twelve sprites that are probably wrong, and
// looking at them one at a time inside a round is a slow way to find
// out that the hedgehog reads as a potato.
//
// Tidegarden has `src/pixel/preview.ts` for exactly this. This is the
// same idea with a smaller footprint: bundle the sprite module on its
// own, draw everything it exports onto one canvas, screenshot it.

import esbuild from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

mkdirSync('shots', { recursive: true });
mkdirSync('.contact', { recursive: true });

const SCALE = 5;
const COLS = 4;

writeFileSync('.contact/entry.ts', `
import { BILDER } from '../src/games/wortbilder.js';

const SCALE = ${SCALE};
const COLS = ${COLS};
const names = Object.keys(BILDER);
const rows = Math.ceil(names.length / COLS);
const CELL = 40 * SCALE;
const LABEL = 26;

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

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('  page error:', e.message));
page.on('console', (m) => console.log(`  console ${m.type()}:`, m.text()));
await page.goto(`file://${process.cwd().replace(/\\/g, '/')}/.contact/index.html`);
await page.waitForFunction(() => window.ready === true, { timeout: 10000 });
const canvas = page.locator('canvas');
await canvas.screenshot({ path: 'shots/wortbilder.png' });
await browser.close();
rmSync('.contact', { recursive: true, force: true });
console.log('  shots/wortbilder.png');
