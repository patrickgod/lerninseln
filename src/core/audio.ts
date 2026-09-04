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

// ------------------------------------------------------------ the juice
//
// Patrick asked for "subtile Sound Effekte", and subtle is the operative
// word: ART-DIRECTION.md's rule is that a sound is the quiet
// confirmation of something you already SAW, never an announcement.
// Everything below sits under the picture.
//
// All synthesised, none downloaded. A sine with a soft attack and a long
// tail is forty lines of code, weighs nothing, works offline, and cannot
// be the wrong sample.

/**
 * Sparkle: a short rising arpeggio. Stars arriving, a purchase landing.
 *
 * Pentatonic on purpose — five notes that cannot form a dissonance
 * between them, so playing several at once or on top of each other
 * still sounds like music rather than like a slot machine.
 */
export function sparkle(n = 4): void {
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  for (let i = 0; i < n; i++) {
    const f = scale[Math.min(scale.length - 1, i + Math.floor(Math.random() * 2))];
    tone(f, i * 0.055, 0.45 - i * 0.03, 0.13);
  }
}

/** A single bright ping, for one star landing in the counter. */
export function ping(i = 0): void {
  const scale = [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.7];
  tone(scale[i % scale.length], 0, 0.30, 0.14);
}

/**
 * A soft pop. Particles bursting, a card being chosen.
 *
 * A pitch envelope rather than a fixed note: the frequency drops
 * through the first 40ms, which is what makes a bubble sound like a
 * bubble instead of like a beep.
 */
export function pop(): void {
  if (!on() || !ctx || !master) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(720 + Math.random() * 260, t);
  osc.frequency.exponentialRampToValueAtTime(240, t + 0.05);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.13, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.2);
}

/**
 * Dust and air: filtered noise, for something landing or a screen
 * turning over. This is the one sound in the game that is not a tone,
 * and it is the one that makes a thunk feel like weight rather than
 * like a note.
 */
export function whoosh(dur = 0.28, cutoff = 1400): void {
  if (!on() || !ctx || !master) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(cutoff, t);
  filt.frequency.exponentialRampToValueAtTime(220, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.16, t + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt);
  filt.connect(env);
  env.connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** A building landing on the ground: the thunk, plus its dust. */
export function land(): void {
  thunk();
  whoosh(0.34, 900);
}

/**
 * The rumble of an island growing.
 *
 * Not a synthesised "thump" like the others — a long band of filtered
 * noise that swells and dies, because an earthquake is a texture rather
 * than a note. Two and a half seconds, which is as long as anything in
 * this app is allowed to hold a child still.
 *
 * Kept quiet on purpose. This is the loudest thing in the game and it
 * still has to be playable in a waiting room with the volume up.
 */
export function beben(): void {
  if (!ctx || !master || !get().sound) return;
  const c = ctx;
  const dauer = 2.5;
  const n = Math.floor(c.sampleRate * dauer);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  // Brown-ish noise: white noise integrated, which puts the energy low
  // where a rumble lives instead of up in the hiss.
  let letzter = 0;
  for (let i = 0; i < n; i++) {
    const weiss = Math.random() * 2 - 1;
    letzter = (letzter + weiss * 0.03) / 1.02;
    d[i] = letzter * 12;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 190;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.35);
  g.gain.setValueAtTime(0.5, t + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  src.connect(lp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dauer);
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
