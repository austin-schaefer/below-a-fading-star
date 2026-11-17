#!/usr/bin/env node
// The floor's fill depth (v16 L4), for tools/outline-test.mjs: a priority flood over a 2 m grid from x, z -290 to 290,
// seeded at every water (waterLevelAt) and past r 285; writes each cell's fill level minus its ground as float32 to
// stdout. node tools/floor-flood.mjs '?floor=v15'
globalThis.FP_HEIGHT_PARAMS = process.argv[2] || '?';
const F = await import('../src/height/field.js');
const st = 2, x0 = -290, N = 291, H = new Float64Array(N * N), Wt = new Float64Array(N * N).fill(Infinity), done = new Uint8Array(N * N);
const heap = [];
const push = (k, w) => { heap.push([w, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const x = x0 + i * st, z = x0 + j * st, k = j * N + i;
  H[k] = F.heightAt(x, z);
  if (x * x + z * z > 285 * 285 || F.waterLevelAt(x, z) !== null) { Wt[k] = H[k]; push(k, H[k]); }
}
while (heap.length) {
  const [w, k] = pop(); if (done[k]) continue; done[k] = 1;
  const i = k % N, j = (k - i) / N;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
    const kk = jj * N + ii; if (done[kk]) continue;
    const nw = Math.max(H[kk], w); if (nw < Wt[kk]) { Wt[kk] = nw; push(kk, nw); }
  }
}
const D = new Float32Array(N * N); for (let k = 0; k < N * N; k++) D[k] = Wt[k] - H[k];
process.stdout.write(Buffer.from(D.buffer));
