// The shop: everything a child can buy with sweets and put on an island.
//
// Prices are a curve, not a list. The cheap things cost about one good
// round, so the first purchase happens on the first evening and the
// mechanic is understood immediately. The expensive things cost about a
// fortnight, so there is something to still be saving for.
//
// Nothing here is ever unavailable. A locked shop item is a "you are
// not good enough yet" told by a price tag, and this app does not say
// that. Everything is buyable from minute one; the only question is
// how many sweets are in the tin.

export interface DecoDef {
  id: string;
  nameKey: string;
  price: number;
  /** Which sprite generator draws it. */
  art: string;
  /** Rough grouping for the shop rows. */
  group: 'baum' | 'garten' | 'tier' | 'bau';
}

export const DECOR: DecoDef[] = [
  // ------------------------------------------------------------ trees
  { id: 'kirschbaum', nameKey: 'deco.kirschbaum', price: 12, art: 'cherry', group: 'baum' },
  { id: 'apfelbaum', nameKey: 'deco.apfelbaum', price: 14, art: 'apple', group: 'baum' },
  { id: 'tanne', nameKey: 'deco.tanne', price: 8, art: 'pine', group: 'baum' },

  // ----------------------------------------------------------- garden
  { id: 'blumenbeet', nameKey: 'deco.blumenbeet', price: 6, art: 'flowers', group: 'garten' },
  { id: 'beet', nameKey: 'deco.beet', price: 10, art: 'veg', group: 'garten' },
  { id: 'zaun', nameKey: 'deco.zaun', price: 4, art: 'fence', group: 'garten' },
  { id: 'teich', nameKey: 'deco.teich', price: 20, art: 'pond', group: 'garten' },

  // ---------------------------------------------------------- animals
  { id: 'huhn', nameKey: 'deco.huhn', price: 10, art: 'hen', group: 'tier' },
  { id: 'ente', nameKey: 'deco.ente', price: 12, art: 'duck', group: 'tier' },
  { id: 'schaf', nameKey: 'deco.schaf', price: 18, art: 'sheep', group: 'tier' },
  { id: 'katze', nameKey: 'deco.katze', price: 22, art: 'cat', group: 'tier' },
  { id: 'fuchs', nameKey: 'deco.fuchs', price: 30, art: 'fox', group: 'tier' },

  // ------------------------------------------------------- the orchard
  { id: 'birnbaum', nameKey: 'deco.birnbaum', price: 14, art: 'pear', group: 'baum' },
  { id: 'pflaumenbaum', nameKey: 'deco.pflaumenbaum', price: 16, art: 'plum', group: 'baum' },
  { id: 'beerenbusch', nameKey: 'deco.beerenbusch', price: 9, art: 'berry', group: 'baum' },
  { id: 'hecke', nameKey: 'deco.hecke', price: 6, art: 'hedge', group: 'garten' },
  { id: 'sonnenblumen', nameKey: 'deco.sonnenblumen', price: 11, art: 'sunflowers', group: 'garten' },
  { id: 'kuerbisse', nameKey: 'deco.kuerbisse', price: 13, art: 'pumpkins', group: 'garten' },
  { id: 'pilze', nameKey: 'deco.pilze', price: 5, art: 'mushrooms', group: 'garten' },

  // ---------------------------------------------------------- village
  { id: 'laterne', nameKey: 'deco.laterne', price: 8, art: 'lamp', group: 'bau' },
  { id: 'bank', nameKey: 'deco.bank', price: 10, art: 'bench', group: 'bau' },
  { id: 'brunnen', nameKey: 'deco.brunnen', price: 25, art: 'well', group: 'bau' },
  { id: 'leuchtturm', nameKey: 'deco.leuchtturm', price: 60, art: 'lighthouse', group: 'bau' },

  // Four that CHANGE the island rather than standing on it, which is
  // why they are priced where they are: the hive brings bees, the box
  // brings birds even to a treeless island, the fire is the one thing
  // that is better after dark, and the mill turns.
  { id: 'bienenstock', nameKey: 'deco.bienenstock', price: 26, art: 'beehive', group: 'tier' },
  { id: 'vogelhaus', nameKey: 'deco.vogelhaus', price: 20, art: 'birdbox', group: 'tier' },
  { id: 'feuerstelle', nameKey: 'deco.feuerstelle', price: 18, art: 'campfire', group: 'bau' },
  { id: 'windmuehle', nameKey: 'deco.windmuehle', price: 75, art: 'windmill', group: 'bau' },
];

export function deco(id: string): DecoDef | undefined {
  return DECOR.find((d) => d.id === id);
}
