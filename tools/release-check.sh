#!/bin/sh
# Every release in RELEASES.md has one line in README.md's Milestones, with the same title, linked to its GitHub
# release; and the README lists no release that RELEASES.md does not have. Run by tools/suite.sh, so a release cannot
# pass the gate with the two out of step. The model: .agents/skills/orchestrator/release-notes.md.
cd "$(dirname "$0")/.." || exit 2
fail=0; n=0
grep '^## v' RELEASES.md | sed 's/^## //' > /tmp/release-check.$$ 
while IFS= read -r head; do
  v=${head%%:*}; n=$((n + 1))
  if grep -qF -- "- [$head](https://github.com/" README.md && grep -F -- "- [$head](" README.md | grep -q "/releases/tag/$v)"; then echo "PASS README has $head"
  else echo "FAIL README.md Milestones has no line '- [$head](.../releases/tag/$v). <one sentence>'"; fail=1; fi
done < /tmp/release-check.$$
rm -f /tmp/release-check.$$
m=$(sed -n '/^## Milestones/,/^## License/p' README.md | grep -c '^- \[v')
if [ "$m" = "$n" ]; then echo "PASS $n releases, $m README lines"; else echo "FAIL $n releases in RELEASES.md, $m lines in README.md Milestones"; fail=1; fi
first=$(grep -m1 '^## v' RELEASES.md | sed 's/^## //'); top=$(sed -n '/^## Milestones/,/^## License/p' README.md | grep -m1 '^- \[v')
# the working branch is checked out and pushed: a detached HEAD in the deploy worktree commits to nothing, and
# `git push origin next` then reports nothing wrong (v9 was released from a stale `next` this way)
br=$(git symbolic-ref --short -q HEAD || echo DETACHED)
if [ "$br" = next ]; then echo "PASS on the branch next"; else echo "FAIL HEAD is '$br', not the branch next: commits here are not on next (git checkout next && git merge --ff-only <that commit>)"; fail=1; fi
git fetch -q origin next 2>/dev/null
ahead=$(git rev-list --count origin/next..HEAD 2>/dev/null || echo '?')
if [ "$ahead" = 0 ]; then echo "PASS next is pushed"; else echo "FAIL $ahead commit(s) here are not on origin/next: push before releasing"; fail=1; fi
case "$top" in "- [$first]("*) echo "PASS newest first in both";; *) echo "FAIL the newest release is not the first README line"; fail=1;; esac
exit $fail
