#!/usr/bin/env bash
#
# update-opencode.sh
#
# 从 GitHub 拉取最新 opencode 代码并更新 opencode/ 子目录
# 使用方法: bash scripts/update-opencode.sh [version]
#   不带参数：更新到最新 main 分支
#   带版本号：更新到指定 tag，例如 bash scripts/update-opencode.sh 1.17.8

set -euo pipefail

OPNECODE_REPO="https://github.com/anomalyco/opencode.git"
OPNECODE_DIR="opencode"
VERSION_FILE="opencode.version"
VERSION="${1:-main}"

echo "=== OpenCode 更新工具 ==="

# 临时目录
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

if [ "$VERSION" = "main" ]; then
  echo "拉取最新 main 分支..."
  git clone --depth 1 "$OPNECODE_REPO" "$TEMP_DIR/opencode"
  NEW_VERSION="main-$(date +%Y%m%d-%H%M%S)"
else
  echo "拉取版本: $VERSION"
  git clone --depth 1 --branch "$VERSION" "$OPNECODE_REPO" "$TEMP_DIR/opencode"
  NEW_VERSION="$VERSION"
fi

echo "替换 opencode/ 目录..."

# 删除旧的 opencode 目录（保留 node_modules 避免重新安装）
if [ -d "$OPNECODE_DIR/node_modules" ]; then
  echo "保留 node_modules..."
  mv "$OPNECODE_DIR/node_modules" "$TEMP_DIR/node_modules.bak"
fi

# 删除旧文件，复制新文件
rm -rf "$OPNECODE_DIR"
cp -r "$TEMP_DIR/opencode" "$OPNECODE_DIR"

# 恢复 node_modules（如果有）
if [ -d "$TEMP_DIR/node_modules.bak" ]; then
  mv "$TEMP_DIR/node_modules.bak" "$OPNECODE_DIR/node_modules"
fi

# 记录版本
echo "$NEW_VERSION" > "$VERSION_FILE"

echo "安装依赖..."
cd "$OPNECODE_DIR"
bun install

cd ..

echo "记录到版本文件: $NEW_VERSION"
echo "更新完成！版本: $NEW_VERSION"
