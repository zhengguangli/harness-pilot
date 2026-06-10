# Harness-Pilot 质量检查清单

## 概述

本文档定义了 harness-polit 的质量检查标准，用于验证安装后的功能完整性。

## 检查清单

### 1. 核心组件验证

| 检查项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| ReAct 循环 | `grep -c "ReAct" {{AGENTS_DIR}}/orchestrator.md` | ≥ 3 |
| Tool Offload | `grep -r "tool-offload" {{SKILLS_DIR}}/hooks-framework/` | ≥ 1 |
| 浏览器配置 | `grep -c "chromium" {{SKILLS_DIR}}/sandbox-exec/SKILL.md` | ≥ 1 |
| 文件系统原语 | `grep -c "文件系统是最基础" {{SKILLS_DIR}}/context-setup/SKILL.md` | ≥ 1 |
| 共演化策略 | `grep -c "共演化" CLAUDE.md` | ≥ 1 |

### 2. Hooks 框架验证

| Hook 脚本 | 验证命令 | 预期结果 |
|-----------|----------|----------|
| context-check.mjs | `node {{SKILLS_DIR}}/hooks-framework/scripts/context-check.mjs` | 运行无错误 |
| env-verify.mjs | `node {{SKILLS_DIR}}/hooks-framework/scripts/env-verify.mjs` | 运行无错误 |
| lint-check.mjs | `node {{SKILLS_DIR}}/hooks-framework/scripts/lint-check.mjs` | 运行无错误 |
| tool-offload.mjs | `echo '{"tool_output":"test","tool_name":"test"}' \| node {{SKILLS_DIR}}/hooks-framework/scripts/tool-offload.mjs` | 运行无错误 |
| compaction.mjs | `node {{SKILLS_DIR}}/hooks-framework/scripts/compaction.mjs` | 运行无错误 |
| continuation.mjs | `node {{SKILLS_DIR}}/hooks-framework/scripts/continuation.mjs` | 运行无错误 |

### 3. Agent 团队验证

| Agent | 文件存在 | 描述完整 |
|-------|----------|----------|
| orchestrator | `{{AGENTS_DIR}}/orchestrator.md` | ✅ |
| architect | `{{AGENTS_DIR}}/architect.md` | ✅ |
| builder | `{{AGENTS_DIR}}/builder.md` | ✅ |
| reviewer | `{{AGENTS_DIR}}/reviewer.md` | ✅ |
| qa | `{{AGENTS_DIR}}/qa.md` | ✅ |
| sre | `{{AGENTS_DIR}}/sre.md` | ✅ |
| context-engineer | `{{AGENTS_DIR}}/context-engineer.md` | ✅ |

### 4. Skill 团队验证

| Skill | 文件存在 | 描述完整 |
|-------|----------|----------|
| harness-orchestrator | `{{SKILLS_DIR}}/harness-orchestrator/SKILL.md` | ✅ |
| harness-init | `{{SKILLS_DIR}}/harness-init/SKILL.md` | ✅ |
| context-setup | `{{SKILLS_DIR}}/context-setup/SKILL.md` | ✅ |
| architecture-guard | `{{SKILLS_DIR}}/architecture-guard/SKILL.md` | ✅ |
| entropy-gc | `{{SKILLS_DIR}}/entropy-gc/SKILL.md` | ✅ |
| observability-setup | `{{SKILLS_DIR}}/observability-setup/SKILL.md` | ✅ |
| sandbox-exec | `{{SKILLS_DIR}}/sandbox-exec/SKILL.md` | ✅ |
| quality-gate | `{{SKILLS_DIR}}/quality-gate/SKILL.md` | ✅ |
| agent-readability | `{{SKILLS_DIR}}/agent-readability/SKILL.md` | ✅ |
| harness-evolve | `{{SKILLS_DIR}}/harness-evolve/SKILL.md` | ✅ |
| hooks-framework | `{{SKILLS_DIR}}/hooks-framework/SKILL.md` | ✅ |
| web-search | `{{SKILLS_DIR}}/web-search/SKILL.md` | ✅ |
| mcp-connector | `{{SKILLS_DIR}}/mcp-connector/SKILL.md` | ✅ |
| tool-search | `{{SKILLS_DIR}}/tool-search/SKILL.md` | ✅ |

### 5. 配置文件验证

| 文件 | 验证方法 | 预期结果 |
|------|----------|----------|
| CLAUDE.md | `grep -c "Harness" CLAUDE.md` | ≥ 1 |
| AGENTS.md | `grep -c "Agent" AGENTS.md` | ≥ 1 |
| Hooks 配置 | 检查 `.claude/settings.json` 或 `.codex/hooks.json` 或 `.opencode/plugins/harness-hooks.ts` | 含 hooks 配置 |

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
REACT_COUNT=$(grep -c "ReAct" {{AGENTS_DIR}}/orchestrator.md 2>/dev/null || echo "0")
TOOL_OFFLOAD=$(grep -r "tool-offload" {{SKILLS_DIR}}/hooks-framework/ 2>/dev/null | wc -l || echo "0")
BROWSER=$(grep -c "chromium" {{SKILLS_DIR}}/sandbox-exec/SKILL.md 2>/dev/null || echo "0")
FILESYSTEM=$(grep -c "文件系统是最基础" {{SKILLS_DIR}}/context-setup/SKILL.md 2>/dev/null || echo "0")

echo "  - ReAct 循环: $REACT_COUNT (预期 ≥ 3)"
echo "  - Tool Offload: $TOOL_OFFLOAD (预期 ≥ 1)"
echo "  - 浏览器配置: $BROWSER (预期 ≥ 1)"
echo "  - 文件系统原语: $FILESYSTEM (预期 ≥ 1)"

# 2. Hooks 框架验证
echo ""
echo "2. Hooks 框架验证"
for script in context-check env-verify lint-check tool-offload compaction continuation apply-patch retry-timeout test-run trace-log quality-metric; do
  if [ -f "{{SKILLS_DIR}}/hooks-framework/scripts/${script}.mjs" ]; then
    echo "  - ${script}.mjs: ✅ 存在"
  else
    echo "  - ${script}.mjs: ❌ 缺失"
  fi
done

# 3. Agent 团队验证
echo ""
echo "3. Agent 团队验证"
for agent in orchestrator architect builder reviewer qa sre context-engineer; do
  if [ -f "{{AGENTS_DIR}}/${agent}.md" ]; then
    echo "  - ${agent}: ✅ 存在"
  else
    echo "  - ${agent}: ❌ 缺失"
  fi
done

# 4. Skill 团队验证
echo ""
echo "4. Skill 团队验证"
for skill in harness-orchestrator harness-init context-setup architecture-guard entropy-gc observability-setup sandbox-exec quality-gate agent-readability harness-evolve hooks-framework web-search mcp-connector tool-search; do
  if [ -f "{{SKILLS_DIR}}/${skill}/SKILL.md" ]; then
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
grep -c "ReAct" {{AGENTS_DIR}}/orchestrator.md

# 运行所有检查
bash /path/to/harness-polit/{{SKILLS_DIR}}/quality-gate/VERIFICATION_CHECKLIST.md
```

### 自动化检查

```bash
# 复制验证脚本到目标项目
cp harness-polit/{{SKILLS_DIR}}/quality-gate/harness-verify.mjs /path/to/your/project/

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
