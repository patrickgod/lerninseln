// The task generators — one per house.
//
// Everything here follows DESIGN.md's didactics, which are standard and
// well-evidenced, so we are not inventing our own:
//
//   Concrete before abstract. Never show `7 + _ = 10` alone to a child
//   at this stage. Show a ten-frame with seven cells filled: the gap is
//   VISIBLE, and the child sees "three missing" before they can
//   calculate it. The frame fades later.
//
//   Both directions. `7 -> 3` and `3 -> 7` are different retrievals to
//   a beginner even though they are the same fact to us.
//
//   The distractors are chosen, not random. A choice that is obviously
//   wrong teaches nothing; a choice that is off by one teaches the
//   child to look at the frame rather than to guess.

import type { Game, Question, Prompt } from './types.js';
import { strengthOf } from '../core/state.js';
import { WOERTER, REIME } from './woerter.js';
import { hasBild } from './wortbilder.js';
import { FORMEN, musterZeile, type Form } from './formen.js';

/** Deterministic-enough randomness. Rounds should not be reproducible. */
function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Weighted pick over facts, favouring the shaky ones.
 *
 * DESIGN.md: spaced repetition on the pairs that are shaky, not uniform
 * random. 5+5 is learned in a day; 7+3 and 6+4 take weeks. Strength 0
 * comes up four times as often as strength 3, which is enough of a tilt
 * to matter over a fortnight and gentle enough that a round never feels
 * like it is drilling one thing.
 */
export function weightedPick(facts: string[]): string {
  const weights = facts.map((f) => 4 - strengthOf(f));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < facts.length; i++) {
    r -= weights[i];
    if (r <= 0) return facts[i];
  }
  return facts[facts.length - 1];
}

/** Three or four numeric cards, one right, the rest plausibly wrong. */
function numberChoices(correct: number, span: number, count: number, max: number): string[] {
  const wrong = new Set<number>();
  // Neighbours first: off-by-one is the mistake a child actually makes,
  // and a card that is off by one is the card that teaches them to
  // count the frame instead of guessing.
  const candidates = [correct - 1, correct + 1, correct - 2, correct + 2, correct + 3, correct - 3];
  for (const c of candidates) {
    if (wrong.size >= count - 1) break;
    if (c === correct || c < 0 || c > max) continue;
    if (Math.abs(c - correct) > span) continue;
    wrong.add(c);
  }
  while (wrong.size < count - 1) {
    const c = Math.floor(Math.random() * (max + 1));
    if (c !== correct) wrong.add(c);
  }
  return shuffle([correct, ...wrong]).map(String);
}

// ------------------------------------------- Haus der verliebten Zahlen

/**
 * Partners to ten, in both directions.
 *
 * The band a pair is in is per-pair and never announced. A child can be
 * remembering 5+5 while still seeing 7+3, which is exactly how it
 * really works.
 */
export const verliebteZahlen: Game = {
  id: 'verliebte-zahlen',
  facts: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `vz:${n}`),
  next(pick) {
    const fact = pick(this.facts());
    const n = Number(fact.slice(3));
    const partner = 10 - n;
    const s = strengthOf(fact);

    // Seeing -> Knowing -> Remembering, per pair. The frame is filled,
    // then an empty outline, then gone.
    const numeral = true;
    const prompt: Prompt = { kind: 'tenframe', n: s >= 3 ? -1 : n, numeral };

    const count = s === 0 ? 3 : 4;
    return {
      fact,
      prompt,
      choices: numberChoices(partner, 3, count, 10),
      correct: -1,   // filled in below
      showOnMiss: { kind: 'tenframe', n: 10, numeral: false },
    } as Question;
  },
};

// -------------------------------------------- Haus der Nachbarzahlen

export const zahlenreihe: Game = {
  id: 'zahlenreihe',
  facts: () => Array.from({ length: 19 }, (_, i) => `zr:${i + 1}`),
  next(pick) {
    const fact = pick(this.facts());
    const missing = Number(fact.slice(3));
    // A window of five around the gap, clipped to 0..20, gap in the
    // middle where possible — a gap at the end is a different and
    // harder task, and this house is not that house.
    const start = Math.max(0, Math.min(16, missing - 2));
    const seq: (number | null)[] = [];
    for (let i = 0; i < 5; i++) seq.push(start + i === missing ? null : start + i);
    return {
      fact,
      prompt: { kind: 'reihe', seq },
      choices: numberChoices(missing, 3, 4, 20),
      correct: -1,
      showOnMiss: { kind: 'reihe', seq: seq.map((v) => v === null ? missing : v) },
    } as Question;
  },
};

// -------------------------------------------- Haus der Rechenmeister

export const rechenmeister: Game = {
  id: 'rechenmeister',
  facts: () => {
    const out: string[] = [];
    for (let a = 0; a <= 10; a++) for (let b = 0; a + b <= 10; b++) out.push(`rm:${a}+${b}`);
    return out;
  },
  next(pick) {
    const fact = pick(this.facts());
    const [a, b] = fact.slice(3).split('+').map(Number);
    // Half the questions run backwards, because a child who can do
    // 6+3 and cannot do 9-3 has learned a procedure, not a fact.
    const minus = Math.random() < 0.4;
    const prompt: Prompt = minus
      ? { kind: 'rechnung', a: a + b, b, op: '-' }
      : { kind: 'rechnung', a, b, op: '+' };
    const answer = minus ? a : a + b;
    return {
      fact,
      prompt,
      choices: numberChoices(answer, 3, 4, 10),
      correct: -1,
      showOnMiss: { kind: 'tenframe', n: answer, numeral: true },
    } as Question;
  },
};

// ------------------------------------------------- Haus der Zwillinge

export const zwillinge: Game = {
  id: 'zwillinge',
  facts: () => Array.from({ length: 11 }, (_, i) => `zw:${i}`),
  next(pick) {
    const fact = pick(this.facts());
    const n = Number(fact.slice(3));
    return {
      fact,
      prompt: { kind: 'doppel', n },
      choices: numberChoices(n * 2, 4, 4, 20),
      correct: -1,
      showOnMiss: { kind: 'doppel', n },
    } as Question;
  },
};

// --------------------------------------------- Haus der ersten Laute

export const anlaute: Game = {
  id: 'anlaute',
  // Only words that have a picture. The question is "which letter does
  // this word START with", and without a picture the only way to know
  // WHICH word is to hear it — which makes the whole house stop working
  // the moment a parent turns the sound off in a waiting room. A house
  // that breaks when you use a switch the app itself offers is broken.
  facts: () => WOERTER.filter((w) => hasBild(w.wort)).map((w) => `an:${w.wort}`),
  next(pick) {
    const fact = pick(this.facts());
    const w = WOERTER.find((x) => `an:${x.wort}` === fact) ?? WOERTER[0];
    const letter = w.wort[0].toUpperCase();
    // Distractors are letters that actually confuse a beginner — the
    // ones that sound close, then any others.
    const confusable: Record<string, string[]> = {
      B: ['P', 'D'], P: ['B', 'T'], D: ['T', 'B'], T: ['D', 'P'],
      G: ['K', 'C'], K: ['G', 'C'], F: ['V', 'W'], V: ['F', 'W'],
      W: ['V', 'M'], M: ['N', 'W'], N: ['M', 'H'], S: ['Z', 'F'],
      Z: ['S', 'T'], L: ['R', 'N'], R: ['L', 'N'], H: ['N', 'K'],
      A: ['O', 'E'], E: ['A', 'I'], I: ['E', 'U'], O: ['A', 'U'], U: ['O', 'I'],
    };
    const near = (confusable[letter] ?? ['M', 'S']).slice();
    const pool = 'ABDEFGHIKLMNOPRSTUWZ'.split('').filter((c) => c !== letter);
    while (near.length < 3) {
      const c = pickOne(pool);
      if (!near.includes(c)) near.push(c);
    }
    return {
      fact,
      prompt: { kind: 'wort', wort: w.wort, audio: w.wort.toLowerCase(), zeige: false },
      choices: shuffle([letter, ...near.slice(0, 3)]),
      correct: -1,
      showOnMiss: { kind: 'wort', wort: w.wort, audio: w.wort.toLowerCase(), zeige: true },
    } as Question;
  },
};

// -------------------------------------------------- Haus der Silben

export const silben: Game = {
  id: 'silben',
  facts: () => WOERTER.map((w) => `si:${w.wort}`),
  next(pick) {
    const fact = pick(this.facts());
    const w = WOERTER.find((x) => `si:${x.wort}` === fact) ?? WOERTER[0];
    // The word IS shown here, because clapping a word you can see is
    // the exercise the teacher actually sets — and a first-grader who
    // is learning to read gains from seeing it while hearing it.
    return {
      fact,
      prompt: { kind: 'wort', wort: w.wort, audio: w.wort.toLowerCase(), zeige: true },
      choices: ['1', '2', '3', '4'],
      correct: -1,
      showOnMiss: { kind: 'wort', wort: w.wort, audio: w.wort.toLowerCase(), zeige: true },
    } as Question;
  },
};

// ------------------------------------------------- Haus der ersten Wörter

/**
 * A picture, and three written words. Tap the one that says it.
 *
 * The first real reading exercise in the box, and the point where the
 * language island stops being about sounds and starts being about
 * print. Deliberately the other way round from Anlaute: there the word
 * is heard and a letter is chosen, here the word is SEEN and matched to
 * a thing — which is what reading actually is.
 *
 * The distractors are chosen to share a first letter or a length with
 * the answer wherever possible, because a child who can rule out two
 * words by their shape alone has not read anything.
 */
export const woerterLesen: Game = {
  id: 'woerter',
  facts: () => WOERTER.filter((w) => hasBild(w.wort)).map((w) => `wl:${w.wort}`),
  next(pick) {
    const fact = pick(this.facts());
    const wort = fact.slice(3);
    const pool = WOERTER.map((w) => w.wort).filter((w) => w !== wort);
    // Same initial first, then similar length, then anything.
    const near = pool.filter((w) => w[0] === wort[0]);
    const sized = pool.filter((w) => Math.abs(w.length - wort.length) <= 1 && w[0] !== wort[0]);
    const wrong: string[] = [];
    for (const list of [near, sized, pool]) {
      for (const w of shuffle(list)) {
        if (wrong.length >= 2) break;
        if (!wrong.includes(w)) wrong.push(w);
      }
    }
    return {
      fact,
      prompt: { kind: 'wort', wort, audio: wort.toLowerCase(), zeige: false },
      choices: shuffle([wort, ...wrong]),
      correct: -1,
      showOnMiss: { kind: 'wort', wort, audio: wort.toLowerCase(), zeige: true },
    } as Question;
  },
};

// ------------------------------------------------------- Haus der Reime

/**
 * Which of these rhymes with the word you just heard?
 *
 * Rhyme awareness is one of the strongest predictors of how easily a
 * child learns to read, and it is a listening skill rather than a
 * reading one — so the word is spoken and the answers are spoken too
 * when tapped.
 */
export const reime: Game = {
  id: 'reime',
  facts: () => REIME.map((g) => `re:${g[0]}`),
  next(pick) {
    const fact = pick(this.facts());
    const group = REIME.find((g) => g[0] === fact.slice(3)) ?? REIME[0];
    const wort = group[0];
    const partner = group[1 + Math.floor(Math.random() * (group.length - 1))];
    // Distractors come from OTHER families, so nothing else in the row
    // rhymes and there is exactly one right answer.
    const others = REIME.filter((g) => g !== group).flat();
    const wrong = shuffle(others).slice(0, 2);
    return {
      fact,
      prompt: { kind: 'wort', wort, audio: wort.toLowerCase(), zeige: true },
      choices: shuffle([partner, ...wrong]),
      correct: -1,
      showOnMiss: { kind: 'wort', wort, audio: wort.toLowerCase(), zeige: true },
    } as Question;
  },
};

// -------------------------------------------------- Haus der Formen

/**
 * The shape is NAMED aloud and the cards are shapes.
 *
 * No word appears on the screen at any point, which makes this the one
 * house a child who cannot read a single letter can play completely
 * unaided — and it is still teaching vocabulary, because hearing
 * "Dreieck" while tapping a triangle is exactly how the word gets
 * attached to the thing.
 */
export const formen: Game = {
  id: 'formen',
  facts: () => FORMEN.map((f) => `fo:${f}`),
  next(pick) {
    const fact = pick(this.facts());
    const want = fact.slice(3) as Form;
    const wrong = shuffle(FORMEN.filter((f) => f !== want)).slice(0, 3);
    return {
      fact,
      prompt: { kind: 'form', frage: want },
      choices: shuffle([want, ...wrong]).map((f) => `form:${f}`),
      correct: -1,
    } as Question;
  },
};

// -------------------------------------------------- Haus der Muster

/**
 * A row of shapes with the last one missing.
 *
 * Continuing a pattern is one of the genuinely load-bearing skills in
 * early maths: it is the same reasoning that becomes "what comes next
 * in this number sequence", years before any numbers are involved. And
 * like the shapes house, it needs no reading at all.
 */
export const muster: Game = {
  id: 'muster',
  // The fact is the KIND of pattern rather than the shapes in it, so
  // the scheduler practises the ones a child finds hard rather than
  // hunting for a particular pair of colours.
  facts: () => ['mu:ab', 'mu:aabb', 'mu:abb'],
  next(pick) {
    const fact = pick(this.facts());
    const seed = Math.floor(Math.random() * 1e6);
    let z = musterZeile(seed);
    // Nudge the seed until the generated pattern is the kind that was
    // asked for. Cheap, and much simpler than threading the kind
    // through the generator.
    const wanted = fact.slice(3);
    for (let i = 0; i < 40; i++) {
      const kind = kindOf(z.row);
      if (kind === wanted) break;
      z = musterZeile(seed + i * 7919);
    }
    const wrong = shuffle(FORMEN.filter((f) => f !== z.answer)).slice(0, 2);
    return {
      fact,
      prompt: { kind: 'muster', reihe: z.row },
      choices: shuffle([z.answer, ...wrong]).map((f) => `form:${f}`),
      correct: -1,
      // The answer is carried on the prompt so `expectedAnswer` can
      // find it without re-deriving the pattern.
      showOnMiss: { kind: 'muster', reihe: [...z.row, z.answer] },
    } as Question;
  },
};

function kindOf(row: string[]): string {
  if (row[0] === row[1]) return row[2] === row[1] ? 'ab' : 'aabb';
  return row[1] === row[2] ? 'abb' : 'ab';
}

// ---------------------------------------------------------------- glue

/**
 * The correct index, resolved once here rather than in every generator.
 *
 * The generators above build their choices with `shuffle`, so none of
 * them KNOWS where the right card ended up; asking each of them to
 * track it was four chances to get it wrong. Instead each one states
 * the answer as a value, and this finds it.
 */
export function answerOf(gameId: string, q: Question): number {
  const want = expectedAnswer(gameId, q);
  const i = q.choices.indexOf(want);
  return i >= 0 ? i : 0;
}

function expectedAnswer(gameId: string, q: Question): string {
  switch (gameId) {
    case 'verliebte-zahlen':
      return String(10 - Number(q.fact.slice(3)));
    case 'zahlenreihe':
      return q.fact.slice(3);
    case 'rechenmeister': {
      const p = q.prompt as Extract<Prompt, { kind: 'rechnung' }>;
      return String(p.op === '+' ? p.a + p.b : p.a - p.b);
    }
    case 'zwillinge':
      return String(Number(q.fact.slice(3)) * 2);
    case 'anlaute':
      return q.fact.slice(3)[0].toUpperCase();
    case 'silben': {
      const w = WOERTER.find((x) => x.wort === q.fact.slice(3));
      return String(w ? w.silben : 2);
    }
    case 'woerter':
      return q.fact.slice(3);
    case 'formen':
      return `form:${q.fact.slice(3)}`;
    case 'muster': {
      // The full row, answer included, is on `showOnMiss`; the last of
      // it is what the row continues with.
      const p = q.showOnMiss as Extract<Prompt, { kind: 'muster' }> | undefined;
      if (!p) return q.choices[0];
      return `form:${p.reihe[p.reihe.length - 1]}`;
    }
    case 'reime': {
      // The generator picked one partner out of the family; the answer
      // is whichever card is in the same family as the prompt word.
      const group = REIME.find((g) => g[0] === q.fact.slice(3));
      if (!group) return q.choices[0];
      return q.choices.find((c) => group.includes(c)) ?? q.choices[0];
    }
    default:
      return q.choices[0];
  }
}

export const GAMES: Record<string, Game> = {
  'verliebte-zahlen': verliebteZahlen,
  'zahlenreihe': zahlenreihe,
  'rechenmeister': rechenmeister,
  'zwillinge': zwillinge,
  'anlaute': anlaute,
  'silben': silben,
  'woerter': woerterLesen,
  'reime': reime,
  'formen': formen,
  'muster': muster,
};

/** Build a whole round: ten questions, no fact twice in a row. */
export function buildRound(gameId: string, n = 10): Question[] {
  const g = GAMES[gameId];
  const out: Question[] = [];
  let last = '';
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const q = g.next(weightedPick);
    if (q.fact === last) continue;
    q.correct = answerOf(gameId, q);
    out.push(q);
    last = q.fact;
  }
  return out;
}
