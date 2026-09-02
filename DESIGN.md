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
