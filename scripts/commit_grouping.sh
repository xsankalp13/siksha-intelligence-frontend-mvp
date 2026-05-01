#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH="chore/group-files-docs"
# Try to switch to existing branch, or create it if missing
git switch "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

MSG_FILE=".repo_grouping/commit_messages.txt"
FILES=(.repo_grouping/*.md)

if [ ! -f "$MSG_FILE" ]; then
  echo "Missing $MSG_FILE" >&2
  exit 1
fi

MESSAGES=()
while IFS= read -r line || [ -n "$line" ]; do
  MESSAGES+=("$line")
done < "$MSG_FILE"

i=0
for f in "${FILES[@]}"; do
  # skip files already tracked in git history
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "Already tracked: $f; skipping"
    i=$((i+1))
    continue
  fi
  if [ ! -f "$f" ]; then
    echo "Skipping missing file $f"
    continue
  fi
  msg="${MESSAGES[$i]:-chore(grouping): add grouping doc}"
  git add "$f"
  git commit -m "$msg"
  echo "Committed: $f -> $msg"
  i=$((i+1))
done

echo "Created $i commits on branch $BRANCH"
