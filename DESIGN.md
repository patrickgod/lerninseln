# Lernkiste — design

## Who this is for

One child, six or seven years old, learning the number bonds to ten.
Possibly his classmates later. That audience decides almost everything
below, and it is worth being blunt about the ways it differs from a game
for adults:

* **He cannot be trusted to be resilient about failure yet.** A red X
  and a buzzer, ten times in a row, teaches a child that maths is
  something they are bad at. That lesson sticks for decades.
* **He is on a borrowed tablet, probably at a kitchen table, probably
  for five minutes.** Not a session. An interlude.
* **He cannot read much.** Instructions have to be shown, not written.
* **He will find every way to break it.** Double taps, four fingers,
  rotating mid-answer, closing the lid.

## The learning goal, stated precisely

**Automatic recall of the ten pairs that make 10.**

```
0+10   1+9   2+8   3+7   4+6   5+5   6+4   7+3   8+2   9+1   10+0
```

Not "can work it out" — *automatic*. A child who has to count up from 6
on their fingers to reach 10 will still be counting on their fingers
when the class has moved to two-digit addition, and every later step
costs them more. This one small set of facts, known cold, is what makes
the next two years easier. It is the single highest-leverage thing a
seven-year-old can memorise.

The German school term for these is **Zahlenfreunde** or *Partnerzahlen*
— number friends. Patrick's "numbers in love" is the same idea with more
romance, and it is a better name.

### The didactic method this follows

Standard and well-evidenced, so we should not invent our own:

1. **Concrete → pictorial → abstract.** Never show `7 + _ = 10` alone to
   a child at this stage. Show a **ten-frame** (*Zehnerfeld*) — two rows
   of five — with seven cells filled. The gap is *visible*, and the child
   sees "three missing" before they can calculate it. Only later does the
   frame fade and the numerals stand alone.
2. **Both directions.** `7 → 3` and `3 → 7` are different retrievals to
   a beginner even though they are the same fact to us. Drill both.
3. **Spaced repetition on the pairs that are shaky**, not uniform random.
   5+5 is learned in a day; 7+3 and 6+4 take weeks. The app must notice.
4. **Immediate, corrective feedback.** A wrong answer shows the ten-frame
   completing itself with the *right* partner, so the correction is a
   picture rather than a scolding.

### Deliberately NOT in the first game

Speed. Timers create anxiety in exactly the children who need the
practice most, and a stopwatch turns a five-minute interlude into a test.
Fluency comes from repetition, not from pressure. If a speed mode is ever
added it should be an opt-in extra with its own cheerful framing, never
the default.

---

## Zahlenfreunde — the game

### The core loop

1. A number appears — as a numeral **and** as a filled ten-frame.
2. Three or four candidate partners appear as large tappable cards.
3. The child taps one.
4. **Right:** the two numbers slide together, the ten-frame fills, a
   small heart, a soft chime. The pair is now "in love".
5. **Wrong:** nothing is taken away. The chosen card gently returns, and
   the ten-frame shows how many cells the choice *would* have filled —
   so the child sees "that is too few" rather than being told "no".
6. Ten questions. Then the meadow.

A round is about three minutes. That is the whole session length, on
purpose.

### Why tapping and not dragging

Dragging is more satisfying and worse: it is harder for small hands, it
fails badly on a smudged screen, and a dropped drag reads as a wrong
answer when it was a motor slip. **Tap to choose is the primary
interaction.** Drag may be added later as an alternative for children who
prefer it, never as the only way.

### Difficulty, and how it moves

Three bands, entered automatically and never announced as levels:

| band | what it shows |
|---|---|
| **Seeing** | Ten-frame filled, numeral shown, 3 choices, one obviously wrong. |
| **Knowing** | Ten-frame outline only (unfilled), numeral shown, 4 choices. |
| **Remembering** | No frame. Numeral alone, 4 choices, both directions mixed. |

Movement between bands is per-pair, not global — a child can be
*remembering* 5+5 while still *seeing* 7+3, which is exactly how it
really works. A pair moves up after three correct in a row and drops back
one band on a miss. No band is ever displayed as a score.

---

## Gamification, and the trap in it

The instinct is points, streaks and stars. All three are a mistake here:

* **Points** measure the wrong thing and invite grinding.
* **Streaks** punish the day you were ill. A seven-year-old who breaks a
  47-day streak has been taught something genuinely bad.
* **Stars out of three** turn a practice session into a graded test.

Instead: **the collectible IS the learning object.**

Each pair of numbers is a pair of small pixel-art creatures who are
friends — the Ones and the Nines, the Threes and the Sevens. Learn a pair
well and its two creatures move into **the meadow**, a persistent little
scene that grows over weeks. Come back and they are still there, doing
something small and idle.

This is worth doing because it makes the reward *be* the knowledge:
looking at the meadow and seeing 6 and 4 sitting together is itself a
recall of the fact. A star would have been decoration; this is revision.

Rules that keep it kind:

* **Nothing is ever taken away.** A creature never leaves the meadow.
* **No daily pressure.** The meadow does not wilt.
* **No comparison.** No leaderboards, no classmates' scores, ever.
* **Progress is visible without being numeric.** How full the meadow is,
  not 63%.

---

## Where it goes after this

Each is a separate game in the same box, sharing the meadow and the
progress model:

1. **Zahlenfreunde bis 10** — this one.
2. **Zahlenfreunde bis 20** — partners to twenty.
3. **Verdopplen und Halbieren** — doubles and halves.
4. **Plus und Minus bis 20**, with the ten-crossing that number bonds
   exist to make possible — which is the pay-off for game one.
5. **Einmaleins** — times tables, same spaced-repetition machinery.

The architecture should assume this. One game, one folder, a shared
`core/` for the ten-frame, the scheduler, the meadow and the audio.

---

## Firm constraints

* **No accounts. No network. No analytics. No third-party anything.**
  This is a child's app on a family iPad. Everything lives in
  `localStorage` and nothing leaves the device. If a future feature needs
  a server, that is a conversation, not an implementation detail.
* **It works offline**, because tablets are used in cars and on trains.
* **It cannot be failed**, and there is no way to reach a screen that
  says you have done badly.
* **German first.** The child's school teaches in German, so German is
  the source language — but build it through a string table from day one
  rather than hard-coding, because that lesson was expensive to learn
  late on Tidegarden and free to apply early here.

---

# Islands and houses

*Added after the first prototype, when the shell around the learning
changed. Everything above still holds — the pedagogy, the ten-frame,
the both-directions drilling, the no-fail rule — and the argument
against points is answered rather than abandoned.*

## What changed

Patrick, looking at ANTON: *"jetzt finde ich die spiele in der ANTON app
aber etwas stumpf. wieso den kids und den eltern nicht zeigen wie schön
videospiele sein können?"*

So the meadow became an **island**, and the box of games became a small
archipelago:

* A child picks an **island** — Die Insel der Zahlen, Die Insel der
  Sprache. More islands are a data entry and a seed.
* On each island stand **houses**. Each house is one kind of task.
  Tapping the Haus der verliebten Zahlen gives ten partner-to-ten
  questions; the Haus der Silben gives ten words to clap.
* Finishing tasks earns two currencies, and new houses **arrive on the
  island** as the first one crosses a threshold.
* The second currency buys **decoration** — cherry trees, apple trees,
  a pond, hens, a sheep, a cat, a fox, a bench, a well, a lighthouse —
  which the child places on the island themselves.

The island is the reward, the progress bar and the save file all at
once, and it is the thing on screen for most of the time the app is
open.

## The two currencies, and why they are not the points this document
## warned about

The document above argues against points, streaks and stars. It is
right about the things it means, and none of them are here:

| the trap | why it is not here |
|---|---|
| **Points that measure you** | Sterne are not a score. They are never compared, never shown as a total out of anything, and there is no screen on which a number can be judged. |
| **Streaks that punish the day you were ill** | Nothing decays. An island that was left for a month is exactly as it was. |
| **Stars out of three** | There is no rating of a round. Ten questions give up to ten Sterne, and a Stern arrives for getting a fact right, not for getting the round right. |
| **Grinding** | The star ladder for houses is short and then stops. After the last house, Sterne do nothing at all, and Bonbons buy trees. |

**Sterne** only ever go up. They are a record of what has been learned
and they unlock houses. **Bonbons** are the only number in the app that
can go down, and only because the child chose to spend them on a sheep —
that is agency, not punishment, and it is the one place where a falling
number is a good thing. A decoration can be picked up again and the
Bonbons come back in full, so even a regretted purchase is not a loss.

The original argument was that *the collectible should be the learning
object*, so that looking at the reward is itself revision. The island
keeps the better half of that — a persistent scene that grows over weeks
and is never taken away — and trades the rest for something the meadow
did not have: **the child decides what it looks like.** A meadow that
fills itself is a progress bar with animals on it. An island the child
arranges is theirs.

## The houses, and the ladder

| island | house | opens at | what it practises |
|---|---|---|---|
| Zahlen | Das Haus der verliebten Zahlen | from the start | partners to ten, both ways |
| Zahlen | Das Haus der Nachbarzahlen | 12 Sterne | predecessor and successor to 20 |
| Zahlen | Das Haus der Rechenmeister | 40 Sterne | plus and minus to 10 |
| Zahlen | Das Haus der Zwillinge | 80 Sterne | doubling to 20 |
| Sprache | Das Haus der ersten Laute | from the start | initial sounds, from a picture |
| Sprache | Das Haus der Silben | 20 Sterne | clapping syllables |
| Sprache | Das Haus der ersten Wörter | 45 Sterne | first reading: picture to word |
| Sprache | Das Haus der Reime | 85 Sterne | rhyme awareness, by ear |

The first rung is deliberately flat: about two good rounds, so a child
who plays twice on the first evening sees the island change and
understands the whole mechanic without being told it. The gaps widen
after that, because the point of the later houses is to still be
arriving in three weeks.

House positions are **fixed**. A child who learns that the Haus der
verliebten Zahlen is the one in the middle should find it there
tomorrow; a house that wanders is a house you cannot remember. The
decorations, which the child places, are the part that moves.

## Voice

*"es wäre auch super cool, wenn einführende kurze texte von einer netten
weichen frauenstimme vorgelesen werden könnten. die kinder sind
schließlich in der ersten klasse."*

This is not a nicety, it is the fix for AGENTS.md rule 13 — no text is
load-bearing, because the child cannot reliably read yet. Every house
speaks one short line when it opens, and it contains the whole
instruction: *"Willkommen im Haus der verliebten Zahlen. Zwei Zahlen sind
verliebt, wenn sie zusammen zehn ergeben. Tippe auf die passende Zahl."*

The lines are generated at build time and shipped as MP3s, so the
running app still makes no network calls; see README.md for the current
state of that.

## The Zahlenfreunde

The original argument in this document — *the collectible IS the
learning object* — was left behind when the meadow became an island,
and it is back.

Each pair of numbers that makes ten is a pair of small creatures. A
pair moves onto the maths island when **both** of its facts are at full
strength, because `7 → 3` and `3 → 7` are different retrievals to a
beginner and a child who can do one and not the other has not learned
the pair. They wander in twos and never separate, each pair with its
own corner of the ground around the Haus der verliebten Zahlen.

Six pairs to find. Looking at the island and seeing the 6 and the 4
walking together is itself a recall of the fact — and the gaps are
visible without a single number on screen, which is a progress bar a
six-year-old reads without being taught how.

## A living island

Everything the child builds changes what lives there. Three trees bring
birds; a pond brings ducks; a fence gets a sheep; a vegetable patch gets
hens; a flower bed gets butterflies; a hive brings bees; a bench gets a
cat; five trees bring a fox; the lighthouse brings a boat across the
water.

This is the difference between a shop and a world. Buying a pond and
later noticing that the ducks came **on their own** teaches a child
about cause and effect; a duck you simply bought teaches them about a
shop. It also means the expensive things keep paying out after the
purchase.

All of it is stateless — a pure function of the clock and what has been
placed — so nothing accumulates, nothing is lost, and a week away costs
nothing.

## Day and night

The island reads the real clock, so a child who plays after dinner sees
a different island from the one they saw after school. Not a tint: every
sprite steps down its own ramp and the lights step **up**, which is why
dusk reads as the lanterns coming on rather than as the island being
switched off.

Night is deliberately not very dark. Two ramp steps in, most colours
have clamped to the bottom of their ramp and the picture loses its
contrast — and a darker island would be harder for a six-year-old to
read at bedtime and no more atmospheric. What says "night" is small warm
lights doing something a daytime island cannot: lit windows, a lantern,
a campfire, and fireflies over the wood.

## Juice, and the one place it must not go

Patrick asked for animation, sound effects and screen shake. This
document's older rule — *nothing flashes, pulses or demands* — is not
against that. It is against effects the app starts on its own. So:

**Every effect is a response to something the child just did. Nothing
fires while they are sitting still, and nothing fires on a mistake.**

A screen shake on a wrong answer is the most obvious thing to build and
it would be a small act of violence against a six-year-old who is
already unsure. The shake fires on a house arriving, a building being
placed and a round finishing. Three pixels for a building, six for a
house: a child holds a tablet 30cm from their face, and anything that
looks dramatic in a screenshot is far too much in the hand.

## Still open

* **The spaced repetition is in and invisible.** Every fact carries a
  strength of 0..3 and weak facts come round four times as often. It has
  never been watched over a real fortnight, which is the only way to
  know whether the tilt is right.
* **Pictures for the rest of the word list.** Twelve of the forty-four
  words have one, and only those twelve can appear in the two houses
  that need a picture.
* **A third island.** The machinery takes a seed; the content is the
  work.
