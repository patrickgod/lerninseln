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
  errors.push(m.text());
});

// Every request the page makes, so a 404 cannot hide. The app is
// supposed to ask for nothing but its own files, and it is supposed to
// get all of them.
const notFound = [];
page.on('response', (r) => { if (r.status() === 404) notFound.push(new URL(r.url()).pathname); });
const offsite = new Set();
page.on('request', (r) => {
  const u = new URL(r.url());
  if (u.origin !== new URL(BASE).origin) offsite.add(u.origin);
});

// ------------------------------------------------------- the voice set
//
// Checked on disk rather than by listening, because what can go wrong
// here is a MISSING file, and a child who taps a house and hears
// nothing has been shown an instruction they cannot read. The earlier
// version of this suite simply ignored 404s under assets/voice, which
// meant it would have stayed green if the whole voice set vanished.

const dist = 'dist/assets/voice';
const i18n = await readFile('src/core/i18n.ts', 'utf8');
const sayKeys = [...i18n.matchAll(/'(say\.[A-Za-z0-9]+)':/g)]
  .map((m) => m[1].replace(/\./g, '-').toLowerCase());
const wordList = await readFile('src/games/woerter.ts', 'utf8');
const wordStems = [...wordList.matchAll(/\{\s*wort:\s*'([^']+)'/g)]
  .map((m) => 'wort-' + m[1].toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'));

const missingVoice = [];
for (const stem of [...sayKeys, ...wordStems]) {
  try {
    const buf = await readFile(join(dist, `${stem}.mp3`));
    // An empty or near-empty MP3 is a failed take that was written
    // anyway. 1KB is well under the smallest real word.
    if (buf.length < 1024) missingVoice.push(`${stem} (${buf.length}b)`);
  } catch {
    missingVoice.push(stem);
  }
}
check(`every spoken line ships as audio (${sayKeys.length + wordStems.length} checked)`,
  missingVoice.length === 0, missingVoice.slice(0, 5).join(', '));

// ------------------------------------------------------ the word pictures
//
// The Anlaute house draws only from words that have a drawing. A typo in
// either table would silently shrink that pool rather than break
// anything — the house would still work, it would just quietly stop
// asking about half the alphabet, and nobody would notice for months.

const art = await readFile('src/games/wortbilder.ts', 'utf8');
const bilder = [...art.matchAll(/^\s{2}([A-ZÄÖÜ][a-zäöüß]+):\s*\w+,$/gm)].map((m) => m[1]);
const known = new Set([...wordList.matchAll(/\{\s*wort:\s*'([^']+)'/g)].map((m) => m[1]));
const orphans = bilder.filter((w) => !known.has(w));
check(`every word picture matches a word (${bilder.length} pictures)`,
  bilder.length >= 12 && orphans.length === 0,
  orphans.length ? `not in woerter.ts: ${orphans.join(', ')}`
    : bilder.length < 12 ? `only ${bilder.length}` : '');

// The whole point of the house is the FIRST SOUND, so twelve pictures
// that all start with B would teach nothing.
const initials = new Set(bilder.map((w) => w[0]));
check('the pictures spread across the alphabet', initials.size >= 10,
  `${initials.size} distinct initials: ${[...initials].sort().join('')}`);

// -------------------------------------------------------- the picker

await page.goto(BASE);
await page.waitForTimeout(700);

check('the picker offers three islands', await page.locator('.island-card').count() === 3);

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

// ------------------------------------------------- the wordless island
//
// Both houses on the Insel der Entdecker answer with DRAWINGS rather
// than with text, which is a different card renderer and could break
// without a single string changing. The assertion is deliberately about
// survival rather than about score: the test cannot hear which shape
// was asked for, and neither can it read one off a card, which is the
// entire point of that island.

await page.goto(BASE);
await page.evaluate(() => {
  localStorage.setItem('lerninseln.save.v1', JSON.stringify({
    v: 1, stars: 200, candy: 0, seen: [], placed: [], strength: {},
    sound: false, voice: false, name: '',
  }));
});
await page.reload();
await page.waitForTimeout(800);
await page.locator('.island-card').nth(2).tap();
await page.waitForTimeout(1200);
const shapeLabel = page.locator('.house-label').filter({ hasText: 'Formen' });
const sb = await shapeLabel.first().boundingBox();
if (sb) {
  await page.touchscreen.tap(sb.x + sb.width / 2, sb.y - 30);
  await page.waitForTimeout(1200);
}
const cards = await page.locator('.answers.shapes button').count();
check('the shapes house deals cards with no words on them', cards === 4, `${cards} cards`);
const drawn = await page.locator('.answers.shapes button canvas').count();
check('every shape card is a drawing', drawn === cards, `${drawn} of ${cards}`);
const written = await page.locator('.answers.shapes button').evaluateAll(
  (els) => els.filter((e) => (e.textContent || '').trim().length > 0).length);
check('and nothing is written on any of them', written === 0, `${written} with text`);
await measureButtons('shapes');
const askedShapes = await playRound(false);
check('a shapes round can be played to the end',
  await page.locator('.sheet').count() > 0, `${askedShapes} answers given`);

// ----------------------------------------------------------- settings
//
// AGENTS.md rule 14: sound is optional and off-switchable in TWO TAPS,
// because this gets played in waiting rooms. Two taps means the gear
// and then the switch, from wherever the child happens to be — so this
// counts them.

await page.goto(BASE);
await page.waitForTimeout(700);
await page.locator('.island-card').first().tap();
await page.waitForTimeout(800);
await page.locator('.gear').first().tap();      // tap one
await page.waitForTimeout(350);
check('the settings open from the island', await page.locator('.settings').count() === 1);
await measureButtons('settings');
// Assert the switch FLIPS rather than that it lands on a particular
// value. The first version checked for `false`, which quietly depended
// on every earlier step in this file leaving sound on — and broke the
// day a new section above it wrote a save with the sound already off.
const soundBefore = await page.evaluate(() => {
  const raw = localStorage.getItem('lerninseln.save.v1');
  return raw ? JSON.parse(raw).sound : null;
});
await page.locator('.setting button').first().tap();   // tap two
await page.waitForTimeout(300);
const soundAfter = await page.evaluate(() => {
  const raw = localStorage.getItem('lerninseln.save.v1');
  return raw ? JSON.parse(raw).sound : null;
});
check('the sound switch flips in two taps',
  soundAfter === !soundBefore, `${soundBefore} -> ${soundAfter}`);
await page.reload();
await page.waitForTimeout(700);
const soundStill = await page.evaluate(() => {
  const raw = localStorage.getItem('lerninseln.save.v1');
  return raw ? JSON.parse(raw).sound : null;
});
check('and survives a reload', soundStill === soundAfter, `sound=${soundStill}`);
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('lerninseln.save.v1') ?? '{}');
  localStorage.setItem('lerninseln.save.v1', JSON.stringify({ ...raw, sound: true }));
});

// --------------------------------------------------------- frame time
//
// IPAD.md sets the budget at 60fps on an iPad from about 2019. This is
// NOT that measurement and must not be mistaken for it: headless
// Chromium rasterises in software, and Tidegarden already learned the
// hard way that the biggest performance bug in a pixel-art renderer can
// be completely invisible to a software rasteriser.
//
// What this DOES catch is the mistake that would ruin the frame on any
// machine — an accidental quadratic in the per-tile loops as the island
// fills up with decorations. So: fill one, run it, and fail if a frame
// takes longer than a thirtieth of a second.

await page.goto(BASE);
await page.evaluate(() => {
  // A heavily built island: forty things, every kind of ambient life.
  const placed = [];
  const kinds = ['kirschbaum', 'apfelbaum', 'teich', 'zaun', 'beet', 'blumenbeet',
    'bank', 'laterne', 'huhn', 'hecke', 'sonnenblumen', 'bienenstock',
    'vogelhaus', 'feuerstelle', 'pilze', 'beerenbusch'];
  let k = 0;
  for (let x = 3; x < 14; x++) {
    for (let y = 3; y < 14; y++) {
      if ((x + y) % 3) continue;
      placed.push({ d: kinds[k++ % kinds.length], i: 'mathe', x, y });
    }
  }
  const strength = {};
  for (let n = 0; n <= 10; n++) strength['vz:' + n] = 3;
  localStorage.setItem('lerninseln.save.v1', JSON.stringify({
    v: 1, stars: 200, candy: 0, seen: [], placed, strength,
    sound: false, voice: false, name: '',
  }));
});
await page.reload();
await page.waitForTimeout(700);
await page.locator('.island-card').first().tap();
await page.waitForTimeout(1200);

const frames = await page.evaluate(() => new Promise((resolve) => {
  const times = [];
  let last = performance.now();
  let n = 0;
  const tick = () => {
    const now = performance.now();
    times.push(now - last);
    last = now;
    if (++n < 140) requestAnimationFrame(tick);
    else resolve(times.slice(20).sort((a, b) => a - b));
  };
  requestAnimationFrame(tick);
}));
const median = frames[Math.floor(frames.length / 2)];
const worst = frames[frames.length - 1];
check('a busy island still draws a frame in under 33ms',
  median < 33, `median ${median.toFixed(1)}ms, worst ${worst.toFixed(1)}ms`);

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
  await page.locator('.island-card').count() === 3);
await ctx.setOffline(false);

// ------------------------------------------------------------ no noise

check('nothing threw', errors.length === 0, errors.slice(0, 3).join(' | '));
check('nothing 404s', notFound.length === 0, [...new Set(notFound)].slice(0, 5).join(', '));

// AGENTS.md rule 8: nothing leaves the device. This is the check that
// makes that a fact rather than an intention — if anybody ever adds a
// font from a CDN or an analytics beacon, this goes red.
check('the app talks to nobody', offsite.size === 0, [...offsite].join(', '));

await browser.close();
server.close();

console.log(failures ? `\n${failures} failed` : '\nall good');
process.exit(failures ? 1 : 0);
