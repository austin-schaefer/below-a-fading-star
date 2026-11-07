#!/usr/bin/env node
// Produce dist/ for publishing as a claude.ai Artifact. The artifact host wraps the page in its own
// <html>/<head>/<body> skeleton and may load module scripts of its own first, which makes the page's
// import map arrive too late to count ("the specifier 'three' was a bare specifier"). So the build
// copies src/ and vendor/ into dist/ with every bare 'three' and 'three/addons/' import rewritten to a
// relative path, and writes dist/artifact.html without the import map. index.html itself keeps the
// import map for local serving and ordinary static hosts such as Netlify.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { dirname, join, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const html = readFileSync(join(root, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
let body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
body = body.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const description = head.match(/<meta name="description"[^>]*>/)[0];
const links = [...head.matchAll(/<link[^>]*>/g)].map((m) => m[0]).join('\n');
const style = head.match(/<style>[\s\S]*?<\/style>/)[0];
const out = `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${description}\n${links}\n${style}\n${body}`;
writeFileSync(join(dist, 'artifact.html'), out);

// Rewrite imports. From a file at dist/<dir>/x.js, 'three' becomes <rel>/vendor/three/three.module.js.
const threeMain = 'vendor/three/three.module.js';
const files = [];
function walk(dir) {
  for (const name of readdirSync(join(root, dir))) {
    const rel = posix.join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) walk(rel);
    else files.push(rel);
  }
}
walk('src'); walk('vendor');
let rewritten = 0;
for (const rel of files) {
  const srcPath = join(root, rel), dstPath = join(dist, rel);
  mkdirSync(dirname(dstPath), { recursive: true });
  if (!rel.endsWith('.js')) { writeFileSync(dstPath, readFileSync(srcPath)); continue; }
  const dir = posix.dirname(rel);
  const toRel = (target) => { let r = posix.relative(dir, target); if (!r.startsWith('.')) r = './' + r; return r; };
  let text = readFileSync(srcPath, 'utf8');
  const before = text;
  text = text.replace(/(from\s*|import\s*)(['"])three\2/g, (m, kw, q) => `${kw}${q}${toRel(threeMain)}${q}`);
  text = text.replace(/(from\s*|import\s*)(['"])three\/addons\/([^'"]+)\2/g, (m, kw, q, p) => `${kw}${q}${toRel('vendor/three/' + p)}${q}`);
  if (text !== before) rewritten++;
  writeFileSync(dstPath, text);
}
const left = files.filter((f) => f.endsWith('.js') && /(from|import)\s*['"]three/.test(readFileSync(join(dist, f), 'utf8')));
if (left.length) { console.error('bare three imports remain in', left); process.exit(1); }
console.log(`wrote dist/artifact.html (${out.length} bytes) and ${files.length} files, ${rewritten} with imports rewritten`);
console.log(JSON.stringify(files));
