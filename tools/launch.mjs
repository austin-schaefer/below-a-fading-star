// The one place the tools' browser draws WebGL (v16-P1, agent issue #79). ANGLE is the backend Chromium is
// launched with: Metal (the Mac's GPU) unless SHOT_ANGLE says otherwise; SHOT_ANGLE=swiftshader draws on the CPU,
// the software path (slow, and the same picture on every machine). ARGS are the Chromium flags every tool passes.
//   import { ANGLE, ARGS, launch } from './launch.mjs';
//   const browser = await launch();                 // chromium with ARGS
//   const browser = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); // more flags
import { createRequire } from 'node:module';
export const ANGLE = process.env.SHOT_ANGLE || 'metal';
export const ARGS = ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let pw = null;
export async function playwright() {
  if (pw) return pw;
  try { pw = await import('playwright'); }
  catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
  return pw;
}
// FP_BROWSER=chromium|firefox|webkit picks the engine (default chromium); the ANGLE flags are Chromium's only
export async function launch(opts = {}) {
  const P = await playwright(), engine = process.env.FP_BROWSER || 'chromium';
  if (engine !== 'chromium') return P[engine].launch({ ...opts, args: undefined });
  return P.chromium.launch({ ...opts, args: [...ARGS, ...(opts.args || [])] });
}
