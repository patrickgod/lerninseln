# The tablet

Everything the iPad demands, gathered in one place so it is not
rediscovered one bug at a time. Most of this is Safari being Safari.

## Sizes and touch

* **Minimum touch target: 64×64 CSS px**, with 12px of clear space.
  Apple's Human Interface Guidelines say 44pt; that number is for adults
  with a mental model of what is tappable. Answer cards should be much
  larger — 120px+ on the short side.
* **No hover.** Anything that only reveals itself on hover does not
  exist. Style `:active` instead, and make the pressed state obvious,
  because a child who is not sure whether a tap registered will tap
  again.
* **Design for the thumbs.** A child holds a tablet at the sides. Put
  answer cards in the lower two-thirds and never in the top corners.
* **Both orientations, or lock one.** Decide, do not leave it to chance:
  a layout that reflows mid-answer is disorienting. Landscape is the
  recommended default for a ten-frame, which is a wide shape.

## Safari traps, and the fix for each

| trap | what happens | fix |
|---|---|---|
| Double-tap zoom | Two quick taps zoom the page instead of answering twice | `touch-action: manipulation` on interactive elements |
| Pull-to-refresh / rubber-band | The whole game slides and can reload mid-round | `overscroll-behavior: none`, and `position: fixed` on the app root |
| Text selection | A long press selects a numeral and shows the callout menu | `user-select: none`, `-webkit-touch-callout: none` |
| Tap highlight | A grey flash on every tap | `-webkit-tap-highlight-color: transparent` |
| 300ms delay | Legacy click delay | Gone if the viewport is set correctly; use `pointerdown`, not `click`, for game answers |
| Audio silence | Sound never plays | Web Audio starts *suspended*; it must be resumed inside the first real touch handler. Do it on the first tap of the session, once. |
| `100vh` | Layout is taller than the screen; buttons sit under the browser chrome | Use `100dvh`, and test with the tab bar visible |
| Safe areas | Content under the home indicator | `viewport-fit=cover` plus `env(safe-area-inset-*)` padding |
| Device pixel ratio | Pixel art looks blurry | The canvas backing store must be sized in device pixels and scaled by CSS, with `image-rendering: pixelated` and smoothing off |
| Sleep / app switch | Timers jump, animations lurch | Handle `visibilitychange`; clamp any delta to a sane maximum |

Required viewport tag:

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover,
               maximum-scale=1, user-scalable=no">
```

## Add to Home Screen

The way this should actually be used: opened from the home screen, full
screen, no browser chrome, works with no signal. That means a real PWA,
and it is not much work:

* `manifest.webmanifest` with `display: "standalone"`, a name, a
  background colour and 192/512px icons.
* `apple-touch-icon` link — iOS still prefers it over the manifest.
* `apple-mobile-web-app-status-bar-style` so the status bar matches.
* A **service worker** that caches the whole app on install. The app is
  small and entirely static, so cache-first for everything with a
  version bump on deploy is correct and simple. Do not get clever.
* Test it *installed*, not just in a tab. Standalone mode has different
  bugs — in particular there is no reload button, so a broken cache is
  unrecoverable for a child. Ship a version check.

## Performance

Far less demanding than the game project, but the same rule holds:
**bench in the browser the player actually uses.** On Tidegarden a
performance bug was invisible to the test harness because headless
Chromium rasterises in software and the real browser does not. An iPad
is a different renderer again, and an old school iPad is a *much* slower
one.

Budget: 60fps on an iPad from about 2019. If that is comfortable,
everything since is fine.

## Testing

Playwright can emulate an iPad properly — use `devices['iPad (gen 7)']`
or similar, with `hasTouch: true`, and drive the app with `tap()` rather
than `click()`. A test that clicks will pass on a build that no child
can operate.

Worth having in the suite from early on:

* every interactive element measured at ≥64px in both dimensions;
* a full round completed using only taps;
* the app loading with the network disabled after one visit;
* a screenshot at iPad resolution, looked at by a human being.
