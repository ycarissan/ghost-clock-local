#!/bin/bash
# Run the runtime test in a disposable Ubuntu container, like the
# "GNOME Shell runtime test" GitHub workflow.
# Usage: tests/run-in-docker.sh [image]   (default: ubuntu:26.04)

set -euo pipefail

IMAGE=${1:-ubuntu:26.04}
cd "$(dirname "$0")/.."

docker run --rm -v "$PWD:/src:ro" "$IMAGE" bash -c '
    set -euo pipefail
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq --no-install-recommends \
        gnome-shell dbus dbus-user-session jq zip unzip libglib2.0-bin \
        libgl1-mesa-dri libegl-mesa0 > /dev/null
    mkdir -p /run/dbus
    dbus-daemon --system --fork
    # systemd is not running: make GNOME Shell use its non-systemd login manager
    rm -rf /run/systemd/seats
    useradd -m tester
    cp -r /src /home/tester/work
    chown -R tester: /home/tester/work
    runuser -u tester -- bash -c "cd ~/work && tests/run-local.sh"
'
