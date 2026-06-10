# harness-pilot

> *裸模型不是 agent。没有 harness 的模型就像没有操作系统的 CPU —— 有算力，但无法干活。*

**harness-pilot 是 agent 的操作系统。** 一套工业级 Harness Engineering 技能包，为 Claude Code、Codex、OpenCode 注入结构化的 agent 团队、架构约束和确定性执行引擎。

你设计环境，AI 执行代码。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 它做了什么

```
 你（人类）                harness-pilot               模型（AI）
 ─────────               ──────────────              ───────────
 设计约束        ──→    编排 + 约束 + 工具     ──→    推理 + 生成
  明确意图        ──→    7 agents · 14 skills   ──→    代码 + 测试
 构建反馈        ←──    验证 + 反馈 + 演进      ←──    决策 + 输出
```

**7 个 agent，14 个技能，一键部署。** 从架构设计到熵管理，覆盖 agent 协作的全生命周期。

---

## 30 秒安装

```bash
git clone https://github.com/zhengguangli/harness-pilot.git /tmp/hp
node /tmp/hp/scripts/install.mjs --yes
rm -rf /tmp/hp
```

已有 `AGENTS.md` / `CLAUDE.md`？**不会覆盖。** harness-pilot 通过 marker 增量注入，保留你的所有原始内容。

```bash
# 指定 AI 工具（默认 claude）
node /tmp/hp/scripts/install.mjs --tool codex --yes     # Codex
node /tmp/hp/scripts/install.mjs --tool opencode --yes  # OpenCode
node /tmp/hp/scripts/install.mjs --tool all --yes       # 全部安装

# 预览安装内容
node /tmp/hp/scripts/install.mjs --dry-run
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--dir <path>` | 目标项目目录 | 当前目录 |
| `--tool <name>` | 目标 AI 工具：`claude` / `codex` / `opencode` / `all` | `claude` |
| `--dry-run` | 仅预览不写入 | 否 |
| `--yes, -y` | 跳过确认提示 | 否 |

---

## 你得到了什么

### 🤖 7 个 Agent

```
orchestrator ──→ architect ──→ builder ──→ reviewer ──→ qa
     │                                                      ↑
     └── sre · context-engineer ─────────────────────────────┘
```

| Agent | 做什么 |
|-------|--------|
| orchestrator | 指挥官 — 任务分解、阶段流转、Ralph 续行 |
| architect | 架构师 — 分层边界、品味不变量 |
| builder | 工匠 — 约束内生成、自验证 |
| reviewer | 审判官 — 跨边界审查、品味校验 |
| qa | 验证官 — 触发检查、录屏证据 |
| sre | 可靠性官 — 可观测性、熵管理 |
| context-engineer | 知识架构师 — AGENTS.md、渐进式披露 |

### 🛠 14 个 Skills

```
初始化 ──→ 编排 ──→ 知识 ──→ 架构 ──→ 质量 ──→ 验证 ──→ 观测 ──→ 清理 ──→ 演进
harness   harness  context   arch    quality  sandbox  observ   entropy  harness
-init     -orch    -setup    -guard  -gate    -exec    -ability -gc      -evolve
                                                                               │
                    hooks-framework · web-search · mcp-connector · tool-search
                            （确定性钩子层 + 外部集成层）
```

| 技能 | 触发词 | 做什么 |
|------|--------|--------|
| `harness-init` | "初始化 harness" | 一键生成全部配置 |
| `harness-orchestrator` | "运行 harness" | 协调所有 agent |
| `context-setup` | "设置知识库" | AGENTS.md + docs/ 架构 |
| `architecture-guard` | "架构检查" | 分层 linter + CI 门禁 |
| `quality-gate` | "质量审查" | 跨边界审查 + 安全扫描 |
| `sandbox-exec` | "沙箱" | 隔离执行 + Git Worktree + 浏览器 |
| `observability-setup` | "配置可观测性" | LogQL/PromQL + CDP |
| `entropy-gc` | "垃圾收集" | 漂移检测 + 自动重构 |
| `agent-readability` | "优化可读性" | 隐性知识审计 |
| `harness-evolve` | "改进 harness" | 反馈驱动演进 |
| `hooks-framework` | "配置 hooks" | Ralph Loop + Compaction + 容错 |
| `web-search` | "搜索" | Web Search + Fetch 实时信息 |
| `mcp-connector` | "MCP 集成" | Context7 + GitHub API 外部工具 |
| `tool-search` | "查找工具" | 动态工具发现 + 渐进式加载 |

---

## 核心机制

**Ralph Loop** — 模型提前退出？Hook 拦截，在干净上下文中重注入提示，强制完成。

**Compaction** — 上下文快满了？智能摘要 + 卸载，释放窗口继续干活。

**Tool Offload** — 工具输出太大？只保留首尾引用，完整内容写入文件系统。

**Progressive Disclosure** — 技能按需加载，启动时不污染上下文窗口。

**Apply Patch** — 精确 unified diff 文件编辑，模型原生优化，可回滚。

**Fault Tolerance** — 指数退避重试 + 超时控制 + 熔断，保障长时间任务。

**Shell Tool Spec** — 标准 shell_command 接口，workdir/timeout/权限提升。

**Browser Wrapper** — 无头浏览器截图、DOM 操作、表单交互。

**Web Search** — 实时搜索最新文档/API/版本信息。

**MCP Connector** — Context7 + GitHub API 外部工具集成。

**Tool Search** — 动态按需发现工具，避免上下文污染。

**Model Neutrality** — 不绑定特定模型训练的 harness，用基准测试选择最佳配置。

**Git Safety Rules** — 禁止破坏性命令、禁止 amend、dirty worktree 保护。

**Parallel Tool Calls** — 批量并行读取/搜索，禁止逐个顺序执行。

**AI Slop Prevention** — 前端代码防呆板设计：字体/色彩/动效/布局约束。

**Semantic File Search** — 意图理解搜索，补充 grep 的精确匹配。

**Prompt Caching** — 静态上下文缓存，节省 50-90% 重复 token 成本。

**Computer Use** — GUI 操作、截图、点击、键入的自动化能力。

**Agent Message Protocol** — 超越文件系统的 agent 间实时通信协议。

**Massive Parallel** — 从 3 并发扩展到 50 并发，支持分片协调。

**Harness A/B Testing** — 对比不同配置的 Terminal Bench 跑分。

**Trace Self-Analysis** — agent 分析自身执行 trace，识别 harness 级故障模式。

---

## 铁律

| # | 原则 | 人话 |
|---|------|------|
| 1 | 人类掌舵，智能体执行 | 你设计环境，AI 写代码 |
| 2 | 仓库即记录系统 | 仓库外的知识 = 不存在 |
| 3 | 给地图，不给说明书 | AGENTS.md ≤100 行 |
| 4 | 约束即加速器 | 边界越严格，速度越快 |
| 5 | 渐进式披露 | 按需加载，不污染上下文 |
| 6 | 纠错成本低，等待成本高 | 快合并 + 后修复 > 无限阻塞 |
| 7 | Agent = Model + Harness | 模型提供智能，Harness 让智能可用 |
| 8 | 模型中立性 | 最优 harness 不一定来自模型训练 |

---

## 兼容

| 工具 | Skill 路径 | 优先级 |
|------|-----------|--------|
| Claude Code | `.claude/skills/` | 原生 |
| Codex | `.agents/skills/` | 原生 |
| OpenCode | `.opencode/skills/` > `.claude/skills/` > `.agents/skills/` | 原生（三级回退） |

安装脚本自动将 skills 同步到三个目录，确保每个工具都用最高优先级路径。

---

## 文件结构

```
your-project/
├── CLAUDE.md                  ← Harness 指针 + 变更历史
├── AGENTS.md                  ← 知识目录（≤100行）
├── .claude/
│   ├── agents/                ← 7 个 agent 定义
│   └── skills/                ← 14 个技能定义
└── docs/                      ← 知识库
    ├── ARCHITECTURE.md        ← 分层架构地图
    ├── DESIGN.md              ← 设计系统
    ├── QUALITY_SCORE.md       ← 质量评分（追踪差距）
    ├── SECURITY.md            ← 安全要求
    └── ...
```

---

## 设计来源

这套技能包不是凭空造的。每条原则都有出处，每个机制都经过实战验证。

- **OpenAI: Harness Engineering / Codex Prompting Guide** — 用 Codex 从零构建百万行代码产品的经验总结。仓库即记录系统、约束即加速器、apply_patch 工具、Shell 工具规范、模型中立性。
- **LangChain: Agent Anatomy (2026.3)** — Agent = Model + Harness 的定义框架。文件系统作为协作表面、Ralph 续行循环、上下文腐烂防护、动态工具装配。
- **LangChain: Deep Agents** — 工业级 harness 构建库。提供文件系统、沙箱、浏览器、子代理编排等核心原语的参考实现。
- **LangChain: Fault Tolerance in LangGraph** — 重试、超时、错误处理的容错模式。
- **LangChain: Model Neutrality** — 模型中立性比云中立性更重要。同一模型在不同 harness 中性能差异巨大。
- **Terminal Bench 2.0** — Agent 性能基准测试。用于评估不同 harness 配置的效果。

> 模型在进化，Harness 也在进化。这不是一次性产物，是一个持续演进的系统。

---

## 开源协议

**MIT License** — 你可以做任何事。

用它、改它、 fork 它、拿去卖钱、集成到你的产品里，不需要问任何人。唯一的要求：保留版权声明。

如果你觉得有价值，给个 star。如果发现问题，开个 issue。如果改了什么好东西，提个 PR。

[![Star History Chart](https://api.star-history.com/svg?repos=zhengguangli/harness-pilot&type=Date)](https://star-history.com/#zhengguangli/harness-pilot&Date)
