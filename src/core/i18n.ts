// Every string the child or a parent can see, in one table.
//
// AGENTS.md rule 6: nothing user-facing is written inline, from the
// first commit. Retrofitting this cost a week on Tidegarden and costs
// nothing here.
//
// German is the source language because the child is German and his
// teacher uses these words. The shape below is Tidegarden's: a flat
// table of keys, `{slots}` filled at call time, and one `t()`.
//
// A second reason the table matters more here than it did there: every
// line a first-grader hears is also a line the VOICE has to speak, and
// `tools/genvoice.mjs` reads this file to decide what to send to
// ElevenLabs. A string that is not in the table cannot be spoken.

export type Lang = 'de';

const DE = {
  // ---------------------------------------------------------- the app
  'app.name': 'LernInseln',
  'app.tagline': 'Such dir eine Insel aus',

  // ------------------------------------------------------ island pick
  'islands.title': 'Wähle eine Insel',
  'island.mathe': 'Die Insel der Zahlen',
  'island.mathe.sub': 'Rechnen, zählen, Zahlen finden',
  'island.sprache': 'Die Insel der Sprache',
  'island.sprache.sub': 'Laute, Silben, Wörter',

  // ------------------------------------------------------- the island
  'island.back': 'Zurück',
  'island.build': 'Bauen',
  'island.buildDone': 'Fertig',
  'island.locked': 'Noch verschlossen',
  'island.needStars': 'Du brauchst {n} Sterne',
  'island.newHouse': 'Ein neues Haus ist da!',
  'island.tapHouse': 'Tippe auf ein Haus',

  // -------------------------------------------------------- the shop
  'shop.title': 'Was möchtest du bauen?',
  'shop.close': 'Fertig',
  'shop.tooExpensive': 'Dafür brauchst du noch mehr Bonbons',
  'shop.placeIt': 'Tippe auf einen freien Platz',

  // --------------------------------------------------------- houses
  'house.verliebteZahlen': 'Das Haus der verliebten Zahlen',
  'house.zahlenreihe': 'Das Haus der Nachbarzahlen',
  'house.rechenmeister': 'Das Haus der Rechenmeister',
  'house.zwillinge': 'Das Haus der Zwillinge',
  'house.anlaute': 'Das Haus der ersten Laute',
  'house.silben': 'Das Haus der Silben',

  // ------------------------------------------------------ the rounds
  'round.progress': 'Aufgabe {n} von {total}',
  'round.done': 'Geschafft!',
  'round.doneStars': 'Du hast {n} Sterne bekommen',
  'round.doneCandy': 'und {n} Bonbons',
  'round.again': 'Nochmal',
  'round.toIsland': 'Zur Insel',
  'round.leave': 'Zurück',

  // The prompts a house speaks when it opens. These are the lines the
  // voice actually says, so they are short, warm, and contain the whole
  // instruction — a child who cannot read has only this.
  'say.pickIsland': 'Wähle eine Insel.',
  'say.mathe': 'Die Insel der Zahlen. Hier wohnen die Zahlen.',
  'say.sprache': 'Die Insel der Sprache. Hier wohnen die Wörter.',
  'say.verliebteZahlen':
    'Willkommen im Haus der verliebten Zahlen. Zwei Zahlen sind verliebt, wenn sie zusammen zehn ergeben. Tippe auf die passende Zahl.',
  'say.zahlenreihe':
    'Willkommen im Haus der Nachbarzahlen. Welche Zahl fehlt in der Reihe? Tippe sie an.',
  'say.rechenmeister':
    'Willkommen im Haus der Rechenmeister. Rechne die Aufgabe und tippe auf das Ergebnis.',
  'say.zwillinge':
    'Willkommen im Haus der Zwillinge. Verdopple die Zahl und tippe auf das Ergebnis.',
  'say.anlaute':
    'Willkommen im Haus der ersten Laute. Höre gut hin. Mit welchem Buchstaben fängt das Wort an?',
  'say.silben':
    'Willkommen im Haus der Silben. Klatsche das Wort. Wie viele Silben hat es?',
  'say.wellDone': 'Das hast du toll gemacht.',
  'say.tryAgain': 'Schau mal, so geht es.',
  'say.build': 'Jetzt kannst du deine Insel schöner machen.',

  // ------------------------------------------------------- currencies
  'cur.stars': 'Sterne',
  'cur.candy': 'Bonbons',

  // ------------------------------------------------------- the things
  'deco.kirschbaum': 'Kirschbaum',
  'deco.apfelbaum': 'Apfelbaum',
  'deco.tanne': 'Tanne',
  'deco.blumenbeet': 'Blumenbeet',
  'deco.brunnen': 'Brunnen',
  'deco.teich': 'Teich',
  'deco.zaun': 'Zaun',
  'deco.beet': 'Gemüsebeet',
  'deco.schaf': 'Schaf',
  'deco.huhn': 'Huhn',
  'deco.fuchs': 'Fuchs',
  'deco.katze': 'Katze',
  'deco.ente': 'Ente',
  'deco.laterne': 'Laterne',
  'deco.bank': 'Bank',
  'deco.leuchtturm': 'Leuchtturm',

  // ---------------------------------------------------------- settings
  'set.sound': 'Ton',
  'set.voice': 'Stimme',
  'set.on': 'an',
  'set.off': 'aus',
  'set.reset': 'Alles zurücksetzen',
  'set.resetSure': 'Wirklich alles löschen?',
  'set.resetYes': 'Ja, löschen',
  'set.resetNo': 'Nein',
} as const;

export type Key = keyof typeof DE;

const TABLES: Record<Lang, Record<string, string>> = { de: DE };

let lang: Lang = 'de';

export function setLang(l: Lang): void {
  lang = l;
}

/**
 * Look a string up and fill its slots.
 *
 * A missing key returns the key itself rather than throwing: a wrong
 * label on screen is recoverable, a crash mid-round in front of a
 * six-year-old is not.
 */
export function t(key: Key | string, slots?: Record<string, string | number>): string {
  const s = TABLES[lang][key];
  if (s === undefined) return String(key);
  if (!slots) return s;
  return s.replace(/\{(\w+)\}/g, (m, name) =>
    slots[name] !== undefined ? String(slots[name]) : m);
}

/** Every key, for the voice generator and the i18n test. */
export function allKeys(): string[] {
  return Object.keys(DE);
}

/** The subset that is spoken aloud. `tools/genvoice.mjs` reads these. */
export function spokenKeys(): string[] {
  return allKeys().filter((k) => k.startsWith('say.'));
}

export function raw(key: string): string | undefined {
  return TABLES[lang][key];
}
