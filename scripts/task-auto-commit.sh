#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "用法: $0 \"type(scope): summary\" [Root cause] [Changes] [Verification] [Impact] [slug]" >&2
  exit 1
fi

summary="$1"
root_cause="${2:-N/A}"
changes="${3:-N/A}"
verification="${4:-N/A}"
impact="${5:-N/A}"
slug_input="${6:-}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "未提交：当前目录不是 Git 仓库。"
  exit 0
fi

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
    | cut -c1-40
}

if [[ -z "$slug_input" ]]; then
  slug_input="$(slugify "$summary")"
fi

if [[ -z "$slug_input" ]]; then
  slug_input="task"
fi

branch="task/$(date +%Y%m%d)-$slug_input"
current_branch="$(git branch --show-current || true)"

if [[ -z "$current_branch" || "$current_branch" == "main" || "$current_branch" == "master" ]]; then
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout "$branch"
  else
    git checkout -b "$branch"
  fi
fi

if git diff --quiet && git diff --cached --quiet; then
  echo "未提交：没有可提交的变更。"
  exit 0
fi

git add -A

message_file="$(mktemp)"
cat > "$message_file" <<EOF
$summary

Root cause
$root_cause

Changes
$changes

Verification
$verification

Impact
$impact
EOF

git commit -F "$message_file"
rm -f "$message_file"

echo "提交完成：$(git rev-parse --short HEAD)"
