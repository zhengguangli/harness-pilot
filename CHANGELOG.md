# CHANGELOG

| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-06-09 | Initial configuration | All | Based on OpenAI + LangChain Harness Engineering specs |
| 2026-06-09 | hooks-framework unified | hooks-framework | .mjs scripts + Claude/Codex/OpenCode native hooks |
| 2026-06-09 | Context mgmt enhanced | hooks-framework | continuation → Stop hook, compaction → PreCompact hook |
| 2026-06-10 | Cross-platform migration | scripts, hooks | Removed install.sh, unified to install.mjs |
| 2026-06-10 | Harness docs alignment v1 | All | Model neutrality, apply_patch, fault tolerance, Shell spec, Browser, WebSearch, MCP, ToolSearch |
| 2026-06-10 | Harness docs alignment v2 | All | Git safety, error handling, parallel tool calls, Non-Interactive mode, output format, agent msg protocol, trace self-analysis, A/B testing, mass parallelism, API-Native Compaction, Prompt Caching, reasoning_effort, semantic search, Computer Use, AI Slop guard, DRY instructions |
| 2026-06-10 | entropy-gc cross-platform | entropy-gc | Converted drift-scan.sh and quality-score.sh to .mjs |
| 2026-06-10 | Code style guidelines | All | Human+AI friendly, strong typing, decoupling, test-driven |
| 2026-06-10 | Mixed-language strategy | All | High-freq context → EN, docs/ → ZH |
| 2026-06-10 | Auto-unload + Context Rot | hooks-framework, context-setup, orchestrator | Context Rot definition, self-verification loop, context-cleanup.mjs, @ref tracking |
