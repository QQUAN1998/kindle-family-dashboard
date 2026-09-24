#!/bin/sh
ROOT=/mnt/us/kindle-dashboard
STATE="$ROOT/state"
SCRIPT_VERSION=4
mkdir -p "$STATE"
if [ -f "$STATE/dashboard.pid" ] && kill -0 "$(cat "$STATE/dashboard.pid")" 2>/dev/null; then
  if [ "$(cat "$STATE/script-version" 2>/dev/null)" = "$SCRIPT_VERSION" ]; then
    touch "$STATE/force-refresh"
    exit 0
  fi
  touch "$STATE/stop"
  waited=0
  while kill -0 "$(cat "$STATE/dashboard.pid" 2>/dev/null)" 2>/dev/null && [ "$waited" -lt 10 ]; do
    sleep 1
    waited=$((waited + 1))
  done
fi
rm -f "$STATE/stop" "$STATE/dashboard.pid" "$STATE/touch.pid"
nohup sh "$ROOT/bin/dashboard.sh" >/dev/null 2>&1 &
