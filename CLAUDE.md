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

## 架构地图

- [AGENTS.md](AGENTS.md) — 项目主文档和 harness 指针
- Agent 定义：`.claude/agents/`（7 个）
- Skill 定义：`.claude/skills/`（11 个）
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
