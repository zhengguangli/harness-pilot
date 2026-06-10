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
8. **ReAct 循环** — 推理→行动→观察→重复，是 agent 执行的核心模式
9. **共演化策略** — 模型和 harness 协同进化，互相增强
10. **模型中立性** — 最优 harness 不一定是模型训练时的那个；持续基准测试评估不同配置
11. **确定性与可操作** — agent 行为规范必须可机械执行，不依赖模型自行推断

## 模型与 Harness 共演化

**关键认知：** 模型训练和 harness 设计是耦合的。今天的 agent 产品（如 Claude Code、Codex）在模型和 harness 的协同中进行后训练。

**共演化循环：**
1. 发现有用的 harness 原语（如文件系统操作、bash 执行、计划）
2. 将这些原语集成到 harness 中
3. 在训练时使用 harness，使模型原生擅长这些操作
4. 下一代模型在 harness 中表现更好

**应对策略：**
- **不依赖特定 harness**：最佳 harness 可能不是模型后训练时使用的那个
- **持续实验**：通过 Terminal Bench 等基准测试评估不同 harness 配置
- **拥抱变化**：随着模型能力提升，部分 harness 功能会被模型吸收

## 模型中立性原则

**核心认知：** 模型训练中与 harness 的耦合会导致"过度拟合"——模型在特定 harness 中表现优异，但在其他 harness 中显著下降（如 Opus 4.6 在 Claude Code 中的 Terminal Bench 分数远低于其他 harness）。模型中立性不是忽略 harness 的价值，而是承认：

- **Harness 可移植性**：同样的模型在不同 harness 中性能差异巨大，优化 harness 本身是重要杠杆
- **独立评估**：用 Terminal Bench 2.0 等基准跨 harness 评估模型，选择最佳配置
- **tool-logic 敏感度**：模型对工具实现的细节高度敏感（如 `apply_patch` 格式），改变工具逻辑会影响模型性能
- **持续基准测试**：定期用不同 harness 配置测试模型，追踪性能变化

## 运行时配置参数

### reasoning_effort（推理深度）

现代模型支持调节推理深度，在速度与质量之间平衡：

| 级别 | 适用场景 | 延迟 | 质量 |
|------|----------|------|------|
| `low` | 简单确认、已知操作 | 低 | 基础 |
| `medium` | 日常编码、代码审查 | 中 | 良好（推荐默认） |
| `high` | 架构设计、复杂重构 | 高 | 优秀 |
| `xhigh` | 长时间自主任务 | 很高 | 最佳 |

**配置方式：** 在 `.claude/settings.json` 中通过 env 变量设置。

### Prompt Caching

Prompt caching 可节省 50-90% 的重复上下文 token 成本。自动缓存：
- System prompts（所有 agent）
- AGENTS.md 内容（跨 session 不变）
- 工具定义 Schema（重复使用）
- 对话历史中不可变的消息前缀

## 架构地图

- [AGENTS.md](AGENTS.md) — 项目主文档和 harness 指针
- Agent 定义：`.claude/agents/`（7 个）
- Skill 定义：`.claude/skills/`（14 个）
- 安装脚本：`scripts/install.mjs`

## 导航指引

- 初始化？`harness-init` / `harness-orchestrator`
- 架构？`.claude/agents/architect.md`
- 质量？`.claude/skills/quality-gate/SKILL.md`
- 知识库？`.claude/skills/context-setup/SKILL.md`
- Hooks？`.claude/skills/hooks-framework/SKILL.md`
- 演进？`.claude/skills/harness-evolve/SKILL.md`

## Change History

| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-06-09 | Initial configuration | All | 基于 OpenAI + LangChain Harness Engineering 规范创建 |
| 2026-06-09 | hooks-framework 三工具统一 | hooks-framework | .mjs 脚本 + Claude/Codex/OpenCode 原生 hooks |
| 2026-06-09 | 上下文管理强化 | hooks-framework | continuation → Stop hook, compaction → PreCompact hook |
| 2026-06-10 | 跨平台改造 | scripts, hooks | 移除 install.sh，统一使用 install.mjs；修复所有脚本跨平台兼容性 |
| 2026-06-10 | Harness 文档对齐 v1 | All | 新增模型中立性原则、apply_patch/容错/Shell规范/浏览器/WebSearch/MCP/ToolSearch |
| 2026-06-10 | Harness 文档对齐 v2 | All | Git安全规则、错误处理规范、并行工具调用、Non-Interactive模式、输出格式、Agent消息协议、Trace自分析、A/B测试、大规模并行、API-Native Compaction、Prompt Caching、reasoning_effort、语义检索、Computer Use、AI Slop防护、DRY指令 |
