// The three DOM helpers, shared.
//
// They lived in `main.ts` and were fine there until a second module
// needed to build a button — the fairy's dialogue box — and the choice
// was to copy them or to move them. Two copies of `tap` is two places
// that decide whether a child's press counts, which is exactly the kind
// of thing that drifts.

import * as audio from '../core/audio.js';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Wire a tap.
 *
 * `pointerdown`, not `click`: IPAD.md, and because a child who is not
 * certain a tap registered taps again — the sooner the button reacts,
 * the fewer double answers. The audio unlock rides along, because iOS
 * only resumes an AudioContext inside a real user gesture.
 */
export function tap(e: HTMLElement, fn: () => void): void {
  e.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    audio.unlock();
    fn();
  });
}

export function button(label: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', cls, label);
  tap(b, () => { audio.click(); fn(); });
  return b;
}
