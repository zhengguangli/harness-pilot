#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# trace-log — Observation Hook
# 记录 agent 行为用于审计和调试
# ============================================================================

WORKSPACE="${WORKSPACE:-.workspace}"
LOG_DIR="${WORKSPACE}/trace"
TRACE_FILE="${LOG_DIR}/trace_$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

# 记录一条 trace
log_trace() {
  local level="$1"
  local message="$2"
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  echo "${timestamp} [${level}] ${message}" >> "$TRACE_FILE"
}

# 检查 git 状态并记录
if git rev-parse --git-dir &>/dev/null 2>&1; then
  branch=$(git branch --show-current 2>/dev/null || echo "unknown")
  commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  dirty=$(git diff --quiet 2>/dev/null && echo "clean" || echo "dirty")

  log_trace "INFO" "git: branch=${branch} commit=${commit} status=${dirty}"

  # 记录最近的变更文件
  changed_files=$(git diff --name-only HEAD 2>/dev/null | head -10)
  if [[ -n "$changed_files" ]]; then
    log_trace "INFO" "changed_files: ${changed_files//$'\n'/, }"
  fi
fi

# 记录 workspace 状态
workspace_files=$(find "$WORKSPACE" -type f 2>/dev/null | wc -l | tr -d ' ')
log_trace "INFO" "workspace: ${workspace_files} files"

# 记录环境信息
log_trace "INFO" "env: $(uname -s) $(uname -m) shell=$SHELL"

echo "[trace-log] 已记录到: ${TRACE_FILE}"
exit 0
