#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$DIR/assets/x5"
mkdir -p "$ASSETS_DIR"

URL_64="https://tbs.imtt.qq.com/others/release/x5/tbs_core_046239_20230210162827_nolog_fs_obfs_arm64-v8a_release.tbs"
URL_32="https://tbs.imtt.qq.com/others/release/x5/tbs_core_046238_20230210164344_nolog_fs_obfs_armeabi_release.tbs"

download() {
  local url="$1" dest="$2" label="$3"
  if [ -f "$dest" ]; then
    echo "✓ $label already exists"
    return
  fi
  echo "⬇ Downloading $label ..."
  curl -L -o "$dest" "$url" --progress-bar
  echo "✓ $label downloaded ($(du -h "$dest" | cut -f1))"
}

download "$URL_64" "$ASSETS_DIR/x5_core_64.apk" "X5 core arm64-v8a"
download "$URL_32" "$ASSETS_DIR/x5_core_32.apk" "X5 core armeabi"

echo ""
echo "Done. X5 offline kernels are in assets/x5/"
