# harness-pilot

> **模型提供智能，Harness 让智能可用。**
>
> 一套工业级 Harness Engineering 技能包，为 Claude Code、Codex、OpenCode 注入结构化的 agent 团队、架构约束和确定性执行引擎。

基于 [OpenAI Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering) 和 [LangChain Agent Anatomy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) 实战经验提炼。

---

## 为什么要用 harness-pilot？

裸模型不是 agent。没有 harness 的模型就像没有操作系统的 CPU —— 有算力，但无法干活。

**harness-pilot 就是 agent 的操作系统。** 它提供：

- 🎯 **7 个专业 agent** — 各司其职，自协调、自验证
- 🛠 **11 个标准技能** — 从初始化到熵管理，覆盖全生命周期
- 🔒 **架构约束引擎** — 分层边界 + 品味不变量，编码一次，全局生效
- 🔄 **确定性钩子** — Ralph 续行、上下文压缩、工具输出卸载，对抗模型不确定性
- 📊 **可观测性集成** — 日志/指标/追踪对智能体可查询，自验证回路的基础

**一句话：你设计环境，AI 执行代码。**

---

## 架构全景

```
┌─────────────────────────────────────────────────────────────────────┐
│                     🧑‍💻 Human — 掌舵者                              │
│              设计环境 · 明确意图 · 构建反馈回路                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 设计约束
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ⚙️ Harness — 让智能可用                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🎯 Orchestration Layer                                      │   │
│  │  orchestrator (团队编排)  +  hooks-framework (确定性钩子)    │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐   │
│  │ 🤖 Agent Team (7)                                           │   │
│  │  architect → builder → reviewer → qa                        │   │
│  │  sre · context-engineer                                     │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐   │
│  │ 🛠 Skills Layer (11)                                        │   │
│  │  harness-init · context-setup · architecture-guard          │   │
│  │  entropy-gc · observability-setup · sandbox-exec            │   │
│  │  quality-gate · agent-readability · harness-evolve          │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐   │
│  │ 🏗 Infrastructure                                           │   │
│  │  Filesystem + Git  ·  Sandbox  ·  Observability  ·  CDP    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 结构化上下文
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     🧠 Model — 智能核心                              │
│                   推理 · 生成 · 规划 · 自验证                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 代码 + 决策
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     📦 Output                                       │
│           应用代码 · 测试+CI · 文档+知识库 · 可观测性                   │
└─────────────────────────────────────────────────────────────────────┘
```

**数据流：** Human 约束 → Harness 编排 → Agent 执行 → Model 推理 → 产出验证 → 反馈回 Human

**关键机制：**
- **Ralph Loop** — Hook 拦截模型退出，在干净上下文中重注入提示，强制完成长任务
- **Compaction** — 上下文 >80% 时智能摘要，释放窗口继续工作
- **Tool Offload** — 大块输出卸载到文件系统，仅保留首尾 token 引用
- **Progressive Disclosure** — 技能按需加载，启动时不污染上下文

---

## 一键安装

```bash
git clone https://github.com/zhengguangli/harness-pilot.git /tmp/harness-pilot
/tmp/harness-pilot/scripts/install.sh --yes
rm -rf /tmp/harness-pilot
```

**增量安全：** 已有的 `AGENTS.md`、`CLAUDE.md` 不会被覆盖 —— harness-pilot 通过 marker 注入增量更新，保留你的所有原始内容。

```bash
# 安装到指定目录
/tmp/harness-pilot/scripts/install.sh --dir /path/to/project

# 预览安装内容（不写入）
/tmp/harness-pilot/scripts/install.sh --dry-run
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--dir <path>` | 目标项目目录 | 当前目录 |
| `--dry-run` | 仅预览不写入 | 否 |
| `--yes, -y` | 跳过确认提示 | 否 |

---

## 兼容矩阵

| 工具 | 适配方式 | 原生支持 |
|------|----------|----------|
| **Claude Code** | `.claude/agents/` + `.claude/skills/` | ✅ |
| **Codex** | `AGENTS.md` + `docs/` 结构 | ✅ |
| **OpenCode** | Skill 系统 | ✅ |

---

## Agent 团队

7 个专业角色，Pipeline + Fan-out 混合编排：

| Agent | 角色 | 核心能力 |
|-------|------|----------|
| **orchestrator** | 指挥官 | 任务分解、阶段流转、Ralph 续行、上下文压缩 |
| **architect** | 架构师 | 分层边界、品味不变量、Parse Don't Validate |
| **builder** | 工匠 | 约束内生成、枯燥技术优先、自验证 |
| **reviewer** | 审判官 | 跨边界交叉审查、品味校验、修复指令式反馈 |
| **qa** | 验证官 | 触发检查、录屏证据、自验证回路 |
| **sre** | 可靠性官 | 可观测性、熵管理、黄金原则编码化 |
| **context-engineer** | 知识架构师 | AGENTS.md 目录、渐进式披露、文档新鲜度 |

---

## 技能矩阵

11 个标准技能，覆盖 harness 全生命周期：

| 阶段 | Skill | 一句话 |
|------|-------|--------|
| **初始化** | `harness-init` | 一键生成 agents + skills + 知识库 |
| **编排** | `harness-orchestrator` | 协调所有 agent 的执行流程 |
| **知识** | `context-setup` | AGENTS.md 目录 + docs/ 架构 + Context Rot 防护 |
| **架构** | `architecture-guard` | 分层 linter + 结构测试 + CI 门禁 |
| **质量** | `quality-gate` | 跨边界审查 + 品味校验 + 安全扫描 |
| **验证** | `sandbox-exec` | 沙箱隔离 + Git Worktree + 命令白名单 |
| **观测** | `observability-setup` | LogQL/PromQL/TraceQL + Chrome DevTools |
| **清理** | `entropy-gc` | 漂移检测 + 质量评分 + 自动重构 PR |
| **可读** | `agent-readability` | 隐性知识审计 + LLM-friendly 文档 |
| **演进** | `harness-evolve` | 反馈驱动 + 变更历史 + 持续改进 |
| **钩子** | `hooks-framework` | Ralph Loop + Compaction + Tool Offload |

---

## 核心原则

这些不是建议，是铁律：

| # | 原则 | 白话 |
|---|------|------|
| 1 | **人类掌舵，智能体执行** | 你设计环境，AI 写代码 |
| 2 | **仓库即记录系统** | 仓库外的知识 = 不存在 |
| 3 | **给地图，不给说明书** | AGENTS.md ≤100 行，指向深层文档 |
| 4 | **约束即加速器** | 边界越严格，速度越快 |
| 5 | **渐进式披露** | 按需加载，不污染上下文窗口 |
| 6 | **纠错成本低，等待成本高** | 快速合并 + 后续修复 > 无限阻塞 |
| 7 | **Agent = Model + Harness** | 裸模型不是 agent，加上 harness 才是 |

---

## 安装后文件结构

```
your-project/
├── CLAUDE.md                      ← Harness 指针 + 变更历史
├── AGENTS.md                      ← 知识库目录（≤100行）
├── .claude/
│   ├── agents/                    ← 7 个 agent 定义
│   │   ├── orchestrator.md
│   │   ├── architect.md
│   │   ├── builder.md
│   │   ├── reviewer.md
│   │   ├── qa.md
│   │   ├── sre.md
│   │   └── context-engineer.md
│   └── skills/                    ← 11 个技能定义
│       ├── harness-orchestrator/
│       ├── harness-init/
│       ├── context-setup/
│       ├── architecture-guard/
│       ├── entropy-gc/
│       ├── observability-setup/
│       ├── sandbox-exec/
│       ├── quality-gate/
│       ├── agent-readability/
│       ├── harness-evolve/
│       └── hooks-framework/
└── docs/                          ← 知识库
    ├── ARCHITECTURE.md
    ├── DESIGN.md
    ├── QUALITY_SCORE.md
    ├── SECURITY.md
    ├── RELIABILITY.md
    └── ...
```

---

## 快速上手

```bash
# 1. 安装
git clone https://github.com/zhengguangli/harness-pilot.git /tmp/harness-pilot
/tmp/harness-pilot/scripts/install.sh --yes

# 2. 对 AI 工具说：
"初始化 harness"       # 全量初始化
"架构检查"             # 运行 architecture-guard
"质量审查"             # 运行 quality-gate
"垃圾收集"             # 运行 entropy-gc
"改进 harness"         # 运行 harness-evolve
```

---

## Harness 组件模型

```
Agent = Model + Harness

Harness = System Prompts
        + Tools / Skills / MCPs
        + Bundled Infrastructure (filesystem, sandbox, browser)
        + Orchestration Logic (subagent spawning, handoffs, routing)
        + Hooks / Middleware (compaction, continuation, lint checks)
```

---

## 设计来源

| 实践 | 出处 |
|------|------|
| 仓库即记录系统 · 给地图不给说明书 | [OpenAI: Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering) |
| 约束即加速器 · 品味不变量 | [OpenAI: Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering) |
| Agent = Model + Harness | [LangChain: Agent Anatomy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) |
| 渐进式披露 · 抗上下文腐烂 | 两者共同 |
| Ralph 续行循环 · 自验证回路 | 两者共同 |
| 文件系统作为协作表面 | [LangChain: Agent Anatomy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) |

---

## License

MIT — 自由使用、修改、分发。详见 [LICENSE](LICENSE)。
