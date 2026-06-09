#!/usr/bin/env bash

# ============================================================================
# quality-metric — Observation Hook
# 追踪质量指标，更新质量评分
# ============================================================================

WORKSPACE="${WORKSPACE:-.workspace}"
METRICS_DIR="${WORKSPACE}/metrics"
METRICS_FILE="${METRICS_DIR}/quality_$(date +%Y%m%d).json"

mkdir -p "$METRICS_DIR"

timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 测试覆盖率
coverage="null"
if [[ -f "coverage/lcov-report/index.html" ]]; then
  coverage=$(grep -o '[0-9]*\.[0-9]*%' "coverage/lcov-report/index.html" 2>/dev/null | head -1 | tr -d '%')
  coverage="${coverage:-null}"
fi

# TODO/FIXME 计数
todo_count=0
if command -v rg &>/dev/null; then
  todo_count=$(rg -c "TODO|FIXME" --type ts --type js --type py --type go --type rust -g '!node_modules' -g '!.git' . 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
else
  todo_count=$(grep -r --include="*.ts" --include="*.js" --include="*.py" --include="*.go" --include="*.rs" -c "TODO\|FIXME" . 2>/dev/null | grep -v node_modules | grep -v .git | awk -F: '{s+=$2}END{print s+0}' || echo 0)
fi

# 文件数和总行数
file_count=$(find . -maxdepth 5 \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/target/*" 2>/dev/null | wc -l | tr -d ' ')

total_lines=0
if [[ $file_count -gt 0 ]]; then
  total_lines=$(find . -maxdepth 5 \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/target/*" -print0 2>/dev/null | xargs -0 wc -l 2>/dev/null | tail -1 | awk '{print $1}')
  total_lines="${total_lines:-0}"
fi

avg_lines=0
if [[ $file_count -gt 0 ]]; then
  avg_lines=$((total_lines / file_count))
fi

# git 指标
commit_count=0
if git rev-parse --git-dir &>/dev/null 2>&1; then
  commit_count=$(git log --oneline -30 2>/dev/null | wc -l | tr -d ' ')
fi

# 写入 JSON
cat > "$METRICS_FILE" <<EOF
{
  "timestamp": "${timestamp}",
  "metrics": {
    "test_coverage": ${coverage},
    "todo_count": ${todo_count},
    "file_count": ${file_count},
    "avg_lines_per_file": ${avg_lines},
    "recent_commits": ${commit_count}
  }
}
EOF

echo "[quality-metric] 指标已记录到: ${METRICS_FILE}"

if [[ $todo_count -gt 50 ]]; then
  echo "[quality-metric] 警告: TODO/FIXME 过多（${todo_count}）— 技术债务累积中"
fi

exit 0
