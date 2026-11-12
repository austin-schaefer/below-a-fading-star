// Acts (v10, #24): the one small thing a visitor can do at a few places. A place's own module registers an act
// with ctx.acts.add({...}); this module owns everything every act shares: the offer (a mark and a few words rising
// at the bottom of the view, in the title card's lettering, with a soft cue), the input (E, a click while the mouse
// is captured, a tap on the offer on touch), the memory (localStorage 'fp-acts', read at load, so a mark made last
// week is in the world before the visitor reaches it) and the settings row that forgets it. The contract is in the
// `world-code` skill ("Acts"); the tally at the Lantern Halt (src/v10/tally.js) is its example.
//
// installActs(ctx, url) runs in main.js before the world modules build, so ctx.acts.add is there for all of them;
// build(ctx), the 'acts' line in MODULES, wires the offer's element, the input and the per-frame check. Away from
// every act the check is a squared distance per act (five to seven on the map) and nothing else: no DOM write, no
// allocation. ?acts=0: no offer, no memory read; add() returns a handle whose count is 0, so places draw as before.
//
// ctx.acts: { add(def) → handle, count(id), forget(), offered (the act on offer, or null), list, off, total() }
// A def: { id, at: {x, y, z}, reach = 2.5 (m, level), rise = 3 (m: the eye within this of at.y), face?: {x, z} (the
//   thing's front: offered only from that side), cone = 0.6 (rad, how far off the look may be) or facing?(player) →
//   bool, when?() → bool (offered only while true), words, every = 'visit' ('once' | 'visit' | 'free'), do(n, data) →
//   seconds | Promise | undefined (busy until then: not offered, not done again), show?(n, data) }.
//   do runs when the act is done, with the count after it; show runs at add() with the remembered count and again
//   with 0 when the visitor forgets their marks.
// A handle: { def, count, done (this visit), busy, data (the act's kept object), setData(obj) }.
// Events on ctx.events: 'act' ({ id, count }) after an act is done; 'actsforget' after the marks are forgotten.

const KEY = 'fp-acts';
const EVERY = ['once', 'visit', 'free'];
const MAXN = 9999, MAXDATA = 2048; // a stored count is clamped to this; an act's data is kept up to this many characters
const clampN = (n) => Math.max(0, Math.min(MAXN, Math.floor(+n) || 0));

function readStore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object' && s.v === 1 && s.marks && typeof s.marks === 'object') {
      const marks = {};
      for (const [id, m] of Object.entries(s.marks)) if (m && typeof m === 'object') marks[id] = { n: clampN(m.n), last: +m.last || 0, data: m.data && typeof m.data === 'object' ? m.data : undefined };
      return { v: 1, marks };
    }
  } catch (e) { /* storage refused, or junk in it */ }
  return { v: 1, marks: {} };
}
function writeStore(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }

export function installActs(ctx, url) {
  const off = url.searchParams.get('acts') === '0';
  const store = off ? { v: 1, marks: {} } : readStore();
  const list = [];
  const now = () => performance.now() / 1000;
  const mark = (id) => (store.marks[id] ||= { n: 0, last: 0 });
  const save = () => { acts.stored = writeStore(store); };
  const acts = ctx.acts = {
    off, list, offered: null, stored: true,
    add(def) {
      if (!def?.id || list.some((h) => h.def.id === def.id)) throw new Error(`acts: id missing or taken: ${def?.id}`);
      const d = { reach: 2.5, rise: 3, cone: 0.6, every: 'visit', ...def };
      if (!EVERY.includes(d.every)) throw new Error(`acts: every must be one of ${EVERY.join(', ')}`);
      const h = {
        def: d, count: off ? 0 : (store.marks[d.id]?.n ?? 0), done: false, until: 0,
        get busy() { return h.until > now(); },
        get data() { return (!off && store.marks[d.id]?.data) || {}; },
        setData(obj) {
          if (off) return false;
          const j = JSON.stringify(obj ?? {});
          if (j.length > MAXDATA) throw new Error(`acts: ${d.id}: data over ${MAXDATA} characters`);
          mark(d.id).data = JSON.parse(j); save(); return true;
        },
      };
      if (!off) list.push(h);
      try { d.show?.(h.count, h.data); } catch (e) { console.error('[fp] act show failed:', d.id, e); }
      return h;
    },
    count: (id) => (store.marks[id]?.n ?? 0),
    total: () => Object.values(store.marks).reduce((s, m) => s + (m.n || 0), 0),
    // may h be offered or done now: its `every`, not busy with its last answer, and its own when()
    may(h) {
      if (h.busy) return false;
      if (!(h.def.every === 'free' || (h.def.every === 'visit' ? !h.done : h.count === 0))) return false;
      try { return !h.def.when || !!h.def.when(); } catch (e) { return false; }
    },
    // do h now (the input calls it on the act on offer, and the tests). False if it may not be done.
    act(h = acts.offered) {
      if (!h || !acts.may(h)) return false;
      h.count = Math.min(MAXN, h.count + 1); h.done = true;
      const m = mark(h.def.id); m.n = h.count; m.last = Date.now();
      save();
      h.until = now() + 0.25; // a floor, so two fast presses never fire twice
      let ret;
      try { ret = h.def.do?.(h.count, h.data); } catch (e) { console.error('[fp] act failed:', h.def.id, e); }
      if (typeof ret === 'number' && ret > 0) h.until = Math.max(h.until, now() + ret);
      else if (ret && typeof ret.then === 'function') {
        h.until = Infinity;
        const free = () => { h.until = now() + 0.1; };
        ret.then(free, (e) => { console.error('[fp] act failed:', h.def.id, e); free(); });
      }
      ctx.events.dispatchEvent(new CustomEvent('act', { detail: { id: h.def.id, count: h.count } }));
      return true;
    },
    forget() {
      store.marks = {};
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept to forget */ }
      for (const h of list) { h.count = 0; h.done = false; try { h.def.show?.(0, {}); } catch (e) { console.error('[fp] act show failed:', h.def.id, e); } }
      ctx.events.dispatchEvent(new CustomEvent('actsforget'));
    },
  };
  return acts;
}

// The offer, the input and the per-frame check.
export async function build(ctx) {
  const acts = ctx.acts;
  if (!acts || acts.off) return;
  const el = document.getElementById('act'), words = document.getElementById('act-words');
  const card = document.getElementById('card');
  const forgetBtn = document.getElementById('set-forget');
  const P = ctx.player;
  const RISE = 0.45, LINGER = 0.35; // s in the offer's condition before it rises; s out of it before it goes
  let cand = null, held = 0, away = 0, shown = null;

  // the walk is in front of the visitor: no title or paused card, no settings panel
  const open = () => P.enabled && !ctx.settings?.shown && (!card || card.classList.contains('hidden'));
  function show(h) {
    shown = acts.offered = h;
    if (!el) return;
    if (h) { words.textContent = h.def.words; el.classList.add('shown'); ctx.audio?.cue('act-offer', h.def.at); }
    else el.classList.remove('shown');
  }
  // is h offered from where the player stands and looks? (no allocation: this runs every frame near an act)
  function inReach(h) {
    const d = h.def, p = P.pos, dx = d.at.x - p.x, dz = d.at.z - p.z, r2 = dx * dx + dz * dz;
    if (r2 > d.reach * d.reach) return -1;
    if (d.at.y != null && Math.abs(p.y - d.at.y) > d.rise) return -1; // another level: up a stair, under a deck
    if (d.face && (p.x - d.at.x) * d.face.x + (p.z - d.at.z) * d.face.z <= 0) return -1; // behind the thing
    if (d.facing) return d.facing(P) ? r2 : -1;
    // the look's bearing against the bearing to the thing; yaw 0 looks down -z
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), r = Math.sqrt(r2) || 1;
    return (fx * dx + fz * dz) / r >= Math.cos(d.cone) ? r2 : -1;
  }
  ctx.registerUpdate((dt) => {
    if (!open()) { cand = null; held = 0; away = 0; if (shown) show(null); return; } // gone at once behind a card or the panel
    let best = null, bd = Infinity;
    for (const h of acts.list) {
      if (!acts.may(h)) continue;
      const r2 = inReach(h);
      if (r2 >= 0 && r2 < bd) { bd = r2; best = h; }
    }
    if (best && best === cand) held += dt; else { cand = best; held = 0; }
    if (shown) {
      if (best === shown) away = 0;
      else if ((away += dt) > LINGER || !acts.may(shown)) { away = 0; show(null); }
    } else if (cand && held > RISE) show(cand);
  });

  function doIt() {
    const h = shown;
    if (!h || !open() || !acts.act(h)) return false;
    if (!acts.may(h)) show(null);
    return true;
  }
  acts.doOffered = doIt;
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !shown || !open()) return;
    e.preventDefault(); doIt();
  });
  // a click while the mouse is captured: the canvas has the pointer, so the offer's element cannot be clicked
  document.addEventListener('mousedown', (e) => { if (e.button === 0 && P.locked && shown) doIt(); });
  if (el) {
    // never focused (tabindex -1 in the markup, and no focus on a press), so Space and Enter stay the walk's
    el.addEventListener('mousedown', (e) => e.preventDefault());
    // touch: the offer is the button. Its own touches never reach the stick or the look (it is not the canvas).
    let tid = null;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (tid === null) tid = e.changedTouches[0].identifier; el.classList.add('held'); }, { passive: false });
    el.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    const end = (e) => {
      e.stopPropagation();
      const t = [...e.changedTouches].find((c) => c.identifier === tid);
      if (!t) return;
      tid = null; el.classList.remove('held');
      const r = el.getBoundingClientRect();
      if (e.type === 'touchend' && t.clientX >= r.left - 12 && t.clientX <= r.right + 12 && t.clientY >= r.top - 12 && t.clientY <= r.bottom + 12) doIt();
    };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
    el.addEventListener('click', (e) => { el.blur(); if (e.detail > 0) doIt(); }); // a mouse on an uncaptured page; never a key
  }
  // the settings row: forget every mark kept in this browser
  if (forgetBtn) {
    const sync = () => { const n = acts.total(); forgetBtn.disabled = n === 0; forgetBtn.textContent = n ? 'Forget my marks' : 'Nothing kept'; };
    forgetBtn.addEventListener('click', () => { acts.forget(); sync(); });
    ctx.events.addEventListener('act', sync);
    ctx.events.addEventListener('actsforget', sync);
    sync();
  }
  ctx.log(`acts: ${acts.list.length} registered, ${acts.total()} marks remembered`);
}
