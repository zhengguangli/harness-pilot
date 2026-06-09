#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# context-check — Pre-execution Hook
# 检查 AGENTS.md 新鲜度：是否存在、是否过大、是否过期
# ============================================================================

WORKSPACE="${WORKSPACE:-.workspace}"
AGENTS_FILE="${AGENTS_FILE:-AGENTS.md}"
MAX_LINES="${MAX_LINES:-150}"
MAX_AGE_DAYS="${MAX_AGE_DAYS:-30}"

errors=0

# 1. 检查 AGENTS.md 是否存在
if [[ ! -f "$AGENTS_FILE" ]]; then
  echo "[context-check] 缺少 AGENTS.md — 智能体无法推理项目结构"
  ((errors++))
fi

if [[ $errors -gt 0 ]]; then
  exit 1
fi

# 2. 检查行数（硬约束：≤150 行，警告阈值：≥100 行）
line_count=$(wc -l < "$AGENTS_FILE" | tr -d ' ')
if [[ $line_count -gt $MAX_LINES ]]; then
  echo "[context-check] AGENTS.md 超限: ${line_count} 行（上限 ${MAX_LINES}）— 挤占上下文空间"
  ((errors++))
elif [[ $line_count -gt 100 ]]; then
  echo "[context-check] AGENTS.md 接近上限: ${line_count} 行（建议 ≤100）"
fi

# 3. 检查最后修改时间
if command -v stat &>/dev/null; then
  if [[ "$(uname)" == "Darwin" ]]; then
    last_mod=$(stat -f %m "$AGENTS_FILE")
  else
    last_mod=$(stat -c %Y "$AGENTS_FILE")
  fi
  now=$(date +%s)
  age_days=$(( (now - last_mod) / 86400 ))
  if [[ $age_days -gt $MAX_AGE_DAYS ]]; then
    echo "[context-check] AGENTS.md 已过期: ${age_days} 天未更新（阈值 ${MAX_AGE_DAYS} 天）"
  fi
fi

# 4. 检查关键 section 是否存在
required_sections=("项目概述" "架构地图" "关键约束")
for section in "${required_sections[@]}"; do
  if ! grep -q "$section" "$AGENTS_FILE" 2>/dev/null; then
    echo "[context-check] AGENTS.md 缺少 section: ${section}"
    ((errors++))
  fi
done

if [[ $errors -gt 0 ]]; then
  echo "[context-check] ${errors} 个问题需要修复"
  exit 1
fi

echo "[context-check] AGENTS.md 健康 (${line_count} 行)"
exit 0
