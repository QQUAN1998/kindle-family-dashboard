#!/bin/sh

if [ -f /mnt/us/kindle-dashboard/bin/stop.sh ]; then
  sh /mnt/us/kindle-dashboard/bin/stop.sh
  sleep 1
fi
rm -rf /mnt/us/extensions/kindle-dashboard
rm -f /mnt/us/documents/KindleDashboard.sh
rm -rf /mnt/us/documents/KindleDashboard.sdr
if [ "$1" != "upgrade" ]; then
  rm -rf /mnt/us/kindle-dashboard
fi
