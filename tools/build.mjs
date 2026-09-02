// Bundles src/main.ts into dist/. Run via `npm run build`, which
// typechecks first — AGENTS.md rule 1: the build typechecks, never
// bypassed, never shipped around.
import esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });
if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true });

const options = {
  entryPoints: { main: 'src/main.ts' },
  bundle: true,
  outdir: 'dist',
  entryNames: '[name]',
  format: 'esm',
  target: ['es2020', 'safari14'],
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
};

/**
 * The service worker caches by version, and the version has to change
 * on every deploy or an installed app is stuck on an old build forever
 * — with no reload button, because standalone mode does not have one.
 * IPAD.md: ship a version check. This is it, and it is derived from the
 * bundle rather than typed by hand, because a version somebody has to
 * remember to bump is a version that does not get bumped.
 */
function stampVersion() {
  const js = readFileSync('dist/main.js');
  const css = readFileSync('dist/style.css');
  const hash = createHash('sha1').update(js).update(css).digest('hex').slice(0, 10);
  const swPath = 'dist/sw.js';
  const sw = readFileSync(swPath, 'utf8').replace('__VERSION__', hash);
  writeFileSync(swPath, sw);
  console.log(`  version ${hash}`);
}

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('watching…');
} else {
  await esbuild.build(options);
  stampVersion();
}
