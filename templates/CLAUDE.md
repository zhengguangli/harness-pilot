## Harness: Harness Engineering

**Goal:** One-click AI agent team + harness system setup for any project

**Trigger:** When work involves harness config, agent team setup, or knowledge architecture, use `harness-orchestrator` skill. Answer simple questions directly.

### Architecture Map

- [AGENTS.md](AGENTS.md) — main project doc and harness pointer
- Agent definitions: `{{AGENTS_DIR}}/` (7)
- Skill definitions: `{{SKILLS_DIR}}/` (14)
- Install script: `scripts/install.mjs`

### Core Principles

1. **Humans steer, agents execute**
2. **Repo = system of record**
3. **Map, not manual**
4. **Constraints = multipliers**
5. **Progressive disclosure**
6. **Corrections cheap, waiting expensive**
7. **Agent = Model + Harness** — model provides intelligence, harness makes it useful
