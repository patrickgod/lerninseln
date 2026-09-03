# Learnings

AGENTS.md rule 7: *write learnings down as they are earned, not at the
end.* This file is the record for LernInseln. Everything here was paid
for during the build; nothing in it is a general principle somebody
thought sounded good.

Tidegarden's own `LEARNINGS.md` is the other half of this — the rules
inherited from there are in AGENTS.md and are not repeated.

---

## The bugs that were invisible in the code and obvious in a picture

Every single one of these typechecked, ran without an error, and looked
plausible in the source. All of them were found by taking a screenshot
and looking at it.

**The device pixel ratio, replaced instead of composed.** The renderer
did `ctx.setTransform(scale, 0, 0, scale, 0, 0)`, which threw away the
`dpr` transform the caller had already put on the context. The island
drew at half size in the top-left quarter of the canvas. Invisible at
dpr 1 — which is every desktop browser at default zoom — and obvious on
every iPad. **Use `ctx.scale()` unless you genuinely own the whole
matrix.**

**The ink rim traced the ground shadow.** `Px.rim()` outlines anything
whose alpha is above 8, and the soft contact shadow under a tree is
drawn with alpha 13–70. Every tree, animal and building stood in a
little black box. The fix is ordering, not logic: **the shadow goes on
after the rim, never before.**

**Screen-space neighbours confused with tile-space neighbours.** With
`sx = (x-y)*16` and `sy = (x+y)*8`, the tile at `(x, y-1)` is up and to
the **right**. The foam code assumed it was up and to the left, so surf
appeared on the wrong side of every coastal tile and drew long diagonal
streaks across open water. **Write down which screen edge each
neighbour is on, once, in a comment, and never re-derive it.**

**A full-screen layer that ate every tap.** `#ui > * { pointer-events:
auto }` beat a plain `pointer-events: none` on the house-label layer, so
the island and every button under it went dead. The app looked entirely
normal in a screenshot; the only thing that noticed was a Playwright
`tap()` timing out. **A CSS rule that turns a property back on for all
children will beat the specific rule you wrote to turn it off.**

**Particles under the interface.** The round-end sheet paints a dark
panel across the whole screen, and the effects canvas was below it — so
the stars flying into the counter, the one moment the entire reward is
built around, were invisible.

## Sprites

**A sprite that has never been looked at is probably wrong.** Twelve
word pictures went in; four were bad and only a contact sheet showed it.
Every island sprite went in; six were bad and only a contact sheet
showed it. `tools/contact.mjs` pays for itself in one use.

**Judge a sprite at the size and on the background it will actually be
seen.** The island sheet draws each sprite at island scale, on the
ground tile it stands on, with a house behind it. Judging one alone at
8× on white is how you end up with a fox the size of a cottage.

**Silhouette beats detail below about thirty pixels.** A shared
`critter()` body plan — an ellipse with four dots for legs — produced
five animals that all read as the same grey lump. Each of them had to
be drawn on its own before any of them worked: the hen upright with a
comb, the cat SITTING, the duck with its head up on a neck, the sheep
bright with a dark head *outside* the fleece, the fox a triangle with a
brush. **A shared anatomy is right for a family of buildings and wrong
for a family of animals.**

**Contrast between parts is what makes a small thing legible.** The
sheep was Tidegarden's white-pebble lesson happening a second time. The
Zahlenfreunde had their number on a belly taken from the creature's own
ramp, so a dark purple digit sat on light purple and read as a smudge.

**Sum-of-sines noise on a square grid is not noise.** However many
terms you add, the beat pattern lines up with the grid; the meadow came
out in big rectangular patches that read as a mowing plan. Value noise
with a smoothstep has no period at all.

**Some shapes are easier as a subtraction.** A crescent moon is one disc
minus another. Drawing it by hand gives a banana.

## Tests

**A test that taps at random is a coin toss, not a test.** The round
check tapped random cards and asserted that some stars had been
awarded. With three cards, ten random taps miss everything about once
in sixty runs — and it duly turned the deploy red on a build that was
completely fine. Worse, it asserted almost nothing: a game that scored
the *wrong* card as correct would have sailed through it. Playing the
round deliberately (the partner to ten is ten minus the numeral on
screen) checks the whole chain and gives the same answer every time.

**Random input still has a place — where surviving it IS the
assertion.** A second round is played at random, and what is checked is
that the child reaches the end, that stars never went down, that
something was still paid, and that no word on the screen tells them
they did badly.

**A test that ignores a class of failure will stay green through it.**
The suite skipped 404s under `assets/voice/` because they were expected
before the voices existed. That meant it would have stayed green if the
entire voice set had vanished. It checks the files on disk now, and the
day that check went in it immediately caught a string added to the
table with no recording — and then a regex in the generator that did
not allow digits, so `wellDone1..3` were being silently skipped.

**Measure the work, not the wall clock.** The frame-time check timed
the gaps between animation frames. In a headless browser that is the
scheduler and the load on the machine and almost nothing to do with the
app: it read 17ms on an idle laptop and 35ms on a busy one while the
actual drawing never moved from about two milliseconds. It then went
red on a build whose renderer had not changed at all.

**And then two confident theories died before anybody measured.** The
new campfire particles: innocent, 2ms. A layout flush in the label
placement — `getBoundingClientRect` read once per label per frame,
which really is a bad idea and really was there: also innocent, 0.04ms.
Tidegarden's rule held exactly: *four confident theories about a
performance bug died in a row; the fifth measurement was right and none
of the theories were.* Two here. The instrumentation took five minutes
and would have taken five minutes at the start.

**A performance check is only as good as the regression it can see.**
The rewritten one measures work per frame and reads a stable 1.3ms. Run
against a deliberately quadratic loop over the placed decorations it
reads 1.8ms — it would NOT have caught that. Run with the sprite cache
disabled it reads 103ms. So it covers the catastrophic mistake and not
the subtle one, and the comment in the file says so rather than letting
a future reader assume it covers both.

**Verify the promise, not the intention.** "Nothing leaves the device"
was a comment in AGENTS.md for a week. It is now a check that watches
every request and compares its origin, and it will go red the day
somebody adds a font from a CDN.

**Rule 3 is worth the two minutes.** Before trusting the new round
check, the partner was changed from `10 - n` to `9 - n`; the check
reported `stars=0` and failed, and passed again when it was put back.

## Sound and voice

**Generate speech at build time, not at run time.** ElevenLabs is a
step in the toolchain, like esbuild. The running app has never heard of
it, which is the only way the offline promise survives.

**Post-process the takes.** 128kbps stereo for one spoken German word
is about 16KB, a third of it silence. Mono at 64kbps with the silence
trimmed took the set from 1.8MB to 912KB — and this app caches *all* of
itself on install, so every one of those kilobytes was part of a first
launch on a school iPad. Trimming the lead is also the part a child
notices: the word answers the tap instead of arriving a beat later.

**A line a child hears a hundred times needs two versions.** The full
explanation plays the first time a house is opened and a short one
after that. Praise comes in three, picked at random. The same sentence
every time stops being praise and becomes a noise the app makes.

**Warmth is mostly a settings knob and mostly not.** Stability 0.62 to
0.45 and a little style did make the delivery warmer. But most of what
made the voice friendlier was rewriting the sentences and not repeating
them.

## Design decisions that came out of building it

**Juice is not forbidden by "nothing flashes, pulses or demands".** That
rule is against effects the app starts on its own. Every effect here is
a response to something the child just did — and nothing fires on a
mistake, because a screen shake on a wrong answer would be a small act
of violence against a six-year-old who is already unsure.

**Three pixels of shake is plenty.** A child holds a tablet 30cm from
their face. Anything that looks dramatic in a screenshot is far too
much in the hand.

**Night cannot be made much darker without losing the picture.** Every
colour steps down its own ramp, so two steps in and most of them have
clamped to the bottom and the contrast is gone. What actually says
"night" is small warm lights doing something a daytime island cannot:
lit windows, a lantern, a campfire, and fireflies. *Add light rather
than subtract it.*

**A decoration that does something is worth three that do not.** The
pond bringing ducks by itself teaches a child about cause and effect;
a duck they bought teaches them about a shop. It also keeps the
expensive items paying out after the purchase, which is what stops the
shop being a slot machine.

**An exercise that breaks when you use a switch the app offers is a
broken exercise.** The Anlaute house relied on hearing the word, in an
app whose own rules say sound must be switchable off in two taps. It
has pictures now.

**Read the answers aloud when the child cannot read them.** The rhyme
house spoke the question and printed the options, which handed a
pre-reader a task they could not even perceive.

**Get the content right before the mechanics around it.** The first
rhyme table had `Ente / Tante / Kante`, which do not rhyme, and
`Mond / wohnt / Ton`, where the third has no final t. A rhyme game that
accepts a near-miss teaches the child that near-misses count, which is
worse than not having the game at all.

## Tooling

**The Bash heredoc in this environment eats backslashes and breaks on
apostrophes.** Two files were written wrong before it was noticed.
Anything containing a regex, an escape or an English possessive goes
through the Write tool.

**A version derived from the build beats one somebody has to remember
to bump.** The service worker's cache version is a hash of the bundle.
An installed PWA has no reload button, so a stale cache is
unrecoverable for a child.
