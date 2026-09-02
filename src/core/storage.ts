// localStorage, wrapped so that a private-window failure degrades to
// "this session only" instead of crashing.
//
// AGENTS.md rule 8: nothing leaves the device. This file is the only
// persistence in the app, and it writes to exactly one key.
//
// Safari throws on `localStorage.setItem` in private mode, and it does
// it on the WRITE rather than on the read, so a naive implementation
// works perfectly through a whole round and then explodes on the save
// at the end — which is the worst possible moment for a six-year-old.
// So: probe once at startup, and if the probe fails, keep the state in
// memory and never touch storage again.

const KEY = 'lerninseln.save.v1';

let available: boolean | null = null;
let memory: string | null = null;

function probe(): boolean {
  if (available !== null) return available;
  try {
    const k = '__li_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function load(): string | null {
  if (!probe()) return memory;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

export function save(text: string): void {
  memory = text;
  if (!probe()) return;
  try {
    window.localStorage.setItem(KEY, text);
  } catch {
    // Quota, or private mode changing its mind. The in-memory copy
    // above still holds, so the session continues.
    available = false;
  }
}

export function clear(): void {
  memory = null;
  if (!probe()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do; the memory copy is already gone */
  }
}

/** True when progress will actually survive a reload. Shown in settings. */
export function persists(): boolean {
  return probe();
}
