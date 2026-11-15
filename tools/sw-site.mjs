#!/usr/bin/env node
// A static server that answers as Netlify does for the service worker (v13-L1): every response carries the
// deploy's commit in `X-Fp-Commit` (Netlify's build writes it into `_site/_headers`), ETags with 304s,
// `cache-control: public, max-age=0, must-revalidate` (Netlify's default), and `no-cache` on /sw.js and
// /commit.json (netlify.toml). By default a 304 carries no X-Fp-Commit, the worst case for the worker (a revalidated
// file keeps the commit it was first served with); `--stamp304=1` sends it.
//   node tools/sw-site.mjs <dir> <port> [--stamp304=1]   serve a built copy (a `_site/` with its commit.json), counting
//                                                         requests: GET /__count prints them, /__reset zeroes them
// tools/sw-test.mjs imports serveSite() with a site held in memory, so it can switch the commit between two loads,
// hold a file mid-load, or cut one off mid-body. tools/serve.sh stays the server for the walk and every other test.
import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.txt': 'text/plain' };

// files(path) → Buffer | string | null, for '/'-rooted paths ('/' asks for '/index.html'); commit() → the current commit
// or null (no header, as a host without the build's _headers); hooks: { before(path, req, res) → true if handled }
export function serveSite({ port, files, commit, stamp304 = false, hooks = {} }) {
  const counts = new Map(), log = [];
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    let path = decodeURIComponent(u.pathname);
    if (path === '/__count') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(Object.fromEntries(counts))); return; }
    if (path === '/__reset') { counts.clear(); log.length = 0; res.writeHead(204); res.end(); return; }
    counts.set(path, (counts.get(path) || 0) + 1);
    log.push({ path, t: Date.now(), cond: !!req.headers['if-none-match'] });
    if (path.endsWith('/')) path += 'index.html';
    const c = commit();
    const head = { 'x-content-type-options': 'nosniff' };
    if (c) head['x-fp-commit'] = c;
    head['cache-control'] = path === '/sw.js' || path === '/commit.json' ? 'no-cache' : 'public, max-age=0, must-revalidate';
    if (hooks.before && (await hooks.before(path, req, res, head))) return;
    const body = files(path);
    if (body == null) { res.writeHead(404, { ...head, 'content-type': 'text/plain' }); res.end('not found'); return; }
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const etag = `"${createHash('sha1').update(buf).digest('hex').slice(0, 16)}"`;
    head.etag = etag;
    head['content-type'] = TYPES[extname(path)] || 'application/octet-stream';
    if (req.headers['if-none-match'] === etag) {
      if (!stamp304) delete head['x-fp-commit'];
      res.writeHead(304, head); res.end(); return;
    }
    head['content-length'] = buf.length;
    res.writeHead(200, head);
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
  return new Promise((ok) => server.listen(port, () => ok({ server, counts, log, close: () => new Promise((d) => { server.closeAllConnections?.(); server.close(d); }) })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [dir, port] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const stamp304 = process.argv.includes('--stamp304=1');
  if (!dir || !port) { console.error('usage: node tools/sw-site.mjs <dir> <port> [--stamp304=1]'); process.exit(2); }
  const root = normalize(dir);
  const files = (p) => {
    const f = join(root, normalize(p));
    if (!f.startsWith(root) || !existsSync(f) || !statSync(f).isFile() || /\/_headers$/.test(f)) return null;
    return readFileSync(f);
  };
  const commit = () => { try { return JSON.parse(readFileSync(join(root, 'commit.json'), 'utf8')).commit || null; } catch { return null; } };
  await serveSite({ port: +port, files, commit, stamp304 });
  console.log(`sw-site: ${root} on http://localhost:${port}, commit ${commit()}`);
}
