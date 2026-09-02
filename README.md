# LernInseln

A learning app for one particular six-or-seven-year-old, and possibly
his class. Pixel art, plays on an iPad, lives on GitHub Pages.

**▶ [patrickgod.github.io/lerninseln](https://patrickgod.github.io/lerninseln/)**

A child picks an **island**. On the island stand **houses**. Tapping a
house opens ten short tasks; finishing them earns **Sterne**, which
bring new houses to the island, and **Bonbons**, which the child spends
on cherry trees, sheep, ponds, a windmill and a lighthouse — so the
island slowly becomes theirs and nobody else's.

| island | houses |
|---|---|
| **Die Insel der Zahlen** | Verliebte Zahlen · Nachbarzahlen · Rechenmeister · Zwillinge |
| **Die Insel der Sprache** | Erste Laute · Silben · Erste Wörter · Reime |

The first house is the one the whole thing was built for. **Verliebte
Zahlen** — numbers in love. 1 and 9 are a pair. 2 and 8 are a pair.
Every number has one partner that completes it to ten, and knowing those
ten pairs by heart is one of the genuine turning points in early
arithmetic. Learn a pair **both ways** and its two little creatures move
onto the island and live there together, which means looking at the
island is itself a recall of the fact.

---

## Run it

```
npm install
npm run build          # typechecks, then bundles into dist/
npm run serve          # http://localhost:8322
npm run verify         # plays whole rounds at iPad size, with taps only
node tools/shot.mjs    # screenshots every screen into shots/
node tools/contact.mjs # contact sheets of every sprite
npm run voice          # regenerate the spoken lines with ElevenLabs
node tools/icons.mjs   # regenerate the home-screen icons
```

`?zeit=nacht` on the URL pins the time of day. `?zeit=` also takes
`morgen`, `tag` and `abend`.

## The documents

| file | what it is |
|---|---|
| [DESIGN.md](DESIGN.md) | What the app is and the pedagogy behind it. The **Islands and houses** section at the end is the current shape. |
| [AGENTS.md](AGENTS.md) | Working rules. Read before writing code. |
| [IPAD.md](IPAD.md) | Everything the tablet demands: touch sizes, Safari's traps, offline, Add to Home Screen. |
| [LEARNINGS.md](LEARNINGS.md) | What this build cost to find out. Read it before repeating any of it. |
| [HANDOVER.md](HANDOVER.md) | The original brief, kept for the reasoning. |

## How it is built

Deliberately the same stack as **Tidegarden**, the same person's game,
so the tooling and the pixel-art pipeline transfer:

* **TypeScript**, no framework, bundled with **esbuild**, `tsc --noEmit`
  gating every build.
* **Canvas** for the island, plain **DOM** for menus and answer cards —
  the DOM is better at buttons and canvas is better at pixels.
* **Every sprite drawn in code**, on a closed palette lifted from
  Tidegarden's `ART-DIRECTION.md`. Shading steps along a ramp; it never
  multiplies a colour. Light comes from the upper left, always.
* **`localStorage` only.** No accounts, no network, no analytics — and
  the verification suite checks every request against the page's own
  origin, so that is a fact rather than an intention.
* **A real PWA** — manifest, generated icons, versioned service worker —
  so it opens from the home screen, full screen, with no signal.

```
src/
  core/      palette, pixel buffer, ten-frame, storage, save, audio, fx, i18n
  islands/   the islands, houses, shop, sprites, ambient life, renderer
  games/     one task generator per house, the word list, the word pictures
tools/       build, verify, screenshots, contact sheets, icons, voice
public/      index.html, style.css, manifest, service worker
```

## What is in it

**The island reacts to what the child builds.** Rules, not scripts:
three trees bring birds, a pond brings ducks, a fence gets a sheep, a
vegetable patch gets hens, a flower bed gets butterflies, a hive brings
bees, a bench gets a cat, five trees bring a fox, and the lighthouse
brings a boat across the water. All of it stateless — a pure function of
the clock and what has been placed — so it costs nothing to resume after
a week.

**Day and night** on the real clock. Not a tint: every sprite steps down
its own ramp, and the lights step up. After dark the windows glow, the
lantern is lit, the campfire burns and fireflies drift over the wood.

**Juice**, on the good things only. Hearts burst off the card the child
touched, the stars fly into the counter one at a time, a new house lands
with dust and six pixels of screen shake. Nothing fires on a mistake.

**A postcard** the parent can save and show.

## Voice

Short lines are read aloud, because the child is in the first class and
cannot yet read an instruction. Every house has two greetings: the full
explanation the first time it is opened, a short warm one afterwards.
Praise comes in three.

The lines are **MP3s generated at build time** by `tools/genvoice.mjs`
and shipped with the app — ElevenLabs is a step in the toolchain, like
esbuild, and the running app has never heard of it. If a file is
missing, the tablet's own German voice fills in.

Currently **Matilda** (`XrExE9yKIg1WjnnlVkGX`) on
`eleven_multilingual_v2`. Changing voice is one command and about 1,900
characters:

```
node tools/genvoice.mjs --samples             # one line in six voices
node tools/genvoice.mjs --voice <id> --force
```

## What is not built yet

* Zahlenfreunde bis 20, Einmaleins — the later games from DESIGN.md.
* A third island.
* Pictures for the rest of the word list; twelve of the forty-four have
  one.
