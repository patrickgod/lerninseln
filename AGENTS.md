# Working rules for Lernkiste

Read this, then **[DESIGN.md](DESIGN.md)**, then **[IPAD.md](IPAD.md)**.
If you are starting the build, **[HANDOVER.md](HANDOVER.md)** is the
brief.

These rules are inherited from `C:\Development\Tidegarden` — the same
person's game project, built the same way, where most of them were paid
for the hard way. Where a rule has a scar attached, the scar is written
down, because a rule without its reason gets followed literally and
wrongly.

---

## The rules that carried over

1. **The build typechecks.** `tsc --noEmit` gates every build. Never
   bypass it, never ship around it.
2. **Verify by looking, not by assuming.** Screenshots and measurements
   over reasoning about what the code should do. On Tidegarden this
   lesson was paid for at least six separate times: birds that were never
   on screen, seasons that were already working, sheep that read as white
   pebbles until someone cropped the image to 170 pixels.
3. **A new test must be seen to fail before it is trusted to pass.** Run
   it against the broken code first. A test that has never failed is a
   test you are trusting on faith.
4. **When a measurement surprises you, the measurement is the suspect** —
   but check it, do not dismiss it. Four confident theories about a
   performance bug died in a row on the last project; the fifth
   measurement was right and none of the theories were.
5. **Numbers in documents are measurements, never estimates.**
6. **Nothing that faces the user is written inline.** Every string goes
   through a table from the first commit. Retrofitting this cost a week
   elsewhere; doing it on day one costs nothing.
7. **Write learnings down** in `LEARNINGS.md` as they are earned, not at
   the end.

## The rules that are new here, because a child uses it

8. **Nothing leaves the device.** No network calls, no analytics, no
   fonts from a CDN, no telemetry, not even an error reporter. If you
   find yourself typing `fetch(`, stop and ask.
9. **There is no fail state and no way to reach one.** No red X, no
   buzzer, no "wrong", no score that can go down. A mistake shows the
   right answer as a picture and moves on.
10. **Every interactive thing is at least 64×64 CSS pixels** with 12px
    of clear space around it. Apple's 44pt minimum is for adults.
11. **Tap is the primary interaction.** Never require a drag, a swipe, a
    long-press or a gesture to answer a question — a motor slip must
    never read as a wrong answer.
12. **It works with no network on first launch after install.** Offline
    is a feature, not a nicety.
13. **No text is load-bearing.** The child cannot reliably read yet. If
    an instruction cannot be shown with a picture, an animation or a
    sound, it is the wrong instruction.
14. **Sound is optional and off-switchable in two taps**, because this
    gets played in waiting rooms.

## Technical shape

Deliberately the same stack as Tidegarden, so the tooling, the muscle
memory and the pixel-art pipeline all transfer:

* **TypeScript**, no framework, bundled with **esbuild**.
* **Canvas** for the game area, plain DOM for menus and buttons —
  the same split Tidegarden uses, for the same reason: DOM is better at
  buttons and canvas is better at pixels.
* **Pixel art on a closed palette**, in the manner of Tidegarden's
  `ART-DIRECTION.md`. Shading means stepping along a ramp, never
  multiplying a colour.
* **`localStorage` for everything**, wrapped so a private-mode failure
  degrades to "this session only" rather than crashing.
* **GitHub Pages** deploy, same pattern as Tidegarden: a private source
  repo that builds and force-pushes the built artefact to a public repo.
* **Playwright** for the verification suite — including at real iPad
  viewport sizes, with touch emulation rather than mouse events.

## Structure

```
src/
  core/        shared: ten-frame, scheduler, storage, audio, i18n, palette
  games/
    zahlenfreunde/
  meadow/      the persistent reward scene
  ui/          menus, the game picker
tools/         verifyall.mjs and friends
public/        index.html, manifest, icons, service worker
```

`core/` must not import from `games/`. A game may import from `core/`.
The scheduler and the storage layer are shared by every future game, so
they should be written as if the second game already exists.

## What "done" means for a change

A change is done when it typechecks, the verification suite passes, a
screenshot at iPad resolution has actually been looked at, and — for
anything a child touches — someone has asked *what happens if they tap it
twice, or with two fingers, or halfway through the animation.*
