#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# compaction — Interception Hook
# 上下文压缩：当对话过长时，生成摘要文件供新上下文使用
#
# 注意：此脚本无法直接控制 AI 工具的上下文窗口。
# 它的作用是：
#   1. 检测 .workspace/ 中的上下文指标
#   2. 生成压缩摘要文件
#   3. 提供"建议压缩"信号，由 orchestrator 或用户决定是否触发
# ============================================================================

WORKSPACE="${WORKSPACE:-.workspace}"
SUMMARY_FILE="${WORKSPACE}/context_summary.md"

# 1. 检查 workspace
if [[ ! -d "$WORKSPACE" ]]; then
  echo "[compaction] .workspace/ 不存在 — 无上下文可压缩"
  exit 0
fi

# 2. 统计 workspace 中的文件数量和总大小
file_count=$(find "$WORKSPACE" -type f 2>/dev/null | wc -l | tr -d ' ')
total_size=$(du -sh "$WORKSPACE" 2>/dev/null | cut -f1)

echo "[compaction] workspace 状态: ${file_count} 个文件, ${total_size}"

# 3. 检查是否需要压缩（文件过多）
if [[ $file_count -lt 10 ]]; then
  echo "[compaction] 文件数量正常 — 无需压缩"
  exit 0
fi

# 4. 生成压缩摘要
echo "[compaction] 文件较多（${file_count}），生成摘要..."

cat > "$SUMMARY_FILE" <<EOF
# 上下文摘要

**生成时间:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**workspace 文件数:** ${file_count}
**workspace 总大小:** ${total_size}

## 关键决策记录

$(find "$WORKSPACE" -name "*.md" -exec grep -l "决策\|decision\|选择\|确定" {} \; 2>/dev/null | head -5 | while read f; do
  echo "### $(basename "$f")"
  head -5 "$f"
  echo ""
done)

## 未完成任务

$(cat "$WORKSPACE/current_task.md" 2>/dev/null || echo "无任务记录")

## 压缩建议

以下文件可安全归档（已完成或不再需要）：

$(find "$WORKSPACE" -name "progress_*.md" -mmin -120 2>/dev/null | head -10 | while read f; do
  echo "- $(basename "$f")"
done)

EOF

echo "[compaction] 摘要已生成: ${SUMMARY_FILE}"
echo "[compaction] 建议: 在新上下文中注入此摘要，然后清理旧的 progress 文件"

exit 0
