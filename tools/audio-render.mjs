#!/usr/bin/env node
// Audio render (v7.2-00): loads the page headless (Chromium, autoplay allowed), waits for body.ready, dispatches
// `begin`, resumes the AudioContext, waits out the master's 4 s fade, then taps the post-limiter node (`audio.vol`)
// with an AudioWorklet (a Blob-URL module; ScriptProcessor if the worklet will not load) and writes what it hears as a
// 16-bit WAV at the context's rate, with `<out>.json` beside it: the url, the options, the rate, the pose, and the
// cue log (every audio.cue call, every new one-shot voice, every footstep, the gutter) in seconds from the render's
// first sample. Used by tools/audio-survey.mjs and audio-quality-test.mjs through render().
// Usage: node tools/audio-render.mjs <url> <out.wav> [--seconds=20] [--cue=name[,name]] [--at=dx,dy,dz] [--opts=<json>]
//        [--every=<s>] [--walk=<m/s>] [--steps=<n>] [--gutter | --gutter-hold=<v>] [--pre] [--tap=cue] [--mono] [--draw] [--settle=<s>] [--seed=<n>]
// --cue fires 1 s in at the camera plus --at (world axes, as tools/audio-test.mjs's offsets), --every repeats it.
// --walk holds W at that speed (over 3.6 m/s it hurries: Shift, the speed scaled from 6.6); --steps fires n of the
// walker's steps standing, 0.59 s apart. --gutter starts a real gutter 1 s in (the sun's own course, its length pinned at 14 s by ?gutter=14,600); without
// it the gutter is held off for the render so two renders compare; --gutter-hold=0.3 pins the flicker at a value.
// --settle=<s> (default 6) waits after body.ready before `begin` (see pageRender). The page loads with ?render=0 (every frame's updates, no draw: software GL otherwise starves the page's timers and
// the walk); --draw draws as usual. --pre taps the master (pre-limiter) instead, as 32-bit float, and writes the post-limiter tap of the same render to
// <out>.post.wav, sample-aligned. --tap=cue taps the cue bus alone (one-shots against silence, at the master's gain). The page has no seed parameter (WORLD.seed is fixed), so --seed is recorded and
// ignored: a render is reproducible by url, options and length.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { writeWav } from './audio-metrics.mjs';

export async function launch() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
  return chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
}

export function parseArgs(argv) {
  const o = {}, pos = [];
  for (const a of argv) { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) o[m[1]] = m[2] ?? true; else pos.push(a); }
  return { o, pos };
}
// normalise the options (from the command line or a survey entry) into the page's plan
export function plan(o = {}) {
  const num = (v, d) => (v === undefined || v === true ? d : Number(v));
  const at = typeof o.at === 'string' ? o.at.split(',').map(Number) : Array.isArray(o.at) ? o.at : [0, 0, 0];
  let opts = o.opts; if (typeof opts === 'string') opts = JSON.parse(opts);
  return {
    seconds: num(o.seconds, 20),
    cue: o.cue ? (Array.isArray(o.cue) ? o.cue : String(o.cue).split(',')).filter(Boolean) : [],
    at: { dx: at[0] || 0, dy: at[1] || 0, dz: at[2] || 0 }, opts: opts || null, every: o.every ? Number(o.every) : 0,
    walk: o.walk ? Number(o.walk) : 0, steps: o.steps ? Number(o.steps) : 0,
    gutter: !!o.gutter && o.gutter !== 'false', gutterHold: o['gutter-hold'] != null ? Number(o['gutter-hold']) : null,
    pre: !!o.pre, cueTap: o.tap === 'cue', mono: !!o.mono, draw: !!o.draw, settle: num(o.settle, 6), seed: o.seed != null ? Number(o.seed) : null,
  };
}
// the page's url for a plan: ?gutter=14,600 with --gutter, ?render=0 (the frame's updates without the draw, so software GL cannot starve the
// page's clock; --draw keeps the picture) and ?speed= for a walk at other than 3.6 or 6.6 m/s
export function withWalk(url, p) {
  const u = new URL(url);
  if (!p.draw && !u.searchParams.has('render')) u.searchParams.set('render', '0');
  // a gutter's length is drawn from Math.random (12-16 s): pinned at 14 s so two gutter renders are a fair pair
  if (p.gutter && !u.searchParams.has('gutter')) u.searchParams.set('gutter', '14,600');
  if (p.walk) { const base = p.walk > 3.6 ? 6.6 : 3.6, mul = p.walk / base; if (Math.abs(mul - 1) > 1e-6) u.searchParams.set('speed', mul.toFixed(4)); }
  return u.toString();
}

// ------------------------------------------------------------------------------------------------ the page side
const TAP = `class FpTap extends AudioWorkletProcessor {
  constructor() { super(); this.left = 0; this.n = 0; this.L = new Float32Array(16384); this.R = new Float32Array(16384);
    this.port.onmessage = (e) => { if (e.data.frames) { this.left = e.data.frames; this.first = true; } }; }
  process(inputs) {
    if (this.left > 0) {
      const inp = inputs[0] || [], L = inp[0], R = inp[1] || inp[0], m = Math.min(128, this.left);
      if (this.first) { this.first = false; this.port.postMessage({ t0: currentTime, f0: currentFrame }); }
      for (let i = 0; i < m; i++) { this.L[this.n + i] = L ? L[i] : 0; this.R[this.n + i] = R ? R[i] : 0; }
      this.n += m; this.left -= m;
      if (this.n > 16384 - 128 || this.left === 0) { this.port.postMessage({ L: this.L.slice(0, this.n), R: this.R.slice(0, this.n) }); this.n = 0; }
      if (this.left === 0) this.port.postMessage({ done: true });
    }
    return true;
  }
}
registerProcessor('fp-tap', FpTap);`;

// The page is set up once (pageSetup: settle, begin, the master's fade, the event hooks, the tap's worklet) and then
// captured any number of times (pageCapture): a survey moves the player between poses on the one page instead of
// loading the world for each.
async function pageSetup(P) {
  const fp = window.__fp, a = fp.audio, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const info = { notes: [] };
  // the mix at the level it was made at
  try { a.setMuted(false); a.setVolume(1); } catch (e) { info.notes.push('volume: ' + e); }
  // the sun's gutter: held off unless asked for, so two renders of a pose are a fair pair
  const fl = fp.sky?.flicker;
  if (fl) { fl.next = 1e9; if (fl.phase > 0) fl.phase = 0; }
  // headless Chromium here: starting the page's audio in the first seconds after body.ready stalls the main thread
  // (frames at 1-15 fps and timers seconds late, so walks crawl and cues fire late); after ~6 s it does not
  await sleep(P.settle * 1000);
  try { fp.events.dispatchEvent(new Event('begin')); } catch (e) { /* pointer lock refuses headless */ }
  for (let i = 0; i < 100 && !a.ctx; i++) await sleep(50);
  const ac = a.ctx; if (!ac) return { error: 'no AudioContext after begin' };
  await ac.resume();
  { let n = 0, on = true; const c = () => { n++; if (on) requestAnimationFrame(c); }; requestAnimationFrame(c); await sleep(4500); on = false; info.fpsFade = n / 4.5; } // the master fades in over 4 s
  info.state = ac.state; info.sampleRate = ac.sampleRate;
  // ---- the event log (times on the audio clock; made relative to the first sample at each capture's end)
  const R = (window.__rig = { events: [], named: new WeakMap(), seen: new WeakSet(), useWorklet: true, info });
  const cp = fp.camera.position;
  const dist = (p) => (p && typeof p === 'object' && 'x' in p ? Math.hypot(p.x - cp.x, (p.y ?? cp.y) - cp.y, p.z - cp.z) : null);
  R.cue0 = a.cue; R.step0 = fp.player.onStep;
  a.cue = function (name, pos, opts) {
    const had = new Set(a.voices);
    R.events.push({ kind: 'cue', at: ac.currentTime, name, d: dist(pos), opts: opts ?? null });
    const r = R.cue0.apply(this, arguments);
    for (const v of a.voices) if (!had.has(v)) R.named.set(v, name);
    return r;
  };
  fp.player.onStep = function (h) { R.events.push({ kind: 'step', at: ac.currentTime, hurrying: !!h }); return R.step0?.apply(this, arguments); };
  a.onToe = (t) => R.events.push({ kind: 'step', at: t, toe: true }); // the hurried step's toe (steps.js)
  // ---- the tap's worklet
  try { await ac.audioWorklet.addModule(URL.createObjectURL(new Blob([P.tapCode], { type: 'application/javascript' }))); }
  catch (e) { R.useWorklet = false; info.notes.push('AudioWorklet failed (' + e + '): ScriptProcessor'); }
  info.tap = R.useWorklet ? 'AudioWorklet' : 'ScriptProcessor';
  R.sink = ac.createGain(); R.sink.gain.value = 0; R.sink.connect(ac.destination);
  return { info };
}

async function pageCapture(P) {
  const fp = window.__fp, a = fp.audio, R = window.__rig, ac = a.ctx, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const info = { notes: [...R.info.notes], sampleRate: ac.sampleRate, state: ac.state, tap: R.info.tap, fpsFade: R.info.fpsFade }, cp = fp.camera.position, fl = fp.sky?.flicker;
  // ---- move to the pose (as the url's pos= and yaw= would put it), let the bed settle on it
  if (P.pose) {
    const pl = fp.player, t = fp.terrain, { x, z } = P.pose;
    pl.keys.clear(); pl.pos.set(x, t.heightAt(x, z) + pl.eye, z); pl.vel.set(0, 0, 0); pl.vy = 0; pl.onGround = true; pl.hopping = false; pl.onTop = false;
    if (P.pose.yaw != null) pl.yaw = P.pose.yaw;
    pl.pitch = P.pose.pitch ?? 0;
  }
  if (fl) { fl.next = 1e9; if (fl.phase > 0) fl.phase = 0; fl.hold = P.gutterHold != null ? P.gutterHold : null; }
  else if (P.gutter || P.gutterHold != null) info.notes.push('gutter asked for but the page has no sky (only=?): none rendered');
  if (P.between > 0) await sleep(P.between * 1000);
  R.events.length = 0; for (const v of a.voices) R.seen.add(v);
  const events = R.events;
  // ---- the taps
  const frames = Math.round(P.seconds * ac.sampleRate), sink = R.sink, useWorklet = R.useWorklet;
  const mkTap = (node) => {
    const t = { L: [], R: [], n: 0, t0: null, f0: null, done: false };
    if (useWorklet) {
      const w = new AudioWorkletNode(ac, 'fp-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' });
      w.port.onmessage = (e) => { const d = e.data; if (d.t0 != null) { t.t0 = d.t0; t.f0 = d.f0; } if (d.L) { t.L.push(d.L); t.R.push(d.R); t.n += d.L.length; } if (d.done) t.done = true; };
      node.connect(w); w.connect(sink); t.node = w; t.src = node; t.start = () => w.port.postMessage({ frames });
    } else {
      const sp = ac.createScriptProcessor(4096, 2, 2); let on = false;
      sp.onaudioprocess = (e) => {
        if (!on || t.done) return;
        if (t.t0 == null) { t.t0 = e.playbackTime; t.f0 = Math.round(e.playbackTime * ac.sampleRate); }
        const m = Math.min(4096, frames - t.n), ib = e.inputBuffer;
        t.L.push(ib.getChannelData(0).slice(0, m)); t.R.push((ib.numberOfChannels > 1 ? ib.getChannelData(1) : ib.getChannelData(0)).slice(0, m));
        t.n += m; if (t.n >= frames) t.done = true;
      };
      node.connect(sp); sp.connect(sink); t.node = sp; t.src = node; t.start = () => { on = true; };
    }
    return t;
  };
  // --tap=cue: the cue bus alone (through its analyser, which passes its input on) at the master's gain, so a one-shot
  // reads against silence at the level it reaches the limiter; anything wired past the cue bus is not in it
  let cueGain = null;
  const cueOnly = () => { cueGain = ac.createGain(); cueGain.gain.value = a.master.gain.value; a.cueAnalyser.connect(cueGain); return cueGain; };
  const taps = [mkTap(P.cueTap ? cueOnly() : P.pre ? a.master : a.vol)];
  if (P.pre) taps.push(mkTap(a.vol));

  // ---- the walk: W (and Shift) held from the first sample
  const p0 = { x: cp.x, y: cp.y, z: cp.z, yaw: fp.player.yaw };
  if (P.walk) { fp.player.keys.add('KeyW'); if (P.walk > 3.6) fp.player.keys.add('ShiftLeft'); }
  let frames0 = 0, raf = true; const countFrames = () => { frames0++; if (raf) requestAnimationFrame(countFrames); }; requestAnimationFrame(countFrames);
  taps.forEach((t) => t.start());
  const w0 = performance.now();
  while (taps[0].t0 == null && performance.now() - w0 < 5000) await sleep(5);
  const T0 = taps[0].t0 ?? ac.currentTime;
  // ---- the plan, on the audio clock
  let nextCue = P.cue.length ? 1 : Infinity, stepsLeft = P.steps, nextStep = 1, gutterAsked = false, gut = null;
  const wall0 = performance.now(), wallMax = (P.seconds + 60) * 1000;
  while (!taps.every((t) => t.done) && performance.now() - wall0 < wallMax) {
    const rt = ac.currentTime - T0;
    if (rt >= nextCue && rt < P.seconds - 0.5) {
      for (const name of P.cue) a.cue(name, { x: cp.x + P.at.dx, y: cp.y + P.at.dy, z: cp.z + P.at.dz }, P.opts || undefined);
      nextCue = P.every > 0 ? nextCue + P.every : Infinity;
    }
    if (stepsLeft > 0 && rt >= nextStep) { fp.player.onStep(false); stepsLeft--; nextStep += 0.59; }
    if (fl && P.gutter && !gutterAsked && rt >= 1) { gutterAsked = true; fl.phase = 0; fl.next = 0; }
    if (fl) {
      if (!gut && fl.phase > 0) gut = { kind: 'gutter', at: ac.currentTime, len: fl.len, floorAt: null, endAt: null, minValue: fl.value };
      if (gut) { gut.minValue = Math.min(gut.minValue, fl.value); if (gut.floorAt == null && fl.value < 0.5) gut.floorAt = ac.currentTime; if (gut.endAt == null && fl.phase <= 0) gut.endAt = ac.currentTime; }
    }
    for (const v of a.voices) if (!R.seen.has(v)) { R.seen.add(v); events.push({ kind: 'voice', at: v.t0, name: R.named.get(v) || '', d: v.d }); }
    await sleep(15);
  }
  raf = false;
  if (P.walk) { fp.player.keys.delete('KeyW'); fp.player.keys.delete('ShiftLeft'); }
  if (fl) { fl.next = 1e9; fl.phase = 0; fl.hold = null; } // a gutter started here does not run on into the next pose
  if (gut) events.push(gut);
  info.wallSeconds = (performance.now() - wall0) / 1000;
  info.fps = frames0 / info.wallSeconds;
  info.pose = { start: p0, end: { x: cp.x, y: cp.y, z: cp.z, yaw: fp.player.yaw }, walked: Math.hypot(cp.x - p0.x, cp.z - p0.z) };
  info.region = fp.regions?.regionAt?.(cp.x, cp.z)?.key ?? null;
  info.gutter = gut ? { start: gut.at - T0, len: gut.len, floor: gut.floorAt != null ? gut.floorAt - T0 : null, end: gut.endAt != null ? gut.endAt - T0 : null, minValue: gut.minValue }
    : P.gutterHold != null ? { held: P.gutterHold } : fl ? 'held off' : 'no sky';
  const rel = events.map((e) => {
    const o = { kind: e.kind, t: +(e.at - T0).toFixed(3) };
    if (e.name !== undefined) o.name = e.name; if (e.d != null) o.d = +e.d.toFixed(1); if (e.opts) o.opts = e.opts; if (e.hurrying) o.hurrying = true;
    if (e.kind === 'gutter') { o.len = +(e.len || 0).toFixed(2); if (e.floorAt != null) o.floor = +(e.floorAt - T0).toFixed(3); if (e.endAt != null) o.end = +(e.endAt - T0).toFixed(3); o.minValue = +e.minValue.toFixed(3); }
    return o;
  }).filter((e) => e.t > -1 && e.t < P.seconds + 1).sort((x, y) => x.t - y.t);
  // the PCM, as base64 of Float32 per channel
  const b64 = (chunks, n) => { const f = new Float32Array(n); let o = 0; for (const c of chunks) { f.set(c.subarray(0, Math.min(c.length, n - o)), o); o += c.length; if (o >= n) break; } const u8 = new Uint8Array(f.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const pcm = taps.map((t) => ({ n: Math.min(t.n, frames), f0: t.f0, t0: t.t0, done: t.done, L: b64(t.L, Math.min(t.n, frames)), R: b64(t.R, Math.min(t.n, frames)) }));
  taps.forEach((t) => { try { t.src.disconnect(t.node); } catch (e) { /* gone */ } try { t.node.disconnect(); } catch (e) { /* gone */ } });
  if (cueGain) { try { a.cueAnalyser.disconnect(cueGain); } catch (e) { /* gone */ } }
  return { info, events: rel, pcm, startAudioTime: T0, contextTime: ac.currentTime };
}

// ------------------------------------------------------------------------------------------------ the node side
const f32 = (b) => { const buf = Buffer.from(b, 'base64'); return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4); };

// One page, many captures. `url` is the first pose's page (?q=low&pos=..&yaw=..); each capture takes the options of a
// render plus `pose: { x, z, yaw, pitch }` to move the player there first, and `between` seconds (default 8) to let the
// bed settle on the new place before the tap starts. A capture needs the url's own parameters to be the session's
// (`?speed=` for a walk at other than 3.6 or 6.6 m/s cannot change on a live page): sessionFits() says which do.
export const BETWEEN = 8;
export function sessionFits(p) { const P = plan(p); return !P.walk || Math.abs(P.walk / (P.walk > 3.6 ? 6.6 : 3.6) - 1) < 1e-6; }
export async function openSession(browser, url, first = {}) {
  const P0 = plan(first), settle = P0.settle, u = withWalk(url, { ...P0, gutter: true }), t0 = Date.now(), page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  let up = false;
  try {
    await page.goto(u, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
    const loadS = (Date.now() - t0) / 1000;
    const setup = await page.evaluate(pageSetup, { settle, tapCode: TAP });
    if (setup.error) throw new Error(setup.error);
    up = true;
    const S = { page, url: u, loadS, setup: setup.info, errors, captures: 0 };
    S.capture = async (out, options = {}, { quiet = false } = {}) => {
      const P = plan({ ...options, settle: undefined });
      P.pose = options.pose || null; P.between = S.captures === 0 ? 0 : options.between ?? BETWEEN;
      const res = await page.evaluate(pageCapture, P);
      S.captures++;
      if (res.error) throw new Error(res.error);
      return finish(res, out, options, P, u, S.captures === 1 ? loadS : 0, errors, quiet);
    };
    S.close = () => page.close();
    return S;
  } catch (e) { await page.close(); throw e; }
}

// the WAVs and the log from a capture's result
function finish(res, out, options, P, u, loadS, errors, quiet) {
  const sr = res.info.sampleRate, [main, post] = res.pcm;
  if (!main.done || main.n < Math.round(P.seconds * sr) * 0.98) throw new Error(`tap stopped short: ${main.n} of ${Math.round(P.seconds * sr)} frames`);
  const chans = (t, skip = 0) => { const L = f32(t.L), R = f32(t.R); return [L.subarray(skip), R.subarray(skip)]; };
  // the two taps of a --pre render start on their own render quanta: line them up by the frame each began on
  let skipMain = 0, skipPost = 0;
  if (post) { const d = (post.f0 ?? 0) - (main.f0 ?? 0); if (d > 0) skipMain = d; else skipPost = -d; }
  const mono = (c) => { const m = new Float32Array(c[0].length); for (let i = 0; i < m.length; i++) m[i] = (c[0][i] + c[1][i]) / 2; return [m]; };
  let C = chans(main, skipMain); if (P.mono) C = mono(C);
  writeWav(out, C, sr, { float: P.pre });
  let postFile = null;
  if (post) { let D = chans(post, skipPost); if (P.mono) D = mono(D); const n = Math.min(C[0].length, D[0].length); D = D.map((c) => c.subarray(0, n)); postFile = out.replace(/\.wav$/i, '') + '.post.wav'; writeWav(postFile, D, sr, { float: true }); }
  const log = {
    url: u, options: Object.fromEntries(Object.entries(options).filter(([k]) => k !== 'tapCode')), plan: P, sampleRate: sr, seconds: C[0].length / sr,
    tap: P.pre ? 'master (pre-limiter)' : 'vol (post-limiter)', tapNode: res.info.tap, postFile: postFile && path.basename(postFile), alignedFrames: skipMain || skipPost || 0,
    startAudioTime: +res.startAudioTime.toFixed(4), rendered: new Date().toISOString(), loadSeconds: +loadS.toFixed(1), wallSeconds: +res.info.wallSeconds.toFixed(1),
    fps: +res.info.fps.toFixed(1), fpsFade: +res.info.fpsFade.toFixed(1), contextState: res.info.state, pose: res.info.pose, region: res.info.region, gutter: res.info.gutter,
    seed: P.seed != null ? `${P.seed} (not a page parameter: ignored; renders are reproducible by url, options and length)` : null,
    notes: [...res.info.notes, ...(res.info.fps < 30 ? [`the page ran at ${res.info.fps.toFixed(1)} fps during the render: walks and frame-driven schedulers ran slow`] : [])], errors: errors.slice(), counts: res.events.reduce((m, e) => ((m[e.kind] = (m[e.kind] || 0) + 1), m), {}), events: res.events,
  };
  fs.writeFileSync(out.replace(/\.wav$/i, '') + '.json', JSON.stringify(log, null, 1));
  if (!quiet) console.log(`${out}: ${log.seconds.toFixed(2)} s at ${sr} Hz (${log.tap}, ${log.tapNode}), load ${log.loadSeconds} s, ${log.fpsFade}/${log.fps} fps; events ${JSON.stringify(log.counts)}${typeof log.gutter === 'object' && log.gutter.start != null ? `; gutter ${log.gutter.start.toFixed(1)}-${log.gutter.end?.toFixed(1)} s` : ''}${postFile ? '; post: ' + postFile : ''}${errors.length ? `; ${errors.length} page errors` : ''}`);
  return log;
}

// one render on a page of its own (the old path; a survey pose that cannot share a page, or --fresh)
export async function render(browser, url, out, options = {}, { quiet = false } = {}) {
  const S = await openSession(browser, url, options);
  try { return await S.capture(out, options, { quiet }); } finally { await S.close(); }
}

async function main() {
  const { o, pos } = parseArgs(process.argv.slice(2));
  if (pos.length < 2) { console.error('usage: node tools/audio-render.mjs <url> <out.wav> [--seconds=20] [--cue=a,b --at=dx,dy,dz --opts=json --every=s] [--walk=m/s] [--steps=n] [--gutter|--gutter-hold=v] [--pre] [--mono] [--seed=n]'); process.exit(2); }
  if (o.seed != null) console.warn('note: the page has no seed parameter (WORLD.seed is fixed); --seed is recorded and ignored');
  const browser = await launch();
  try { await render(browser, pos[0], pos[1], o); }
  catch (e) { console.error('render failed:', e.message); process.exitCode = 1; }
  finally { await browser.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
