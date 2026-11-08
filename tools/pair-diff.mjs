#!/usr/bin/env node
// Picture difference by the v6 survey's method: both frames blurred 1.5 px (the film grain goes), 5% fuzz,
// the count of pixels that still differ; the diff picture marks them red. ImageMagick (`magick`) does the work.
//   node tools/pair-diff.mjs a.png b.png [diff.png] [--baseline=<changed>]
// Prints JSON { changed, ratio, meanAbs, pct, pixels } (ratio = changed / pixels, pct = ratio in percent, meanAbs =
// the mean absolute channel difference of the blurred pair, 0..1); with --baseline, also { vsBaseline } =
// changed / baseline. Every v6 brief states its picture tolerance in these numbers. Exported: pairDiff(a, b, diffPath?).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAGICK = process.env.MAGICK || (spawnSync('magick', ['-version']).error ? '/opt/homebrew/bin/magick' : 'magick');

export function pairDiff(a, b, diff = null) {
  const dir = mkdtempSync(join(tmpdir(), 'pair-diff-'));
  try {
    const A = join(dir, 'a.png'), B = join(dir, 'b.png'), D = diff || join(dir, 'd.png');
    execFileSync(MAGICK, [a, '-blur', '0x1.5', A]);
    execFileSync(MAGICK, [b, '-blur', '0x1.5', B]);
    // compare prints the changed-pixel count on stderr and exits 1 when the pictures differ
    const c = spawnSync(MAGICK, ['compare', '-metric', 'AE', '-fuzz', '5%', '-highlight-color', 'red', '-lowlight-color', 'none', A, B, D], { encoding: 'utf8' });
    const changed = Math.round(parseFloat(String(c.stderr).trim().split(/\s/)[0]));
    if (!isFinite(changed)) throw new Error('compare failed: ' + c.stderr);
    const dims = execFileSync(MAGICK, ['identify', '-format', '%w %h', A], { encoding: 'utf8' }).trim().split(' ').map(Number);
    const pixels = dims[0] * dims[1];
    const meanAbs = parseFloat(execFileSync(MAGICK, [A, B, '-compose', 'difference', '-composite', '-colorspace', 'Gray', '-format', '%[fx:mean]', 'info:'], { encoding: 'utf8' }));
    return { changed, ratio: +(changed / pixels).toExponential(3) * 1, meanAbs: +meanAbs.toPrecision(4), pct: +(changed / pixels * 100).toFixed(4), pixels };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// Changed-pixel counts between consecutive pictures of a list of files (each blurred once): [changed(f0,f1), ...]
export function seqChanged(files) {
  const dir = mkdtempSync(join(tmpdir(), 'pair-seq-'));
  try {
    const blurred = files.map((f, i) => { const o = join(dir, `${i}.png`); execFileSync(MAGICK, [f, '-blur', '0x1.5', o]); return o; });
    const out = [];
    for (let i = 1; i < blurred.length; i++) {
      const c = spawnSync(MAGICK, ['compare', '-metric', 'AE', '-fuzz', '5%', blurred[i - 1], blurred[i], 'null:'], { encoding: 'utf8' });
      out.push(Math.round(parseFloat(String(c.stderr).trim().split(/\s/)[0])));
    }
    return out;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), flags = args.filter((s) => s.startsWith('--')), pos = args.filter((s) => !s.startsWith('--'));
  if (pos.length < 2) { console.error('usage: pair-diff.mjs a.png b.png [diff.png] [--baseline=<n>]'); process.exit(2); }
  const r = pairDiff(pos[0], pos[1], pos[2] || null);
  const bl = flags.find((f) => f.startsWith('--baseline='));
  if (bl) r.vsBaseline = +(r.changed / Math.max(1, +bl.split('=')[1])).toFixed(2);
  console.log(JSON.stringify(r));
}
