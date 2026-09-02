// The word list for the Insel der Sprache.
//
// Chosen against three constraints at once, which is why it is a
// hand-written table and not a dictionary slice:
//
//   1. A first-grader knows the word. No abstractions, no compounds
//      they have never met.
//   2. The FIRST SOUND is unambiguous. That rules out Sch-, St-, Sp-
//      and Ch- words, where the letter a child hears is not the letter
//      the word starts with — those are a later lesson and putting
//      them here would teach the wrong thing.
//   3. The syllable count is the one a teacher would clap. `Tomate` is
//      three claps, `Baum` is one. Where German phonology and clapping
//      disagree, clapping wins, because clapping is the exercise.
//
// Every word here is also a line the voice has to speak, so
// `tools/genvoice.mjs` reads this table directly.

export interface Wort {
  wort: string;
  /** Claps. */
  silben: number;
}

export const WOERTER: Wort[] = [
  { wort: 'Apfel', silben: 2 },
  { wort: 'Ananas', silben: 3 },
  { wort: 'Ball', silben: 1 },
  { wort: 'Banane', silben: 3 },
  { wort: 'Baum', silben: 1 },
  { wort: 'Blume', silben: 2 },
  { wort: 'Dose', silben: 2 },
  { wort: 'Drache', silben: 2 },
  { wort: 'Elefant', silben: 3 },
  { wort: 'Ente', silben: 2 },
  { wort: 'Esel', silben: 2 },
  { wort: 'Feder', silben: 2 },
  { wort: 'Fisch', silben: 1 },
  { wort: 'Gabel', silben: 2 },
  { wort: 'Garten', silben: 2 },
  { wort: 'Haus', silben: 1 },
  { wort: 'Hund', silben: 1 },
  { wort: 'Igel', silben: 2 },
  { wort: 'Insel', silben: 2 },
  { wort: 'Kamel', silben: 2 },
  { wort: 'Katze', silben: 2 },
  { wort: 'Krokodil', silben: 3 },
  { wort: 'Lampe', silben: 2 },
  { wort: 'Leiter', silben: 2 },
  { wort: 'Maus', silben: 1 },
  { wort: 'Mond', silben: 1 },
  { wort: 'Nase', silben: 2 },
  { wort: 'Nest', silben: 1 },
  { wort: 'Ofen', silben: 2 },
  { wort: 'Oma', silben: 2 },
  { wort: 'Pilz', silben: 1 },
  { wort: 'Puppe', silben: 2 },
  { wort: 'Rad', silben: 1 },
  { wort: 'Rose', silben: 2 },
  { wort: 'Salat', silben: 2 },
  { wort: 'Sonne', silben: 2 },
  { wort: 'Tisch', silben: 1 },
  { wort: 'Tomate', silben: 3 },
  { wort: 'Uhr', silben: 1 },
  { wort: 'Vogel', silben: 2 },
  { wort: 'Wolke', silben: 2 },
  { wort: 'Wasser', silben: 2 },
  { wort: 'Zebra', silben: 2 },
  { wort: 'Zitrone', silben: 3 },
];

/**
 * Rhyme families, for the Haus der Reime.
 *
 * Grouped by the SOUND of the ending, not by the spelling, which is the
 * whole exercise — a first-grader hears that Haus and Maus belong
 * together long before they can see why.
 *
 * Getting this table right turned out to matter more than it looks. The
 * first draft had `Ente / Tante / Kante`, which do not rhyme at all —
 * they share a consonant cluster and a different stressed vowel — and
 * `Mond / wohnt / Ton`, where the third has no final t. A rhyme game
 * that accepts a near-miss teaches the child that near-misses count,
 * which is worse than not having the game.
 *
 * Every word is either in WOERTER or in REIMWOERTER below, so every one
 * of them has a recording.
 */
export const REIME: string[][] = [
  ['Haus', 'Maus'],
  ['Tisch', 'Fisch'],
  ['Nase', 'Vase', 'Hase'],
  ['Rose', 'Dose', 'Hose'],
  ['Sonne', 'Tonne'],
  ['Katze', 'Tatze', 'Glatze'],
  ['Baum', 'Traum', 'Schaum'],
  ['Nest', 'Fest'],
  ['Ball', 'Stall'],
  ['Uhr', 'Spur'],
  ['Rad', 'Bad', 'Pfad'],
  ['Hund', 'Mund'],
];

/**
 * The rhyme partners that are not in WOERTER.
 *
 * Kept separate on purpose. WOERTER is the list the Anlaute and Silben
 * houses draw from, and those want clean, common, picture-able nouns
 * with an unambiguous first sound; a rhyme partner only has to sound
 * right at the END. Mixing them would have quietly given the Anlaute
 * house words like `Pfad`, whose first sound is exactly the kind a
 * first-grader is not being asked about yet.
 *
 * `tools/genvoice.mjs` records both lists.
 */
export const REIMWOERTER: string[] = [
  'Vase', 'Hase', 'Hose', 'Tonne', 'Tatze', 'Glatze',
  'Traum', 'Schaum', 'Fest', 'Stall', 'Spur', 'Bad', 'Pfad', 'Mund',
];

/** Does this word rhyme with that one? */
export function reimtSich(a: string, b: string): boolean {
  if (a === b) return false;
  return REIME.some((g) => g.includes(a) && g.includes(b));
}

/** The audio file stem for a word. */
export function stem(wort: string): string {
  return wort
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}
