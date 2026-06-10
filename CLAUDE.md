# harness-pilot — Harness Engineering Toolkit

## Harness: Harness Engineering

**Goal:** One-click AI agent team + harness system setup for any project

**Trigger:** When work involves harness config, agent team setup, or knowledge architecture, use `harness-orchestrator` skill. Answer simple questions directly.

## Core Principles

1. **Humans steer, agents execute** — engineer designs environment, AI writes code
2. **Repo = system of record** — knowledge outside repo doesn't exist to agents
3. **Map, not manual** — AGENTS.md is TOC, not encyclopedia. Keep ≤100 lines.
4. **Constraints = multipliers** — rigid architecture boundaries are multipliers
5. **Progressive disclosure** — lazy-load context, protect context window
6. **Corrections cheap, waiting expensive** — fast merge + follow-up fix > infinite blocking
7. **Agent = Model + Harness** — model provides intelligence, harness makes it useful
8. **ReAct loop** — Reasoning → Action → Observe → Repeat, core agent execution pattern
9. **Co-evolution** — model and harness co-evolve, mutually reinforce
10. **Model neutrality** — optimal harness ≠ training harness; continuously benchmark
11. **Deterministic & actionable** — agent behavior rules must be mechanically enforceable

## Model-Harness Co-evolution

**Key insight:** Model training and harness design are coupled. Today's agents (Claude Code, Codex) are post-trained with harness-in-the-loop.

**Co-evolution cycle:**
1. Discover useful harness primitives (filesystem ops, bash exec, planning)
2. Integrate primitives into harness
3. Train model with harness → model gets natively good at these operations
4. Next-gen models perform better in the harness

**Strategy:**
- **Don't bind to one harness**: optimal harness may not be the one used during post-training
- **Continuous experiment**: evaluate configs via Terminal Bench benchmarks
- **Embrace change**: as model capability rises, some harness features get absorbed

## Model Neutrality

Harness coupling during training causes "overfitting" — models excel in one harness but drop hard in others (e.g. Opus 4.6 in Claude Code scores far below other harnesses on Terminal Bench).

- **Harness portability**: same model, different harness → massive perf difference. Optimizing the harness is a key lever.
- **Independent evaluation**: cross-harness benchmark via Terminal Bench 2.0
- **Tool-logic sensitivity**: models are sensitive to tool impl details (e.g. `apply_patch` format)
- **Continuous benchmarking**: regularly test models across harness configs, track trends

## Runtime Config

### reasoning_effort

| Level | Use case | Latency | Quality |
|-------|----------|---------|---------|
| `low` | Simple confirmations, known ops | Low | Basic |
| `medium` | Daily coding, code review | Mid | Good (default) |
| `high` | Architecture design, complex refactor | High | Great |
| `xhigh` | Long-horizon autonomous tasks | Very high | Best |

Config via env in `.claude/settings.json`.

### Prompt Caching

Saves 50-90% repeated context token cost. Auto-cached:
- System prompts (all agents)
- AGENTS.md content (unchanged across sessions)
- Tool definition schemas (repeated use)
- Immutable message prefixes in conversation history

## Architecture Map

- [AGENTS.md](AGENTS.md) — main project doc + harness pointer
- Agents: `.claude/agents/` (7)
- Skills: `.claude/skills/` (14)
- Install: `scripts/install.mjs`

## Navigation

- Init? `harness-init` / `harness-orchestrator`
- Architecture? `.claude/agents/architect.md`
- Quality? `.claude/skills/quality-gate/SKILL.md`
- Knowledge? `.claude/skills/context-setup/SKILL.md`
- Hooks? `.claude/skills/hooks-framework/SKILL.md`
- Evolve? `.claude/skills/harness-evolve/SKILL.md`

See [CHANGELOG.md](CHANGELOG.md) for change history.

<!-- HARNESS-PILOT:START -->

## Harness: Harness Engineering

**Goal:** One-click AI agent team + harness system setup for any project

**Trigger:** When work involves harness config, agent team setup, or knowledge architecture, use `harness-orchestrator` skill. Answer simple questions directly.

### Architecture Map

- [AGENTS.md](AGENTS.md) — main project doc and harness pointer
- Agent definitions: `.claude/agents/` (7)
- Skill definitions: `.claude/skills/` (14)
- Install script: `scripts/install.mjs`

### Core Principles

1. **Humans steer, agents execute**
2. **Repo = system of record**
3. **Map, not manual**
4. **Constraints = multipliers**
5. **Progressive disclosure**
6. **Corrections cheap, waiting expensive**
7. **Agent = Model + Harness** — model provides intelligence, harness makes it useful

<!-- HARNESS-PILOT:END -->
