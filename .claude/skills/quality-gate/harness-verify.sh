#!/bin/bash
# harness-verify.sh — Harness-Pilot 自动化质量检查脚本
#
# 使用方法:
#   cd /path/to/your/project
#   bash harness-verify.sh
#
# 或者从 harness-polit 目录运行:
#   bash /path/to/harness-polit/.claude/skills/quality-gate/harness-verify.sh /path/to/your/project

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否提供了目标目录
if [ -n "$1" ]; then
  cd "$1"
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║       Harness-Pilot 质量检查                    ║"
echo "║       $(date '+%Y-%m-%d %H:%M:%S')                      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 计数器
PASS=0
FAIL=0
WARN=0

# 检查函数
check() {
  local name="$1"
  local value="$2"
  local expected="$3"
  
  if [ "$value" -ge "$expected" ] 2>/dev/null; then
    echo -e "  ${GREEN}✅${NC} $name: $value (预期 ≥ $expected)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌${NC} $name: $value (预期 ≥ $expected)"
    FAIL=$((FAIL + 1))
  fi
}

check_file() {
  local name="$1"
  local file="$2"
  
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✅${NC} $name: 存在"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌${NC} $name: 缺失"
    FAIL=$((FAIL + 1))
  fi
}

# 1. 核心组件验证
echo "1. 核心组件验证"
REACT_COUNT=$(grep -c "ReAct" .claude/agents/orchestrator.md 2>/dev/null || echo "0")
TOOL_OFFLOAD=$(grep -c "tool-offload" .claude/settings.json 2>/dev/null || echo "0")
BROWSER=$(grep -c "chromium" .claude/skills/sandbox-exec/SKILL.md 2>/dev/null || echo "0")
FILESYSTEM=$(grep -c "文件系统是最基础" .claude/skills/context-setup/SKILL.md 2>/dev/null || echo "0")

check "ReAct 循环" "$REACT_COUNT" 3
check "Tool Offload" "$TOOL_OFFLOAD" 1
check "浏览器配置" "$BROWSER" 1
check "文件系统原语" "$FILESYSTEM" 1

# 2. Hooks 框架验证
echo ""
echo "2. Hooks 框架验证"
for script in context-check env-verify lint-check tool-offload compaction continuation; do
  check_file "${script}.mjs" ".claude/skills/hooks-framework/scripts/${script}.mjs"
done

# 3. Agent 团队验证
echo ""
echo "3. Agent 团队验证"
for agent in orchestrator architect builder reviewer qa sre context-engineer; do
  check_file "${agent}" ".claude/agents/${agent}.md"
done

# 4. Skill 团队验证
echo ""
echo "4. Skill 团队验证"
for skill in harness-orchestrator harness-init context-setup architecture-guard entropy-gc observability-setup sandbox-exec quality-gate agent-readability harness-evolve hooks-framework; do
  check_file "${skill}" ".claude/skills/${skill}/SKILL.md"
done

# 5. 配置文件验证
echo ""
echo "5. 配置文件验证"
CLAUDE_HARNESS=$(grep -c "Harness" CLAUDE.md 2>/dev/null || echo "0")
AGENTS_AGENT=$(grep -c "Agent" AGENTS.md 2>/dev/null || echo "0")

check "CLAUDE.md Harness 引用" "$CLAUDE_HARNESS" 1
check "AGENTS.md Agent 引用" "$AGENTS_AGENT" 1

if cat .claude/settings.json | jq -e .hooks > /dev/null 2>&1; then
  echo -e "  ${GREEN}✅${NC} .claude/settings.json: 有效 JSON"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}❌${NC} .claude/settings.json: 无效 JSON"
  FAIL=$((FAIL + 1))
fi

# 6. 项目测试验证
echo ""
echo "6. 项目测试验证"
if command -v bun &> /dev/null; then
  TEST_RESULT=$(bun test 2>&1 | tail -3)
  if echo "$TEST_RESULT" | grep -q "0 fail"; then
    echo -e "  ${GREEN}✅${NC} 项目测试: 全部通过"
    echo "     $TEST_RESULT"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌${NC} 项目测试: 存在失败"
    echo "     $TEST_RESULT"
    FAIL=$((FAIL + 1))
  fi
elif command -v npm &> /dev/null; then
  TEST_RESULT=$(npm test 2>&1 | tail -3)
  if echo "$TEST_RESULT" | grep -q "passing"; then
    echo -e "  ${GREEN}✅${NC} 项目测试: 全部通过"
    echo "     $TEST_RESULT"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌${NC} 项目测试: 存在失败"
    echo "     $TEST_RESULT"
    FAIL=$((FAIL + 1))
  fi
else
  echo -e "  ${YELLOW}⚠️${NC} 项目测试: 跳过（未找到 bun 或 npm）"
  WARN=$((WARN + 1))
fi

# 总结
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║               检查结果总结                      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  通过: $PASS"
echo "  失败: $FAIL"
echo "  警告: $WARN"
echo ""

TOTAL=$((PASS + FAIL))
if [ $TOTAL -gt 0 ]; then
  SCORE=$((PASS * 100 / TOTAL))
  echo "  得分: $SCORE%"
  
  if [ $SCORE -ge 95 ]; then
    echo -e "  等级: ${GREEN}优秀${NC}"
  elif [ $SCORE -ge 85 ]; then
    echo -e "  等级: ${GREEN}良好${NC}"
  elif [ $SCORE -ge 75 ]; then
    echo -e "  等级: ${YELLOW}合格${NC}"
  else
    echo -e "  等级: ${RED}不合格${NC}"
  fi
fi

echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ 质量检查全部通过！${NC}"
  exit 0
else
  echo -e "${RED}❌ 质量检查存在失败项，请修复后重新检查。${NC}"
  exit 1
fi
