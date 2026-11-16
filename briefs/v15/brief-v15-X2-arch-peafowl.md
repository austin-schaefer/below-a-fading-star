# Brief v15-X2: the arch's stones sit on their centring; the peafowl stand on things, not in them

Worktree `.claude/worktrees/issue-1531-arch-peafowl`, branch `issue-1531-arch-peafowl`, port 8173. Work only there. Read `briefs/v15/_common.md` first. Helpers that read images run on `haiku`.

## The owner's words (2026-11-16, 13:20)

1. "how are these bricks around the arch meant to be held up? :)" Screenshot `/Users/austin/dev/below-a-fading-star/.claude/worktrees/deploy/shots/wip/owner-v15/14.png` (read only): a door's timber centring (a half-wheel of boards on two props) in a half-built house, seen from close below, with big pale ashlar blocks standing round its upper curve at odd tilts, gaps between them and daylight between them and the timber: they read as floating.
2. "also gotta lot of peacocks clippin' thru things" Screenshot `15.png` beside it: a white peafowl on a village roof or terrace with its body through a low plastered wall, its train through the wall beside it.

## Goal

**The arch** (`src/v15/houses/newhouse.js`, "the door's centering", used by the Unroofed House `new-house` and the Strake's `strake-new`). The stones are the first voussoirs laid on the centring: each must sit on the rib (touching it), radial to the arch, hard against the stone below it, starting from a springer that sits on the wall, so that it is plain the timber carries them until the arch closes. A patch that starts this is applied uncommitted in your worktree (the orchestrator's, not rendered: check it, keep or redo it). Consider making the stones wedge-shaped and deeper than the rib is thick so they read as arch stones, not bricks, from 1.5 m below as in the owner's frame, and a wedge or two of timber under the last stone each side. Render both houses' doors at every `stage` that draws the centring, from the owner's stand (close, below, looking up through the door) and from 6 m; look at each.

**The peafowl** (`src/v4/regions/peafowl.js`, placed by `src/v4/regions/demesne.js` "on the biggest blocks round (75, -15)" through `blocks.perches`). The village now stands where their blocks were, so their perches are stale: birds stand inside walls and roofs. Give every bird a real perch: a spot on top of something drawn (a parapet's coping, a roof's edge, a wall head, the fountain's rim, a remaining block, the ground), body and train clear of every mesh and collider (the train needs about 1.6 m of clear air behind and below the rump, so a perch at an edge with the train hanging over the drop is the good one), facing out. Keep their number, their cry and its positions in step (`PEAFOWL`). Peafowl on the village's parapets are a gift: put them where a visitor sees them against the sky. Then guard it: a row in `tools/regions-test.mjs` (or `village-test`) that fails when any bird's body or train box meets a collider or sits more than 0.1 m off the top of what it stands on. Say how many of the birds clipped before.

Others at work: W4 (`issue-1528-landings`, the village's stairs, parapets and ways: a parapet you perch a bird on may move, so take perches from the plan's records at build time, not from literal coordinates) and W3 (`src/controls.js`). Merge `origin/next` before you start and before your last run.

## Done when

Before/after frames of the arch at both houses and of every bird (one frame each, the bird filling a third of it); the new row red before, green after. `ONLY=regions,village,geometry,house,walk,audio tools/suite.sh 8173` green with counts. Report `briefs/v15/reports/issue-1531-arch-peafowl.md`; hand back in under 150 words.
