# Wilderness v11: the mountains

The ring mountains are in almost every frame and have been the jankiest thing in every release. v11 makes them look like mountains that happen to stand round a valley, and makes them step back: a supporting character, not the star.

## What was chosen, and why

The owner's word, in session on 2026-11-12: "let's work on the mountains!". So no choosing: the milestone is the owner's **#5** (Better mountains), with the tweak **#6** (the two big square things on the west wall) which names it. From #5:

> The earliest releases looked like My First Fractal Mountains. Too low-poly, too cheap. They were also far too regular, creating an overly artificial feeling. Later releases have upped fidelity, but still suffer from weirdness. In the current release, for instance, mountains have an exaggerated striation effect that's again very distracting.
>
> 1. Mountains are a supporting character, not the star
> 2. Mountains need to look natural and are worth spending some budget on, because they're visible in practically every frame.

Passed over, still in the pool: #4 the Heights and Depths (#5 points at it; ways up into the mountains are a milestone of their own and want a wall worth climbing first), #18, #20, #23, #28, #30. #22 waits on the owner.

## The look before planning

Seventeen renders at medium, `shots/wip/v11-00-before-*.png`, from `tools/views-v11-mountains.json` (spawn, 70 m over the centre at six yaws, the High Ling, the foreland, the west). Every brief renders the same file before and after. What they show:

- **Contour lines.** Every face away from the sun is ruled with evenly spaced horizontal lines (ledges cut in the geometry every 13 to 17 m, then outlined by the curvature bake, brightened by the shader's ledge lines, which never fade with distance, and stacked with three more height bands). Crossing them, rows of vertical fins like a picket fence. Together: a quarry face, or a topographic map (`high-y0`, `high-y4`).
- **Bell curves.** Each massif is one smooth hump, nearly symmetric; no ridgeline, no shoulder that leads the eye, no spur, no valley cut by water (`foreland-y2`, `high-y2`).
- **Cardboard behind.** The far ranges are flat lilac cut-outs with no light or structure on them.
- **No recession.** In the cold light the near wall is as contrasty at 400 m as the ground at 40 m, so it competes with everything in front of it. Toward the sun the haze already does this well: the walls there are the best the mountains look (`spawn-y1`).
- **#6:** the Galleries of Durance (`src/v5/galleries.js`, bearings 268 to 296) and the Escarpment Lamps (`src/v5/lamps.js`, 300 to 318) are two rectangles of the same size side by side on one massif (`highling-y1`).

## What a visitor should notice

Nothing, at first: the mountains stop catching the eye. Then, looking at them: rock that water and frost have worked, with gullies running down it, ribs and spurs, fans of scree at the foot, ridgelines that lead somewhere, ranges behind ranges going pale. No ruled lines. And on the west wall one great thing, not two.

## Calls made, each reversible

- **The massifs stay.** The owner chose C's five massifs and deep cols (the study); v11 keeps that plan, the sun's saddle as lowest col, `crestAt` / `faceAt` / `walkLimit` / `seats` as an API. It changes what the massifs are made of and how their outlines run.
- **The ledges go.** Bedding survives only as broken, tilted, irregular structure seen here and there, never as rules across a face.
- **Erosion is the organising idea.** What makes rock read as natural is that everything on it runs downhill: drainage first, bedding second.
- **Budget may be spent** (#5): more triangles in the far rings, more shader work on the wall, within the perf test's gates on low.
- **The Lamps move** away from the Galleries (#6 suggests it); where to is M3's call.
- **One before nine** does not split this further: three briefs, each a different part, judged on the same views. The judge is a blind reader and, when they are back, the owner: `http://localhost:8123/?pos=0,0` and look round.

## Done when

- The seventeen views show no ruled horizontal lines and no picket fins at any distance, on low, medium and high.
- A fresh agent shown the after frames alone, asked what is odd or artificial in them, does not name the mountains first.
- Everything hung on the wall (Galleries, Lamps, Hawser, Annals, Vigilant, Gradine, Thrones, Long Figure, Ridge, Span abutments, the fall) sits on it properly in a render.
- `tools/suite.sh` green; the walk no slower on low (`perf-test`).
- #6: no frame has the two squares side by side.

## Status

**2026-11-12, 07:52 PST. Opened and dispatched.** State at opening: `main` is v10 (released 04:59 today); nothing was in flight; `next` holds `main` plus v10's look back. #5 and #6 are labelled `in-progress`, `v11`, with a marked comment each. A read-only survey of the mountain code is summarised in `briefs/v11/index.md` ("Where things are").

In flight (three implementation agents, told of each other):

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| M1 the rock: faces and shading (`brief-v11-M1-rock.md`) | `issue-1101-rock` | 8161 | opus |
| M2 the form: outlines, far ranges, recession (`brief-v11-M2-form.md`) | `issue-1102-form` | 8162 | opus |
| M3 #6, the two squares (`brief-v11-M3-squares.md`) | `issue-1103-squares` | 8163 | sonnet |

Next: judge each on its before/after frames (look, then a blind reader, then a cold review of the diff), merge M1 first, then M2 onto it, then M3; then a fitting pass for whatever hung thing the new wall has disturbed (M4, written then), the critic, the curator, one full gate (shared code changes: `src/terrain.js`), release.

**Waiting on the owner:** #22 (Umami tracking) needs them to create the Umami site and paste its snippet; agents may not create accounts.
