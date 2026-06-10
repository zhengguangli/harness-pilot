# harness-pilot

**Agent = Model + Harness.** harness-pilot is the harness — 7 agents, 14 skills, one command. Deploy a full AI agent team with architecture enforcement, deterministic hooks, and context management into any project.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Quick Install

```bash
git clone https://github.com/zhengguangli/harness-pilot.git /tmp/hp
node /tmp/hp/scripts/install.mjs --yes
rm -rf /tmp/hp
```

Existing AGENTS.md / CLAUDE.md? **Not overwritten.** harness-pilot injects via markers, preserving your original content.

```bash
# Target specific AI tools
node /tmp/hp/scripts/install.mjs --tool codex --yes    # Codex
node /tmp/hp/scripts/install.mjs --tool opencode --yes # OpenCode
node /tmp/hp/scripts/install.mjs --tool all --yes      # All three

# Preview only
node /tmp/hp/scripts/install.mjs --dry-run
```

| Flag | Description | Default |
|------|-------------|---------|
| `--dir <path>` | Target project directory | cwd |
| `--tool <name>` | AI tool: `claude` / `codex` / `opencode` / `all` | `claude` |
| `--dry-run` | Preview without writing | off |
| `--yes, -y` | Skip confirmation | off |

## What You Get

### 7 Agents

```
orchestrator  →  architect  →  builder  →  reviewer  →  qa
     │                                                     ↑
     └── sre  ·  context-engineer ─────────────────────────┘
```

| Agent | Role |
|-------|------|
| orchestrator | Task decomposition, phase transitions, Ralph loop continuation |
| architect | Layer boundaries, taste invariants, architecture rules |
| builder | Constrained code generation, self-verification, git safety |
| reviewer | Cross-boundary review, taste validation, compliance checks |
| qa | Trigger verification, regression testing, screenshot evidence |
| sre | Observability stack, entropy management, environment config |
| context-engineer | AGENTS.md architecture, progressive disclosure design |

### 14 Skills

| Skill | Triggers (EN / 中文) | Purpose |
|-------|----------------------|---------|
| `harness-init` | init harness / 初始化 harness | One-click full deployment |
| `harness-orchestrator` | run harness / 运行 harness | Coordinate all agents |
| `context-setup` | context setup / 设置知识库 | AGENTS.md + docs/ architecture |
| `architecture-guard` | architecture guard / 架构检查 | Layer linters + CI gates |
| `quality-gate` | quality gate / 质量审查 | Cross-boundary review + security scan |
| `sandbox-exec` | sandbox / 沙箱 | Isolated execution, git worktrees, browser |
| `observability-setup` | observability / 配置可观测性 | LogQL/PromQL + Chrome DevTools |
| `entropy-gc` | entropy gc / 垃圾收集 | Drift detection + auto-refactor PRs |
| `agent-readability` | agent readability / 优化可读性 | Tacit knowledge audit |
| `harness-evolve` | evolve harness / 改进 harness | Feedback-driven evolution + A/B testing |
| `hooks-framework` | config hooks / 配置 hooks | Ralph Loop, compaction, fault tolerance |
| `web-search` | web search / 搜索 | Real-time web search + page fetch |
| `mcp-connector` | mcp connect / MCP 集成 | Context7, GitHub API integration |
| `tool-search` | tool search / 查找工具 | Dynamic tool discovery + lazy loading |

## How It Works

### Execution Engine

| Mechanism | What it does |
|-----------|-------------|
| **ReAct Loop** | Reason → Act → Observe → Repeat. Core agent execution pattern. |
| **Ralph Loop** | Agent tries to exit early? Hook intercepts, re-injects prompt in clean context. |
| **Self-verification** | Write code → Run tests → Inspect logs → Fix errors → Repeat until clean. |
| **Fault Tolerance** | Exponential backoff retry + timeout control + circuit breaker. |
| **Parallel Tool Calls** | Batch independent reads/searches in parallel. Never sequential when unnecessary. |
| **Massive Parallel** | 3→50 concurrent sub-agents with shard coordination and git worktree isolation. |

### Context Management

| Mechanism | What it does |
|-----------|-------------|
| **Map, Not Manual** | AGENTS.md ≤100 lines. Pointer to docs/, not encyclopedia. Protects context window. |
| **Progressive Disclosure** | Skills loaded on demand via trigger words, not pre-injected at startup. |
| **Compaction** | Context near full? Intelligent summarization + offload to filesystem. |
| **Tool Offload** | Large tool outputs truncated to head/tail, full content → `.harness-polit/offloaded/`. |
| **File Ref Tracking** | Automatically track and unload stale file references via TTL. |
| **Prompt Caching** | Static context (system prompts, schemas) cached by API. Saves 50-90% repeat cost. |

### Quality & Safety

| Mechanism | What it does |
|-----------|-------------|
| **Apply Patch** | Precise unified diff file editing. Model-native optimization, rollback support. |
| **Architecture Guard** | Layer direction enforcement via custom linters + structural tests. |
| **Entropy GC** | Drift scanning + quality scoring + automated cleanup PRs on schedule. |
| **Model Neutrality** | Benchmark across harness configs. Best harness ≠ training harness. |
| **AI Slop Prevention** | Frontend constraints: typography, color, animation, layout rules. |
| **Git Safety** | No destructive commands. No amend. Dirty worktree protection. |
| **Agent Message Protocol** | File-system-based agent-to-agent messaging with routing and confirmation. |

### Extensions

| Mechanism | What it does |
|-----------|-------------|
| **Browser Wrapper** | Headless browser: screenshots, DOM ops, form interaction. |
| **Computer Use** | GUI automation: click, type, scroll, VNC-based app testing. |
| **Web Search** | Real-time doc/API/version search beyond model knowledge cutoff. |
| **MCP Connector** | Context7 + GitHub API for external tool integration. |
| **Tool Search** | Dynamic tool discovery. Agents find tools on demand, not pre-configured. |
| **Trace Self-Analysis** | Agents analyze their own traces to identify harness-level failure patterns. |
| **Harness A/B Testing** | Compare harness configs via Terminal Bench scoring. |

## Architecture

### File Structure

```
your-project/
├── CLAUDE.md                  ← Harness pointer
├── CHANGELOG.md               ← Change history
├── AGENTS.md                  ← Knowledge TOC (≤100 lines)
├── .claude/
│   ├── agents/                ← 7 agent definitions
│   └── skills/                ← 14 skill definitions
└── docs/                      ← Knowledge base
    ├── ARCHITECTURE.md        ← Layer architecture map
    ├── QUALITY_SCORE.md       ← Quality tracking
    ├── SECURITY.md            ← Security requirements
    └── ...
```

### Constraints That Power the System

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | Humans steer, agents execute | You design the environment, AI writes code |
| 2 | Repo = system of record | Knowledge outside the repo doesn't exist to agents |
| 3 | Map, not manual | AGENTS.md ≤100 lines, points to deeper docs |
| 4 | Constraints = multipliers | Rigid boundaries enable speed, not slow it down |
| 5 | Progressive disclosure | Load context on demand, protect the window |
| 6 | Corrections cheap, waiting expensive | Fast merge + follow-up fix > infinite blocking |
| 7 | Agent = Model + Harness | Intelligence comes from the model, usefulness from the harness |
| 8 | Model neutrality | Optimal harness ≠ training harness. Keep benchmarking. |

### Compatibility

| Tool | Installed Path | Config File |
|------|----------------|-------------|
| Claude Code | `.claude/agents/` + `.claude/skills/` | `.claude/settings.json` |
| Codex | `.agents/agents/` + `.agents/skills/` | `.codex/hooks.json` |
| OpenCode | `.opencode/agents/` + `.opencode/skills/` | `.opencode/plugins/harness-hooks.ts` |

Source files use `{{SKILLS_DIR}}` and `{{AGENTS_DIR}}` placeholders — auto-replaced during install based on target tool.

## Sources

Every principle is battle-tested. Each mechanism has an origin.

- **OpenAI: Harness Engineering (2026.2)** — Building a million-line product with zero human-written code. Repo as system of record, constraints as multipliers, apply_patch tool spec.
- **OpenAI: Codex Prompting Guide** — Shell tool spec, plan hygiene, preamble suppression, parallel tool calls.
- **LangChain: Agent Anatomy (2026.3)** — Agent = Model + Harness framework. Filesystem as collaboration surface, Ralph loops, context rot, dynamic tool assembly.
- **LangChain: Deep Agents** — Industrial harness building library. Filesystem, sandbox, browser, sub-agent orchestration primitives.
- **LangChain: Model Neutrality (2026.6)** — Model neutrality matters more than cloud neutrality. Same model, different harness → massive perf variance.
- **LangChain: Fault Tolerance in LangGraph** — Retry, timeout, error handler patterns.
- **Terminal Bench 2.0** — Agent performance benchmark for cross-harness evaluation.

## License

MIT. Use it, fork it, sell it, integrate it. Just keep the copyright notice.
