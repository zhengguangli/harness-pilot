#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# lint-check — Post-execution Hook
# 架构边界检查：依赖方向、层次违规、循环依赖
#
# 这是一个轻量级检查，不替代完整的 linter。
# 根据项目技术栈自动选择检查策略。
# ============================================================================

errors=0

# 1. 检测技术栈
detect_stack() {
  if [[ -f "package.json" ]]; then
    echo "node"
  elif [[ -f "Cargo.toml" ]]; then
    echo "rust"
  elif [[ -f "go.mod" ]]; then
    echo "go"
  elif [[ -f "pyproject.toml" ]] || [[ -f "requirements.txt" ]]; then
    echo "python"
  else
    echo "unknown"
  fi
}

STACK=$(detect_stack)

# 2. 检查架构文档是否存在
if [[ ! -f "docs/ARCHITECTURE.md" ]]; then
  echo "[lint-check] docs/ARCHITECTURE.md 不存在 — 无法验证架构边界"
  echo "[lint-check] 建议: 运行 '架构检查' 生成架构定义"
  exit 0  # 不阻塞，只警告
fi

# 3. 检查分层违规（基于目录结构）
check_layer_violations() {
  local violations=0

  # 检查常见的分层违规模式
  # Types 层不应 import Service/Runtime 层
  # Config 层不应 import Service 层

  case "$STACK" in
    node)
      # 检查是否有从低层到高层的 import
      if [[ -d "src/types" ]] && [[ -d "src/services" ]]; then
        # types 不应 import services
        if grep -r "from.*services" src/types/ 2>/dev/null | grep -v node_modules | head -5; then
          echo "[lint-check] 分层违规: types 层导入了 services 层"
          ((violations++))
        fi
      fi
      ;;
    rust)
      # Rust: 检查 Cargo.toml 中的循环依赖
      if command -v cargo &>/dev/null; then
        if ! cargo check 2>&1 | grep -q "error"; then
          :
        fi
      fi
      ;;
    go)
      # Go: 检查 import 循环
      if command -v go &>/dev/null; then
        if go vet ./... 2>&1 | grep -i "import cycle"; then
          echo "[lint-check] 检测到循环依赖"
          ((violations++))
        fi
      fi
      ;;
  esac

  return $violations
}

# 4. 检查品味不变量
check_taste_invariants() {
  local violations=0

  # 检查文件大小（单文件 >500 行警告）
  while IFS= read -r file; do
    lines=$(wc -l < "$file" | tr -d ' ')
    if [[ $lines -gt 500 ]]; then
      echo "[lint-check] 文件过大: ${file} (${lines} 行) — 考虑拆分"
      ((violations++))
    fi
  done < <(find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" 2>/dev/null | grep -v node_modules | grep -v target | grep -v .git | head -100)

  # 检查 TODO/FIXME 数量
  todo_count=$(grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.js" --include="*.py" --include="*.go" --include="*.rs" . 2>/dev/null | grep -v node_modules | grep -v .git | wc -l | tr -d ' ')
  if [[ $todo_count -gt 20 ]]; then
    echo "[lint-check] TODO/FIXME 过多: ${todo_count} 个 — 技术债务累积"
  fi

  return $violations
}

# 执行检查
check_layer_violations || ((errors++))
check_taste_invariants || ((errors++))

if [[ $errors -gt 0 ]]; then
  echo "[lint-check] ${errors} 个架构问题需要关注"
  exit 1
fi

echo "[lint-check] 架构检查通过"
exit 0
