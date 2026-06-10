# Harness-Pilot 质量检查清单

## 概述

本文档定义了 harness-polit 的质量检查标准，用于验证安装后的功能完整性。

## 检查清单

### 1. 核心组件验证

| 检查项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| ReAct 循环 | `grep -c "ReAct" .claude/agents/orchestrator.md` | ≥ 3 |
| Tool Offload | `grep -c "tool-offload" .claude/settings.json` | ≥ 1 |
| 浏览器配置 | `grep -c "chromium" .claude/skills/sandbox-exec/SKILL.md` | ≥ 1 |
| 文件系统原语 | `grep -c "文件系统是最基础" .claude/skills/context-setup/SKILL.md` | ≥ 1 |
| 共演化策略 | `grep -c "共演化" CLAUDE.md` | ≥ 1 |

### 2. Hooks 框架验证

| Hook 脚本 | 验证命令 | 预期结果 |
|-----------|----------|----------|
| context-check.mjs | `node .claude/skills/hooks-framework/scripts/context-check.mjs` | 运行无错误 |
| env-verify.mjs | `node .claude/skills/hooks-framework/scripts/env-verify.mjs` | 运行无错误 |
| lint-check.mjs | `node .claude/skills/hooks-framework/scripts/lint-check.mjs` | 运行无错误 |
| tool-offload.mjs | `echo '{"tool_output":"test","tool_name":"test"}' \| node .claude/skills/hooks-framework/scripts/tool-offload.mjs` | 运行无错误 |
| compaction.mjs | `node .claude/skills/hooks-framework/scripts/compaction.mjs` | 运行无错误 |
| continuation.mjs | `node .claude/skills/hooks-framework/scripts/continuation.mjs` | 运行无错误 |

### 3. Agent 团队验证

| Agent | 文件存在 | 描述完整 |
|-------|----------|----------|
| orchestrator | `.claude/agents/orchestrator.md` | ✅ |
| architect | `.claude/agents/architect.md` | ✅ |
| builder | `.claude/agents/builder.md` | ✅ |
| reviewer | `.claude/agents/reviewer.md` | ✅ |
| qa | `.claude/agents/qa.md` | ✅ |
| sre | `.claude/agents/sre.md` | ✅ |
| context-engineer | `.claude/agents/context-engineer.md` | ✅ |

### 4. Skill 团队验证

| Skill | 文件存在 | 描述完整 |
|-------|----------|----------|
| harness-orchestrator | `.claude/skills/harness-orchestrator/SKILL.md` | ✅ |
| harness-init | `.claude/skills/harness-init/SKILL.md` | ✅ |
| context-setup | `.claude/skills/context-setup/SKILL.md` | ✅ |
| architecture-guard | `.claude/skills/architecture-guard/SKILL.md` | ✅ |
| entropy-gc | `.claude/skills/entropy-gc/SKILL.md` | ✅ |
| observability-setup | `.claude/skills/observability-setup/SKILL.md` | ✅ |
| sandbox-exec | `.claude/skills/sandbox-exec/SKILL.md` | ✅ |
| quality-gate | `.claude/skills/quality-gate/SKILL.md` | ✅ |
| agent-readability | `.claude/skills/agent-readability/SKILL.md` | ✅ |
| harness-evolve | `.claude/skills/harness-evolve/SKILL.md` | ✅ |
| hooks-framework | `.claude/skills/hooks-framework/SKILL.md` | ✅ |
| web-search | `.claude/skills/web-search/SKILL.md` | ✅ |
| mcp-connector | `.claude/skills/mcp-connector/SKILL.md` | ✅ |
| tool-search | `.claude/skills/tool-search/SKILL.md` | ✅ |

### 5. 配置文件验证

| 文件 | 验证方法 | 预期结果 |
|------|----------|----------|
| CLAUDE.md | `grep -c "Harness" CLAUDE.md` | ≥ 1 |
| AGENTS.md | `grep -c "Agent" AGENTS.md` | ≥ 1 |
| .claude/settings.json | `cat .claude/settings.json \| jq .hooks` | 有效 JSON |

### 6. 项目测试验证

| 测试类型 | 验证命令 | 预期结果 |
|----------|----------|----------|
| 单元测试 | `bun test` 或 `npm test` | 全部通过 |
| 类型检查 | `bun run typecheck` 或 `npm run typecheck` | 无错误 |
| Lint 检查 | `bun run lint` 或 `npm run lint` | 无错误 |

## 自动化脚本

```bash
#!/bin/bash
# harness-verify.mjs — 自动化质量检查脚本

set -e

echo "=== Harness-Pilot 质量检查 ==="
echo ""

# 1. 核心组件验证
echo "1. 核心组件验证"
REACT_COUNT=$(grep -c "ReAct" .claude/agents/orchestrator.md 2>/dev/null || echo "0")
TOOL_OFFLOAD=$(grep -c "tool-offload" .claude/settings.json 2>/dev/null || echo "0")
BROWSER=$(grep -c "chromium" .claude/skills/sandbox-exec/SKILL.md 2>/dev/null || echo "0")
FILESYSTEM=$(grep -c "文件系统是最基础" .claude/skills/context-setup/SKILL.md 2>/dev/null || echo "0")

echo "  - ReAct 循环: $REACT_COUNT (预期 ≥ 3)"
echo "  - Tool Offload: $TOOL_OFFLOAD (预期 ≥ 1)"
echo "  - 浏览器配置: $BROWSER (预期 ≥ 1)"
echo "  - 文件系统原语: $FILESYSTEM (预期 ≥ 1)"

# 2. Hooks 框架验证
echo ""
echo "2. Hooks 框架验证"
for script in context-check env-verify lint-check tool-offload compaction continuation apply-patch retry-timeout test-run trace-log quality-metric; do
  if [ -f ".claude/skills/hooks-framework/scripts/${script}.mjs" ]; then
    echo "  - ${script}.mjs: ✅ 存在"
  else
    echo "  - ${script}.mjs: ❌ 缺失"
  fi
done

# 3. Agent 团队验证
echo ""
echo "3. Agent 团队验证"
for agent in orchestrator architect builder reviewer qa sre context-engineer; do
  if [ -f ".claude/agents/${agent}.md" ]; then
    echo "  - ${agent}: ✅ 存在"
  else
    echo "  - ${agent}: ❌ 缺失"
  fi
done

# 4. Skill 团队验证
echo ""
echo "4. Skill 团队验证"
for skill in harness-orchestrator harness-init context-setup architecture-guard entropy-gc observability-setup sandbox-exec quality-gate agent-readability harness-evolve hooks-framework web-search mcp-connector tool-search; do
  if [ -f ".claude/skills/${skill}/SKILL.md" ]; then
    echo "  - ${skill}: ✅ 存在"
  else
    echo "  - ${skill}: ❌ 缺失"
  fi
done

# 5. 项目测试验证
echo ""
echo "5. 项目测试验证"
if command -v bun &> /dev/null; then
  bun test 2>&1 | tail -3
elif command -v npm &> /dev/null; then
  npm test 2>&1 | tail -3
else
  echo "  - 跳过（未找到 bun 或 npm）"
fi

echo ""
echo "=== 质量检查完成 ==="
```

## 使用方法

### 手动检查

```bash
# 进入目标项目
cd /path/to/your/project

# 运行单个检查
grep -c "ReAct" .claude/agents/orchestrator.md

# 运行所有检查
bash /path/to/harness-polit/.claude/skills/quality-gate/VERIFICATION_CHECKLIST.md
```

### 自动化检查

```bash
# 复制验证脚本到目标项目
cp harness-polit/.claude/skills/quality-gate/harness-verify.mjs /path/to/your/project/

# 运行验证
cd /path/to/your/project
node harness-verify.mjs
```

## 质量标准

| 指标 | 标准 | 权重 |
|------|------|------|
| 核心组件完整性 | 100% | 30% |
| Hooks 框架可用性 | 100% | 25% |
| Agent 团队完整性 | 100% | 20% |
| Skill 团队完整性 | 100% | 15% |
| 项目测试通过率 | 100% | 10% |

**总分 = Σ(指标 × 权重)**

- **优秀**: 95-100%
- **良好**: 85-94%
- **合格**: 75-84%
- **不合格**: < 75%
