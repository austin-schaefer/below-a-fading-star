# Brief v15-W3: fewer invisible walls (edges you can walk off)

Worktree `.claude/worktrees/issue-1527-edges`, branch `issue-1527-edges`, port 8169. Work only there. Read `briefs/v15/_common.md` first, and `world-code` "Floors, corridors and edges". Helpers that read images run on `haiku` or `sonnet`. **Stronger model: this is the walking code.**

## The owner's words (2026-11-16)

"related pet peeve: the map is too stuffed with invisible walls around pits and falls. if we're gonna have pits, and a jump button, we should allow you to go up to edge and fall in and jump"

## Where things stand

Edges hold: walkables registered with `keep` stop the walker at their lip (23 `keep: true` sites under `src/`, plus edge guards in the heights, the icefall, the Lonely Staircase, the lift, the Span, the Pit, the Nave's sinkhole, the Lappet's steps and roofs); `tools/edges-test.mjs` (214 rows) and `heights-test` assert that they hold. A fall exists (`src/v12/fall.js`: over 12 m blacks out and wakes the walker at the keep's gate), off by default (`?fall=1`, the settings panel's "A long fall costs"). A lip "press" exists (`edgeDwell` in `src/controls.js`). So today a visitor walks to a drop, stops against nothing, and Space does not carry them over.

## Goal

A drop behaves like a drop. A visitor can walk to any edge, look over, and step or hop off it; they land on what is below; nothing invisible stops them where the eye sees open air.

1. **Survey first.** List every held edge and every invisible collider that stands where nothing is drawn (the `keep` sites, the guards, `stand:false` walls with no mesh), with what is below it: a floor (how far), water, a pit with a way out, a pit with none, the world's end, geometry that would trap or clip. Put the table in the report.
2. **Decide by what is below**, and say the rule in `world-code` in a few lines:
   - *A floor below, any height, and a way back up:* open it. Walking off steps down a small drop and falls a large one; a hop clears a lip or a low parapet that is drawn. A drawn rail, parapet, rope or wall still stops a walker at its own height (a rope rail can be hopped; a wall cannot): what holds is what is seen.
   - *A long fall:* decide and say it: the fall plays (the drop, the landing, a held breath) and the walk goes on from where they land if it is ground; if it would kill a person the v12 blackout to the keep's gate is the cost, and that turns on by default (the setting stays, to turn it off). No invisible catch.
   - *A pit with no way out, or below the world:* either give it a way out (the Pit, the Nave and the Depths have theirs) or the blackout takes the walker back; never a wall of air.
   - *Where an accidental fall would only annoy* (a narrow roof walk, a plank bridge, the Leads, a stair's open side): the lip press that exists is the model: walking straight on at a lip holds for a moment, then goes; a hop goes at once. Tune it so a careless walker is not thrown off a bridge and a deliberate one is never refused. The touch stick too.
3. **Landing matters:** no falling through a floor, into a mesh, or onto a walkable that snaps the walker back up; check every opened edge by doing it.
4. **The tests change meaning, not strength:** `edges-test` and `heights-test` rows that assert "holds" become "holds where a thing is drawn; elsewhere a walker who goes off lands on X within Y and can walk on" (rewrite them row by row, say the count before and after; zero rows is a failure). `walk`, `hop`, `touch`, `acts`, the village walks and `ways` still pass; the walk tools' steering must not walk off edges by accident (give them waypoints, not walls).

Another agent (brief W2) is changing `src/v15/ways/ladder.js` and registering ladders; merge `origin/next` before you start and again before your last run. This is shared code (`src/controls.js`): the whole suite is the orchestrator's to run on `next` after your merge; you run the named tests.

## Done when

The table and the rule; for each kind of edge one done in a real browser with the pointer captured, on keys and on touch (the Lappet's top step, a roof on the Leads, the Span, the Pit's lip, the Nave's sinkhole, the icefall, the Lonely Staircase's deck, a heights gallery): frames walking to the lip, at it looking down, going over, landing, and walking on or waking at the gate. `ONLY=edges,heights,walk,hop,touch,ways,village,settings,acts,stair,lift,house tools/suite.sh 8169` green. Report `briefs/v15/reports/issue-1527-edges.md`; hand back in under 250 words, with what you chose for a long fall and why, so the owner can reverse it.
