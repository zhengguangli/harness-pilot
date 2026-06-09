#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# env-verify — Pre-execution Hook
# 验证开发环境就绪：工具链、目录结构、依赖
# ============================================================================

errors=0
warnings=0

# 1. 检查 git
if ! command -v git &>/dev/null; then
  echo "[env-verify] 缺少 git"
  ((errors++))
fi

# 2. 检查是否在 git 仓库中
if ! git rev-parse --git-dir &>/dev/null 2>&1; then
  echo "[env-verify] 当前目录不是 git 仓库"
  ((errors++))
fi

# 3. 检查 .workspace/ 目录（中间产物存储）
if [[ ! -d "${WORKSPACE:-.workspace}" ]]; then
  echo "[env-verify] 创建 .workspace/ 目录"
  mkdir -p "${WORKSPACE:-.workspace}"
fi

# 4. 检查关键文件
for file in AGENTS.md CLAUDE.md; do
  if [[ ! -f "$file" ]]; then
    echo "[env-verify] 缺少 ${file}"
    ((warnings++))
  fi
done

# 5. 检查 .claude/ 目录结构
if [[ -d ".claude" ]]; then
  agent_count=$(find .claude/agents -name "*.md" -maxdepth 1 2>/dev/null | wc -l | tr -d ' ')
  skill_count=$(find .claude/skills -name "SKILL.md" -maxdepth 2 2>/dev/null | wc -l | tr -d ' ')
  echo "[env-verify] Agents: ${agent_count}, Skills: ${skill_count}"
else
  echo "[env-verify] .claude/ 目录不存在 — harness 未安装"
  ((warnings++))
fi

# 6. 检查 hooks 目录
if [[ ! -d ".claude/skills/hooks-framework/scripts" ]]; then
  echo "[env-verify] hooks 脚本目录不存在"
  ((warnings++))
fi

if [[ $errors -gt 0 ]]; then
  echo "[env-verify] ${errors} 个错误需要修复"
  exit 1
fi

if [[ $warnings -gt 0 ]]; then
  echo "[env-verify] ${warnings} 个警告（不阻塞）"
fi

echo "[env-verify] 环境就绪"
exit 0
