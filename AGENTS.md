# AGENTS.md

## 项目概述
harness-pilot 是一套标准的 Harness Engineering 技能包，为 Claude Code、Codex、OpenCode 等 AI 编码工具提供结构化的 agent 团队和技能体系。

## 架构地图
- 详见 [CLAUDE.md](CLAUDE.md) — 项目主文档和 harness 指针
- 详见 [README.md](README.md) — 安装和使用指南
- Agent 定义：`.claude/agents/` — 7 个专业 agent
- Skill 定义：`.claude/skills/` — 11 个标准技能
- 安装脚本：`scripts/install.sh` — 统一安装器

## 关键约束
- **人类掌舵，智能体执行** — 工程师设计环境，AI 执行代码
- **仓库即记录系统** — 仓库外的知识对智能体不存在
- **给地图，不给说明书** — AGENTS.md 是目录，不是百科全书
- **约束即加速器** — 严格的架构边界是倍增器

## Agent 团队

| Agent | 职责 |
|-------|------|
| orchestrator | 团队协调者，管理任务分派和阶段流转 |
| architect | 架构设计师，定义分层边界和品味不变量 |
| builder | 代码生成器，在约束内生成实现代码 |
| reviewer | 质量审查员，代码审查和品味校验 |
| qa | 验证工程师，测试和触发检查 |
| sre | 站点可靠性工程师，可观测性和熵管理 |
| context-engineer | 上下文工程师，知识库架构管理 |

## 技能包

| Skill | 用途 |
|-------|------|
| harness-orchestrator | 团队编排器，协调所有 agent 执行 |
| harness-init | 一键初始化 harness |
| context-setup | 知识库架构生成 |
| architecture-guard | 架构边界强制执行 |
| entropy-gc | 熵管理与垃圾收集 |
| observability-setup | 可观测性堆栈配置 |
| sandbox-exec | 安全代码执行环境 |
| quality-gate | 质量审查门禁 |
| agent-readability | 智能体可读性优化 |
| harness-evolve | 反馈驱动演进 |
| hooks-framework | 确定性执行钩子 |

## 快速安装

```bash
git clone https://github.com/zhengguangli/harness-pilot.git /tmp/harness-pilot
/tmp/harness-pilot/scripts/install.sh --yes
rm -rf /tmp/harness-pilot
```

## 导航指引
- 新项目初始化？使用 `harness-init` 或 `harness-orchestrator` skill
- 架构设计？读 `.claude/agents/architect.md`
- 质量审查？读 `.claude/skills/quality-gate/SKILL.md`
- 知识库管理？读 `.claude/skills/context-setup/SKILL.md`
- 演进反馈？读 `.claude/skills/harness-evolve/SKILL.md`
- Hooks 配置？读 `.claude/skills/hooks-framework/SKILL.md`
- 安装部署？读 `README.md` 或运行 `scripts/install.sh --help`

<!-- CODEX:BEGIN -->
## Codex 适配

Codex 读取 `.agents/skills/`（非 `.claude/skills/`）。以下是等效路径：

### Skill 定义（.agents/skills/）
- harness-orchestrator: [.agents/skills/harness-orchestrator/SKILL.md](.agents/skills/harness-orchestrator/SKILL.md)
- harness-init: [.agents/skills/harness-init/SKILL.md](.agents/skills/harness-init/SKILL.md)
- context-setup: [.agents/skills/context-setup/SKILL.md](.agents/skills/context-setup/SKILL.md)
- architecture-guard: [.agents/skills/architecture-guard/SKILL.md](.agents/skills/architecture-guard/SKILL.md)
- entropy-gc: [.agents/skills/entropy-gc/SKILL.md](.agents/skills/entropy-gc/SKILL.md)
- observability-setup: [.agents/skills/observability-setup/SKILL.md](.agents/skills/observability-setup/SKILL.md)
- sandbox-exec: [.agents/skills/sandbox-exec/SKILL.md](.agents/skills/sandbox-exec/SKILL.md)
- quality-gate: [.agents/skills/quality-gate/SKILL.md](.agents/skills/quality-gate/SKILL.md)
- agent-readability: [.agents/skills/agent-readability/SKILL.md](.agents/skills/agent-readability/SKILL.md)
- harness-evolve: [.agents/skills/harness-evolve/SKILL.md](.agents/skills/harness-evolve/SKILL.md)
- hooks-framework: [.agents/skills/hooks-framework/SKILL.md](.agents/skills/hooks-framework/SKILL.md)

### 核心原则
1. **人类掌舵，智能体执行** — 工程师设计环境，AI 执行代码
2. **仓库即记录系统** — 仓库外的知识对智能体不存在
3. **给地图，不给说明书** — AGENTS.md 是目录，不是百科全书
4. **约束即加速器** — 严格的架构边界是倍增器
5. **渐进式披露** — 按需加载上下文，保护窗口
6. **纠错成本低，等待成本高** — 快速合并+后续修复优于无限阻塞
7. **Agent = Model + Harness** — 模型提供智能，Harness 让智能可用
<!-- CODEX:END -->
