#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# test-run — Post-execution Hook
# 运行项目测试套件，检测回归
# ============================================================================

WORKSPACE="${WORKSPACE:-.workspace}"
TIMEOUT="${TEST_TIMEOUT:-120}"

# 1. 检测技术栈和测试命令
detect_test_command() {
  if [[ -f "package.json" ]]; then
    if grep -q '"test"' package.json 2>/dev/null; then
      echo "npm test"
      return
    fi
  fi

  if [[ -f "Cargo.toml" ]]; then
    echo "cargo test"
    return
  fi

  if [[ -f "go.mod" ]]; then
    echo "go test ./..."
    return
  fi

  if [[ -f "pyproject.toml" ]]; then
    if grep -q "pytest" pyproject.toml 2>/dev/null; then
      echo "python -m pytest"
      return
    fi
  fi

  if [[ -f "Makefile" ]] && grep -q "^test:" Makefile 2>/dev/null; then
    echo "make test"
    return
  fi

  echo ""
}

TEST_CMD=$(detect_test_command)

if [[ -z "$TEST_CMD" ]]; then
  echo "[test-run] 未检测到测试命令 — 跳过"
  exit 0
fi

# 2. 检查是否有代码变更
if git diff --quiet HEAD 2>/dev/null; then
  echo "[test-run] 无代码变更 — 跳过测试"
  exit 0
fi

# 3. 运行测试
echo "[test-run] 执行: ${TEST_CMD}"
mkdir -p "$WORKSPACE"

test_output="${WORKSPACE}/test_output_$(date +%s).txt"

if timeout "$TIMEOUT" $TEST_CMD > "$test_output" 2>&1; then
  echo "[test-run] 测试通过"
  exit 0
else
  exit_code=$?
  echo "[test-run] 测试失败 (exit: $exit_code)"
  echo "[test-run] 输出已保存到: ${test_output}"

  # 输出最后 20 行作为快速诊断
  echo "--- 最后 20 行 ---"
  tail -20 "$test_output"
  echo "---"

  exit 1
fi
