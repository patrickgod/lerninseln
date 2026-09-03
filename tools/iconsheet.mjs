// Contact sheet for the home-screen icon.
//
//   node tools/iconsheet.mjs        ->  shots/icons.png
//
// The master at 512, and then the sizes iOS actually draws, at their
// TRUE size, on a home-screen grey and behind the squircle mask.
// Judging an icon at 512 on white is how you end up with one that is a
// warm smudge on a real iPad — the same mistake as judging a sprite at
// 8x instead of at island scale.

import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const html = `<!doctype html><meta charset=utf-8>
<style>
  body { margin:0; background:#8e8e93; font:12px -apple-system,sans-serif; color:#fff; }
  .wrap { display:flex; gap:24px; padding:24px; align-items:flex-start; }
  img { display:block; }
  .row { display:flex; gap:20px; align-items:flex-end; }
  figure { margin:0; text-align:center; }
  figcaption { margin-top:6px; opacity:.9; }
  .sq img { border-radius:22.37%; }   /* what iOS masks it to */
</style>
<div class=wrap>
  <figure><img src="icon-512.png" style="width:320px;height:320px"><figcaption>512, unmasked</figcaption></figure>
  <div>
    <div class="row sq">
      <figure><img src="icon-180.png" style="width:180px;height:180px"><figcaption>180 &mdash; iPad home screen</figcaption></figure>
      <figure><img src="icon-180.png" style="width:120px;height:120px"><figcaption>120</figcaption></figure>
      <figure><img src="icon-180.png" style="width:80px;height:80px"><figcaption>80</figcaption></figure>
      <figure><img src="icon-180.png" style="width:60px;height:60px"><figcaption>60 &mdash; smallest</figcaption></figure>
    </div>
    <div class="row sq" style="margin-top:30px">
      <figure><img src="icon-192.png" style="width:192px;height:192px"><figcaption>192 &mdash; manifest</figcaption></figure>
      <figure><img src="icon-512.png" style="width:120px;height:120px"><figcaption>512 scaled to 120</figcaption></figure>
    </div>
  </div>
</div>`;

const page = 'public/icons/__sheet.html';
writeFileSync(page, html);
mkdirSync('shots', { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1010, height: 470 }, deviceScaleFactor: 2 });
await p.goto(pathToFileURL(process.cwd() + '/' + page).href);
await p.screenshot({ path: 'shots/icons.png' });
await b.close();
unlinkSync(page);
console.log('  shots/icons.png');
