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

/** The audio file stem for a word. */
export function stem(wort: string): string {
  return wort
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}
