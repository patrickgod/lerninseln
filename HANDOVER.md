# Handover — start here

You are picking up a project that has documentation and no code. This
file is the brief. Read [DESIGN.md](DESIGN.md) for what the thing is,
[AGENTS.md](AGENTS.md) for how to work, and [IPAD.md](IPAD.md) before
writing a single line of layout.

**Patrick's instruction, verbatim:** *"a learning app for my son… first
learning thing could be 'numbers in love', meaning 1 is partner of 9, 2
is partner of 8, so always how much is missing to get 10… maybe, if it
is fun, we can build a whole learning app around that… played on a
tablet I think, iPad I guess, and of course we can add gamification for
motivation maybe? pixel art as well. let's try a first prototype."*

---

## What to build first

**One playable round of Zahlenfreunde on an iPad, and nothing else.**

Resist building the box before the first thing in it. The question this
prototype answers is *"does a seven-year-old want to do another round?"*
— and no amount of menu, settings screen or second game helps answer it.

### The thin slice

1. A round is **ten questions**.
2. Each question: a numeral plus a **ten-frame** showing that many filled
   cells, and **three large cards** to tap.
3. Correct → the pair slides together, the frame completes, a heart, a
   soft chime.
4. Wrong → the card returns gently, and the ten-frame briefly shows what
   that choice *would* have made. No red, no buzzer, no "wrong".
5. After ten: the **meadow**, with any newly-won creature walking in.
6. State survives a reload.

That is the whole prototype. It should be playable in a browser and
installable to the home screen.

### Deliberately not in the prototype

Difficulty bands, spaced repetition, more than one game, a game picker,
settings, sound options, animations beyond the two named above. All of
those are in DESIGN.md because they are the plan, not because they are
the prototype. **Build the loop, put it in front of the child, then
decide.**

## Suggested order

1. **Repo skeleton** — TypeScript, esbuild, `tsc --noEmit` in the build,
   a page that loads and says nothing. Deploy it to GitHub Pages
   immediately, before it does anything, so deployment is never a
   surprise later. Copy the pattern from Tidegarden's
   `.github/workflows/deploy.yml`.
2. **The iPad shell** — viewport, safe areas, no zoom, no selection, no
   rubber-band, `100dvh`, canvas at the right device pixel ratio. Verify
   on the actual iPad, or at minimum in Playwright's iPad emulation with
   touch on. Getting this right first means never fighting it later.
3. **The ten-frame**, as a component that can be drawn at any size with n
   cells filled. It is the visual spine of every game in the box, so it
   is worth making properly.
4. **One question, hard-coded.** Tap a card, get the right answer or the
   gentle correction. This is the moment to look at it and judge whether
   it feels good.
5. **The round** — ten questions, drawn from the ten pairs, both
   directions.
6. **The meadow and one creature pair**, persisted.
7. **PWA** — manifest, icons, service worker, installed test.

Steps 1–4 are the risky ones. Steps 5–7 are turning a handle.

## How to know it works

* `tsc --noEmit` clean; a `verifyall`-style suite in `tools/`.
* Every interactive element measured ≥64×64 CSS px **by a test**, not by
  eye.
* A whole round completed in Playwright using `tap()` only.
* The app loads with the network disabled after one visit.
* A screenshot at iPad resolution that someone has actually looked at.
* **The real test:** the child plays it twice without being asked to.

## Decisions already made

You do not need to re-litigate these; they are in DESIGN.md with
reasoning.

* Tap to answer, never drag-only.
* No timers, no score, no streaks, no stars, no fail state.
* The collectible is the learning object — creatures per number pair,
  living in a persistent meadow.
* German is the source language, but through a string table from the
  first commit, not hard-coded.
* Nothing leaves the device. No network, no analytics, ever.
* Ten-frame first, numerals-only later — concrete before abstract.

## Open questions for Patrick

Ask; do not assume.

1. **His son's age and where he is** — can he read short German words?
   Does he already know some pairs? This changes the starting difficulty
   and how much text is allowed.
2. **The name.** "Lernkiste" is a placeholder. So is "Zahlenfreunde",
   though it is the real term his teacher will use.
3. **Which iPad, and which iOS?** An old school iPad is a much slower
   renderer and it changes the performance budget.
4. **Landscape or portrait?** Recommendation: landscape, because a
   ten-frame is a wide shape. Worth one question rather than a rebuild.
5. **Voice?** Spoken German numbers would help a child who cannot read
   yet, and it is a big lift. Probably not for the prototype.
6. **Classmates later?** If yes, nothing changes technically — no
   accounts either way — but it raises the bar on polish and on the
   German being correct.

## Where to look for prior art

`C:\Development\Tidegarden` is the same person's game, built the same
way. Worth copying rather than reinventing:

* `.github/workflows/deploy.yml` — the private-source, public-pages
  deploy.
* `tools/verifyall.mjs` and the other harnesses — the pattern of driving
  a real browser and asserting on real pixels.
* `src/pixel/palette.ts` — the closed-palette approach, and
  `ART-DIRECTION.md` for why shading steps along a ramp.
* `src/i18n.ts` — string tables with slots, plural rules via `Intl`.
  Lift the shape wholesale; it was expensive to retrofit there.
* `LEARNINGS.md` — the general ones, especially about testing what you
  can actually see.
