# harness-pilot — Harness Engineering 技能包

## Harness: Harness Engineering

**Goal:** 为任意项目一键配置 AI agent 团队和 harness 体系

**Trigger:** 工作请求涉及 harness 配置、agent 团队搭建、知识库架构时，使用 `harness-orchestrator` skill。简单问题直接回答。

## 核心原则

1. **人类掌舵，智能体执行** — 工程师设计环境，AI 执行代码
2. **仓库即记录系统** — 仓库外的知识对智能体不存在
3. **给地图，不给说明书** — AGENTS.md 是目录，不是百科全书
4. **约束即加速器** — 严格的架构边界是倍增器
5. **渐进式披露** — 按需加载上下文，保护窗口
6. **纠错成本低，等待成本高** — 快速合并+后续修复优于无限阻塞
7. **Agent = Model + Harness** — 模型提供智能，Harness 让智能可用

## Agents（7个）

| Agent | 文件 | 职责 |
|-------|------|------|
| orchestrator | `.claude/agents/orchestrator.md` | 团队协调者 |
| architect | `.claude/agents/architect.md` | 架构设计师 |
| builder | `.claude/agents/builder.md` | 代码生成器 |
| reviewer | `.claude/agents/reviewer.md` | 质量审查员 |
| qa | `.claude/agents/qa.md` | 验证工程师 |
| sre | `.claude/agents/sre.md` | 站点可靠性工程师 |
| context-engineer | `.claude/agents/context-engineer.md` | 上下文工程师 |

## Skills（11个）

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

## Change History

| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-06-09 | Initial configuration | All | 基于 OpenAI + LangChain Harness Engineering 规范创建 |
| 2026-06-09 | hooks-framework 三工具统一 | hooks-framework | .mjs 脚本 + Claude/Codex/OpenCode 原生 hooks |
| 2026-06-09 | 上下文管理强化 | hooks-framework | continuation → Stop hook, compaction → PreCompact hook |
