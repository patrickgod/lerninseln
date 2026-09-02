// Generate every spoken line with ElevenLabs, at BUILD time.
//
//   node tools/genvoice.mjs             # everything that is missing
//   node tools/genvoice.mjs --force     # everything, again
//   node tools/genvoice.mjs --samples   # one line in each candidate voice
//   node tools/genvoice.mjs --voice ID  # use a different voice
//
// Key: ELEVENLABS_API_KEY, or c:/development/fallennights2d/.env, the
// same place Tidegarden looks.
//
// WHY THIS IS A BUILD STEP AND NOT A RUNTIME CALL
//
// AGENTS.md rule 8: nothing leaves the device. No network calls, no
// analytics, not even an error reporter. A learning app for a
// six-year-old that phones an American speech API every time it opens a
// door would break that rule for every child in the class, and it would
// stop working on a train.
//
// So ElevenLabs is a tool in the toolchain, like esbuild. It runs on
// this machine, writes MP3 files into `assets/voice/`, and the running
// app has never heard of it. The whole voice set is about 40 short
// lines and 44 words; it costs a few thousand characters once and then
// costs nothing, forever, offline.
//
// The lines themselves come from `src/core/i18n.ts` and the word list
// from `src/games/woerter.ts`, so a line that is not in the string
// table cannot be spoken — which is the same rule the app enforces from
// the other side.

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FFMPEG = 'ffmpeg';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const SAMPLES = args.includes('--samples');
const VOICE_ARG = args.includes('--voice') ? args[args.indexOf('--voice') + 1] : null;

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const env = readFileSync('c:/development/fallennights2d/.env', 'utf8').trim();
  const m = env.match(/sk_[a-z0-9]+/i);
  if (!m) throw new Error('no ElevenLabs key found');
  return m[0];
}

/**
 * Candidate voices, for `--samples`.
 *
 * The brief is "a nice soft woman's voice" for a first-grader, in
 * German. `eleven_multilingual_v2` will speak German in any of these,
 * but how much English accent leaks through varies a lot between them
 * and is not something that can be decided by reading a label — so this
 * renders the same sentence in each and the choice is made by ear.
 */
const CANDIDATES = {
  matilda: 'XrExE9yKIg1WjnnlVkGX',
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  lily: 'pFZP5JQG7iQjIQuC4Bku',
  alice: 'Xb7hH8MSUJpSbSDYk0k2',
  dorothy: 'ThT5KcBeYPX3keUQqHPh',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
};

/** The voice the app ships with. One constant; swapping it is a rerun. */
const VOICE = VOICE_ARG ?? CANDIDATES.matilda;

const MODEL = 'eleven_multilingual_v2';

/**
 * Settings tuned for a six-year-old listener rather than for an
 * audiobook: high stability so the same sentence sounds the same every
 * time it is heard (and it will be heard a hundred times), moderate
 * similarity so it stays warm, and style at zero because any
 * performance at all reads as a grown-up being funny at a child.
 */
const SETTINGS = {
  // Warmer than the first pass, which came out correct and a little
  // flat. Stability at 0.62 kept every reading identical and also kept
  // every reading level; dropping it lets the sentence rise and fall
  // the way somebody actually talks to a child. A touch of style adds
  // the smile.
  //
  // Not lower than this, and style not higher: past about 0.3 the model
  // starts performing, and a grown-up being funny AT a six-year-old is
  // worse than a grown-up reading plainly to one.
  stability: 0.45,
  similarity_boost: 0.80,
  style: 0.18,
  use_speaker_boost: true,
};

// ------------------------------------------------------- what to speak

function spokenLines() {
  const src = readFileSync('src/core/i18n.ts', 'utf8');
  const out = {};
  // The table is a plain object literal of 'key': 'value' pairs. A
  // regex is enough and means this script does not need a bundler.
  const re = /'(say\.[A-Za-z0-9]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src))) {
    const stem = m[1].replace(/\./g, '-').toLowerCase();
    out[stem] = m[2].replace(/\\'/g, "'");
  }
  return out;
}

function words() {
  const src = readFileSync('src/games/woerter.ts', 'utf8');
  const out = {};
  const re = /\{\s*wort:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    const w = m[1];
    const stem = 'wort-' + w.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    // A single word in isolation gets read like a list item and comes
    // out clipped. A full stop after it gives the model a sentence to
    // land, and the extra silence is trimmed by nobody because a beat
    // of quiet after the word is exactly what a listening exercise
    // wants.
    out[stem] = `${w}.`;
  }
  return out;
}

// The numerals, spoken. A child who cannot read still needs to hear
// which number the question is about, and "sieben" is a different
// retrieval from seeing a 7.
function numbers() {
  const names = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben',
    'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn',
    'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig'];
  const out = {};
  names.forEach((n, i) => { out[`zahl-${i}`] = `${n}.`; });
  return out;
}

async function tts(text, voice, path) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey(), 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS }),
    });
  if (!res.ok) {
    throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

/**
 * Shrink and tidy a take.
 *
 * The generator hands back 128kbps stereo at 44.1kHz, which for one
 * spoken German word is about 16KB of which roughly a third is silence.
 * Seventy-seven of those came to 1.8MB — and this app caches ALL of
 * itself on install so that it works on a train, which makes every one
 * of those kilobytes part of the first launch on a school iPad.
 *
 * So: mono (it is one voice, and an iPad speaker is mono anyway),
 * 64kbps (speech, not music), and the silence trimmed off both ends so
 * that a word answers a tap immediately instead of a beat later. That
 * last one is the part a child would actually notice.
 *
 * `loudnorm` is deliberately NOT used: it is a two-pass measurement and
 * on takes this short it pumps. A fixed, gentle gain keeps every line
 * at the same level, which is what "einheitlich" was asking for.
 */
function shrink(path) {
  const tmp = `${path}.tmp.mp3`;
  try {
    execFileSync(FFMPEG, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', path,
      '-af', [
        // leading silence
        'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB',
        // trailing silence, by reversing, trimming and reversing back —
        // ffmpeg has no "stop_silence" that behaves on short files
        'areverse',
        'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB',
        'areverse',
        // a breath of room at the end, so the tail is not clipped
        'apad=pad_dur=0.12',
        'volume=1.15',
      ].join(','),
      '-ac', '1', '-ar', '44100', '-b:a', '64k',
      tmp,
    ], { stdio: 'pipe' });
    renameSync(tmp, path);
  } catch (e) {
    // No ffmpeg, or a take it cannot handle. The unprocessed file is
    // still perfectly playable, so this must never be fatal.
    if (existsSync(tmp)) unlinkSync(tmp);
    if (!shrink.warned) {
      console.log(`  (not shrinking: ${String(e.message).split('\n')[0]})`);
      shrink.warned = true;
    }
  }
}

// ------------------------------------------------------------------ go

if (SAMPLES) {
  mkdirSync('audio_raw', { recursive: true });
  const line = 'Willkommen im Haus der verliebten Zahlen. '
    + 'Zwei Zahlen sind verliebt, wenn sie zusammen zehn ergeben. '
    + 'Tippe auf die passende Zahl.';
  for (const [name, id] of Object.entries(CANDIDATES)) {
    const path = `audio_raw/sample-${name}.mp3`;
    process.stdout.write(`  ${name} … `);
    try {
      await tts(line, id, path);
      console.log(path);
    } catch (e) {
      console.log(`FAILED ${e.message}`);
    }
  }
  console.log('\nListen to audio_raw/sample-*.mp3 and pick one, then:');
  console.log('  node tools/genvoice.mjs --voice <id> --force');
  process.exit(0);
}

mkdirSync('assets/voice', { recursive: true });
const all = { ...spokenLines(), ...words(), ...numbers() };
const names = Object.keys(all);

// ElevenLabs bills characters, and this whole set is regenerated every
// time the voice changes, so it is worth knowing what a rerun costs
// before spending it. `--dry` prints the bill and stops.
const chars = Object.values(all).reduce((a, s) => a + s.length, 0);
console.log(`${names.length} lines, ${chars} characters, voice ${VOICE}`);
if (args.includes('--dry')) {
  for (const stem of names) console.log(`  ${stem}  "${all[stem]}"`);
  process.exit(0);
}

let made = 0, skipped = 0;
for (const stem of names) {
  const path = `assets/voice/${stem}.mp3`;
  if (!FORCE && existsSync(path)) { skipped++; continue; }
  process.stdout.write(`  ${stem} … `);
  try {
    await tts(all[stem], VOICE, path);
    shrink(path);
    made++;
    console.log('ok');
  } catch (e) {
    console.log(`FAILED ${e.message}`);
  }
}
console.log(`\n${made} written, ${skipped} already there`);
