---
name: hooks-framework
description: Hooks/中间件框架。定义确定性执行钩子，包括压缩、续行、lint 检查。当用户说"配置 hooks"、"中间件"、"hooks framework"、"执行钩子"、"确定性检查"时触发。也用于修改已有 hook 配置。
---

# Hooks Framework — 确定性执行钩子

## 核心理念

**Harness 不仅是工具，还是确定性执行的保障。** Hooks 在 agent 执行周期的关键点注入确定性逻辑，弥补模型的不确定性。

## 架构

```
hooks.yaml（声明层：抽象事件名）
    ↓
install.mjs（适配层：转译为各工具原生格式）
    ↓
├── .claude/settings.json    → Claude Code 原生 hooks
├── .codex/hooks.json        → Codex 原生 hooks
└── .opencode/plugins/       → OpenCode 原生插件

scripts/（执行层：.mjs 脚本，三工具通用）
```

## 抽象事件映射

| 抽象事件 | Claude Code | Codex | OpenCode |
|----------|-------------|-------|----------|
| `on_session_start` | `SessionStart` | `SessionStart` | `session.created` |
| `on_file_edit` | `PostToolUse(Edit\|Write)` | `PostToolUse(Edit\|Write)` | `file.edited` |
| `on_compact` | `PreCompact` | `PreCompact` | `experimental.session.compacting` |
| `on_turn_end` | `Stop` | `Stop` | `session.idle` |

## 可运行脚本

```
.claude/skills/hooks-framework/
├── SKILL.md
├── hooks.yaml               ← 统一配置
├── opencode-plugin.ts        ← OpenCode 插件模板
└── scripts/
    ├── context-check.mjs     ← AGENTS.md 新鲜度检查
    ├── env-verify.mjs        ← 环境就绪检查
    ├── lint-check.mjs        ← 架构边界检查
    ├── test-run.mjs          ← 测试套件
    ├── continuation.mjs      ← Ralph Loop 续行检测
    ├── compaction.mjs        ← 上下文压缩
    ├── trace-log.mjs         ← 执行日志
    └── quality-metric.mjs    ← 质量指标
```

### 脚本双模式

每个 .mjs 支持两种调用方式：

**CLI 模式**（Claude Code / Codex hooks 调用）：
```bash
node scripts/context-check.mjs
# stdin JSON + exit code + stdout
```

**Import 模式**（OpenCode 插件调用）：
```typescript
import { contextCheck } from './scripts/context-check.mjs'
const result = contextCheck(projectDir)
```

## 快速开始

### 手动运行

```bash
node .claude/skills/hooks-framework/scripts/context-check.mjs
node .claude/skills/hooks-framework/scripts/lint-check.mjs
```

### install.mjs 自动生成

```bash
# Claude Code
node scripts/install.mjs --tool claude   → 生成 .claude/settings.json hooks

# Codex
node scripts/install.mjs --tool codex    → 生成 .codex/hooks.json

# OpenCode
node scripts/install.mjs --tool opencode → 生成 .opencode/plugins/harness-hooks.ts

# 全部
node scripts/install.mjs --tool all      → 三个都生成
```

## 输入/输出

**输出目录：**
- `.workspace/trace/` — 执行日志
- `.workspace/metrics/` — 质量指标
- `.workspace/context_summary.md` — 压缩摘要
- `.workspace/continuation_prompt.md` — 续行提示

## 质量标准

- 每个脚本可独立运行和测试
- 脚本无外部依赖（Node.js 内置模块）
- 三平台通用（macOS / Linux / Windows）
- 所有脚本支持 CLI 和 import 双模式
