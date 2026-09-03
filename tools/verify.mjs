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
import { inflateSync } from 'node:zlib';

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

// ------------------------------------------------------- the writing
//
// The hardest thing in the app to check, and the one it would be
// easiest to ship broken: a widget that is operated with a DRAG rather
// than a tap, whose whole job is to decide whether a movement was the
// right movement.
//
// So the suite writes. It asks the widget for the stroke it is
// currently expecting — behind the same `?perf=1` flag as the frame
// timers — and drags along it. Recomputing the layout here would be
// testing a copy of the maths rather than the maths.

await page.goto(`${BASE}?perf=1`);
await page.evaluate(() => {
  localStorage.setItem('lerninseln.save.v1', JSON.stringify({
    v: 1, stars: 200, candy: 0, seen: [], placed: [], strength: {},
    sound: false, voice: false, name: '',
  }));
});
await page.reload();
await page.waitForTimeout(800);
await page.locator('.island-card').nth(1).tap();
await page.waitForTimeout(1200);
const schreibLabel = page.locator('.house-label').filter({ hasText: 'Schreiber' });
const wb = await schreibLabel.first().boundingBox();
if (wb) {
  await page.touchscreen.tap(wb.x + wb.width / 2, wb.y - 30);
  await page.waitForTimeout(1300);
}
check('the writing house opens a tracing surface',
  await page.locator('.tracer').count() === 1);
check('and deals no answer cards at all',
  await page.locator('.answers button').count() === 2, 'only the two helpers');

/**
 * Follow one stroke with the pointer, the way a finger would.
 *
 * A single-point path is the dot on an `i`, which is TOUCHED rather
 * than drawn — the first version of this helper treated it as a
 * malformed stroke and gave up, so every syllable with an i in it
 * silently ended the test two strokes early.
 */
async function zieheZug() {
  const box = await page.locator('.tracer').boundingBox();
  const pfad = await page.evaluate(() => (window.__zug ? window.__zug() : []));
  if (!box || pfad.length === 0) return false;
  if (pfad.length === 1) {
    await page.mouse.move(box.x + pfad[0].x, box.y + pfad[0].y);
    await page.mouse.down();
    await page.mouse.up();
    return true;
  }
  await page.mouse.move(box.x + pfad[0].x, box.y + pfad[0].y);
  await page.mouse.down();
  for (const p of pfad) await page.mouse.move(box.x + p.x, box.y + p.y);
  await page.mouse.up();
  return true;
}

// A scribble first: straight across the letter, which visits no
// checkpoint in order and must therefore do nothing at all.
{
  const box = await page.locator('.tracer').boundingBox();
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) {
    await page.mouse.move(box.x + 20 + (box.width - 40) * (i / 20),
      box.y + box.height / 2 + Math.sin(i) * 30);
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
}
check('a scribble across the letter does not count as writing it',
  await page.locator('.sheet').count() === 0
  && await page.locator('.tracer').count() === 1);

// Now write it properly, stroke by stroke, until the question changes.
let zuege = 0;
for (let i = 0; i < 24; i++) {
  if (await page.locator('.tracer').count() === 0) break;
  if (!(await zieheZug())) break;
  zuege++;
  await page.waitForTimeout(140);
  // Finishing the last stroke starts a pause before the next question.
  if (await page.evaluate(() => (window.__zug ? window.__zug().length : 0)) === 0) {
    await page.waitForTimeout(1200);
    break;
  }
}
check('following the strokes writes the syllable', zuege >= 2, `${zuege} strokes traced`);

const nachSchrift = await page.evaluate(() => {
  const raw = localStorage.getItem('lerninseln.save.v1');
  return raw ? JSON.parse(raw) : null;
});
check('and the round moved on',
  await page.locator('.pip.done').count() >= 1 || (nachSchrift && nachSchrift.stars > 200),
  `pips done: ${await page.locator('.pip.done').count()}`);

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

// --------------------------------------------------------- frame work
//
// This measures the WORK the app does per frame, not the frame rate,
// and the difference is the whole reason it is written this way.
//
// The first version timed the gaps between animation frames. In a
// headless browser that is the scheduler and the load on the machine
// and almost nothing to do with this app: it read 17ms on an idle
// laptop and 35ms on a busy one while the actual drawing never moved
// from about two milliseconds. It then went red on a build whose
// renderer had not changed, and two confident theories about the cause
// — the new campfire particles, then a layout flush in the label
// placement — were both wrong, which is exactly the trap LEARNINGS.md
// describes and which happened anyway.
//
// It is still NOT the iPad measurement from IPAD.md: headless Chromium
// rasterises in software. What it is, is a stable number that goes up
// the moment somebody writes an accidental quadratic into the per-tile
// loops, which is the mistake that would ruin the frame on any machine.

await page.goto(`${BASE}?perf=1`);
await page.evaluate(() => {
  // A heavily built island: forty things, every kind of ambient life,
  // and every Zahlenfreund-pair already learned.
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
// Long enough for the rolling mean to settle.
await page.waitForTimeout(3500);

const work = await page.evaluate(() => window.__perf);
const total = work ? work.draw + work.labels + work.fx : 999;
// Five, against a real figure of about 1.3. Tight enough that a
// fourfold regression trips it, loose enough that a slow morning does
// not. Verified the way AGENTS.md rule 3 asks: with the sprite cache
// disabled — the single most likely catastrophic regression in this
// renderer, and the one LEARNINGS.md warns about by name — it reads
// 103ms and fails. A merely quadratic loop over the placed decorations
// only costs half a millisecond and would NOT trip it, which is worth
// knowing about what this check does and does not cover.
check('a busy island costs under 5ms of work per frame',
  total < 5,
  `draw ${work.draw.toFixed(2)}ms + labels ${work.labels.toFixed(2)}ms `
  + `+ fx ${work.fx.toFixed(2)}ms = ${total.toFixed(2)}ms`);

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

// ---------------------------------------------------------------- icons

// The home-screen icon is the only part of the app a child sees before
// the app is running, and it is the one part no screenshot of the game
// ever shows. So it gets checked here rather than trusted.
//
// Three things go wrong with an apple-touch-icon and all three are
// silent: the file is missing (iOS falls back to a screenshot of the
// page, which for this game is a black rectangle), the `sizes` attribute
// disagrees with the actual PNG (Safari picks it and then rescales, so
// the pixel art smudges), and the PNG has transparency (iOS composites
// it onto black rather than honouring it).

{
  const html = await (await fetch(BASE + 'index.html')).text();
  const manifest = await (await fetch(BASE + 'manifest.webmanifest')).json();

  const refs = [];
  for (const m of html.matchAll(/<link[^>]*rel="(apple-touch-icon|icon)"[^>]*>/g)) {
    const href = /href="([^"]+)"/.exec(m[0])?.[1];
    const sizes = /sizes="(\d+)x\1"/.exec(m[0])?.[1];
    if (href) refs.push({ href, want: sizes ? Number(sizes) : null, from: m[1] });
  }
  for (const i of manifest.icons) {
    refs.push({ href: i.src, want: Number(i.sizes.split('x')[0]), from: 'manifest' });
  }

  check('the page and manifest reference home-screen icons', refs.length >= 6,
    `${refs.length} references`);
  check('an apple-touch-icon is offered at 180, the size iOS draws',
    refs.some((r) => r.from === 'apple-touch-icon' && r.want === 180));

  const bad = [];
  const notOpaque = [];
  for (const r of refs) {
    const res = await fetch(BASE + r.href);
    if (!res.ok) { bad.push(`${r.href} is ${res.status}`); continue; }
    const png = Buffer.from(await res.arrayBuffer());
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    if (w !== h) bad.push(`${r.href} is ${w}x${h}, not square`);
    else if (r.want !== null && w !== r.want) bad.push(`${r.href} declares ${r.want} and is ${w}`);

    // Every pixel opaque. Worth decoding for: a transparent icon looks
    // correct in every preview and turns into a black square on a home
    // screen, which is exactly the kind of bug that only shows up on
    // the device, three days later, in someone else's hands.
    const idat = [];
    for (let o = 8; o + 8 <= png.length;) {
      const len = png.readUInt32BE(o), type = png.toString('ascii', o + 4, o + 8);
      if (type === 'IDAT') idat.push(png.subarray(o + 8, o + 8 + len));
      o += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = w * 4;
    const line = Buffer.alloc(stride);
    const prev = Buffer.alloc(stride);
    let opaque = true;
    for (let y = 0; y < h && opaque; y++) {
      const f = raw[y * (stride + 1)];
      raw.copy(line, 0, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? line[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
        if (f === 1) line[i] = (line[i] + a) & 255;
        else if (f === 2) line[i] = (line[i] + b) & 255;
        else if (f === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
        else if (f === 4) {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
        }
      }
      for (let i = 3; i < stride; i += 4) if (line[i] !== 255) { opaque = false; break; }
      line.copy(prev);
    }
    if (!opaque) notOpaque.push(r.href);
  }
  check('every icon exists and is the size it says it is', bad.length === 0, bad.join('; '));
  check('every icon is fully opaque, so iOS has no transparency to blacken',
    notOpaque.length === 0, notOpaque.join(', '));
}

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
