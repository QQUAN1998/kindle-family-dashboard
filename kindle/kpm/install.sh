#!/bin/sh
set -e

echo "Installing Kindle family dashboard"
mkdir -p /mnt/us/documents
cp -f ./kindle-dashboard/launcher/KindleDashboard.sh /mnt/us/documents/KindleDashboard.sh
cp -rf ./kindle-dashboard /mnt/us/
rm -rf ./kindle-dashboard

if [ -d /mnt/us/extensions ] && [ -d ./extensions/kindle-dashboard ]; then
  cp -rf ./extensions/kindle-dashboard /mnt/us/extensions/
fi
rm -rf ./extensions
