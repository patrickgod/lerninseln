// Look at the thing. AGENTS.md rule 2: verify by looking, not by
// assuming — screenshots and measurements over reasoning about what the
// code should do.
//
//   node tools/shot.mjs [name...]
//
// Names are steps in `SHOTS` below. With no arguments it takes them all.
// Everything runs at a real iPad viewport with touch emulation and is
// driven with tap(), not click(): a test that clicks will pass on a
// build no child can operate.

import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PORT = 8399;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.json': 'application/json', '.map': 'application/json',
  '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(join('dist', p));
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));

mkdirSync('shots', { recursive: true });

const ipad = devices['iPad (gen 7) landscape'] ?? devices['iPad (gen 7)'];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...ipad,
  hasTouch: true,
  isMobile: true,
  viewport: { width: 1080, height: 810 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('  console error:', m.text()); });
page.on('pageerror', (e) => console.log('  page error:', e.message));

const wanted = process.argv.slice(2);
const want = (n) => wanted.length === 0 || wanted.includes(n);

async function shot(name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `shots/${name}.png` });
  console.log(`  shots/${name}.png`);
}

await page.goto(`http://localhost:${PORT}/`);
await page.waitForTimeout(700);
if (want('picker')) await shot('picker');

// Into the maths island.
await page.locator('.island-card').first().tap();
await page.waitForTimeout(900);
if (want('island')) await shot('island');

// Into the first house. The house is hit-tested on the canvas, so this
// taps where the house actually is rather than a DOM element.
const box = await page.locator('#stage').boundingBox();
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2 + 10);
await page.waitForTimeout(900);
if (want('round')) await shot('round');

// Answer whatever is on screen, right or wrong, and look at the result.
const answers = page.locator('.answers button');
if (await answers.count()) {
  await answers.first().tap();
  await page.waitForTimeout(700);
  if (want('answered')) await shot('answered');
}

// Play the rest of the round correctly — the partner to ten is ten
// minus the numeral — and catch the reward sheet while the stars are
// still in the air.
if (want('fertig')) {
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.sheet').count() > 0) break;
    if (await answers.count() === 0) break;
    const shown = Number(await page.locator('.numeral').first().textContent());
    const card = page.locator('.answers button', { hasText: new RegExp(`^${10 - shown}$`) });
    if (await card.count() === 0) break;
    await card.first().tap();
    // Short enough that the last one catches the reward sheet while the
    // stars are still in the air — which is the thing worth looking at.
    await page.waitForTimeout(await page.locator('.answers button').count() ? 2000 : 1500);
    if (await page.locator('.sheet').count() > 0) break;
  }
  await page.waitForTimeout(1250);
  await page.screenshot({ path: 'shots/fertig.png' });
  console.log('  shots/fertig.png');
}

// The shop.
await page.goto(`http://localhost:${PORT}/`);
await page.waitForTimeout(600);
await page.evaluate(() => {
  // Give the tester enough sweets to see every item enabled. This is a
  // harness convenience and is the only place in the project that
  // writes the save from outside the app.
  const raw = JSON.parse(localStorage.getItem('lerninseln.save.v1') ?? '{}');
  localStorage.setItem('lerninseln.save.v1', JSON.stringify({ ...raw, v: 1, stars: 120, candy: 200 }));
});
await page.reload();
await page.waitForTimeout(700);
await page.locator('.island-card').first().tap();
await page.waitForTimeout(700);
if (want('island-full')) await shot('island-full');
await page.locator('button', { hasText: 'Bauen' }).first().tap();
await page.waitForTimeout(400);
await page.locator('button', { hasText: 'Bauen' }).first().tap();
await page.waitForTimeout(500);
if (want('shop')) await shot('shop');

// The language island, and the Anlaute house — the one that must work
// with the sound switched off, so the picture is the thing to look at.
// Clear the tester's 120 stars first, or BOTH language houses are
// unlocked and the tap at the centre of the island lands on whichever
// one happens to be in front.
await page.goto(`http://localhost:${PORT}/`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(900);
await page.locator('.island-card').nth(1).tap();
await page.waitForTimeout(900);
if (want('sprache')) await shot('sprache');
const box2 = await page.locator('#stage').boundingBox();
await page.touchscreen.tap(box2.x + box2.width / 2, box2.y + box2.height / 2 + 10);
await page.waitForTimeout(1200);
if (want('anlaute')) await shot('anlaute');

// A decorated island, so the ambient life has something to react to:
// the pond brings ducks, the fence a sheep, the patch hens, the bed
// butterflies, the bench a cat, the lighthouse a boat.
if (want('leben')) {
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(() => {
    const placed = [
      ['teich', 7, 7], ['zaun', 9, 7], ['beet', 7, 9], ['blumenbeet', 9, 9],
      ['bank', 10, 8], ['leuchtturm', 6, 8], ['kirschbaum', 8, 6],
      ['apfelbaum', 8, 10], ['brunnen', 10, 10], ['laterne', 6, 10],
    ].map(([d, x, y]) => ({ d, i: 'mathe', x, y }));
    localStorage.setItem('lerninseln.save.v1', JSON.stringify({
      v: 1, stars: 120, candy: 300, seen: [], placed, strength: {}, sound: true, voice: false,
    }));
  });
  await page.reload();
  await page.waitForTimeout(900);
  await page.locator('.island-card').first().tap();
  // Long enough for a bird to be up and the critters to have moved off
  // their starting waypoints.
  await page.waitForTimeout(4200);
  await shot('leben');
  // Again with the plaques hidden, so it is possible to tell whether a
  // decoration is missing or merely covered.
  await page.evaluate(() => {
    const l = document.querySelector('.labels');
    if (l) l.style.display = 'none';
  });
  await page.waitForTimeout(300);
  await shot('leben-nackt');

  // The same island at dusk and at night. Nothing is tinted: every
  // sprite steps down its own ramp, and the lights step UP.
  for (const zeit of ['abend', 'nacht']) {
    await page.goto(`http://localhost:${PORT}/?zeit=${zeit}`);
    await page.waitForTimeout(700);
    await page.locator('.island-card').first().tap();
    await page.waitForTimeout(1400);
    await page.evaluate(() => {
      const l = document.querySelector('.labels');
      if (l) l.style.display = 'none';
    });
    await page.waitForTimeout(200);
    await shot(`insel-${zeit}`);
  }
}

// The two newest houses on the language island: reading a word off a
// picture, and hearing a rhyme.
if (want('lesen')) {
  for (const [name, tile] of [['lesen', [5, 9]], ['reime', [11, 6]]]) {
    await page.goto(`http://localhost:${PORT}/`);
    await page.evaluate(() => {
      localStorage.setItem('lerninseln.save.v1', JSON.stringify({
        v: 1, stars: 200, candy: 0, seen: [], placed: [], strength: {},
        sound: true, voice: false,
      }));
    });
    await page.reload();
    await page.waitForTimeout(900);
    await page.locator('.island-card').nth(1).tap();
    await page.waitForTimeout(1200);
    // Aim at the house by its tile, using the app's own projection.
    const at = await page.evaluate(([tx, ty]) => {
      const c = document.getElementById('stage');
      const r = c.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, tx, ty };
    }, tile);
    // The houses are laid out around the centre; tap by hunting the
    // label, which is positioned over the house itself.
    const label = page.locator('.house-label').filter({ hasText: name === 'lesen' ? 'Wörter' : 'Reime' });
    const box3 = await label.first().boundingBox();
    if (box3) {
      await page.touchscreen.tap(box3.x + box3.width / 2, box3.y - 30);
      await page.waitForTimeout(1400);
      await shot(name);
    }
    void at;
  }
}

// The Zahlenfreunde: pairs of numbers that make ten, known both ways,
// wandering by the house they came out of.
if (want('freunde')) {
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(() => {
    const strength = {};
    // Four pairs fully mastered, both directions, and two not.
    for (const n of [1, 3, 4, 5, 9, 7, 6]) strength['vz:' + n] = 3;
    strength['vz:2'] = 1;
    localStorage.setItem('lerninseln.save.v1', JSON.stringify({
      v: 1, stars: 60, candy: 40, seen: [], placed: [], strength,
      sound: true, voice: false,
    }));
  });
  await page.reload();
  await page.waitForTimeout(900);
  await page.locator('.island-card').first().tap();
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const l = document.querySelector('.labels');
    if (l) l.style.display = 'none';
  });
  await page.waitForTimeout(200);
  await shot('freunde');
}

// The settings, with a name in them, and the postcard.
if (want('einstellungen')) {
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(() => {
    const placed = [
      ['teich', 7, 7], ['zaun', 10, 7], ['beet', 6, 10], ['blumenbeet', 9, 10],
      ['bank', 11, 9], ['leuchtturm', 5, 7], ['kirschbaum', 9, 5],
      ['birnbaum', 11, 11], ['feuerstelle', 7, 12], ['windmuehle', 12, 8],
      ['bienenstock', 6, 6], ['sonnenblumen', 10, 13],
    ].map(([d, x, y]) => ({ d, i: 'mathe', x, y }));
    localStorage.setItem('lerninseln.save.v1', JSON.stringify({
      v: 1, stars: 120, candy: 300, seen: [], placed, strength: {},
      sound: true, voice: false, name: 'Ben',
    }));
  });
  await page.reload();
  await page.waitForTimeout(900);
  await shot('picker-named');
  await page.locator('.island-card').first().tap();
  await page.waitForTimeout(1400);
  await page.locator('.gear').first().tap();
  await page.waitForTimeout(400);
  await shot('einstellungen');
  await page.locator('button', { hasText: 'Postkarte' }).first().tap();
  await page.waitForTimeout(900);
  await shot('postkarte');
}

await browser.close();
server.close();
console.log('done');
