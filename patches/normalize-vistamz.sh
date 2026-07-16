#!/usr/bin/env bash
# ============================================================================
# Vistamz 规范化批处理（对 src/styles.css 做值级替换）
# 何时运行：等 Codex 当前这轮改动【提交后】再运行，避免和它的未提交改动打架。
# 平台：macOS 自带 sed（BSD）。会先备份。
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
f="src/styles.css"
[ -f "$f" ] || { echo "找不到 $f"; exit 1; }
cp "$f" "$f.bak.$(date +%s)"
echo "已备份 $f"

# A. 非规范字重 → Vistamz 字重（现有 76 处 750 / 若干 850）
sed -i '' -E \
  -e 's/font-weight: ?750/font-weight: 600/g' \
  -e 's/font-weight: ?850/font-weight: 700/g' \
  "$f"

# B. 旧 Amazon 橙 → Vistamz Purple
#    语义：旧主题里橙=“强调/激活/焦点/进度”，在 Vistamz 里这些都归 Purple(primary)。
#    唯一例外“引导 callout”(.project-center-next) 由 vistamz-conformance.css 单独设回 Coral。
sed -i '' -E \
  -e 's/#ff7a1[af]/#7e49fe/gI' \
  -e 's/#ff8a3d/#6c3eda/gI' \
  -e 's/#ff9a57/#a984ff/gI' \
  -e 's/#ffad7d/#cfb9ff/gI' \
  -e 's/#ffd9bf/#e5dbff/gI' \
  -e 's/#ff9172/#a984ff/gI' \
  -e 's/rgba\(255, ?122, ?26,/rgba(126, 73, 254,/g' \
  -e 's/rgba\(255, ?138, ?60,/rgba(126, 73, 254,/g' \
  -e 's/rgba\(255, ?154, ?8[47],/rgba(126, 73, 254,/g' \
  "$f"

echo "完成：字重已规范化；旧橙已改为 Vistamz 紫。"
echo "剩余检查（应为 0 或仅 logo 渐变 #feae18/#f85b1c）："
grep -icE "ff7a1[af]|ff8a3d|font-weight: ?(750|850)" "$f" || true
echo ""
echo "下一步：确保 src/main.jsx 里最后 import 了补丁 CSS，然后 npm run build。见 patches/README.md"
