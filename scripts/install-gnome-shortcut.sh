#!/usr/bin/env bash

set -euo pipefail

SHORTCUT_NAME="${1:-AI 调度台切换}"
SHORTCUT_BINDING="${2:-<Super>a}"
SHORTCUT_COMMAND="${3:-aidc toggle}"

SCHEMA="org.gnome.settings-daemon.plugins.media-keys"
BASE_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings"
CURRENT=$(gsettings get "$SCHEMA" custom-keybindings)

if [[ "$CURRENT" == "@as []" ]]; then
  CURRENT="[]"
fi

INDEX=$(printf '%s' "$CURRENT" | grep -o "custom[0-9]\\+/" | sed 's/[^0-9]//g' | sort -n | tail -n1)
if [[ -z "$INDEX" ]]; then
  INDEX=0
else
  INDEX=$((INDEX + 1))
fi

ENTRY_PATH="${BASE_PATH}/custom${INDEX}/"
UPDATED=$(python3 -c 'import ast, sys; items = ast.literal_eval(sys.argv[1]); items.append(sys.argv[2]); print(items)' "$CURRENT" "$ENTRY_PATH")

gsettings set "$SCHEMA" custom-keybindings "$UPDATED"
gsettings set "${SCHEMA}.custom-keybinding:${ENTRY_PATH}" name "$SHORTCUT_NAME"
gsettings set "${SCHEMA}.custom-keybinding:${ENTRY_PATH}" command "$SHORTCUT_COMMAND"
gsettings set "${SCHEMA}.custom-keybinding:${ENTRY_PATH}" binding "$SHORTCUT_BINDING"

printf '已安装 GNOME 快捷键：%s -> %s\n' "$SHORTCUT_BINDING" "$SHORTCUT_COMMAND"
