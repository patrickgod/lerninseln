// Sound: a handful of soft chimes made in code, and the spoken lines.
//
// Two rules from IPAD.md that decide the whole shape of this file:
//
//   Web Audio starts SUSPENDED on iOS. It must be resumed inside a real
//   touch handler, once, on the first tap of the session. Everything
//   here is a no-op until that has happened, and nothing anywhere else
//   needs to know.
//
//   Sound is optional and off-switchable in two taps, because this gets
//   played in waiting rooms.
//
// And one from AGENTS.md: nothing leaves the device. The voice lines
// are MP3 files generated at BUILD time by `tools/genvoice.mjs` and
// shipped with the app. ElevenLabs is a step in the toolchain, like
// esbuild — the running app has never heard of it and makes no network
// calls at all.
//
// The chimes are synthesised rather than sampled because ART-DIRECTION
// asks for sound that sits UNDER everything: a soft sine with a long
// tail is exactly that, it is forty lines, and it never has to be
// downloaded.

import { get } from './state.js';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

/** Call from the first real touch handler of the session. */
export function unlock(): void {
  if (unlocked) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    void ctx.resume();
    unlocked = true;
  } catch {
    // No audio. The app is still completely playable; nothing in it is
    // load-bearing on sound.
    unlocked = true;
  }
}

function on(): boolean {
  return unlocked && ctx !== null && master !== null && get().sound;
}

/**
 * One soft note. `wave` is a sine because anything with harmonics
 * becomes an alert, and this is meant to be the quiet confirmation of
 * something you already saw.
 */
function tone(freq: number, at: number, dur: number, gain = 0.25): void {
  if (!on() || !ctx || !master) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // A soft attack, because a hard one is a click and a click is an
  // alert. 12ms is enough to be inaudible as an attack and enough to
  // stop the transient.
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A correct answer. A rising third: warm, resolved, not a fanfare. */
export function chimeRight(): void {
  tone(659.25, 0, 0.5, 0.22);        // E5
  tone(987.77, 0.08, 0.6, 0.16);     // B5
}

/**
 * A wrong answer.
 *
 * NOT a buzzer. AGENTS.md rule 9: there is no fail state and no way to
 * reach one. This is two soft notes that go nowhere in particular —
 * the sound of a card being put back, not the sound of being wrong.
 */
export function chimeSoft(): void {
  tone(392.0, 0, 0.28, 0.13);        // G4
  tone(349.23, 0.06, 0.34, 0.10);    // F4
}

/** A tap landed. Under everything, barely there. */
export function click(): void {
  tone(880, 0, 0.09, 0.09);
}

/** A round finished. Three notes, gentle, resolving upward. */
export function chimeRound(): void {
  tone(523.25, 0, 0.5, 0.20);
  tone(659.25, 0.13, 0.5, 0.20);
  tone(783.99, 0.26, 0.9, 0.22);
}

/** A house arrived, or something was placed. A low, satisfied thunk. */
export function thunk(): void {
  tone(174.61, 0, 0.30, 0.28);
  tone(261.63, 0.02, 0.22, 0.12);
}

// ---------------------------------------------------------------- voice
//
// Two sources, in order of preference:
//
//   1. A pre-generated MP3 under `assets/voice/`, made at build time by
//      `tools/genvoice.mjs`. This is the one that sounds good, is
//      identical every time, and works with no network because the file
//      shipped with the app.
//
//   2. The browser's own speech synthesiser, in German, if that file is
//      not there.
//
// The fallback exists because the ElevenLabs key currently on this
// machine is scoped to sound generation only and cannot make speech, so
// without it the app would open a door and say nothing to a child who
// cannot read the label. iOS carries its German voices on the device,
// so the fallback also honours the offline promise — but it is a
// fallback: it is a different voice on every platform, which is exactly
// what "kriegen wir etwas einheitliches hin" was asking to avoid. The
// moment the key can speak, the MP3s land and this path stops running.

const VOICE_DIR = 'assets/voice/';
const cache = new Map<string, HTMLAudioElement>();
/** Stems we have already discovered are not shipped, so we stop asking. */
const missing = new Set<string>();
let current: HTMLAudioElement | null = null;

/** Is the built-in synthesiser usable, and is a German voice installed? */
function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

let germanVoice: SpeechSynthesisVoice | null = null;
function pickGerman(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  if (germanVoice) return germanVoice;
  const voices = s.getVoices();
  if (!voices.length) return null;   // not loaded yet; try again next time
  const de = voices.filter((v) => v.lang.toLowerCase().startsWith('de'));
  if (!de.length) return null;
  // Prefer a female voice where the platform says which is which. The
  // brief asked for a soft woman's voice and this is the only lever the
  // Web Speech API gives.
  const named = de.find((v) => /anna|petra|marlene|katja|female|helena|vicki/i.test(v.name));
  germanVoice = named ?? de[0];
  return germanVoice;
}

function speakFallback(text: string): void {
  const s = synth();
  const v = pickGerman();
  if (!s || !v || !text) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  // Slower than default, and slightly higher: this is being read to a
  // six-year-old, not to a commuter.
  u.rate = 0.86;
  u.pitch = 1.05;
  u.volume = 1;
  s.speak(u);
}

/**
 * Speak a line.
 *
 * `id` is a file stem under `assets/voice/`; `text` is the same line as
 * German words, used only if that file is not there.
 */
export function say(id: string, text = ''): void {
  if (!get().voice) return;
  stopSaying();

  if (missing.has(id)) { speakFallback(text); return; }

  let el = cache.get(id);
  if (!el) {
    el = new Audio(`${VOICE_DIR}${id}.mp3`);
    el.preload = 'auto';
    // A 404 is the normal case before the voices have been generated,
    // and it must be silent and cheap: remember it and never ask again.
    el.addEventListener('error', () => {
      missing.add(id);
      cache.delete(id);
      speakFallback(text);
    }, { once: true });
    cache.set(id, el);
  }
  el.currentTime = 0;
  current = el;
  void el.play().catch(() => {
    // Rejected play is normal on iOS before the first touch. Falling
    // back here would double up with the error handler above, so this
    // deliberately does nothing.
  });
}

export function stopSaying(): void {
  const s = synth();
  if (s) s.cancel();
  if (!current) return;
  try {
    current.pause();
    current.currentTime = 0;
  } catch {
    /* nothing */
  }
  current = null;
}

/** Warm the cache for the lines a screen is about to need. */
export function preload(ids: string[]): void {
  for (const id of ids) {
    if (cache.has(id) || missing.has(id)) continue;
    const el = new Audio(`${VOICE_DIR}${id}.mp3`);
    el.preload = 'auto';
    el.addEventListener('error', () => { missing.add(id); cache.delete(id); }, { once: true });
    cache.set(id, el);
  }
}

// The voice list arrives asynchronously in every browser that has one.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => { germanVoice = null; });
}
