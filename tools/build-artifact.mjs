#!/usr/bin/env node
// Produce dist/artifact.html: the page body for publishing as a claude.ai Artifact, which wraps
// the file in its own <html>/<head>/<body> skeleton. Keeps <title>, <meta>, <style>, markup and scripts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const description = head.match(/<meta name="description"[^>]*>/)[0];
const links = [...head.matchAll(/<link[^>]*>/g)].map((m) => m[0]).join('\n');
const style = head.match(/<style>[\s\S]*?<\/style>/)[0];
const out = `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${description}\n${links}\n${style}\n${body}`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'artifact.html'), out);
console.log('wrote dist/artifact.html', out.length, 'bytes');
