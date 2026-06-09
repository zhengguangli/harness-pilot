# harness-pilot — Harness Engineering 技能包

## 项目概述

harness-pilot 是一套标准的 Harness Engineering 技能包，为 Claude Code、Codex、OpenCode 等 AI 编码工具提供结构化的 agent 团队和技能体系。基于 OpenAI 和 LangChain 的 Harness Engineering 最佳实践设计。

## Harness: Harness Engineering

**Goal:** 为任意项目一键配置 AI agent 团队和 harness 体系

**Trigger:** 工作请求涉及 harness 配置、agent 团队搭建、知识库架构时，使用 `harness-orchestrator` skill。简单问题直接回答。

## 安装

```bash
git clone https://github.com/zhengguangli/harness-pilot.git /tmp/harness-pilot
/tmp/harness-pilot/scripts/install.sh --yes
rm -rf /tmp/harness-pilot
```

详见 [README.md](README.md)。

## 技能包清单

### Agents（7个）

| Agent | 文件 | 职责 |
|-------|------|------|
| orchestrator | `.claude/agents/orchestrator.md` | 团队协调者 |
| architect | `.claude/agents/architect.md` | 架构设计师 |
| builder | `.claude/agents/builder.md` | 代码生成器 |
| reviewer | `.claude/agents/reviewer.md` | 质量审查员 |
| qa | `.claude/agents/qa.md` | 验证工程师 |
| sre | `.claude/agents/sre.md` | 站点可靠性工程师 |
| context-engineer | `.claude/agents/context-engineer.md` | 上下文工程师 |

### Skills（11个）

| Skill | 文件 | 用途 |
|-------|------|------|
| harness-orchestrator | `.claude/skills/harness-orchestrator/SKILL.md` | 团队编排器 |
| harness-init | `.claude/skills/harness-init/SKILL.md` | 一键初始化 harness |
| context-setup | `.claude/skills/context-setup/SKILL.md` | 知识库架构生成 |
| architecture-guard | `.claude/skills/architecture-guard/SKILL.md` | 架构边界强制执行 |
| entropy-gc | `.claude/skills/entropy-gc/SKILL.md` | 熵管理与垃圾收集 |
| observability-setup | `.claude/skills/observability-setup/SKILL.md` | 可观测性堆栈配置 |
| sandbox-exec | `.claude/skills/sandbox-exec/SKILL.md` | 安全代码执行环境 |
| quality-gate | `.claude/skills/quality-gate/SKILL.md` | 质量审查门禁 |
| agent-readability | `.claude/skills/agent-readability/SKILL.md` | 智能体可读性优化 |
| harness-evolve | `.claude/skills/harness-evolve/SKILL.md` | 反馈驱动演进 |
| hooks-framework | `.claude/skills/hooks-framework/SKILL.md` | 确定性执行钩子 |

## 核心原则

1. **人类掌舵，智能体执行**
2. **仓库即记录系统**
3. **给地图，不给说明书**
4. **约束即加速器**
5. **渐进式披露**
6. **纠错成本低，等待成本高**
7. **Agent = Model + Harness** — 模型提供智能，Harness 让智能可用

## Harness 组件模型

```
Agent = Model + Harness

Harness = System Prompts + Tools/Skills/MCPs
        + Bundled Infrastructure (filesystem, sandbox, browser)
        + Orchestration Logic (subagent spawning, handoffs, routing)
        + Hooks/Middleware (compaction, continuation, lint checks)
```

## 模型训练与 Harness 耦合

现代 AI 产品（Claude Code、Codex）在训练时将模型和 harness 耦合，导致：
- 模型对特定 harness 操作（如 apply_patch）形成过拟合
- 更换 harness 可能导致性能下降
- 但这**不意味着**训练时的 harness 就是最优选择

**启示：** 为你的任务优化 harness，而非盲目沿用训练时的 harness。Terminal Bench 2.0 证明，仅改变 harness 就能显著提升性能。

## 支持的 AI 工具

- **Claude Code**: 原生支持 `.claude/agents/` 和 `.claude/skills/`
- **Codex**: 通过 AGENTS.md 和 docs/ 结构适配
- **OpenCode**: 通过 skill 系统适配

## Change History

| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-06-09 | Initial configuration | All | 基于 OpenAI + LangChain Harness Engineering 规范创建 |
| 2026-06-09 | 补充 P0-P3 差距 | orchestrator, builder, qa, context-setup, sandbox-exec, observability-setup, architecture-guard | 一致性检查后补充 Ralph Loop、Compaction、Tool Offloading、Context Rot、Git Worktree、Chrome DevTools、Hooks Framework |
| 2026-06-09 | 新增 hooks-framework | skills/hooks-framework | LangChain Hooks/Middleware 组件 |
| 2026-06-09 | 新增 install.sh | scripts/install.sh | 统一安装脚本 |
| 2026-06-09 | 新增 README.md | README.md | 项目文档 |
| 2026-06-09 | 增量安装支持 | scripts/install.sh | 已有 AGENTS.md/CLAUDE.md 不覆盖，增量注入 marker 区域 |
