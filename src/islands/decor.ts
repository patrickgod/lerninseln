// The shop: everything a child can buy with sweets and put on an island.
//
// Prices are a curve, not a list. The cheap things cost about one good
// round, so the first purchase happens on the first evening and the
// mechanic is understood immediately. The expensive things cost about a
// fortnight, so there is something to still be saving for.
//
// Nothing here is ever unavailable. A locked shop item is a "you are
// not good enough yet" told by a price tag, and this app does not say
// that. Everything shown is buyable; the only question is how many
// sweets are in the tin.
//
// ---------------------------------------------------------------------
//
// The shop GROWS, and there is a real difference between growing and
// locking.
//
// A locked shop shows a padlock and a condition — "40 Sterne" — under a
// greyed-out picture of something a child wants. It says *you are not
// good enough for this yet*, once per item, every time they open it.
// And the child in question cannot read the condition anyway, which
// makes it a grey rectangle that is theirs and also not theirs.
//
// A growing shop shows only the things that exist. When a round ends,
// new things have ARRIVED, with a small "Neu" flash and a line from the
// voice, and the shop that was eight cards is eleven. Nothing has ever
// been refused, nothing has ever been greyed out, and the child has
// twice as much to look at in a fortnight as they did on the first
// evening.
//
// Same mechanic, opposite feeling. `ab` below is the lifetime star count
// at which a thing turns up. It is never SHOWN and never explained.
//
// It also solves a problem the first playtest found from the other
// direction: twenty-seven cards on the first evening is a wall, and a
// wall is as hard to choose from as a blank page.

export type Gruppe = 'baum' | 'garten' | 'nasch' | 'tier' | 'bau';

export interface DecoDef {
  id: string;
  nameKey: string;
  price: number;
  /** Which sprite generator draws it. */
  art: string;
  /** Rough grouping for the shop rows. */
  group: Gruppe;
  /**
   * Lifetime stars at which this turns up in the shop. Zero means it is
   * there from the first minute. NEVER shown to the child.
   */
  ab: number;
  /**
   * May be placed on the beach. Only the sandcastle, and it is here so
   * that the sand ring — the largest unbuildable part of every island —
   * has one thing that belongs on it.
   */
  sand?: boolean;
}

/**
 * The order the groups appear in the shop.
 *
 * Trees first because a tree is the biggest change a single purchase
 * makes to an empty island, and the first thing a child buys should be
 * the thing that most obviously worked.
 */
export const GRUPPEN: Gruppe[] = ['baum', 'garten', 'nasch', 'tier', 'bau'];

export const DECOR: DecoDef[] = [
  // ------------------------------------------------------------ trees
  //
  // `kirschbaum` keeps its id and loses its name. It is the
  // Marshmallowbaum now, because that is what a six-year-old called it
  // when he saw it, and he was righter than the adult who drew it: pink
  // round things on a stick ARE marshmallows. The id stays put so that
  // every cherry tree already planted on a real island survives.
  { id: 'kirschbaum', nameKey: 'deco.kirschbaum', price: 12, art: 'cherry', group: 'baum', ab: 0 },
  { id: 'tanne', nameKey: 'deco.tanne', price: 8, art: 'pine', group: 'baum', ab: 0 },
  { id: 'apfelbaum', nameKey: 'deco.apfelbaum', price: 14, art: 'apple', group: 'baum', ab: 10 },
  { id: 'beerenbusch', nameKey: 'deco.beerenbusch', price: 9, art: 'berry', group: 'baum', ab: 10 },
  { id: 'birnbaum', nameKey: 'deco.birnbaum', price: 14, art: 'pear', group: 'baum', ab: 30 },
  { id: 'pflaumenbaum', nameKey: 'deco.pflaumenbaum', price: 16, art: 'plum', group: 'baum', ab: 45 },

  // ----------------------------------------------------------- garden
  { id: 'blumenbeet', nameKey: 'deco.blumenbeet', price: 6, art: 'flowers', group: 'garten', ab: 0 },
  { id: 'zaun', nameKey: 'deco.zaun', price: 4, art: 'fence', group: 'garten', ab: 0 },
  { id: 'pilze', nameKey: 'deco.pilze', price: 5, art: 'mushrooms', group: 'garten', ab: 0 },
  { id: 'hecke', nameKey: 'deco.hecke', price: 6, art: 'hedge', group: 'garten', ab: 10 },
  { id: 'beet', nameKey: 'deco.beet', price: 10, art: 'veg', group: 'garten', ab: 20 },
  { id: 'sonnenblumen', nameKey: 'deco.sonnenblumen', price: 11, art: 'sunflowers', group: 'garten', ab: 20 },
  { id: 'kuerbisse', nameKey: 'deco.kuerbisse', price: 13, art: 'pumpkins', group: 'garten', ab: 30 },
  { id: 'teich', nameKey: 'deco.teich', price: 20, art: 'pond', group: 'garten', ab: 30 },

  // ------------------------------------------------------------ sweets
  //
  // The Marshmallowbaum family. Priced a little above their plain
  // equivalents on purpose: an island of nothing but candy is a worse
  // picture than an island with a candy corner, and the price is what
  // makes it a corner.
  { id: 'zuckerstange', nameKey: 'deco.zuckerstange', price: 9, art: 'zuckerstange', group: 'nasch', ab: 10 },
  { id: 'lolliblumen', nameKey: 'deco.lolliblumen', price: 12, art: 'lolliblumen', group: 'nasch', ab: 20 },
  { id: 'bonbonbusch', nameKey: 'deco.bonbonbusch', price: 15, art: 'bonbonbusch', group: 'nasch', ab: 30 },
  { id: 'zuckerwatte', nameKey: 'deco.zuckerwatte', price: 17, art: 'zuckerwatte', group: 'nasch', ab: 45 },
  { id: 'schokobrunnen', nameKey: 'deco.schokobrunnen', price: 34, art: 'schokobrunnen', group: 'nasch', ab: 80 },
  { id: 'lebkuchenhaus', nameKey: 'deco.lebkuchenhaus', price: 55, art: 'lebkuchenhaus', group: 'nasch', ab: 110 },

  // ---------------------------------------------------------- animals
  { id: 'huhn', nameKey: 'deco.huhn', price: 10, art: 'hen', group: 'tier', ab: 20 },
  { id: 'ente', nameKey: 'deco.ente', price: 12, art: 'duck', group: 'tier', ab: 30 },
  { id: 'schaf', nameKey: 'deco.schaf', price: 18, art: 'sheep', group: 'tier', ab: 45 },
  { id: 'vogelhaus', nameKey: 'deco.vogelhaus', price: 20, art: 'birdbox', group: 'tier', ab: 45 },
  { id: 'katze', nameKey: 'deco.katze', price: 22, art: 'cat', group: 'tier', ab: 60 },
  { id: 'bienenstock', nameKey: 'deco.bienenstock', price: 26, art: 'beehive', group: 'tier', ab: 60 },
  { id: 'fuchs', nameKey: 'deco.fuchs', price: 30, art: 'fox', group: 'tier', ab: 80 },

  // ---------------------------------------------------------- village
  { id: 'fahne', nameKey: 'deco.fahne', price: 5, art: 'fahne', group: 'bau', ab: 0 },
  { id: 'laterne', nameKey: 'deco.laterne', price: 8, art: 'lamp', group: 'bau', ab: 0 },
  { id: 'bank', nameKey: 'deco.bank', price: 10, art: 'bench', group: 'bau', ab: 0 },
  { id: 'sandburg', nameKey: 'deco.sandburg', price: 7, art: 'sandburg', group: 'bau', ab: 20, sand: true },
  { id: 'feuerstelle', nameKey: 'deco.feuerstelle', price: 18, art: 'campfire', group: 'bau', ab: 45 },
  { id: 'brunnen', nameKey: 'deco.brunnen', price: 25, art: 'well', group: 'bau', ab: 60 },
  { id: 'leuchtturm', nameKey: 'deco.leuchtturm', price: 60, art: 'lighthouse', group: 'bau', ab: 80 },
  { id: 'windmuehle', nameKey: 'deco.windmuehle', price: 75, art: 'windmill', group: 'bau', ab: 110 },
];

export function deco(id: string): DecoDef | undefined {
  return DECOR.find((d) => d.id === id);
}

/** Everything that has turned up so far, in shop order. */
export function sortiment(stars: number): DecoDef[] {
  return GRUPPEN.flatMap((g) => DECOR.filter((d) => d.group === g && d.ab <= stars));
}

/**
 * What has just arrived, crossing from `vorher` stars to `jetzt`.
 *
 * Used by the end of a round to say "the boat brought something".
 * Returns an empty list far more often than not, which is the point:
 * an arrival that happens every time is not an arrival.
 */
export function neuAb(vorher: number, jetzt: number): DecoDef[] {
  return DECOR.filter((d) => d.ab > vorher && d.ab <= jetzt);
}

/** The star totals at which anything at all arrives, for tests. */
export function stufen(): number[] {
  return [...new Set(DECOR.map((d) => d.ab))].sort((a, b) => a - b);
}
