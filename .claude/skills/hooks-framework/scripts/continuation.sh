#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# continuation — Interception Hook (Ralph Loop)
# 检测 agent 是否提前退出，如果是则重注入提示
#
# 设计：
#   1. 读取 .workspace/ 中的进度文件
#   2. 检查是否有未完成的任务标记
#   3. 如果有，生成续行提示文件供 orchestrator 使用
# ============================================================================

WORKSPACE="${WORKSPACE:-.workspace}"

# 1. 检查 workspace 是否存在
if [[ ! -d "$WORKSPACE" ]]; then
  echo "[continuation] .workspace/ 不存在 — 无续行上下文"
  exit 0
fi

# 2. 检查是否有中断标记
interrupted=false
interrupt_reason=""

# 检查 .workspace/interrupted.flag
if [[ -f "$WORKSPACE/interrupted.flag" ]]; then
  interrupted=true
  interrupt_reason=$(cat "$WORKSPACE/interrupted.flag")
fi

# 检查 .workspace/ 中是否有 incomplete 标记的文件
if [[ -f "$WORKSPACE/current_task.md" ]]; then
  if grep -qi "incomplete\|未完成\|interrupted\|中断" "$WORKSPACE/current_task.md" 2>/dev/null; then
    interrupted=true
    interrupt_reason="任务标记为未完成"
  fi
fi

# 3. 检查是否有最近的进度文件（30 分钟内）
if [[ -d "$WORKSPACE" ]]; then
  recent_progress=$(find "$WORKSPACE" -name "progress_*.md" -mmin -30 2>/dev/null | head -1)
  if [[ -n "$recent_progress" ]]; then
    interrupted=true
    interrupt_reason="发现最近的进度文件: $(basename "$recent_progress")"
  fi
fi

if [[ "$interrupted" == "false" ]]; then
  echo "[continuation] 无中断信号 — 正常继续"
  exit 0
fi

# 4. 生成续行提示
continuation_file="$WORKSPACE/continuation_prompt.md"

cat > "$continuation_file" <<EOF
# 续行提示 (Ralph Loop)

**检测到中断:** ${interrupt_reason}

## 原始任务

$(cat "$WORKSPACE/current_task.md" 2>/dev/null || echo "无任务记录")

## 已完成进度

$(ls -t "$WORKSPACE"/progress_*.md 2>/dev/null | head -3 | while read f; do
  echo "- $(basename "$f"): $(head -1 "$f")"
done)

## 续行指令

1. 读取上述进度文件了解已完成的工作
2. 从上次中断点继续执行
3. 完成后更新 .workspace/current_task.md 的状态
EOF

echo "[continuation] 已生成续行提示: ${continuation_file}"
echo "[continuation] 原因: ${interrupt_reason}"

# 5. 清除中断标记
rm -f "$WORKSPACE/interrupted.flag"

exit 0
