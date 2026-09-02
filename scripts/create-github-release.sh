#!/usr/bin/env bash
# Creates a GitHub release and uploads savedpocket-extension.zip as a release asset.
# Requires: gh CLI (brew install gh && gh auth login)
#
# Usage:
#   ./scripts/create-github-release.sh           # creates v1.0.0
#   ./scripts/create-github-release.sh v1.2.0    # creates specified tag

set -euo pipefail

TAG="${1:-v1.0.0}"
ZIP="savedpocket-extension.zip"
REPO="ozdensmh/savedpocket"

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI not found. Install with: brew install gh && gh auth login"
  exit 1
fi

if [ ! -f "$ZIP" ] && [ ! -f "public/$ZIP" ]; then
  echo "Error: $ZIP not found in project root or public/"
  exit 1
fi

ASSET="${ZIP}"
[ -f "public/$ZIP" ] && ASSET="public/$ZIP"

echo "Creating release $TAG on $REPO ..."
gh release create "$TAG" \
  --repo "$REPO" \
  --title "SavedPocket $TAG" \
  --notes "SavedPocket Chrome extension — download, unzip, then load the unpacked extension in chrome://extensions with Developer mode enabled." \
  "$ASSET#savedpocket-extension.zip"

echo ""
echo "Release created. Download URL:"
echo "  https://github.com/$REPO/releases/download/$TAG/savedpocket-extension.zip"
