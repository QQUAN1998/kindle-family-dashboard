#!/bin/sh
ROOT=/mnt/us/kindle-dashboard
STATE="$ROOT/state"
CONF="$ROOT/config/dashboard.conf"
LOG="$STATE/dashboard.log"
FBINK=/mnt/us/libkh/bin/fbink
LUAJIT=/mnt/us/koreader/luajit
SCRIPT_VERSION=4
mkdir -p "$STATE"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }
safe_value() { printf '%s' "$1" | grep -Eq '^[A-Za-z0-9_./:?=&%+-]+$'; }

if [ ! -f "$CONF" ]; then log "missing config"; exit 1; fi
API_URL=$(sed -n 's/^API_URL=//p' "$CONF" | head -n 1)
DEVICE_TOKEN=$(sed -n 's/^DEVICE_TOKEN=//p' "$CONF" | head -n 1)
POLL_SECONDS=$(sed -n 's/^POLL_SECONDS=//p' "$CONF" | head -n 1)
safe_value "$API_URL" || { log "invalid API_URL"; exit 1; }
safe_value "$DEVICE_TOKEN" || { log "invalid DEVICE_TOKEN"; exit 1; }
case "$POLL_SECONDS" in ''|*[!0-9]*) POLL_SECONDS=300 ;; esac
[ "$POLL_SECONDS" -lt 60 ] && POLL_SECONDS=60
[ -x "$FBINK" ] || { log "FBInk not found"; exit 1; }

PREVIOUS_SCRIPT_VERSION=$(cat "$STATE/script-version" 2>/dev/null)
if [ "$PREVIOUS_SCRIPT_VERSION" != "$SCRIPT_VERSION" ]; then
  rm -f "$STATE/version" "$STATE/dashboard.png" "$STATE/clock"
fi
rm -f "$STATE/stop" "$STATE/force-refresh"
printf '%s\n' $$ > "$STATE/dashboard.pid"
printf '%s\n' "$SCRIPT_VERSION" > "$STATE/script-version"
lipc-set-prop -i com.lab126.powerd preventScreenSaver 1 >/dev/null 2>&1 || true

find_touch() {
  awk 'BEGIN{RS=""} { block=tolower($0) } block ~ /touch|zforce|cyttsp|atmel|pt_mt|elan|goodix/ { if (match($0,/event[0-9]+/)) { print "/dev/input/" substr($0,RSTART,RLENGTH); exit } }' /proc/bus/input/devices
}
cp /proc/bus/input/devices "$STATE/input-devices.txt" 2>/dev/null || true
TOUCH_DEV=$(find_touch)
if [ -n "$TOUCH_DEV" ] && [ -x "$LUAJIT" ]; then
  log "touch device $TOUCH_DEV"
  "$LUAJIT" "$ROOT/bin/touch.lua" "$TOUCH_DEV" "$ROOT" >> "$LOG" 2>&1 &
  printf '%s\n' $! > "$STATE/touch.pid"
else
  log "touch unavailable; use KUAL controls"
fi

apply_brightness() {
  [ "$BRIGHT_ENABLED" = "true" ] || return 0
  now_h=$(date +%H); now_m=$(date +%M)
  day_h=${DAY_START%:*}; day_m=${DAY_START#*:}; night_h=${NIGHT_START%:*}; night_m=${NIGHT_START#*:}
  now_h=${now_h#0}; now_m=${now_m#0}; day_h=${day_h#0}; day_m=${day_m#0}; night_h=${night_h#0}; night_m=${night_m#0}
  [ -n "$now_h" ] || now_h=0; [ -n "$now_m" ] || now_m=0
  [ -n "$day_h" ] || day_h=0; [ -n "$day_m" ] || day_m=0
  [ -n "$night_h" ] || night_h=0; [ -n "$night_m" ] || night_m=0
  now=$((now_h * 60 + now_m)); day_at=$((day_h * 60 + day_m)); night_at=$((night_h * 60 + night_m))
  level=$NIGHT_LEVEL
  if [ "$day_at" -le "$night_at" ]; then
    if [ "$now" -ge "$day_at" ] && [ "$now" -lt "$night_at" ]; then level=$DAY_LEVEL; fi
  else
    if [ "$now" -ge "$day_at" ] || [ "$now" -lt "$night_at" ]; then level=$DAY_LEVEL; fi
  fi
  lipc-set-prop -i com.lab126.powerd flIntensity "$level" >/dev/null 2>&1 || true
}

draw_local_clock() {
  clock=$(date '+%H:%M')
  regular=/usr/java/lib/fonts/Caecilia_LT_65_Medium.ttf
  bold=/usr/java/lib/fonts/Caecilia_LT_75_Bold.ttf
  clear_image="$ROOT/assets/clock-clear.png"
  [ -f "$clear_image" ] && "$FBINK" -q -g "file=$clear_image,x=410,y=30" >> "$LOG" 2>&1
  if [ -f "$regular" ] && [ -f "$bold" ]; then
    "$FBINK" -q -m -t "regular=$regular,bold=$bold,px=52,top=35,left=410,right=18,style=BOLD" "$clock" >> "$LOG" 2>&1 || return 1
  else
    "$FBINK" -q -x -1 -y 1 -S 5 "$clock" >> "$LOG" 2>&1 || return 1
  fi
  printf '%s\n' "$clock" > "$STATE/clock"
}

fetch_snapshot() {
  response="$STATE/response.tmp"
  url="${API_URL%/}/kindle/snapshot?device=$DEVICE_TOKEN"
  curl -fsS --connect-timeout 8 --max-time 25 "$url" -o "$response" || { log "snapshot metadata fetch failed"; return 1; }
  snapshot_url=$(sed -n 's/.*"url":"\([^"]*\)".*/\1/p' "$response")
  version=$(sed -n 's/.*"version":"\([^"]*\)".*/\1/p' "$response")
  [ -n "$snapshot_url" ] && [ -n "$version" ] || { log "invalid snapshot metadata"; return 1; }
  BRIGHT_ENABLED=$(sed -n 's/.*"enabled":\([^,}]*\).*/\1/p' "$response")
  DAY_START=$(sed -n 's/.*"dayStart":"\([0-9:]*\)".*/\1/p' "$response")
  NIGHT_START=$(sed -n 's/.*"nightStart":"\([0-9:]*\)".*/\1/p' "$response")
  DAY_LEVEL=$(sed -n 's/.*"day":\([0-9]*\).*/\1/p' "$response")
  NIGHT_LEVEL=$(sed -n 's/.*"night":\([0-9]*\).*/\1/p' "$response")
  [ "$version" = "$(cat "$STATE/version" 2>/dev/null)" ] && [ ! -f "$STATE/force-refresh" ] && { apply_brightness; return 0; }
  curl -LfsS --connect-timeout 8 --max-time 30 "$snapshot_url" -o "$STATE/dashboard.tmp.png" || { log "snapshot image fetch failed"; return 1; }
  magic=$(dd if="$STATE/dashboard.tmp.png" bs=1 count=8 2>/dev/null | od -An -tx1 | tr -d ' \n')
  [ "$magic" = "89504e470d0a1a0a" ] || { log "snapshot is not PNG"; rm -f "$STATE/dashboard.tmp.png"; return 1; }
  mv "$STATE/dashboard.tmp.png" "$STATE/dashboard.png"
  printf '%s\n' "$version" > "$STATE/version"
  rm -f "$STATE/force-refresh"
  "$FBINK" -q -i "$STATE/dashboard.png" >> "$LOG" 2>&1
  "$FBINK" -q -s >> "$LOG" 2>&1
  draw_local_clock || log "local clock draw failed"
  apply_brightness
  log "rendered $version"
}

[ -f "$STATE/dashboard.png" ] && { "$FBINK" -q -i "$STATE/dashboard.png" >> "$LOG" 2>&1; draw_local_clock || true; }
while [ ! -f "$STATE/stop" ]; do
  fetch_snapshot
  waited=0
  while [ "$waited" -lt "$POLL_SECONDS" ] && [ ! -f "$STATE/stop" ] && [ ! -f "$STATE/force-refresh" ]; do
    sleep 5
    waited=$((waited + 5))
    current_clock=$(date '+%H:%M')
    [ "$current_clock" = "$(cat "$STATE/clock" 2>/dev/null)" ] || draw_local_clock || true
  done
done

lipc-set-prop -i com.lab126.powerd preventScreenSaver 0 >/dev/null 2>&1 || true
[ -f "$STATE/touch.pid" ] && kill "$(cat "$STATE/touch.pid")" >/dev/null 2>&1 || true
rm -f "$STATE/dashboard.pid" "$STATE/touch.pid" "$STATE/stop" "$STATE/clock"
"$FBINK" -q -f -k >> "$LOG" 2>&1 || true
log "stopped; launcher will restore home"
