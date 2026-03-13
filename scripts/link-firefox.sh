#!/bin/bash

# Firefox Extension ID from wxt.config.ts
EXTENSION_ID="{dacde3ba-72d1-48c5-afd3-83097c36f518}"
# Path to the build output directory
SOURCE_DIR="$(pwd)/.output/firefox-mv3"
# Firefox extensions directory for the current user
TARGET_DIR="$HOME/.mozilla/extensions"

echo "🔗 Setting up persistent dev mode for Firefox..."

if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Error: $SOURCE_DIR not found. Run 'npm run build' first."
  exit 1
fi

mkdir -p "$TARGET_DIR"

# Create symbolic link
ln -sf "$SOURCE_DIR" "$TARGET_DIR/$EXTENSION_ID"

echo "✅ Linked $SOURCE_DIR to $TARGET_DIR/$EXTENSION_ID"
echo "👉 Now follow these steps in Firefox Developer Edition:"
echo "   1. Open 'about:config' and set 'xpinstall.signatures.required' to 'false'"
echo "   2. Restart Firefox"
echo "   3. Your extension will be permanently loaded. Updates to the code will reflect after rebuild."
