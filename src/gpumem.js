// GPU memory accounting (v3 stage 3). renderer.info.memory only counts textures and geometries; this wraps
// the WebGL calls that allocate texture and renderbuffer storage and keeps the bytes each one holds, so the
// profiler can say how many megabytes the render targets, the shadow map and the procedural textures take,
// and how many texture uploads a frame makes (a static texture re-uploaded every frame shows up here).
// Mip chains count when they are allocated (texStorage levels, or generateMipmap: +1/3). The canvas's own
// drawing buffer is not allocated through these calls, so it is estimated from the context's attributes.
const BPP = {
  0x8058: 4, 0x8c43: 4, 0x8051: 4, 0x8c41: 4, 0x8059: 4, 0x8c3a: 4, // RGBA8 SRGB8_ALPHA8 RGB8 SRGB8 RGB10_A2 R11G11B10F
  0x881a: 8, 0x881b: 8, 0x8814: 16, 0x8815: 16,                       // RGBA16F RGB16F RGBA32F RGB32F
  0x8229: 1, 0x822b: 2, 0x822d: 2, 0x822e: 4, 0x822f: 4, 0x8230: 8,   // R8 RG8 R16F R32F RG16F RG32F
  0x8231: 1, 0x8232: 1, 0x8233: 2, 0x8234: 2, 0x8235: 4, 0x8236: 4,   // R8I.. integer formats
  0x81a5: 2, 0x81a6: 4, 0x8cac: 4, 0x88f0: 4, 0x8cad: 8, 0x8d48: 1,   // DEPTH16 DEPTH24 DEPTH32F D24S8 D32FS8 STENCIL8
  0x1902: 4,                                                          // DEPTH_COMPONENT (unsized)
};
const TYPE_BYTES = { 0x1401: 1, 0x1406: 4, 0x140b: 2, 0x8d61: 2, 0x1403: 2, 0x1405: 4 }; // ubyte float half half_oes ushort uint
const CHANNELS = { 0x1908: 4, 0x1907: 3, 0x1903: 1, 0x8227: 2, 0x1909: 1, 0x190a: 2, 0x1906: 1 }; // RGBA RGB RED RG LUM LUMA ALPHA
function bpp(internal, format, type) {
  if (BPP[internal]) return BPP[internal];
  const ch = CHANNELS[internal] ?? CHANNELS[format] ?? 4, tb = TYPE_BYTES[type] ?? 1;
  return Math.max(1, (ch === 3 ? 4 : ch) * tb);
}
const CUBE = 0x8513, CUBE_X = 0x8515, CUBE_NZ = 0x851a;

export function installGpuMem(gl, canvas) {
  const tex = new Map(); // WebGLTexture -> Map(face:level -> bytes)
  const rbs = new Map(); // WebGLRenderbuffer -> bytes
  const bound = new Map(); // unit*65536 + target -> texture
  let unit = 0, rb = null;
  let uploads = 0, uploadsFrame = 0, perFrame = 0, frames = 0;
  const key = (target) => unit * 65536 + (target >= CUBE_X && target <= CUBE_NZ ? CUBE : target);
  const levels = (t) => { let m = tex.get(t); if (!m) { m = new Map(); tex.set(t, m); } return m; };
  const wrap = (name, after) => {
    const orig = gl[name];
    if (typeof orig !== 'function') return;
    gl[name] = function (...a) { const r = orig.apply(gl, a); after(a, r); return r; };
  };
  wrap('activeTexture', (a) => { unit = a[0] - gl.TEXTURE0; });
  wrap('bindTexture', (a) => { bound.set(key(a[0]), a[1]); });
  wrap('texImage2D', (a) => {
    uploads++; uploadsFrame++;
    const t = bound.get(key(a[0])); if (!t) return;
    let w, h, fmt, type;
    if (a.length >= 8) { w = a[3]; h = a[4]; fmt = a[6]; type = a[7]; }
    else { const s = a[5]; w = s?.videoWidth || s?.naturalWidth || s?.displayWidth || s?.width || 0; h = s?.videoHeight || s?.naturalHeight || s?.displayHeight || s?.height || 0; fmt = a[3]; type = a[4]; }
    levels(t).set(`${a[0]}:${a[1]}`, w * h * bpp(a[2], fmt, type));
  });
  wrap('texImage3D', (a) => {
    uploads++; uploadsFrame++;
    const t = bound.get(key(a[0])); if (!t) return;
    levels(t).set(`${a[0]}:${a[1]}`, a[3] * a[4] * a[5] * bpp(a[2], a[7], a[8]));
  });
  const storage = (a, depth) => {
    const t = bound.get(key(a[0])); if (!t) return;
    const m = levels(t); m.clear();
    let w = a[3], h = a[4], d = depth ? a[5] : 1, total = 0;
    const faces = a[0] === CUBE ? 6 : 1;
    for (let l = 0; l < a[1]; l++) { total += w * h * d * bpp(a[2]) * faces; w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); if (depth && a[0] !== 0x8c1a) d = Math.max(1, d >> 1); }
    m.set('storage', total);
  };
  wrap('texStorage2D', (a) => storage(a, false));
  wrap('texStorage3D', (a) => storage(a, true));
  wrap('texSubImage2D', () => { uploads++; uploadsFrame++; });
  wrap('texSubImage3D', () => { uploads++; uploadsFrame++; });
  wrap('generateMipmap', (a) => {
    const t = bound.get(key(a[0])); if (!t) return;
    const m = levels(t); if (m.has('storage')) return; // texStorage already allocated the chain
    let base = 0; for (const [k, v] of m) if (k.endsWith(':0')) base += v;
    m.set('mips', Math.round(base / 3));
  });
  wrap('deleteTexture', (a) => { tex.delete(a[0]); });
  wrap('bindRenderbuffer', (a) => { rb = a[1]; });
  wrap('renderbufferStorage', (a) => { if (rb) rbs.set(rb, a[2] * a[3] * bpp(a[1])); });
  wrap('renderbufferStorageMultisample', (a) => { if (rb) rbs.set(rb, a[3] * a[4] * bpp(a[2]) * Math.max(1, a[1])); });
  wrap('deleteRenderbuffer', (a) => { rbs.delete(a[0]); });

  const MB = (b) => Math.round(b / 1048576 * 10) / 10;
  function bytesOf(t) { let s = 0; for (const v of tex.get(t)?.values() || []) s += v; return s; }
  // the canvas's drawing buffer: colour (and a resolve buffer with MSAA), depth/stencil, times the samples
  function backbuffer() {
    const at = gl.getContextAttributes?.() || {}, px = canvas.width * canvas.height;
    const samples = at.antialias ? 4 : 1;
    const ds = (at.depth ? 4 : 0) || (at.stencil ? 4 : 0);
    return px * ((4 + ds) * samples + (samples > 1 ? 4 : 0));
  }
  return {
    bytesOf,
    frame() { perFrame = uploadsFrame; uploadsFrame = 0; frames++; },
    stats() {
      let t = 0; for (const k of tex.keys()) t += bytesOf(k);
      let r = 0; for (const v of rbs.values()) r += v;
      const bb = backbuffer();
      return { textureMB: MB(t), renderbufferMB: MB(r), backbufferMB: MB(bb), totalMB: MB(t + r + bb), textures: tex.size, renderbuffers: rbs.size, uploads, uploadsLastFrame: perFrame };
    },
  };
}
