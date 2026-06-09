# harness-pilot

**Harness Engineering 技能包 — 为 AI 编码工具提供标准化的 agent 团队和技能体系**

基于 [OpenAI Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering) 和 [LangChain Agent Anatomy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) 最佳实践设计。

---

## 什么是 harness-pilot？

Agent = Model + Harness。模型提供智能，Harness 让智能可用。

harness-pilot 是一套可复用的 Harness 配置，包含 7 个专业 agent 和 11 个标准技能，可一键部署到任意项目，让 Claude Code、Codex、OpenCode 等 AI 工具在结构化约束内高效工作。

## 快速安装

```bash
# 克隆并安装到当前项目
git clone https://github.com/zhengguangli/harness-pilot.git /tmp/harness-pilot
/tmp/harness-pilot/scripts/install.sh --yes
rm -rf /tmp/harness-pilot
```

```bash
# 安装到指定目录
/tmp/harness-pilot/scripts/install.sh --dir /path/to/project

# 预览安装内容（不写入）
/tmp/harness-pilot/scripts/install.sh --dry-run

# 强制覆盖已有文件
/tmp/harness-pilot/scripts/install.sh --force
```

### 安装参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--dir <path>` | 目标项目目录 | 当前目录 |
| `--force` | 覆盖已有文件 | 否 |
| `--dry-run` | 仅预览不写入 | 否 |
| `--yes, -y` | 跳过确认提示 | 否 |

## 支持的 AI 工具

| 工具 | 适配方式 |
|------|----------|
| **Claude Code** | 原生支持 `.claude/agents/` 和 `.claude/skills/` |
| **Codex** | 通过 `AGENTS.md` 和 `docs/` 结构适配 |
| **OpenCode** | 通过 skill 系统适配 |

## 安装后使用

```bash
# 对 AI 工具说以下任一命令：
"初始化 harness"       # 全量初始化
"配置 agent 团队"      # 团队搭建
"设置知识库"           # 仅知识库

# 日常使用：
"架构检查"             # 运行 architecture-guard
"质量审查"             # 运行 quality-gate
"垃圾收集"             # 运行 entropy-gc
"改进 harness"         # 运行 harness-evolve
```

## Agent 团队（7个）

| Agent | 职责 |
|-------|------|
| **orchestrator** | 团队协调者，管理任务分派和阶段流转 |
| **architect** | 架构设计师，定义分层边界和品味不变量 |
| **builder** | 代码生成器，在约束内生成实现代码 |
| **reviewer** | 质量审查员，代码审查和品味校验 |
| **qa** | 验证工程师，测试和触发检查 |
| **sre** | 站点可靠性工程师，可观测性和熵管理 |
| **context-engineer** | 上下文工程师，知识库架构管理 |

## 技能包（11个）

| Skill | 用途 | 触发词 |
|-------|------|--------|
| **harness-orchestrator** | 团队编排器 | "运行 harness"、"开始构建" |
| **harness-init** | 一键初始化 | "初始化 harness"、"配置 agent" |
| **context-setup** | 知识库架构 | "设置知识库"、"生成 AGENTS.md" |
| **architecture-guard** | 架构边界强制 | "架构检查"、"边界验证" |
| **entropy-gc** | 熵管理/垃圾收集 | "垃圾收集"、"代码清理" |
| **observability-setup** | 可观测性堆栈 | "配置可观测性"、"设置日志" |
| **sandbox-exec** | 安全代码执行 | "沙箱"、"安全执行" |
| **quality-gate** | 质量审查门禁 | "质量审查"、"代码审查" |
| **agent-readability** | 智能体可读性 | "智能体可读性"、"优化可读性" |
| **harness-evolve** | 反馈驱动演进 | "改进 harness"、"演进" |
| **hooks-framework** | 确定性执行钩子 | "配置 hooks"、"中间件" |

## 核心原则

| # | 原则 | 说明 |
|---|------|------|
| 1 | 人类掌舵，智能体执行 | 工程师设计环境，AI 执行代码 |
| 2 | 仓库即记录系统 | 仓库外的知识对智能体不存在 |
| 3 | 给地图，不给说明书 | AGENTS.md 是目录，不是百科全书 |
| 4 | 约束即加速器 | 严格的架构边界是倍增器 |
| 5 | 渐进式披露 | 按需加载上下文，保护窗口 |
| 6 | 纠错成本低，等待成本高 | 快速合并+后续修复优于无限阻塞 |
| 7 | Agent = Model + Harness | 模型提供智能，Harness 让智能可用 |

## Harness 组件模型

```
Agent = Model + Harness

Harness = System Prompts + Tools/Skills/MCPs
        + Bundled Infrastructure (filesystem, sandbox, browser)
        + Orchestration Logic (subagent spawning, handoffs, routing)
        + Hooks/Middleware (compaction, continuation, lint checks)
```

## 安装后文件结构

```
your-project/
├── CLAUDE.md                              ← Harness 指针 + 变更历史
├── AGENTS.md                              ← 知识库目录（≤100行）
└── .claude/
    ├── agents/                            ← 7 个 agent 定义
    │   ├── orchestrator.md
    │   ├── architect.md
    │   ├── builder.md
    │   ├── reviewer.md
    │   ├── qa.md
    │   ├── sre.md
    │   └── context-engineer.md
    └── skills/                            ← 11 个技能定义
        ├── harness-orchestrator/SKILL.md
        ├── harness-init/SKILL.md
        ├── context-setup/SKILL.md
        ├── architecture-guard/SKILL.md
        ├── entropy-gc/SKILL.md
        ├── observability-setup/SKILL.md
        ├── sandbox-exec/SKILL.md
        ├── quality-gate/SKILL.md
        ├── agent-readability/SKILL.md
        ├── harness-evolve/SKILL.md
        └── hooks-framework/SKILL.md
└── docs/                                  ← 知识库目录结构
    ├── design-docs/
    ├── exec-plans/
    ├── generated/
    ├── product-specs/
    ├── references/
    ├── ARCHITECTURE.md
    ├── DESIGN.md
    ├── FRONTEND.md
    ├── PLANS.md
    ├── PRODUCT_SENSE.md
    ├── QUALITY_SCORE.md
    ├── RELIABILITY.md
    └── SECURITY.md
```

## 设计来源

| 规范原则 | 来源 |
|----------|------|
| 仓库即记录系统、给地图不给说明书 | [OpenAI Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering) |
| 约束即加速器、品味不变量 | [OpenAI Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering) |
| Agent = Model + Harness | [LangChain Agent Anatomy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) |
| 渐进式披露、抗上下文腐烂 | 两者共同 |
| Ralph 续行循环、自验证回路 | 两者共同 |
| 文件系统作为协作表面 | [LangChain Agent Anatomy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) |

## License

MIT — 自由使用、修改、分发。

详见 [LICENSE](LICENSE)。
