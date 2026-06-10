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

<!-- HARNESS-PILOT:START -->

## Architecture Map
- See [CLAUDE.md](CLAUDE.md) — main project doc and harness pointer
- Agent definitions: `.claude/agents/` — 7 specialized agents
- Skill definitions: `.claude/skills/` — 14 standard skills
- Install script: `scripts/install.mjs` — unified installer

## Key Constraints
- **Humans steer, agents execute** — engineer designs environment, AI writes code
- **Repo = system of record** — knowledge outside repo doesn't exist to agents
- **Map, not manual** — AGENTS.md is TOC, not encyclopedia
- **Constraints = multipliers** — rigid architecture boundaries enable speed

## Agent Team

| Agent | Role |
|-------|------|
| orchestrator | Team coordinator, manages task dispatch and phase transitions |
| architect | Architecture designer, defines layer boundaries and taste invariants |
| builder | Code generator, produces implementation within constraints |
| reviewer | Quality reviewer, code review and taste validation |
| qa | Verification engineer, testing and trigger checks |
| sre | Site reliability engineer, observability and entropy management |
| context-engineer | Context engineer, knowledge architecture management |

## Skills

| Skill | Purpose |
|-------|---------|
| harness-orchestrator | Team orchestrator, coordinates all agents |
| harness-init | One-click harness init |
| context-setup | Knowledge base architecture generation |
| architecture-guard | Architecture boundary enforcement |
| entropy-gc | Entropy management & garbage collection |
| observability-setup | Observability stack config |
| sandbox-exec | Secure code execution environment |
| quality-gate | Quality review gate |
| agent-readability | Agent readability optimization |
| harness-evolve | Feedback-driven evolution |
| hooks-framework | Deterministic execution hooks |
| web-search | Web search integration |
| mcp-connector | MCP tool connector |
| tool-search | Dynamic tool discovery |

## Navigation
- New project init? Use `harness-init` or `harness-orchestrator` skill
- Architecture design? Read `.claude/agents/architect.md`
- Quality review? Read `.claude/skills/quality-gate/SKILL.md`
- Knowledge management? Read `.claude/skills/context-setup/SKILL.md`
- Evolution feedback? Read `.claude/skills/harness-evolve/SKILL.md`
- Hooks config? Read `.claude/skills/hooks-framework/SKILL.md`
- Web search? Read `.claude/skills/web-search/SKILL.md`
- MCP integration? Read `.claude/skills/mcp-connector/SKILL.md`
- Install? Read `README.md` or run `node scripts/install.mjs --help`

<!-- HARNESS-PILOT:END -->
