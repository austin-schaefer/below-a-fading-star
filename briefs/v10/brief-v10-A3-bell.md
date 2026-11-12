# Brief v10-A3: something to ring

Read `briefs/v10/_common.md` first; it is half of this brief. Port **8165**, worktree `.claude/worktrees/issue-1004-bell`.

On the unmerged branch `origin/issue-932-waystation-b` is the Bell-House: a waystation made in a fallen nine-metre bell (`git show origin/issue-932-waystation-b:src/v9/waystation.js`; note that file name is the Lantern Halt's on `next`, so nothing merges: read it and carry over what serves). The owner preferred its concept and silhouette to the other test building's. It was made for the causeway, which has its waystation now.

**Goal.** A great bell somewhere a visitor would walk 200 m to reach, that they can ring. Rehome it: not on the causeway, and not near the Lantern Halt at (-63, 1). The v9 critic listed places that are empty or dark where nobody checks: the south-west corner about (-260, 290), a bare plain at (330, -20), near-black under the Span's west end (-230, 205); one of those, or better ground of your finding (render the candidates before choosing; `src/world.js` and the roads in `src/v4/paths.js` say what is near). It need not stay a house: a bell that size, fallen or hung or half sunk, with whatever the Late folk did to it since. Whether it can still be rung as a bell is the question the place asks; the act answers it.

**The act.** Up close, the visitor strikes it (a beam on chains, a stone, a hand: yours). It sounds: the biggest sound a visitor can make in this world, in the world's key (D; the carillon in `src/audio/cues-v2.js` is a just minor pentatonic on D3, the bed drone D1 and D2; `sound-design` has the palette and the gates; a long tail, no clipping, and it must pass the loudness gates rather than move them). Then the world answers, once, from far off: decide what (another bell nobody knew was there, the rooks going up from the Demesne, the Carillon Flags, something on the mountain). The answer is the payoff: it should make a visitor turn round. A bell rung on an earlier visit has left something changed at the bell.

One act, one place. If the place and the act cannot both be finished well, finish the act at a plain strong bell and say what was left.
