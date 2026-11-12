# Release notes

A `RELEASES.md` entry is for a stranger who has never taken the walk: what this version adds, what they can find or will notice, and, if it matters to them, what does not work yet. It is also the version's GitHub release. The engineering story (how, measured how, tested how, decided by whom) belongs in the milestone doc's Status and the commits, not here. This is the owner's model, from issue #3.

## The shape

```
## v<N>: <plain title>

Released <YYYY-MM-DD>.

<One or two plain sentences on what the release adds.>

- **<What a visitor finds or notices, in plain words>**: <One or two sentences: what it is and where.>
- ... three to seven of these; a small hotfix may have one.

Known issues: <one to three plain items, only if they matter to a visitor>.
```

The owner's example:

```
## v7: The living

Adds far more life to the world, with 18 new creatures and motifs to discover. Highlights:

* **Three new walking NPCs to discover**: The Little Thurifer walks paths near the Armiger's Tower, the Link Boy tries to skip ahead of you down main paths, and [x] endlessly lights 12 lanterns near the keep.
```

## Rules

- Name places and characters, and explain each in passing the first time in an entry: "the Leerie, a lamplighter", "the Adust, a red clay desert", "when the sun gutters (dims for a few seconds)". Assume the reader knows nothing of the world.
- Cut: who decided what, the agents' process, brief numbers, test names and pass counts, file paths, measurements, internal codes (AM, BQ, CE...), path codes (P3, K1), shot stage numbers, flags (except where a flag is the feature, as with `?perf=1`).
- Say only what shipped. Write from the milestone doc's Status and the merged work; if you cannot tell what something is, read the code or the doc; leave out what you cannot verify.
- Honesty about what shipped weaker than planned goes two ways: what a visitor would trip over goes in Known issues, in their words; the rest goes in the milestone doc's Status, for engineers.
- Keep the version's title plain ("The sound", "A settings menu"), not the milestone doc's voice.

## Before and after (v7)

Don't:

> *The walkers* (`src/v7/walkers.js`): the Little Thurifer walks P3 in a robe far too long, swinging a censer of thin blue smoke, and steps off to bow as you pass; the Leerie walks the twelve standards beside K1 touching each wick and lighting none, turning only at a gutter's end; ...

Do:

> - **Three walking figures**: The Little Thurifer, a small figure in a robe far too long swinging a censer of blue smoke, walks the sheep-track between the Wayside Shrine and the Cardinal Stones and steps aside to bow as you pass. The Leerie, a lamplighter, walks the row of twelve lamps near the keep, touching each wick. ...

And for what fell short (v7.2), don't: "**Known and left:** the places' rooms are not yet told apart by ear (court, tarn and canyon all read about −31 LUFS with the moor's sharpness; ...)". Do: "Known issues: places are meant to sound like different rooms (the open moor, the wood, the stone of the keep, the water's edge), but the difference is still hard to hear."

## Steps

1. Write the entry at the top of `RELEASES.md` in the release PR, from the milestone doc's Status.
2. In the same PR, add the release's line at the top of `README.md`'s Milestones: `- [v<N>: <the entry's title>](https://github.com/<owner>/<repo>/releases/tag/v<N>). <One plain sentence.>` The title is the entry's, exactly; the sentence is the shortest plain summary, in the owner's voice ("Soundscape level-up.", "Fixed the peafowl."). Every release has one, a hotfix included. `tools/release-check.sh` (run by the gate) checks every entry has its line and the newest is first.
3. Check it: `tools/gh-release.sh --dry-run <version>` shows the notes as GitHub will.
4. After the release PR merges, run `tools/gh-release.sh <version>`: it creates the release and its tag on the merge commit (or edits the release if it exists).
5. Close the issues the release ships, linking the release.
