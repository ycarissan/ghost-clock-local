#!/bin/bash
# Run tests/shell-test.sh directly on this machine (needs gnome-shell, jq,
# dbus-run-session), in a headless GNOME Shell isolated from your session:
# temporary HOME, private D-Bus session and runtime directory.

set -euo pipefail
cd "$(dirname "$0")/.."

TEST_HOME=$(mktemp -d)
trap 'rm -rf "$TEST_HOME"' EXIT

env -i PATH="$PATH" LANG="${LANG:-C.UTF-8}" HOME="$TEST_HOME" \
    XDG_CONFIG_HOME="$TEST_HOME/.config" XDG_DATA_HOME="$TEST_HOME/.local/share" \
    XDG_CACHE_HOME="$TEST_HOME/.cache" XDG_STATE_HOME="$TEST_HOME/.local/state" \
    SHELL_LOG="$TEST_HOME/gnome-shell.log" \
    tests/shell-test.sh
