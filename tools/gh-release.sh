#!/usr/bin/env bash
# Publish a version's RELEASES.md entry as a native GitHub release.
#
#   tools/gh-release.sh <version>             e.g. 7.2 or v7.2: create the release v<version>, or edit it if it exists
#   tools/gh-release.sh --dry-run <version>   print the title, tag, target commit and notes; touch nothing
#   tools/gh-release.sh --dry-run --all       the same for every entry in RELEASES.md
#   tools/gh-release.sh --target <rev> <version>   tag <rev> instead of the commit found below
#
# The notes are the entry between its heading "## v<version>: <title>" and the next "## v" heading.
# The release's title is the heading's text ("v7: The living"); its tag is v<version>, created by GitHub
# on the target commit if it does not exist yet. Run it after the release PR has merged to main.
#
# The target commit is the commit on main's first-parent history that shipped the version. For a new
# version that is found by itself: the earliest first-parent commit on origin/main whose diff to
# RELEASES.md adds a heading for that version, which is the release PR's merge. The versions released
# before the notes were rewritten (issue #3) are pinned in the table below, because the rewrite touched
# every heading again. Two differ from what the search would find: v1 shipped before RELEASES.md existed
# (its entry came with v2's merge; v1 is the last commit of v1's work, "refinement pass; stage 10 shots",
# just before the v2 brief written after the owner walked v1), and v6 reached main by fast-forward, so
# its tag is the last commit of that push rather than the commit that wrote the entry.
#
#   version  commit   date        how it reached main
#   1        223f985  2026-11-07  commit (before RELEASES.md)
#   2        8e05ac3  2026-11-07  merge fading-planet#90
#   2.1      e270901  2026-11-07  merge fading-planet#91
#   2.2      a743bba  2026-11-07  merge fading-planet#92
#   3        926b9d0  2026-11-07  merge fading-planet#93
#   4        5481fcf  2026-11-08  merge fading-planet#94
#   5        5dc6aa1  2026-11-08  merge fading-planet#95
#   6        be6adde  2026-11-08  fast-forward (entry written in 5d8ad63)
#   6.1      7f73c0b  2026-11-08  merge fading-planet#102
#   6.2      3a466bf  2026-11-08  merge fading-planet#105
#   6.3      bbe1e67  2026-11-08  merge fading-planet#106
#   6.4      6177a7e  2026-11-08  merge fading-planet#104
#   6.5      b3c1778  2026-11-08  merge fading-planet#107
#   6.6      aff851f  2026-11-08  merge fading-planet#108
#   6.7      c452d4c  2026-11-08  merge fading-planet#109
#   7        204d888  2026-11-08  merge fading-planet#110
#   7.1      47119e9  2026-11-09  merge fading-planet#112
#   7.2      f86f16e  2026-11-09  merge fading-planet#113
#
# Versions from 7.2.1 on are found by the search. The repository's history before 2026-11-09 comes
# from fading-planet, so its PR numbers are that repository's.

set -euo pipefail

root="$(git rev-parse --show-toplevel)"
notes_file="$root/RELEASES.md"

usage() { sed -n '2,7p' "$0"; exit 1; }

pinned() {
  sed -n '/^#   version  commit/,/^#$/p' "$0" | awk -v v="$1" '$2 == v { print $3 }'
}

dry=0; all=0; target_override=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry=1; shift ;;
    --all) all=1; shift ;;
    --target) target_override="${2:-}"; [ -n "$target_override" ] || usage; shift 2 ;;
    -h|--help) usage ;;
    -*) usage ;;
    *) break ;;
  esac
done

# The body of one version's entry, without its heading, trimmed of blank lines at either end.
entry_body() {
  awk -v h="## v$1:" '
    index($0, h) == 1 { on = 1; next }
    on && /^## v/ { exit }
    on { print }
  ' "$notes_file" | awk 'NF { started = 1 } started { lines[++n] = $0 } END { while (n > 0 && lines[n] == "") n--; for (i = 1; i <= n; i++) print lines[i] }'
}

entry_title() {
  awk -v h="## v$1:" 'index($0, h) == 1 { sub(/^## /, ""); print; exit }' "$notes_file"
}

find_target() {
  local v="$1" pin re
  pin="$(pinned "$v")"
  if [ -n "$pin" ]; then echo "$pin"; return; fi
  re="^## v$(printf '%s' "$v" | sed 's/\./\\./g')[: (]"
  git -C "$root" log --first-parent --reverse --format=%H -G"$re" origin/main -- RELEASES.md | head -1
}

one() {
  local v="${1#v}" title body target sha subject tmp
  title="$(entry_title "$v")"
  [ -n "$title" ] || { echo "no entry '## v$v:' in RELEASES.md" >&2; return 1; }
  body="$(entry_body "$v")"
  [ -n "$body" ] || { echo "the entry for v$v is empty" >&2; return 1; }
  target="${target_override:-$(find_target "$v")}"
  [ -n "$target" ] || { echo "v$v: no commit on origin/main adds its entry yet (merge the release first, or pass --target)" >&2; return 1; }
  sha="$(git -C "$root" rev-parse --verify -q "$target^{commit}")" || { echo "v$v: $target is not a commit" >&2; return 1; }
  git -C "$root" merge-base --is-ancestor "$sha" origin/main || { echo "v$v: $target is not on origin/main" >&2; return 1; }
  subject="$(git -C "$root" log -1 --format='%h %ad %s' --date=short "$sha")"

  if [ "$dry" = 1 ]; then
    printf '=== v%s\ntitle:  %s\ntag:    v%s\ntarget: %s\nnotes (%s lines):\n%s\n\n' \
      "$v" "$title" "$v" "$subject" "$(printf '%s\n' "$body" | wc -l | tr -d ' ')" "$body"
    return 0
  fi

  # pictures: RELEASES.md points at shots/ by relative path, which GitHub renders in the file; a release body needs
  # absolute addresses, pinned to the commit the release is tagged at
  local slug; slug="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
  body="$(printf '%s\n' "$body" | sed -e "s#src=\"shots/#src=\"https://raw.githubusercontent.com/$slug/$sha/shots/#g" -e "s#](shots/#](https://raw.githubusercontent.com/$slug/$sha/shots/#g")"
  tmp="$(mktemp)"; printf '%s\n' "$body" > "$tmp"
  if gh release view "v$v" >/dev/null 2>&1; then
    gh release edit "v$v" --title "$title" --notes-file "$tmp"
    echo "edited v$v ($subject)"
  else
    gh release create "v$v" --title "$title" --notes-file "$tmp" --target "$sha"
    echo "created v$v at $subject"
  fi
  rm -f "$tmp"
}

git -C "$root" fetch -q origin main

if [ "$all" = 1 ]; then
  [ "$dry" = 1 ] || { echo "--all is for --dry-run; publish one version at a time" >&2; exit 1; }
  status=0
  for v in $(sed -n 's/^## v\([0-9.]*\):.*/\1/p' "$notes_file"); do one "$v" || status=1; done
  exit $status
fi

[ $# -eq 1 ] || usage
one "$1"
