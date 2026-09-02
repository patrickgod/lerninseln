// What a task looks like, whichever house it came from.
//
// Every house produces the same shape, so the round screen is written
// once and a new house is a generator rather than a new screen. That is
// the whole reason this file exists: DESIGN.md promises five more games
// in this box, and the second one should cost an afternoon.

/** How the question is SHOWN. A first-grader cannot read the question. */
export type Prompt =
  /** A ten-frame with n cells filled, optionally with the numeral. */
  | { kind: 'tenframe'; n: number; numeral: boolean }
  /** A row of numbers with exactly one gap. */
  | { kind: 'reihe'; seq: (number | null)[] }
  /** An arithmetic sentence with the result hidden. */
  | { kind: 'rechnung'; a: number; b: number; op: '+' | '-' }
  /** Double this number. Shown as two ten-frames filling together. */
  | { kind: 'doppel'; n: number }
  /** A spoken word. The child hears it; nothing is written. */
  | { kind: 'wort'; wort: string; audio: string; zeige: boolean };

export interface Question {
  /**
   * Stable id for this exact fact, so the scheduler can remember that
   * 7 is shaky and 5 is not. Never shown.
   */
  fact: string;
  prompt: Prompt;
  /** The tappable cards, as they are labelled. */
  choices: string[];
  /** Index into `choices`. */
  correct: number;
  /**
   * What to show when the child taps a wrong card. The correction is a
   * PICTURE — the ten-frame completing itself with the right partner —
   * never the word "wrong".
   */
  showOnMiss?: Prompt;
}

export interface Game {
  id: string;
  /** Ten of these make a round. */
  next(pick: (facts: string[]) => string): Question;
  /** Every fact this game can ask, so the scheduler can weight them. */
  facts(): string[];
}
