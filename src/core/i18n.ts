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
  'islands.titleNamed': 'Die Inseln von {name}',
  'islands.lead': 'Auf jeder Insel stehen Häuser. In jedem Haus warten Aufgaben.',
  'island.mathe': 'Die Insel der Zahlen',
  'island.mathe.sub': 'Rechnen, zählen, Zahlen finden',
  'island.sprache': 'Die Insel der Sprache',
  'island.sprache.sub': 'Laute, Silben, Wörter',
  'island.entdecker': 'Die Insel der Entdecker',
  'island.entdecker.sub': 'Formen und Muster — ganz ohne Lesen',

  // ------------------------------------------------------- the island
  'island.back': 'Zurück',
  'island.build': 'Bauen',
  'island.buildDone': 'Fertig',
  'island.locked': 'Noch verschlossen',
  'island.needStars': 'Du brauchst {n} Sterne',
  'island.newHouse': 'Ein neues Haus ist da!',
  'island.newFriend': 'Neue Zahlenfreunde: {a} und {b}!',
  'island.tapHouse': 'Tippe auf ein Haus',
  'island.pickHouse': 'Wähle ein Haus, um zu starten',
  'island.fromStars': 'ab {n} Sternen',
  'island.stillLocked': 'Noch {n} Sterne, dann zieht hier jemand ein',

  // -------------------------------------------------------- the shop
  'shop.title': 'Was möchtest du bauen?',
  'shop.geliefert': 'Das Boot hat etwas Neues gebracht!',
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
  'house.woerter': 'Das Haus der ersten Wörter',
  'house.reime': 'Das Haus der Reime',
  'house.schreiben': 'Das Haus der Schreiber',
  'house.silbenwoerter': 'Das Haus der Silbenwörter',
  'house.formen': 'Das Haus der Formen',
  'house.muster': 'Das Haus der Muster',

  // One line per house, for the grown-up sitting next to the child.
  // Deliberately says what is PRACTISED, not what the game does — a
  // parent who reads "Partnerzahlen zur Zehn" knows what their child is
  // working on and can talk to the teacher about it.
  'house.verliebteZahlen.sub': 'Partnerzahlen zur Zehn — 3 und 7, 6 und 4',
  'house.zahlenreihe.sub': 'Vorgänger und Nachfolger bis 20',
  'house.rechenmeister.sub': 'Plus und Minus im Zahlenraum bis 10',
  'house.zwillinge.sub': 'Verdoppeln bis 20',
  'house.anlaute.sub': 'Anlaute hören — mit welchem Buchstaben fängt es an?',
  'house.silben.sub': 'Silben klatschen',
  'house.woerter.sub': 'Erstes Lesen — Bild und Wort zusammenbringen',
  'house.reime.sub': 'Reime hören — Haus und Maus',
  'house.schreiben.sub': 'Silben schreiben — mit dem Finger',
  'house.silbenwoerter.sub': 'Zwei Silben, ein Wort — Ma und ma macht Mama',
  'house.formen.sub': 'Kreis, Dreieck, Quadrat — hören und finden',
  'house.muster.sub': 'Muster fortsetzen — was kommt als Nächstes?',

  // ------------------------------------------------------ the rounds
  'round.progress': 'Aufgabe {n} von {total}',
  'round.done': 'Geschafft!',
  'round.doneStars': 'Du hast {n} Sterne bekommen',
  'round.doneCandy': 'und {n} Bonbons',
  'round.again': 'Nochmal',
  'round.toIsland': 'Zur Insel',
  'round.leave': 'Zurück',
  'round.show': 'Zeigen',
  'round.write': 'Schreibe',

  // The prompts a house speaks when it opens. These are the lines the
  // voice actually says, so they are short, warm, and contain the whole
  // instruction — a child who cannot read has only this.
  // The lines the voice speaks.
  //
  // Two versions of every house greeting, and the reason is that a
  // child will hear these a hundred times. The `.erst` line is the
  // full explanation and plays only the first time that house is ever
  // opened; after that it is the short one. A warm sentence is warm
  // the first time and wearing by the twentieth, and an app that
  // explains the rules again every single visit is talking down to the
  // child who has just learned them.
  //
  // Praise comes in three, picked at random, for the same reason.
  'say.pickIsland': 'Hallo! Schön, dass du da bist. Such dir eine Insel aus.',
  'say.pickHouse': 'Tippe auf ein Haus, dann geht es los.',
  'say.mathe': 'Die Insel der Zahlen. Hier wohnen die Zahlen.',
  'say.sprache': 'Die Insel der Sprache. Hier wohnen die Wörter.',
  'say.entdecker': 'Die Insel der Entdecker. Hier gibt es Formen und Muster.',

  'say.verliebteZahlenErst':
    'Willkommen im Haus der verliebten Zahlen! Zwei Zahlen sind verliebt, wenn sie zusammen zehn ergeben. Die drei und die sieben zum Beispiel. Tippe einfach auf die Zahl, die dazu passt.',
  'say.verliebteZahlen': 'Die verliebten Zahlen! Welche Zahl passt dazu?',

  'say.zahlenreiheErst':
    'Willkommen im Haus der Nachbarzahlen! Hier steht eine Reihe von Zahlen, und eine fehlt. Findest du sie?',
  'say.zahlenreihe': 'Die Nachbarzahlen! Welche Zahl fehlt?',

  'say.rechenmeisterErst':
    'Willkommen im Haus der Rechenmeister! Rechne in Ruhe, und tippe dann auf das Ergebnis.',
  'say.rechenmeister': 'Die Rechenmeister! Was kommt heraus?',

  'say.zwillingeErst':
    'Willkommen im Haus der Zwillinge! Hier gibt es alles doppelt. Verdopple die Zahl und tippe auf das Ergebnis.',
  'say.zwillinge': 'Die Zwillinge! Wie viel ist das Doppelte?',

  'say.anlauteErst':
    'Willkommen im Haus der ersten Laute! Du siehst ein Bild und hörst das Wort. Mit welchem Buchstaben fängt es an?',
  'say.anlaute': 'Die ersten Laute! Womit fängt das Wort an?',

  'say.silbenErst':
    'Willkommen im Haus der Silben! Klatsche das Wort mit, so wie in der Schule. Wie viele Silben hat es?',
  'say.silben': 'Die Silben! Wie oft klatschst du?',

  'say.woerterErst':
    'Willkommen im Haus der ersten Wörter! Du siehst ein Bild. Welches Wort gehört dazu? Lies in Ruhe und tippe darauf.',
  'say.woerter': 'Die ersten Wörter! Welches Wort passt zum Bild?',

  'say.reimeErst':
    'Willkommen im Haus der Reime! Zwei Wörter reimen sich, wenn sie hinten gleich klingen. Haus und Maus zum Beispiel. Welches Wort reimt sich?',
  'say.reime': 'Die Reime! Welches Wort klingt hinten gleich?',

  'say.schreibenErst':
    'Willkommen im Haus der Schreiber! Hier schreibst du mit dem Finger. Fang immer beim roten Punkt an und folge dem Pfeil. Lass dir Zeit.',
  'say.schreiben': 'Die Schreiber! Fang beim roten Punkt an.',

  'say.silbenwoerterErst':
    'Willkommen im Haus der Silbenwörter! Zwei Silben ergeben zusammen ein Wort. Ma und ma macht Mama. Schreib das ganze Wort.',
  'say.silbenwoerter': 'Die Silbenwörter! Schreib das ganze Wort.',
  'say.zeigen': 'Schau, so geht es.',

  'say.formenErst':
    'Willkommen im Haus der Formen! Ich sage dir eine Form, und du tippst sie an. Zum Beispiel: den Kreis.',
  'say.formen': 'Die Formen! Hör zu und tippe die richtige an.',

  'say.musterErst':
    'Willkommen im Haus der Muster! Schau dir die Reihe an. Welche Form kommt als Nächstes?',
  'say.muster': 'Die Muster! Was kommt als Nächstes?',

  // The shape names, spoken one at a time. Every question in the Haus
  // der Formen is one of these and nothing else, which is what lets
  // that house work with no word on the screen at all.
  'say.formKreis': 'Tippe auf den Kreis.',
  'say.formDreieck': 'Tippe auf das Dreieck.',
  'say.formQuadrat': 'Tippe auf das Quadrat.',
  'say.formRechteck': 'Tippe auf das Rechteck.',
  'say.formStern': 'Tippe auf den Stern.',
  'say.formHerz': 'Tippe auf das Herz.',

  'say.wellDone1': 'Das hast du toll gemacht.',
  'say.wellDone2': 'Super! Ich freue mich.',
  'say.wellDone3': 'Das war richtig gut.',
  'say.tryAgain1': 'Schau mal, so geht es.',
  'say.tryAgain2': 'Fast! Schau, so ist es richtig.',
  'say.tryAgain3': 'Kein Problem. Hier ist die passende Zahl.',
  'say.newHouse': 'Schau mal! Ein neues Haus ist auf deine Insel gekommen.',
  'say.newFriend': 'Zwei Zahlen haben sich gefunden! Sie wohnen jetzt auf deiner Insel.',
  'say.build': 'Jetzt kannst du deine Insel schöner machen.',

  // ------------------------------------------------------- currencies
  'cur.stars': 'Sterne',
  'cur.candy': 'Bonbons',

  // ------------------------------------------------------- the things
  // Not 'Kirschbaum'. Patrick's son looked at it and called it a
  // Marshmallowbaum, and the name a child gives a thing is a better
  // name than the one the adult had in mind. The id stays 'kirschbaum'
  // so that every tree already planted survives the rename.
  'deco.kirschbaum': 'Marshmallowbaum',
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
  'deco.birnbaum': 'Birnbaum',
  'deco.pflaumenbaum': 'Pflaumenbaum',
  'deco.beerenbusch': 'Beerenbusch',
  'deco.hecke': 'Hecke',
  'deco.sonnenblumen': 'Sonnenblumen',
  'deco.kuerbisse': 'Kürbisse',
  'deco.pilze': 'Pilze',
  'deco.zuckerstange': 'Zuckerstange',
  'deco.lolliblumen': 'Lolliblumen',
  'deco.bonbonbusch': 'Bonbonbusch',
  'deco.zuckerwatte': 'Zuckerwatte',
  'deco.schokobrunnen': 'Schokobrunnen',
  'deco.lebkuchenhaus': 'Lebkuchenhaus',
  'deco.sandburg': 'Sandburg',
  'deco.fahne': 'Fahne',
  'gruppe.baum': 'Bäume',
  'gruppe.garten': 'Garten',
  'gruppe.nasch': 'Naschwerk',
  'gruppe.tier': 'Tiere',
  'gruppe.bau': 'Dorf',
  'shop.neu': 'Neu',
  'deco.bienenstock': 'Bienenstock',
  'deco.vogelhaus': 'Vogelhaus',
  'deco.feuerstelle': 'Feuerstelle',
  'deco.windmuehle': 'Windmühle',

  // ---------------------------------------------------------- settings
  'set.sound': 'Ton',
  'set.voice': 'Stimme',
  'set.on': 'an',
  'set.off': 'aus',
  'set.name': 'Name',
  'set.namePlaceholder': 'Wie heißt du?',
  'set.postcard': 'Postkarte',
  'set.save': 'Speichern',
  'set.postcardHint': 'Bild gedrückt halten und sichern',
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
