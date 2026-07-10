#!/bin/bash
# Start sync-worker in watch mode (cron / Render / systemd)
# Usage: ./scripts/start-sync.sh

set -e
cd "$(dirname "$0")/.."

echo "[sync] Starting sync-worker in watch mode..."
echo "[sync] ATLAS: ${ATLAS_MONGODB_URI:-(using MONGODB_URI)}"
echo "[sync] LOCAL: ${LOCAL_MONGODB_URI:-(using MONGODB_URI)}"

# Check dependencies
if ! command -v mongodump &>/dev/null; then
  echo "[sync] ERROR: mongodump not found. Install MongoDB Database Tools."
  exit 1
fi
if ! command -v mongorestore &>/dev/null; then
  echo "[sync] ERROR: mongorestore not found. Install MongoDB Database Tools."
  exit 1
fi

# Guard: source and target must be different, or ATLAS must be explicitly set
if [ -z "${ATLAS_MONGODB_URI}" ] && [ -z "${LOCAL_MONGODB_URI}" ]; then
  echo "[sync] WARNING: Both ATLAS_MONGODB_URI and LOCAL_MONGODB_URI are unset."
  echo "[sync] The sync defaults to dumping MONGODB_URI → LOCAL (which may be the same DB)."
  echo "[sync] Set ATLAS_MONGODB_URI to your production Atlas string to sync from there."
  echo "[sync] Continuing in 5 seconds (Ctrl+C to abort)..."
  sleep 5
fi

node scripts/sync-worker.js --watch
