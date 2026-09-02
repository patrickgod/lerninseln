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

  // ---------------------------------------------------------- village
  { id: 'laterne', nameKey: 'deco.laterne', price: 8, art: 'lamp', group: 'bau' },
  { id: 'bank', nameKey: 'deco.bank', price: 10, art: 'bench', group: 'bau' },
  { id: 'brunnen', nameKey: 'deco.brunnen', price: 25, art: 'well', group: 'bau' },
  { id: 'leuchtturm', nameKey: 'deco.leuchtturm', price: 60, art: 'lighthouse', group: 'bau' },
];

export function deco(id: string): DecoDef | undefined {
  return DECOR.find((d) => d.id === id);
}
