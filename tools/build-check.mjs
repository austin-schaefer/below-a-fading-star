#!/usr/bin/env node
// What every module built, as one fingerprint a module (v13-L5): for a change to a builder that must not change
// what is seen. terrain-probe's idea, for the whole scene.
//   node tools/build-check.mjs <base> [--q=low] [--params=a=1&b=2] [--runs=1] [--record=path.json] [--against=path.json] [--only=a,b] [--allowunstable] [--repeat] [--throttle=4]
// --throttle=N (v13 L3): Chromium's CPU throttle from the first byte (a slow phone's stand-in), for build-order races:
// a module whose output depends on how long another took differs from the unthrottled recording.
// --repeat (v13 L3): each load is a repeat visit: a load, its kept store written (src/v13/kept.js), then a reload in the
// same context, fingerprinted; it fails unless the reload's terrain came from the store, so what is checked is the
// walk built from what was kept.
// It loads <base>/?q=<q>&<params> and, at the "ready" mark (src/startup.js), synchronously, before the first frame
// has run any update, walks the objects each module added to the scene (the profiler's tagging, ctx.perf._mods;
// what no module claimed is 'core': the terrain, the sky, the lights) and hashes, bit for bit: every geometry
// attribute and index (array type, item size, normalized, interleaving; draw range, groups, instanceCount), each
// InstancedMesh's matrices, colours and count, each object's world matrix, visibility and shadow, culling and render
// order flags, each material's scalar, colour and vector properties, defines and uniforms (typed arrays by their
// bytes), and each texture's pixels (a canvas's by getImageData, a DataTexture's data) and sampling parameters.
// Not covered: shader code changed in onBeforeCompile, colliders, registered updates, acts, anything outside the
// scene or parented under the camera. One line a module: its fingerprint, its object, attribute and texture counts
// and the megabytes hashed. --record writes the entries with q and params; --against compares with a recording made
// with the same q and params (it refuses otherwise) and prints IDENTICAL or MOVED a module, with the first entries
// that moved (an attribute's weighted sum, before and after, says by how much), and exits 1 if any moved or nothing
// was compared. The warm-up draw (src/warmup.js) runs before "ready", so onBeforeRender packing is in the
// fingerprint. A module's fingerprint does not depend on the order its roots or children were added in.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const opts = { q: 'low', params: '', record: '', against: '', only: '', runs: '1', allowunstable: '', repeat: '', throttle: '' };
const pos = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([a-z]+)(?:=(.*))?$/);
  if (m) opts[m[1]] = m[2] ?? '1'; else pos.push(a);
}
const base = (pos[0] || 'http://localhost:8123').replace(/\/$/, '');
const url = `${base}/?q=${opts.q}${opts.params ? '&' + opts.params : ''}`;

// Runs in the page: installed before any script, it fingerprints inside performance.mark('fp:ready').
function install() {
  const H = () => ({ a: 0x811c9dc5 | 0, b: 0x9747b28c | 0 });
  const mix32 = (h, w) => { h.a = Math.imul(h.a ^ w, 0x01000193); h.b = Math.imul(h.b ^ w, 0x5bd1e995); h.b ^= h.b >>> 13; };
  const hex = (h) => (h.a >>> 0).toString(16).padStart(8, '0') + (h.b >>> 0).toString(16).padStart(8, '0');
  let bytes = 0;
  function hashBuf(view) { // any TypedArray or DataView, by its bytes
    const h = H(), off = view.byteOffset, len = view.byteLength;
    bytes += len;
    const n4 = len >> 2;
    const u32 = (off & 3) === 0 ? new Uint32Array(view.buffer, off, n4) : new Uint32Array(new Uint8Array(view.buffer, off, n4 * 4).slice().buffer);
    for (let i = 0; i < n4; i++) mix32(h, u32[i]);
    const u8 = new Uint8Array(view.buffer, off + n4 * 4, len - n4 * 4);
    for (let i = 0; i < u8.length; i++) mix32(h, u8[i]);
    mix32(h, len);
    return hex(h);
  }
  function hashStr(s) { const h = H(); for (let i = 0; i < s.length; i++) mix32(h, s.charCodeAt(i)); return hex(h); }
  const wsum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * ((i % 7) + 1); return s; };
  let scratch = null;
  function texPixels(t) {
    const img = t.image;
    if (!img) return { h: 'none' };
    if (t.isDataTexture || t.isDataArrayTexture || t.isData3DTexture || (img.data && ArrayBuffer.isView(img.data))) return { h: hashBuf(img.data), w: img.width, hh: img.height };
    if (t.isCubeTexture || Array.isArray(img)) return { h: hashStr(String(img.length)) };
    const w = img.width, hh = img.height;
    if (!w || !hh) return { h: 'empty' };
    let data = null;
    try {
      const c2 = (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) || (typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas) ? img.getContext('2d') : null;
      if (c2) data = c2.getImageData(0, 0, w, hh).data;
      else {
        scratch = scratch || document.createElement('canvas');
        scratch.width = w; scratch.height = hh;
        const g = scratch.getContext('2d', { willReadFrequently: true });
        g.clearRect(0, 0, w, hh); g.drawImage(img, 0, 0);
        data = g.getImageData(0, 0, w, hh).data;
      }
    } catch (e) { return { h: 'unreadable:' + e.message.slice(0, 40) }; }
    return { h: hashBuf(data), w, hh };
  }
  function scalars(o, skip) {
    const parts = [];
    for (const k of Object.keys(o).sort()) {
      if (skip && skip.has(k)) continue;
      const v = o[k];
      if (v == null || typeof v === 'function') continue;
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') parts.push(k + '=' + (typeof v === 'number' ? v.toString() : String(v)));
      else if (v.isColor || v.isVector2 || v.isVector3 || v.isVector4 || v.isMatrix3 || v.isMatrix4 || v.isQuaternion || v.isEuler) parts.push(k + '=' + v.toArray().join(','));
      else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) parts.push(k + '=' + v.join(','));
    }
    return parts.join(';');
  }
  const childId = (c) => `${c.type}${c.name ? ' ' + c.name : ''}${c.geometry?.attributes?.position ? ' v' + c.geometry.attributes.position.count : ''}`;
  const MAT_SKIP = new Set(['uuid', 'id', 'version', 'name', 'userData', '_listeners']);
  function fingerprint(ctx) {
    const t0 = performance.now();
    bytes = 0;
    const mods = ctx.perf?._mods;
    const owner = new Map();
    const roots = new Map(); // name -> [objects]
    if (mods) for (const [name, m] of mods) { if (!m.world) continue; roots.set(name, [...m.objects]); }
    for (const [name, list] of roots) for (const o of list) o.traverse((c) => { if (!owner.has(c)) owner.set(c, name); });
    const core = [];
    ctx.scene.traverse((c) => { if (!owner.has(c)) { owner.set(c, 'core'); if (c.parent === ctx.scene || c === ctx.scene) core.push(c); } });
    roots.set('core', core.filter((c) => c !== ctx.scene));
    const out = {};
    for (const [name, list] of roots) {
      const entries = [];
      let objs = 0, attrs = 0, texs = 0;
      const b0 = bytes;
      const texSeen = new Map();
      const walk = (o, path) => {
        if (owner.get(o) !== name) return;
        objs++;
        o.updateMatrixWorld?.(false);
        const tag = `${path}<${o.type}${o.name ? ' ' + o.name : ''}>`;
        entries.push({ k: tag + ':matrix', h: hashBuf(new Float64Array(o.matrixWorld.elements)) + (o.visible ? '' : ':hidden') + `|${o.castShadow},${o.receiveShadow},${o.frustumCulled},${o.renderOrder}` });
        const g = o.geometry;
        if (g && g.attributes) {
          for (const an of Object.keys(g.attributes).sort()) {
            const at = g.attributes[an];
            const arr = at.isInterleavedBufferAttribute ? at.data.array : at.array;
            if (!arr) continue;
            attrs++;
            entries.push({ k: `${tag}:${an}`, h: hashBuf(arr) + `/${arr.constructor.name}/${at.itemSize}/${at.normalized ? 'n' : ''}/${at.isInterleavedBufferAttribute ? at.offset + 'i' + at.data.stride : ''}`, n: arr.length, s: wsum(arr) });
          }
          if (g.index) entries.push({ k: `${tag}:index`, h: hashBuf(g.index.array), n: g.index.array.length });
          entries.push({ k: `${tag}:draw`, h: `${g.isInstancedBufferGeometry ? 'i' + g.instanceCount + ';' : ''}${g.drawRange.start},${g.drawRange.count};${(g.groups || []).map((x) => `${x.start},${x.count},${x.materialIndex}`).join('|')}` });
        }
        if (o.isInstancedMesh) {
          entries.push({ k: `${tag}:instanceMatrix`, h: hashBuf(o.instanceMatrix.array) + '#' + o.count, n: o.count, s: wsum(o.instanceMatrix.array.subarray(0, o.count * 16)) });
          if (o.instanceColor) entries.push({ k: `${tag}:instanceColor`, h: hashBuf(o.instanceColor.array), n: o.instanceColor.array.length });
        }
        if (o.isBatchedMesh) entries.push({ k: `${tag}:batch`, h: hashBuf(o._matricesTexture.image.data) + '#' + o.instanceCount });
        if (o.isPoints || o.isSprite || o.isLight) entries.push({ k: `${tag}:props`, h: hashStr(scalars(o, new Set(['uuid', 'id', 'name', 'userData', 'parent', 'children']))) });
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach((m, mi) => {
          entries.push({ k: `${tag}:mat${mi}<${m.type}>`, h: hashStr(scalars(m, MAT_SKIP) + '|' + (m.defines ? JSON.stringify(m.defines) : '')) });
          const tx = [];
          for (const k of Object.keys(m).sort()) if (m[k]?.isTexture) tx.push([k, m[k]]);
          if (m.uniforms) {
            const us = [];
            for (const k of Object.keys(m.uniforms).sort()) {
              const v = m.uniforms[k]?.value;
              if (v?.isTexture) tx.push(['u.' + k, v]);
              else if (Array.isArray(v)) v.forEach((x, i) => { if (x?.isTexture) tx.push([`u.${k}[${i}]`, x]); else us.push(`${k}[${i}]=${x?.toArray ? x.toArray().join(',') : x}`); });
              else if (ArrayBuffer.isView(v)) us.push(`${k}=${v.constructor.name}:${hashBuf(v)}`);
              else if (v != null && typeof v !== 'function') us.push(`${k}=${v.toArray ? v.toArray().join(',') : (typeof v === 'object' ? (v.isTexture ? 'tex' : '{}') : v)}`);
            }
            entries.push({ k: `${tag}:mat${mi}:uniforms`, h: hashStr(us.join(';')) });
          }
          for (const [k, t] of tx) {
            if (t.isRenderTargetTexture) continue;
            let th = texSeen.get(t);
            if (!th) {
              const p = texPixels(t);
              th = `${p.h}@${p.w}x${p.hh}|${t.wrapS},${t.wrapT},${t.magFilter},${t.minFilter},${t.generateMipmaps},${t.anisotropy},${t.flipY},${t.colorSpace},${t.repeat.toArray()},${t.offset.toArray()}`;
              texSeen.set(t, th); texs++;
            }
            entries.push({ k: `${tag}:mat${mi}.${k}`, h: th });
          }
        });
        // a child is keyed by its type, name and vertex count and how many siblings before it share them (not its
        // index), so a child added in a racing order does not shift its later siblings' keys
        const seen = new Map();
        for (const c of o.children) {
          const id = childId(c), nth = seen.get(id) || 0;
          seen.set(id, nth + 1);
          walk(c, `${path}/${id}#${nth}`);
        }
      };
      // a root's hash is its subtree's entries without the root's index; the module's is over its roots' hashes
      // sorted, so the order roots were added in (async builds race) does not move it
      const rootHashes = [];
      // a root is keyed as a child is (below), so a key does not shift when another root is added earlier
      const seenRoot = new Map();
      list.forEach((o) => {
        const id = childId(o), nth = seenRoot.get(id) || 0;
        seenRoot.set(id, nth + 1);
        const e0 = entries.length, p = `#${nth}`;
        walk(o, p);
        rootHashes.push(hashStr(entries.slice(e0).map((e) => e.k.slice(p.length) + '=' + e.h).join('\n')));
      });
      out[name] = { h: hashStr(rootHashes.sort().join('\n')), objs, attrs, texs, mb: +((bytes - b0) / 1048576).toFixed(1), entries };
    }
    return { ms: Math.round(performance.now() - t0), mods: out };
  }
  const mark = performance.mark.bind(performance);
  performance.mark = function (name, o) {
    const r = mark(name, o);
    if (name === 'fp:ready' && window.__fp && !window.__buildCheck) {
      try { window.__buildCheck = fingerprint(window.__fp); } catch (e) { window.__buildCheck = { error: String(e && e.stack || e) }; }
    }
    return r;
  };
}

const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function once() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.addInitScript(install);
  if (+opts.throttle > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +opts.throttle }); }
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__buildCheck, null, { timeout: 900000, polling: 500 });
  if (opts.repeat) {
    await page.waitForFunction(() => window.__fp?.keptDone, null, { timeout: 120000, polling: 250 });
    await page.reload();
    await page.waitForFunction(() => window.__buildCheck, null, { timeout: 900000, polling: 500 });
    const how = await page.evaluate(() => ({ bake: window.__fp_startup.report().extra.bake?.source, hits: window.__fp.keptStats?.hits }));
    console.log(`  (repeat: the terrain from ${how.bake}; kept hits ${JSON.stringify(how.hits)})`);
    if (how.bake !== 'kept') { console.log('FAIL --repeat: the reload did not take its terrain from the store'); process.exit(1); }
  }
  const r = await page.evaluate(() => window.__buildCheck);
  await page.close();
  if (r.error) { console.log('FAIL fingerprint threw:', r.error); process.exit(1); }
  r.wall = Date.now() - t0;
  return r;
}
// --runs=N loads N times, one after another; an entry whose hash differs between the loads is unstable (a module
// that packs by time or waits on another module's build: region-bletting waits up to 15 s for vegetation's trees),
// recorded as such and skipped by --against, and the module's fingerprint is taken without it.
const runs = Math.max(1, +opts.runs || 1);
const res = await once();
const unstable = new Map(); // module -> Set of keys
for (let k = 1; k < runs; k++) {
  const r = await once();
  for (const [n, m] of Object.entries(res.mods)) {
    const other = new Map((r.mods[n]?.entries || []).map((e) => [e.k, e.h])), mine = new Map(m.entries.map((e) => [e.k, e.h]));
    const keys = new Set([...mine.keys(), ...other.keys()]);
    for (const key of keys) if (other.get(key) !== mine.get(key)) { if (!unstable.has(n)) unstable.set(n, new Set()); unstable.get(n).add(key); }
  }
}
await browser.close();
const hashStr = (s) => { let a = 0x811c9dc5 | 0; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 0x01000193); return (a >>> 0).toString(16).padStart(8, '0'); };
const stableHash = (m, skip) => (skip && skip.size ? 's' + hashStr(m.entries.filter((e) => !skip.has(e.k)).map((e) => e.k + '=' + e.h).sort().join('\n')) : m.h);
for (const [n, keys] of unstable) {
  const m = res.mods[n];
  m.unstable = [...keys];
  for (const e of m.entries) if (keys.has(e.k)) e.h = 'unstable';
  m.h = stableHash(m, keys);
}
const only = opts.only ? new Set(opts.only.split(',')) : null;
const names = Object.keys(res.mods).filter((n) => !only || only.has(n)).sort();
console.log(`build-check ${url}${+opts.throttle > 1 ? ` · cpu ${opts.throttle}x` : ''} · ready in ${(res.wall / 1000).toFixed(1)} s · fingerprinted in ${res.ms} ms${runs > 1 ? ` · ${runs} loads` : ''}`);
for (const n of names) {
  const m = res.mods[n];
  console.log(`  ${n.padEnd(22)} ${m.h}  ${String(m.objs).padStart(5)} objects ${String(m.attrs).padStart(5)} attributes ${String(m.texs).padStart(3)} textures ${String(m.mb).padStart(6)} MB${m.unstable ? `  (${m.unstable.length} entries unstable between loads: ${m.unstable.slice(0, 3).join(', ')}${m.unstable.length > 3 ? ', ...' : ''})` : ''}`);
}
if (opts.record) {
  writeFileSync(opts.record, JSON.stringify({ kind: 'fading-planet-build-check', url, q: opts.q, params: opts.params, runs, date: new Date().toISOString(), mods: res.mods }));
  console.log('[recorded]', opts.record);
}
if (opts.against) {
  const rec = JSON.parse(readFileSync(opts.against, 'utf8')), ref = rec.mods;
  if (rec.q !== opts.q || (rec.params || '') !== opts.params) { console.log(`FAIL the recording is q=${rec.q} params=${rec.params || '(none)'}, this load q=${opts.q} params=${opts.params || '(none)'}: record again or match them`); process.exit(2); }
  // only the recording's unstable entries are skipped: one that is unstable in this load but was stable when recorded
  // is new nondeterminism, a failure. More than MAX_SKIP of a module's entries skipped fails unless --allowunstable.
  const MAX_SKIP = 0.1;
  let moved = 0, same = 0, compared = 0;
  for (const n of [...new Set([...names, ...Object.keys(ref).filter((n) => !only || only.has(n))])].sort()) {
    const a = ref[n], b = res.mods[n];
    if (!a || !b) { console.log(`MOVED ${n}: only in the ${a ? 'recording' : 'this load'}`); moved++; continue; }
    const skip = new Set(a.unstable || []);
    const fresh = (b.unstable || []).filter((k) => !skip.has(k));
    if (fresh.length) { console.log(`MOVED ${n}: ${fresh.length} entries unstable in this load but stable in the recording: ${fresh.slice(0, 3).join(', ')}`); moved++; continue; }
    const share = skip.size / Math.max(1, a.entries.length);
    if (share > MAX_SKIP) {
      console.log(`${opts.allowunstable ? 'WARN' : 'MOVED'} ${n}: ${skip.size} of ${a.entries.length} entries are unstable in the recording (over ${MAX_SKIP * 100}%), too many to call it identical`);
      if (!opts.allowunstable) { moved++; continue; }
    }
    compared += a.entries.length - skip.size;
    if (stableHash(a, skip) === stableHash(b, skip)) { console.log(`IDENTICAL ${n}${skip.size ? ` (${skip.size} of ${a.entries.length} entries skipped as unstable)` : ''}`); same++; continue; }
    moved++;
    const A = new Map(a.entries.map((e) => [e.k, e])), B = new Map(b.entries.map((e) => [e.k, e]));
    const diffs = [];
    for (const [k, e] of A) {
      if (skip.has(k)) continue;
      const f = B.get(k);
      if (!f) diffs.push(`gone ${k}`);
      else if (f.h !== e.h) diffs.push(`${k}${e.s != null ? ` (sum ${e.s.toPrecision(10)} -> ${f.s.toPrecision(10)}, n ${e.n} -> ${f.n})` : ''}`);
    }
    for (const k of B.keys()) if (!A.has(k) && !skip.has(k)) diffs.push(`new ${k}`);
    console.log(`MOVED ${n}: ${diffs.length} of ${a.entries.length} entries`);
    for (const d of diffs.slice(0, 8)) console.log(`    ${d}`);
  }
  const fail = moved > 0 || compared === 0;
  console.log(`${fail ? 'FAIL' : 'PASS'} build-check against ${opts.against}: ${same} identical, ${moved} moved, ${compared} entries compared${compared === 0 ? ' (nothing compared: a typo in --only?)' : ''}`);
  process.exit(fail ? 1 : 0);
}
