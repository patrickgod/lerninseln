// The verification suite.
//
//   node tools/verify.mjs
//
// Everything here is a claim from HANDOVER.md's "how to know it works",
// turned into something a machine checks:
//
//   * every interactive element measured >=64x64 CSS px BY A TEST, not
//     by eye;
//   * a whole round completed using tap() only — a test that clicks
//     will pass on a build no child can operate;
//   * state survives a reload;
//   * the app loads with the network disabled after one visit;
//   * nothing throws on the way through.
//
// It runs at a real iPad viewport with touch emulation, and it fails
// loudly. AGENTS.md rule 3 applies to everything added here: run it
// against the broken code FIRST. A test that has never failed is a test
// you are trusting on faith.

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PORT = 8398;
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
const BASE = `http://localhost:${PORT}/`;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...(devices['iPad (gen 7) landscape'] ?? devices['iPad (gen 7)']),
  hasTouch: true,
  isMobile: true,
  viewport: { width: 1080, height: 810 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // A 404 for a voice file is expected until `npm run voice` has been
  // run with a key that can speak; it is not a failure of the app.
  const t = m.text();
  if (/assets\/voice\//.test(t)) return;
  if (/Failed to load resource/.test(t)) return;
  errors.push(t);
});

// -------------------------------------------------------- the picker

await page.goto(BASE);
await page.waitForTimeout(700);

check('the picker offers two islands', await page.locator('.island-card').count() === 2);

/** Every visible button, measured. Apple's 44pt is for adults. */
async function measureButtons(where) {
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), label: (e.textContent || '').trim().slice(0, 18) };
    }));
  const small = boxes.filter((b) => b.w < 64 || b.h < 64);
  check(`${where}: every button is at least 64x64 (${boxes.length} measured)`,
    small.length === 0,
    small.map((b) => `"${b.label}" ${b.w}x${b.h}`).join(', '));
}
await measureButtons('picker');

// -------------------------------------------------------- the island

await page.locator('.island-card').first().tap();
await page.waitForTimeout(800);
await measureButtons('island');

// The first house is at the middle of the maths island, so a tap at the
// centre of the canvas should open a round. This is deliberately a
// touchscreen tap on the CANVAS, because the houses are not DOM.
const box = await page.locator('#stage').boundingBox();
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2 + 10);
await page.waitForTimeout(800);
check('tapping a house opens a round', await page.locator('.answers button').count() >= 3);
await measureButtons('round');

// ------------------------------------------------- a whole round, by tap
//
// The round is played CORRECTLY, by working the answer out from what is
// on screen: this house asks for the partner to ten, so the right card
// is 10 minus the numeral.
//
// The first version tapped at random and then asserted that some stars
// had been awarded. That is not a test, it is a coin toss — with three
// cards, ten random taps miss every single time about once in sixty
// runs, and it duly went red on a build that was completely fine. It
// also asserted almost nothing: a game that scored the wrong card as
// correct would have passed it.
//
// Playing deliberately checks the whole chain instead — the ten pairs,
// the shuffled cards, the scoring, and the currency — and it gives the
// same answer every time.

const answers = page.locator('.answers button');

async function playRound(correctly) {
  let asked = 0;
  for (let i = 0; i < 40; i++) {
    if (await answers.count() === 0) break;
    const n = await answers.count();
    if (correctly) {
      const shown = Number(await page.locator('.numeral').first().textContent());
      const want = String(10 - shown);
      const card = page.locator('.answers button', { hasText: new RegExp(`^${want}$`) });
      if (await card.count() === 0) {
        check(`the partner of ${shown} is on a card`, false,
          `cards: ${(await answers.allTextContents()).join(' ')}`);
        return asked;
      }
      await card.first().tap();
    } else {
      await answers.nth(Math.floor(Math.random() * n)).tap();
    }
    asked++;
    // A hit advances after 820ms, a miss after 700 + 1400. Waiting for
    // the next question rather than for a fixed time would be better
    // still, but the DOM is rebuilt wholesale so there is no stable
    // node to wait on.
    await page.waitForTimeout(2400);
    if (await page.locator('.sheet').count() > 0) break;
  }
  return asked;
}

const asked = await playRound(true);
check('a whole round can be played with taps only',
  await page.locator('.sheet').count() > 0, `${asked} answers given`);

const save = await page.evaluate(() => {
  const raw = localStorage.getItem('lerninseln.save.v1');
  return raw ? JSON.parse(raw) : null;
});
const stars = save ? save.stars : null;
// Ten right out of ten: one star each, and the perfect-round bonus on
// top of the sweets. Exact, because every part of it is deterministic.
check('ten correct answers award ten stars', stars === 10, `stars=${stars}`);
check('a perfect round pays the bonus', save && save.candy === 15, `candy=${save && save.candy}`);

// ------------------------------------------------------------- reload

await page.reload();
await page.waitForTimeout(700);
const after = await page.evaluate(() => {
  const raw = localStorage.getItem('lerninseln.save.v1');
  return raw ? JSON.parse(raw).stars : null;
});
check('progress survives a reload', after === stars, `${stars} -> ${after}`);

// ----------------------------------------------------- a round of misses
//
// The other half of the promise: a child who gets everything wrong must
// still reach the end, still be paid something, and never see a screen
// that says they did badly. Random taps are exactly right HERE, because
// the assertion is about surviving whatever happens rather than about a
// score.

await page.locator('.island-card').first().tap();
await page.waitForTimeout(800);
const box2 = await page.locator('#stage').boundingBox();
await page.touchscreen.tap(box2.x + box2.width / 2, box2.y + box2.height / 2 + 10);
await page.waitForTimeout(800);
const asked2 = await playRound(false);
check('a round survives being answered at random',
  await page.locator('.sheet').count() > 0, `${asked2} answers given`);

const save2 = await page.evaluate(() => {
  const raw = localStorage.getItem('lerninseln.save.v1');
  return raw ? JSON.parse(raw) : null;
});
check('stars never go down', save2 && save2.stars >= stars, `${stars} -> ${save2 && save2.stars}`);
check('even a round of misses pays something',
  save2 && save2.candy > (save ? save.candy : 0), `candy=${save2 && save2.candy}`);
check('there is no screen that says you did badly',
  !/falsch|leider|schade|verloren/i.test(await page.locator('.sheet').innerText()));

// ------------------------------------------------------------ offline
//
// The real test of the service worker. One visit, then the network is
// taken away and the app must still start — because tablets are used
// in cars and on trains.

await page.goto(BASE);
await page.waitForTimeout(1500);           // let the worker install
await ctx.setOffline(true);
await page.goto(BASE).catch(() => { /* the assertion below is the test */ });
await page.waitForTimeout(900);
check('the app loads with the network disabled',
  await page.locator('.island-card').count() === 2);
await ctx.setOffline(false);

// ------------------------------------------------------------ no noise

check('nothing threw', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
server.close();

console.log(failures ? `\n${failures} failed` : '\nall good');
process.exit(failures ? 1 : 0);
