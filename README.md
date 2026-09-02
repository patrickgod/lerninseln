# Lernkiste

A small learning app for one particular six-or-seven-year-old, and
possibly his class. Pixel art, plays on an iPad, lives on GitHub Pages.

The first game is **Zahlenfreunde** — "numbers in love". 1 and 9 are a
pair. 2 and 8 are a pair. Every number has one partner that completes it
to ten, and knowing those ten pairs by heart is one of the genuine
turning points in early arithmetic.

If it turns out to be fun, it becomes a box with more games in it. That
is what "Lernkiste" means — a learning box — and it is why the
architecture assumes more games from the start even though only one is
being built.

> **The name is a placeholder you can overrule.** It is German because
> the child is; it is generic because the app is meant to grow past
> arithmetic. If you want it called something else, now is the cheap
> moment.

---

## Nothing is implemented yet

This folder currently contains **only documentation**, deliberately.
Read these in order:

| file | what it is |
|---|---|
| **[HANDOVER.md](HANDOVER.md)** | **Start here.** The brief for the thread that builds it: what to build first, in what order, and how to know it works. |
| [DESIGN.md](DESIGN.md) | What the app is, the pedagogy behind Zahlenfreunde, and how the gamification avoids being a slot machine. |
| [AGENTS.md](AGENTS.md) | Working rules. Read before writing code. |
| [IPAD.md](IPAD.md) | Everything the tablet demands: touch sizes, Safari's traps, offline, Add to Home Screen. |

## The one-paragraph version

A child taps a number and its partner, the pair falls in love, a ten-frame
fills up, and a small pixel-art creature joins a meadow that stays there
between sessions. Sessions are about three minutes. Nothing is timed,
nothing is lost, nothing is uploaded anywhere, and the whole thing works
on a plane with no signal.
