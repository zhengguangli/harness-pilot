#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Hook Runner — 读取 hooks.yaml，按阶段执行钩子
#
# 用法:
#   run-hooks.sh <phase> [--workspace <path>] [--verbose]
#
# Phase:
#   pre         — 执行前钩子（context-check, env-verify, plan-inject）
#   post        — 执行后钩子（lint-check, test-run, quality-gate）
#   intercept   — 拦截检查（continuation, compaction, tool-offload）
#   observe     — 观察钩子（trace-log, quality-metric, drift-detect）
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHASE="${1:-pre}"
WORKSPACE="${WORKSPACE:-.workspace}"
VERBOSE=false
HOOKS_FILE="${HOOKS_FILE:-hooks.yaml}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "[hook:$PHASE] $*"; }
ok()    { echo -e "${GREEN}[ok]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
fail()  { echo -e "${RED}[fail]${NC} $*"; }

# 解析参数
shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace) WORKSPACE="$2"; shift 2 ;;
    --verbose)   VERBOSE=true; shift ;;
    --hooks-file) HOOKS_FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# 查找 hooks.yaml
find_hooks_file() {
  local search_dirs=("." "$WORKSPACE" ".claude" ".claude/skills/hooks-framework")
  for dir in "${search_dirs[@]}"; do
    if [[ -f "$dir/$HOOKS_FILE" ]]; then
      echo "$dir/$HOOKS_FILE"
      return 0
    fi
  done
  return 1
}

# 解析 YAML 中指定 phase 的 hook 名称列表（轻量解析，不依赖 yq）
parse_hooks() {
  local file="$1"
  local phase="$2"
  local in_phase=false
  local hooks=()

  while IFS= read -r line; do
    # 检测 phase 入口
    if [[ "$line" =~ ^[[:space:]]*${phase}:[[:space:]]*$ ]]; then
      in_phase=true
      continue
    fi
    # 检测下一个顶层 key（退出 phase）
    if [[ "$in_phase" == "true" ]] && [[ "$line" =~ ^[[:space:]]*[a-z]_?[a-z]*:[[:space:]]*$ ]] && [[ ! "$line" =~ ^[[:space:]]*# ]]; then
      in_phase=false
      continue
    fi
    # 提取 hook name
    if [[ "$in_phase" == "true" ]] && [[ "$line" =~ name:[[:space:]]*(.+) ]]; then
      hooks+=("${BASH_REMATCH[1]}")
    fi
  done < "$file"

  printf '%s\n' "${hooks[@]}"
}

# 执行单个 hook
run_hook() {
  local hook_name="$1"
  local script="${SCRIPT_DIR}/${hook_name}.sh"

  if [[ ! -f "$script" ]]; then
    warn "Hook 脚本不存在: ${hook_name}.sh — 跳过"
    return 0
  fi

  if [[ "$VERBOSE" == "true" ]]; then
    log "执行: ${hook_name}"
  fi

  # 执行 hook，传递 workspace 环境变量
  if WORKSPACE="$WORKSPACE" bash "$script" 2>&1; then
    ok "${hook_name}"
    return 0
  else
    local exit_code=$?
    fail "${hook_name} (exit: $exit_code)"
    return $exit_code
  fi
}

# ============================================================================
# 主流程
# ============================================================================

# 映射 phase 名称到 YAML key
declare -A PHASE_MAP=(
  [pre]=pre_execution
  [post]=post_execution
  [intercept]=interception
  [observe]=observation
)

yaml_phase="${PHASE_MAP[$PHASE]:-$PHASE}"

hooks_file=$(find_hooks_file) || {
  log "未找到 hooks.yaml — 使用默认钩子集"
  # 默认钩子集
  case "$PHASE" in
    pre)       hooks=("context-check" "env-verify") ;;
    post)      hooks=("lint-check" "test-run") ;;
    intercept) hooks=("continuation" "compaction") ;;
    observe)   hooks=("trace-log") ;;
    *)         hooks=() ;;
  esac

  for hook in "${hooks[@]}"; do
    run_hook "$hook" || true
  done
  exit 0
}

log "使用: $hooks_file"

# 从 YAML 解析 hooks
mapfile -t hooks < <(parse_hooks "$hooks_file" "$yaml_phase")

if [[ ${#hooks[@]} -eq 0 ]]; then
  log "无钩子需要执行"
  exit 0
fi

failed=0
for hook in "${hooks[@]}"; do
  run_hook "$hook" || ((failed++))
done

if [[ $failed -gt 0 ]]; then
  warn "${failed} 个钩子执行失败"
  exit 1
fi

exit 0
