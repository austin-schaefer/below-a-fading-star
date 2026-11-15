#!/bin/sh
# Every release in RELEASES.md has one line in README.md's Milestones, with the same title, linked to its GitHub
# release; and the README lists no release that RELEASES.md does not have. Run by tools/suite.sh, so a release cannot
# pass the gate with the two out of step. The model: .agents/skills/orchestrator/release-notes.md.
cd "$(dirname "$0")/.." || exit 2
fail=0; n=0
grep '^## v' RELEASES.md | sed 's/^## //' > /tmp/release-check.$$ 
while IFS= read -r head; do
  v=${head%%:*}; n=$((n + 1))
  case "$v" in *.*) pre="  - [";; *) pre="- **[";; esac  # a major release is a bold top-level line; a point release sits indented under its major
  if grep -qF -- "$pre$head](https://github.com/" README.md && grep -F -- "$pre$head](" README.md | grep -q "/releases/tag/$v)"; then echo "PASS README has $head"
  else echo "FAIL README.md Milestones has no line '$pre$head](.../releases/tag/$v)...' (a major: '- **[title](url)**. Sentence'; a point release: '  - [title](url). Sentence' under its major)"; fail=1; fi
done < /tmp/release-check.$$
rm -f /tmp/release-check.$$
m=$(sed -n '/^## Milestones/,/^## License/p' README.md | grep -cE '^(- \*\*|  - )\[v')
if [ "$m" = "$n" ]; then echo "PASS $n releases, $m README lines"; else echo "FAIL $n releases in RELEASES.md, $m lines in README.md Milestones"; fail=1; fi
first=$(grep -m1 '^## v' RELEASES.md | sed 's/^## //'); top=$(sed -n '/^## Milestones/,/^## License/p' README.md | grep -m1 '^- \*\*\[v')
# every major release (v<N>) has its picture in README.md's Progress boxes: the alt texts list the versions shown
prog=$(sed -n '/^## Progress/,/^## Milestones/p' README.md | grep '^!\[' )
shown=$(printf '%s\n' "$prog" | sed 's/\](.*//' | grep -oE '[0-9]+' | tr '\n' ' ')
for N in $(grep -oE '^## v[0-9]+:' RELEASES.md | grep -oE '[0-9]+'); do
  case " $shown " in *" $N "*) ;; *) echo "FAIL README.md Progress has no picture for v$N (tools/gallery.sh; release-notes.md, step 2)"; fail=1; miss=1;; esac
done
[ -z "$miss" ] && echo "PASS every major release has its picture in README.md Progress"
for f in $(printf '%s\n' "$prog" | grep -oE 'shots/[^)]+'); do [ -f "$f" ] || { echo "FAIL README.md Progress shows $f, which does not exist"; fail=1; }; done
# the working branch is checked out and pushed: a detached HEAD in the deploy worktree commits to nothing, and
# `git push origin next` then reports nothing wrong (v9 was released from a stale `next` this way)
br=$(git symbolic-ref --short -q HEAD || echo DETACHED)
if [ "$br" = next ]; then echo "PASS on the branch next"; else echo "FAIL HEAD is '$br', not the branch next: commits here are not on next (git checkout next && git merge --ff-only <that commit>)"; fail=1; fi
git fetch -q origin next 2>/dev/null
ahead=$(git rev-list --count origin/next..HEAD 2>/dev/null || echo '?')
if [ "$ahead" = 0 ]; then echo "PASS next is pushed"; else echo "FAIL $ahead commit(s) here are not on origin/next: push before releasing"; fail=1; fi
# newest first: the README's first line is the newest release's major, and if the newest is a point release it is that major's first sub-line
fm=${first%%:*}; fm=${fm%%.*}
case "$top" in "- **[$fm:"*) ok=1;; *) ok=;; esac
case "${first%%:*}" in *.*) sub=$(sed -n '/^## Milestones/,/^## License/p' README.md | grep -A1 -m1 '^- \*\*\[v' | tail -1); case "$sub" in "  - [$first]("*) ;; *) ok=;; esac;; esac
if [ -n "$ok" ]; then echo "PASS newest first in both"; else echo "FAIL the newest release is not first in README.md Milestones (its major at the top; a point release first under it)"; fail=1; fi
exit $fail
