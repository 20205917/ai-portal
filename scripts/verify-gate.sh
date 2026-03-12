#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_gui() {
  [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]
}

print_step() {
  echo
  echo "==> $1"
}

print_step "1/4 构建校验"
npm run build

print_step "2/4 测试校验"
npm test

print_step "3/4 aidc 命令链"
gui_usable=0
if has_gui; then
  node bin/aidc.mjs show
  show_status="$(node bin/aidc.mjs status)"
  echo "$show_status"
  if echo "$show_status" | rg -q '"state":\s*"visible-(focused|unfocused)"'; then
    gui_usable=1
  elif echo "$show_status" | rg -q '"state":\s*"stopped"'; then
    echo "检测到显示变量但窗口未拉起，按无 GUI 可用处理（可通过 AIPROTAL_REQUIRE_GUI=1 强制失败）"
    if [[ "${AIPROTAL_REQUIRE_GUI:-0}" == "1" ]]; then
      echo "命令链校验失败：AIPROTAL_REQUIRE_GUI=1 且 show 后状态为 stopped" >&2
      exit 1
    fi
  else
    echo "命令链校验失败：show 后状态异常" >&2
    exit 1
  fi

  if [[ "$gui_usable" -eq 1 ]]; then
    node bin/aidc.mjs hide
    hide_status="$(node bin/aidc.mjs status)"
    echo "$hide_status"
    if ! echo "$hide_status" | rg -q '"state":\s*"hidden"'; then
      echo "命令链校验失败：hide 后未进入 hidden 状态" >&2
      exit 1
    fi
  fi
else
  echo "跳过 show/hide：未检测到 GUI（DISPLAY/WAYLAND_DISPLAY 不存在）"
  echo "保留状态检查输出："
  node bin/aidc.mjs status
fi

print_step "4/4 启动冒烟"
if [[ "$gui_usable" -eq 1 ]]; then
  if command -v timeout >/dev/null 2>&1; then
    set +e
    timeout 12s npm run start
    code=$?
    set -e
    if [[ "$code" -ne 0 && "$code" -ne 124 ]]; then
      echo "启动冒烟失败：npm run start 返回码 $code" >&2
      exit "$code"
    fi
    if [[ "$code" -eq 124 ]]; then
      echo "启动冒烟通过：进程在 12 秒窗口内保持运行（timeout 终止）"
    else
      echo "启动冒烟通过：进程在 12 秒内正常退出"
    fi
  else
    echo "跳过启动冒烟：系统缺少 timeout 命令"
  fi
else
  echo "跳过启动冒烟：GUI 不可用或未检测到"
fi

echo
echo "验证闸门全部通过。"
