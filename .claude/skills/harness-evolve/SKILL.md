---
name: harness-evolve
description: 反馈驱动的 Harness 演进。收集执行反馈，持续改进 agents、skills、知识库。当用户说"改进 harness"、"演进"、"harness evolve"、"反馈整合"、"优化 agent 团队"时触发。也用于在每次 harness 执行后主动建议收集反馈。
---

# Harness Evolve — 反馈驱动演进

## 核心理念

**Harness 是演进系统，不是一次性产物。** 每次执行后收集反馈，持续改进 agents、skills 和知识库。

## 执行流程

### Step 1: 反馈收集

每次 harness 执行后，询问用户：

1. "结果有哪些部分需要改进？"
2. "agent 团队组成或工作流程需要调整吗？"
3. "有没有发现智能体重复犯的错误？"

**不强求反馈，但始终提供机会。**

### Step 2: 反馈分类与路由

| 反馈类型 | 修改目标 | 示例 |
|----------|----------|------|
| 输出质量 | 对应 agent 的 skill | "分析太浅" → 在 skill 中增加深度标准 |
| Agent 角色 | Agent 定义 `.md` | "需要安全审查" → 新增 agent |
| 工作流程 | Orchestrator skill | "验证应该前置" → 调整阶段顺序 |
| 团队组成 | Orchestrator + agents | "这两个可以合并" → 合并 agent |
| 触发缺失 | Skill 描述 | "这个表达没触发" → 扩展描述 |

### Step 3: 增量修改

**修改原则：**
- 一次改一个地方
- 修改后立即验证
- 记录变更原因

**修改流程：**
1. 定位修改目标文件
2. 读取现有内容
3. 做出最小化修改
4. 验证修改有效性
5. 更新 CLAUDE.md 变更历史

### Step 4: 变更历史

在 CLAUDE.md 的变更历史表中记录：

```markdown
**Change History:**
| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-01-01 | Initial configuration | All | - |
| 2026-01-05 | 增加安全审查 agent | agents/security.md | 反馈：输出缺少安全审查 |
| 2026-01-10 | 扩展触发描述 | skills/quality-gate | "检查质量"未触发 |
```

### Step 5: 演进触发器

**主动建议演进的情况：**
- 同类反馈重复 2+ 次
- 发现 agent 重复失败的模式
- 用户观察到绕过 orchestrator 手动操作
- 新的技术栈或工具引入
- Terminal Bench 2.0 评分下降

### Step 6: 评估基准

**Terminal Bench 2.0 自动化：**

使用 Terminal Bench 2.0 评估 harness 配置效果：

| 评估维度 | 说明 | 权重 |
|----------|------|------|
| 任务完成率 | 成功完成的任务比例 | 40% |
| 代码质量 | 生成代码的正确性、可维护性 | 30% |
| 执行效率 | 完成任务所需时间和 token | 20% |
| 错误恢复 | 遇到错误时的恢复能力 | 10% |

**自动化评估流程：**
1. 从 Terminal Bench 2.0 选择标准测试任务集
2. 在当前 harness 配置下运行 `node .claude/skills/harness-evolve/scripts/run-benchmark.mjs`
3. 自动收集评分和瓶颈分析
4. 生成对比报告（当前 vs 历史跑分）
5. 评分下降时自动触发演进建议

**关键认知：** 同一模型在不同 harness 中表现差异显著。Opus 4.6 在 Claude Code 中的评分远低于在其他 harness 中的评分。持续优化 harness 是提升 agent 性能的关键。

### Step 7: 操作/维护工作流

对已有 harness 进行系统性检查、修改和同步：

1. **状态审计**：对比 agent/skill 文件与 orchestrator 定义的一致性
2. **增量修改**：按用户请求增删改，每次修改后立即同步
3. **更新历史**：记录变更到 CLAUDE.md
4. **变更验证**：结构检查 + 触发验证（如影响触发）

### Step 8: Trace 自分析

**用途：** 分析 agent 执行 trace 以识别和修复 harness 级别的故障模式。

**分析流程：**
1. 加载 `.workspace/trace/` 中的最近 N 次执行日志
2. 扫描失败模式：
   - 重复出现的相同错误类型
   - 某 tool 调用持续超时 → 可能需调整超时或替代工具
   - 某 phase 频繁中断 → 可能需增加 context 或调整步骤分解
   - 同一文件被反复编辑 → 可能存在上下文腐烂
3. 生成故障模式报告，自动路由到对应 target：
   - Tool 问题 → 调整 `hooks-framework` 脚本
   - Phase 问题 → 调整 `harness-orchestrator` 编排
   - Context 问题 → 调整 `context-setup` 或压缩策略
4. 提出修复建议（含具体文件:行号）

**自动化触发：**
- 每次 harness 执行后自动运行
- 累计 3 次相同错误模式 → 主动通知用户
- Terminal Bench 评分下降 >10% → 强制全链路分析

### Step 9: Harness A/B 测试

**用途：** 对比不同 harness 配置的效果，选择最优方案。

**A/B 测试流程：**
1. 定义 Harness 变体：
   ```
   Variant A: 当前配置（基线）
   Variant B: 修改某一维度（如增加 apply_patch 工具）
   ```
2. 在相同任务集上并行运行两个变体
3. 对比指标：
   | 指标 | 测量方式 |
   |------|----------|
   | 任务完成率 | Terminal Bench 评分 |
   | Token 消耗 | 总计 + 每次操作均值 |
   | 执行时间 | 墙钟时间 |
   | 错误恢复次数 | 从 trace 提取 |
   | 用户修正次数 | 从 feedback 提取 |
4. 生成对比报告（`.workspace/benchmark/comparison.html`）
5. 变体 B 优于 A → 建议合并；劣于 A → 分析原因

**配置变体维度（可独立 A/B 测试）：**
- Tool 集合（增加/移除某 tool）
- 压缩策略（阈值、摘要方式）
- 并行度（子代理数量）
- reasoning_effort 级别

## 输入/输出协议

**输入：**
- 用户反馈
- 执行日志
- 当前 harness 配置

**输出：**
- 修改后的 agent/skill 文件
- 更新的 CLAUDE.md 变更历史
- 演进报告

## 质量标准

- 每次变更记录原因
- 变更后验证一致性
- 不引入新的冲突
- 变更历史完整可追溯
