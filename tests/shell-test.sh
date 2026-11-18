#!/bin/bash
# Runtime test: starts a headless GNOME Shell, installs and enables the
# extension, changes its settings and checks that no error occurs.
#
# Meant to run inside a disposable container (see tests/run-in-docker.sh),
# from the repository root, with gnome-shell, dbus and jq installed.

set -euo pipefail

UUID=$(jq -r .uuid metadata.json)
SCHEMA=$(jq -r '."settings-schema"' metadata.json)
LOG=${SHELL_LOG:-/tmp/gnome-shell.log}

if [ -z "${IN_DBUS_SESSION:-}" ]; then
    # --- Setup, then re-run this script inside a private D-Bus session ---
    # Private runtime dir: never talk to the user's own session
    XDG_RUNTIME_DIR=$(mktemp -d)
    export XDG_RUNTIME_DIR
    unset DISPLAY WAYLAND_DISPLAY DBUS_SESSION_BUS_ADDRESS

    echo "== Building and installing the package"
    mkdir -p dist
    gnome-extensions pack --force --out-dir=dist .
    gnome-extensions install --force "dist/$UUID.shell-extension.zip"

    IN_DBUS_SESSION=1 exec dbus-run-session -- "$0"
fi

EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
ext_set() {
    gsettings --schemadir "$EXT_DIR/schemas" set "$SCHEMA" "$@"
}

ext_info() {
    gdbus call --session --dest org.gnome.Shell \
        --object-path /org/gnome/Shell \
        --method org.gnome.Shell.Extensions.GetExtensionInfo "$UUID"
}

# Extension state: 1 = active/enabled, 3 = error, 4 = out of date
ext_state() {
    ext_info | grep -oP "'state': <\K[0-9.]+" | cut -d. -f1
}

fail() {
    echo "::error::$1"
    echo "== GNOME Shell log"
    cat "$LOG"
    exit 1
}

check_state() {
    local state
    state=$(ext_state)
    if [ "$state" != "1" ]; then
        ext_info
        fail "Extension is not active (state $state) $1"
    fi
    echo "   extension active $1"
}

echo "== Starting headless GNOME Shell ($(gnome-shell --version))"
gsettings set org.gnome.shell disable-user-extensions false
gsettings set org.gnome.shell enabled-extensions "['$UUID']"

gnome-shell --headless --wayland --no-x11 \
    --virtual-monitor 1920x1080 --virtual-monitor 1280x1024 \
    > "$LOG" 2>&1 &
SHELL_PID=$!
trap 'kill $SHELL_PID 2>/dev/null || true' EXIT

for _ in $(seq 60); do
    if ext_info > /dev/null 2>&1; then
        break
    fi
    kill -0 $SHELL_PID 2>/dev/null || fail "GNOME Shell exited during startup"
    sleep 1
done
ext_info > /dev/null 2>&1 || fail "GNOME Shell did not start within 60 s"
sleep 3
check_state "after startup"

echo "== Changing settings"
for mode in bottom-left top-right top-left center custom bottom-right; do
    ext_set position-mode "$mode"
    sleep 0.5
done
ext_set position-x 0.25
ext_set position-y 0.75
ext_set font 'Sans Italic 40'
ext_set opacity 0.8
for anim in slide zoom none fade; do
    ext_set animation "$anim"
done
ext_set stretch-to-screen true
sleep 1
ext_set stretch-keep-ratio false
sleep 1
ext_set split-flap true
sleep 1
check_state "after changing settings"

# The split-flap animation runs when the minute changes: wait for one
echo "== Waiting for the next minute (split-flap animation)"
sleep $((61 - $(date +%-S)))
sleep 2
check_state "after a minute change"

echo "== Disabling and re-enabling"
gnome-extensions disable "$UUID"
sleep 1
gnome-extensions enable "$UUID"
sleep 2
check_state "after re-enabling"

echo "== Checking the log for errors"
if grep -nE "JS ERROR|JS WARNING|$UUID|TypeError|ReferenceError" "$LOG" \
        | grep -vE "Extension $UUID: (enabled|disabled)"; then
    fail "Errors found in the GNOME Shell log"
fi

echo "== All checks passed"
