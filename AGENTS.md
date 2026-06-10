# AGENTS.md

## 项目概述
harness-pilot 是一套 Harness Engineering 技能包，为 Claude Code、Codex、OpenCode 提供 agent 团队和技能体系。

## 架构地图
- [CLAUDE.md](CLAUDE.md) — 项目主文档和 harness 指针
- [README.md](README.md) — 安装和使用指南
- Agent 定义：`.claude/agents/`（7 个）| Skill 定义：`.claude/skills/`（14 个）
- 安装脚本：`scripts/install.mjs`

## 关键约束
- **人类掌舵，智能体执行** — 工程师设计环境，AI 执行代码
- **仓库即记录系统** — 仓库外的知识对智能体不存在
- **给地图，不给说明书** — AGENTS.md 是目录，不是百科全书
- **约束即加速器** — 严格的架构边界是倍增器

## Agent 团队
| Agent | 职责 | Agent | 职责 |
|-------|------|-------|------|
| orchestrator | 团队协调 | architect | 架构设计 |
| builder | 代码生成 | reviewer | 质量审查 |
| qa | 验证测试 | sre | 可靠性 |
| context-engineer | 知识架构 | | |

## 技能包
| Skill | 用途 | Skill | 用途 |
|-------|------|-------|------|
| harness-orchestrator | 团队编排 | harness-init | 一键初始化 |
| context-setup | 知识库生成 | architecture-guard | 架构边界 |
| entropy-gc | 熵管理 | quality-gate | 质量门禁 |
| hooks-framework | 执行钩子 | harness-evolve | 反馈演进 |
| agent-readability | 可读性 | sandbox-exec | 安全执行 |
| observability-setup | 可观测性 | web-search | Web 搜索 |
| mcp-connector | MCP 集成 | tool-search | 工具发现 |

## 导航指引
- 初始化？`harness-init` / `harness-orchestrator`
- 架构？`.claude/agents/architect.md`
- 质量？`.claude/skills/quality-gate/SKILL.md`
- 知识库？`.claude/skills/context-setup/SKILL.md`
- Hooks？`.claude/skills/hooks-framework/SKILL.md`
- 演进？`.claude/skills/harness-evolve/SKILL.md`
