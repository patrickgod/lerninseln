# LernInseln

A learning app for one particular six-or-seven-year-old, and possibly
his class. Pixel art, plays on an iPad, lives on GitHub Pages.

A child picks an **island**. On the island stand **houses**. Tapping a
house opens ten short tasks; finishing them earns **Sterne**, which
bring new houses to the island, and **Bonbons**, which the child spends
on cherry trees, sheep, ponds, lanterns and a lighthouse — so the island
slowly becomes theirs and nobody else's.

Two islands to start with:

| island | houses |
|---|---|
| **Die Insel der Zahlen** | Das Haus der verliebten Zahlen · Die Nachbarzahlen · Die Rechenmeister · Die Zwillinge |
| **Die Insel der Sprache** | Das Haus der ersten Laute · Das Haus der Silben |

The first house is the one the whole thing was built for. **Verliebte
Zahlen** — numbers in love. 1 and 9 are a pair. 2 and 8 are a pair.
Every number has one partner that completes it to ten, and knowing those
ten pairs by heart is one of the genuine turning points in early
arithmetic.

---

## Run it

```
npm install
npm run build      # typechecks, then bundles into dist/
npm run serve      # http://localhost:8322
npm run verify     # plays a whole round at iPad size, with taps
node tools/shot.mjs   # screenshots into shots/
```

`npm run voice` regenerates the spoken lines with ElevenLabs. It needs
an API key with the `text_to_speech` permission; without one the app
falls back to the tablet's own German voice (see **Voice** below).

## The documents

| file | what it is |
|---|---|
| [DESIGN.md](DESIGN.md) | What the app is, the pedagogy, and why the gamification is not a slot machine. The **Islands and houses** section at the end is the current shape. |
| [AGENTS.md](AGENTS.md) | Working rules. Read before writing code. |
| [IPAD.md](IPAD.md) | Everything the tablet demands: touch sizes, Safari's traps, offline, Add to Home Screen. |
| [HANDOVER.md](HANDOVER.md) | The original brief, kept for the reasoning. |

## How it is built

Deliberately the same stack as
[Tidegarden](https://store.steampowered.com/), the same person's game,
so the tooling and the pixel-art pipeline transfer:

* **TypeScript**, no framework, bundled with **esbuild**, `tsc --noEmit`
  gating every build.
* **Canvas** for the island, plain **DOM** for menus and answer cards —
  the DOM is better at buttons and canvas is better at pixels.
* **Every sprite drawn in code**, on a closed palette lifted from
  Tidegarden's `ART-DIRECTION.md`. Shading steps along a ramp; it never
  multiplies a colour.
* **`localStorage` only.** No accounts, no network, no analytics. The
  app makes no requests at all once it has loaded.
* **A real PWA** — manifest, icons, service worker — so it opens from
  the home screen, full screen, with no signal.

```
src/
  core/      palette, pixel buffer, ten-frame, storage, save, audio, i18n
  islands/   the islands, their houses, the shop, the sprites, the renderer
  games/     one task generator per house
tools/       build, verify, screenshots, icons, voice
public/      index.html, style.css, manifest, service worker
```

## Voice

Short lines are read aloud, because the child is in the first class and
cannot yet read an instruction. There are two sources, in order:

1. **Pre-generated MP3s** under `assets/voice/`, made at build time by
   `tools/genvoice.mjs` with ElevenLabs and shipped with the app. This
   is the one that sounds right and is identical every time.
2. **The tablet's own German voice**, if those files are not there.

ElevenLabs is a step in the toolchain, like esbuild — it runs on the
build machine, and the running app has never heard of it. That is what
lets the app keep the promise in AGENTS.md that nothing leaves the
device.

**Currently the fallback is what plays.** The ElevenLabs key on this
machine is scoped to sound generation and does not carry the
`text_to_speech` permission, so `npm run voice` returns 401. Grant that
permission (or supply another key as `ELEVENLABS_API_KEY`) and run:

```
node tools/genvoice.mjs --samples          # one line in six voices
node tools/genvoice.mjs --voice <id> --force
```

Then listen to `audio_raw/sample-*.mp3` and pick the one that sounds
like somebody a six-year-old would want to be read to by.

## What is not built yet

* Pictures for the language island, so `Anlaute` works with the sound
  off.
* A settings screen for the two switches that already exist in the save
  (sound, voice).
* The remaining games from DESIGN.md: Zahlenfreunde bis 20, Einmaleins.
