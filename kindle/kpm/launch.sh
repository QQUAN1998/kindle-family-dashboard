#!/bin/sh
set -e
ROOT=/mnt/us/kindle-dashboard
STATE="$ROOT/state"
mkdir -p "$STATE"

if [ -f "$STATE/dashboard.pid" ] && kill -0 "$(cat "$STATE/dashboard.pid")" 2>/dev/null; then
  touch "$STATE/stop"
  waited=0
  while kill -0 "$(cat "$STATE/dashboard.pid" 2>/dev/null)" 2>/dev/null && [ "$waited" -lt 10 ]; do
    sleep 1
    waited=$((waited + 1))
  done
fi

rm -f "$STATE/stop" "$STATE/dashboard.pid" "$STATE/touch.pid"
exec sh "$ROOT/bin/dashboard.sh"
