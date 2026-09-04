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
  | { kind: 'wort'; wort: string; audio: string; zeige: boolean }
  /** "Tippe auf den Kreis." The shape is named aloud, never written. */
  | { kind: 'form'; frage: string }
  /** A row of shapes with the last one missing. */
  | { kind: 'muster'; reihe: string[] }
  /**
   * A Steckwuerfelstange: `ganz` cubes, the first `teil` in one colour.
   *
   * Out of the real homework, and the reason it is not just another
   * ten-frame: the frame says "five and five", the bar says "this long,
   * split here". A child who only ever sees one picture of a number has
   * learned the picture.
   */
  | { kind: 'stange'; ganz: number; teil: number; gefuellt: boolean }
  /**
   * A Zahlenhaus: a roof number and rows of two, one of them gapped.
   *
   * The rows around the gap are already filled in, which is the point —
   * the house shows the whole systematic list, and a child who spots
   * that one side counts down while the other counts up has found
   * something better than the answer.
   */
  | { kind: 'zahlenhaus'; dach: number; zeilen: [number, number | null][] }
  /** A dice face. Recognised, never counted. */
  | { kind: 'wuerfel'; augen: number }
  /** Two dice that must add to `ganz`, one of them still blank. */
  | { kind: 'wuerfelpaar'; ganz: number; augen: number }
  /** One vehicle, and which way is it going. */
  | { kind: 'richtung'; art: string; rechts: boolean }
  /**
   * Write this, with a finger.
   *
   * The only prompt with no answer cards at all: the answer IS the
   * tracing, and the round moves on when the last stroke lands.
   */
  | { kind: 'schreiben'; text: string; teile?: [string, string] };

export interface Question {
  /**
   * Stable id for this exact fact, so the scheduler can remember that
   * 7 is shaky and 5 is not. Never shown.
   */
  fact: string;
  prompt: Prompt;
  /**
   * The tappable cards.
   *
   * A plain string is written on the card. Four prefixes are DRAWN on
   * it instead — `form:`, `wuerfel:`, `fahrzeug:` and `pfeil:` — which
   * is how a house asks a question with no words on screen at all.
   */
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
