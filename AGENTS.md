# AGENTS.md

## Overview
harness-pilot — Harness Engineering toolkit for Claude Code, Codex, OpenCode.

## Architecture Map
- [CLAUDE.md](CLAUDE.md) — harness pointer
- [README.md](README.md) — install & usage guide
- Agents: `.claude/agents/` (7) | Skills: `.claude/skills/` (14)
- Install: `scripts/install.mjs`

## Constraints
- **Humans steer, agents execute** — engineer designs environment, AI writes code
- **Repo = system of record** — knowledge outside repo doesn't exist to agents
- **Map, not manual** — AGENTS.md is TOC, not encyclopedia. Keep ≤100 lines.
- **Constraints = multipliers** — rigid architecture boundaries enable speed
- **Cross-platform** — Node.js .mjs only; no .sh/.bat/.ps1

## Code Style
Human-intuitive + AI-readable. Strong typing, defensive coding, fail-fast. Single-responsibility functions. Precise naming.

## Agent Team
| Agent | Role | Agent | Role |
|-------|------|-------|------|
| orchestrator | Team coordination | architect | Architecture design |
| builder | Code generation | reviewer | Quality review |
| qa | Verification & test | sre | Reliability |
| context-engineer | Knowledge architecture | | |

## Skills
| Skill | Purpose | Skill | Purpose |
|-------|---------|-------|---------|
| harness-orchestrator | Team orchestration | harness-init | One-click init |
| context-setup | Knowledge base generation | architecture-guard | Architecture boundaries |
| entropy-gc | Entropy management | quality-gate | Quality gate |
| hooks-framework | Execution hooks | harness-evolve | Feedback evolution |
| agent-readability | Agent readability | sandbox-exec | Secure execution |
| observability-setup | Observability | web-search | Web search |
| mcp-connector | MCP integration | tool-search | Tool discovery |

## Navigation
- Init? `harness-init` / `harness-orchestrator`
- Architecture? `.claude/agents/architect.md`
- Quality? `.claude/skills/quality-gate/SKILL.md`
- Knowledge? `.claude/skills/context-setup/SKILL.md`
- Hooks? `.claude/skills/hooks-framework/SKILL.md`
- Evolve? `.claude/skills/harness-evolve/SKILL.md`
