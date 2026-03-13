#!/bin/bash

# 插件 ID (从 wxt.config.ts 中获取)
EXTENSION_ID="{dacde3ba-72d1-48c5-afd3-83097c36f518}"
SOURCE_DIR="$(pwd)/.output/firefox-mv3"
FIREFOX_HOME="$HOME/.mozilla/firefox"

echo "🔍 Searching for Firefox profiles..."

if [ ! -d "$FIREFOX_HOME" ]; then
    echo "❌ Firefox home directory not found. Please start Firefox once."
    exit 1
fi

# 寻找包含 "default" 的 Profile 文件夹
PROFILES=$(ls -d $FIREFOX_HOME/*.default* 2>/dev/null)

if [ -z "$PROFILES" ]; then
    echo "❌ No default profiles found in $FIREFOX_HOME"
    exit 1
fi

for PROFILE in $PROFILES; do
    EXT_DIR="$PROFILE/extensions"
    mkdir -p "$EXT_DIR"
    
    # 执行链接
    ln -sf "$SOURCE_DIR" "$EXT_DIR/$EXTENSION_ID"
    
    echo "✅ Linked to profile: $(basename $PROFILE)"
done

echo ""
echo "👉 NEXT STEPS:"
echo "1. Restart Firefox Developer Edition."
echo "2. Open 'about:config' -> set 'xpinstall.signatures.required' to 'false'."
echo "3. Code changes will sync automatically after 'npm run build' or during 'npx wxt dev'."
