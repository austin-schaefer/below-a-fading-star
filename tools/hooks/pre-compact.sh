#!/bin/sh
# PreCompact hook (.claude/settings.json): its stdout is added to the instructions for the summary whenever this
# session's context is compacted, by the owner's /compact or automatically. Claude Code has no way for the model, a
# hook or a scheduled prompt to start a compaction (checked against its docs, 2026-11-11), so this only makes sure
# that when one happens the summary is short and points at the repository, where the state lives.
cat <<'TXT'
This is a long autonomous run of the "Below a Fading Star" repository. State lives in the repository, not in this
conversation. Keep the summary short and write it for an orchestrator that will re-read the files:
- Keep, word for word, anything the owner said in this session that is not yet written into a plans/wilderness-v<N>.md
  Status section or an issue, and say that it still needs writing down.
- Keep the list of agents in flight (brief, branch, worktree, port, agent id) and background shell tasks, and any
  merge, test run or release that was half done, with the exact next command.
- Keep any decision made and not yet committed.
- Drop everything else: file contents, render descriptions, test output, reviews of merged work, finished milestones.
  All of that is in git, RELEASES.md and the Status sections.
After compaction the first action is the `autonomous-run` skill's "On each wake": `date`, then the current
milestone doc's Status.
TXT
