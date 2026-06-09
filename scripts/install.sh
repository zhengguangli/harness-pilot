#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# harness-pilot — Harness Engineering 技能包安装器
# 
# 用法:
#   curl -fsSL https://raw.githubusercontent.com/zhengguangli/harness-pilot/main/install.sh | bash
#   curl -fsSL ... | bash -s -- --dir /path/to/project
#   curl -fsSL ... | bash -s -- --dry-run
#
# 支持: Claude Code / Codex / OpenCode
#
# 设计原则:
#   - 已有 AGENTS.md / CLAUDE.md → 增量注入，不覆盖
#   - 已有 .claude/agents/ / .claude/skills/ → 仅补充缺失，不覆盖
#   - 已有 docs/ → 仅创建缺失目录和骨架，不覆盖
# ============================================================================

REPO_URL="https://github.com/zhengguangli/harness-pilot"
VERSION="1.1.0"
TARGET_DIR="."
DRY_RUN=false
SKIP_CONFIRM=false

# Marker 标记 harness 注入区域
MARKER_START="<!-- HARNESS-PILOT:START -->"
MARKER_END="<!-- HARNESS-PILOT:END -->"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${BLUE}[pilot]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
skip()  { echo -e "${CYAN}[skip]${NC} $*"; }

# ============================================================================
# 参数解析
# ============================================================================
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)        TARGET_DIR="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --yes|-y)     SKIP_CONFIRM=true; shift ;;
    --version)    echo "harness-pilot v${VERSION}"; exit 0 ;;
    --help|-h)
      echo "用法: install.sh [--dir <path>] [--dry-run] [--yes]"
      echo ""
      echo "选项:"
      echo "  --dir <path>   目标项目目录 (默认: 当前目录)"
      echo "  --dry-run      仅预览，不实际写入"
      echo "  --yes, -y      跳过确认提示"
      echo "  --version      显示版本号"
      echo "  --help, -h     显示帮助"
      echo ""
      echo "行为:"
      echo "  已有 AGENTS.md / CLAUDE.md → 增量注入 harness 区域，不覆盖"
      echo "  已有 agents / skills        → 仅补充缺失文件，不覆盖"
      echo "  已有 docs/                  → 仅创建缺失目录和骨架，不覆盖"
      exit 0
      ;;
    *) err "未知参数: $1"; exit 1 ;;
  esac
done

# ============================================================================
# 环境检测
# ============================================================================
detect_target() {
  TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || {
    err "目录不存在: $TARGET_DIR"
    exit 1
  }
  log "目标目录: ${TARGET_DIR}"
}

detect_ai_tools() {
  local tools=()
  
  if command -v claude &>/dev/null || [[ -d "${TARGET_DIR}/.claude" ]]; then
    tools+=("claude-code")
  fi
  
  if command -v codex &>/dev/null || [[ -f "${TARGET_DIR}/AGENTS.md" ]]; then
    tools+=("codex")
  fi
  
  if command -v opencode &>/dev/null; then
    tools+=("opencode")
  fi
  
  if [[ ${#tools[@]} -eq 0 ]]; then
    tools+=("claude-code")
    warn "未检测到 AI 工具，默认使用 Claude Code 格式"
  fi
  
  DETECTED_TOOLS=("${tools[@]}")
  log "检测到工具: ${tools[*]}"
}

detect_tech_stack() {
  local stack="unknown"
  if [[ -f "${TARGET_DIR}/package.json" ]]; then
    stack="node"
    if grep -q "next" "${TARGET_DIR}/package.json" 2>/dev/null; then
      stack="nextjs"
    elif grep -q "react" "${TARGET_DIR}/package.json" 2>/dev/null; then
      stack="react"
    fi
  elif [[ -f "${TARGET_DIR}/Cargo.toml" ]]; then
    stack="rust"
  elif [[ -f "${TARGET_DIR}/go.mod" ]]; then
    stack="go"
  elif [[ -f "${TARGET_DIR}/pyproject.toml" ]] || [[ -f "${TARGET_DIR}/requirements.txt" ]]; then
    stack="python"
  fi
  
  TECH_STACK="$stack"
  log "技术栈: ${TECH_STACK}"
}

# ============================================================================
# 状态统计
# ============================================================================
count_existing() {
  EXISTING_AGENTS=0
  EXISTING_SKILLS=0
  NEW_AGENTS=0
  NEW_SKILLS=0
  SKIPPED_FILES=0
  
  # 统计已有 agents
  if [[ -d "${TARGET_DIR}/.claude/agents" ]]; then
    EXISTING_AGENTS=$(find "${TARGET_DIR}/.claude/agents" -name "*.md" -maxdepth 1 | wc -l | tr -d ' ')
  fi
  
  # 统计已有 skills
  if [[ -d "${TARGET_DIR}/.claude/skills" ]]; then
    EXISTING_SKILLS=$(find "${TARGET_DIR}/.claude/skills" -name "SKILL.md" -maxdepth 2 | wc -l | tr -d ' ')
  fi
  
  # 统计将新增的数量
  local all_agents=(orchestrator architect builder reviewer qa sre context-engineer)
  for agent in "${all_agents[@]}"; do
    if [[ ! -f "${TARGET_DIR}/.claude/agents/${agent}.md" ]]; then
      NEW_AGENTS=$((NEW_AGENTS + 1))
    fi
  done
  
  local all_skills=(harness-orchestrator harness-init context-setup architecture-guard entropy-gc observability-setup sandbox-exec quality-gate agent-readability harness-evolve hooks-framework)
  for skill in "${all_skills[@]}"; do
    if [[ ! -f "${TARGET_DIR}/.claude/skills/${skill}/SKILL.md" ]]; then
      NEW_SKILLS=$((NEW_SKILLS + 1))
    fi
  done
}

# ============================================================================
# 增量注入 AGENTS.md
# ============================================================================
install_agents_md() {
  local file="${TARGET_DIR}/AGENTS.md"
  
  # 生成 harness 区域内容
  local harness_section
  harness_section=$(cat <<'SECTION'
## 架构地图
- 详见 [CLAUDE.md](CLAUDE.md) — 项目主文档和 harness 指针
- Agent 定义：`.claude/agents/` — 7 个专业 agent
- Skill 定义：`.claude/skills/` — 11 个标准技能
- 安装脚本：`scripts/install.sh` — 统一安装器

## 关键约束
- **人类掌舵，智能体执行** — 工程师设计环境，AI 执行代码
- **仓库即记录系统** — 仓库外的知识对智能体不存在
- **给地图，不给说明书** — AGENTS.md 是目录，不是百科全书
- **约束即加速器** — 严格的架构边界是倍增器

## Agent 团队

| Agent | 职责 |
|-------|------|
| orchestrator | 团队协调者，管理任务分派和阶段流转 |
| architect | 架构设计师，定义分层边界和品味不变量 |
| builder | 代码生成器，在约束内生成实现代码 |
| reviewer | 质量审查员，代码审查和品味校验 |
| qa | 验证工程师，测试和触发检查 |
| sre | 站点可靠性工程师，可观测性和熵管理 |
| context-engineer | 上下文工程师，知识库架构管理 |

## 技能包

| Skill | 用途 |
|-------|------|
| harness-orchestrator | 团队编排器，协调所有 agent 执行 |
| harness-init | 一键初始化 harness |
| context-setup | 知识库架构生成 |
| architecture-guard | 架构边界强制执行 |
| entropy-gc | 熵管理与垃圾收集 |
| observability-setup | 可观测性堆栈配置 |
| sandbox-exec | 安全代码执行环境 |
| quality-gate | 质量审查门禁 |
| agent-readability | 智能体可读性优化 |
| harness-evolve | 反馈驱动演进 |
| hooks-framework | 确定性执行钩子 |

## 导航指引
- 新项目初始化？使用 `harness-init` 或 `harness-orchestrator` skill
- 架构设计？读 `.claude/agents/architect.md`
- 质量审查？读 `.claude/skills/quality-gate/SKILL.md`
- 知识库管理？读 `.claude/skills/context-setup/SKILL.md`
- 演进反馈？读 `.claude/skills/harness-evolve/SKILL.md`
- Hooks 配置？读 `.claude/skills/hooks-framework/SKILL.md`
- 安装部署？读 `README.md` 或运行 `scripts/install.sh --help`
SECTION
)
  
  inject_section "$file" "AGENTS.md" "$harness_section"
}

# ============================================================================
# 增量注入 CLAUDE.md
# ============================================================================
install_claude_md() {
  local file="${TARGET_DIR}/CLAUDE.md"
  
  local harness_section
  harness_section=$(cat <<'SECTION'
## Harness: Harness Engineering

**Goal:** 为任意项目一键配置 AI agent 团队和 harness 体系

**Trigger:** 工作请求涉及 harness 配置、agent 团队搭建、知识库架构时，使用 `harness-orchestrator` skill。简单问题直接回答。

### Agents（7个）

| Agent | 文件 | 职责 |
|-------|------|------|
| orchestrator | `.claude/agents/orchestrator.md` | 团队协调者 |
| architect | `.claude/agents/architect.md` | 架构设计师 |
| builder | `.claude/agents/builder.md` | 代码生成器 |
| reviewer | `.claude/agents/reviewer.md` | 质量审查员 |
| qa | `.claude/agents/qa.md` | 验证工程师 |
| sre | `.claude/agents/sre.md` | 站点可靠性工程师 |
| context-engineer | `.claude/agents/context-engineer.md` | 上下文工程师 |

### Skills（11个）

| Skill | 文件 | 用途 |
|-------|------|------|
| harness-orchestrator | `.claude/skills/harness-orchestrator/SKILL.md` | 团队编排器 |
| harness-init | `.claude/skills/harness-init/SKILL.md` | 一键初始化 harness |
| context-setup | `.claude/skills/context-setup/SKILL.md` | 知识库架构生成 |
| architecture-guard | `.claude/skills/architecture-guard/SKILL.md` | 架构边界强制执行 |
| entropy-gc | `.claude/skills/entropy-gc/SKILL.md` | 熵管理与垃圾收集 |
| observability-setup | `.claude/skills/observability-setup/SKILL.md` | 可观测性堆栈配置 |
| sandbox-exec | `.claude/skills/sandbox-exec/SKILL.md` | 安全代码执行环境 |
| quality-gate | `.claude/skills/quality-gate/SKILL.md` | 质量审查门禁 |
| agent-readability | `.claude/skills/agent-readability/SKILL.md` | 智能体可读性优化 |
| harness-evolve | `.claude/skills/harness-evolve/SKILL.md` | 反馈驱动演进 |
| hooks-framework | `.claude/skills/hooks-framework/SKILL.md` | 确定性执行钩子 |

### Harness 组件模型

```
Agent = Model + Harness

Harness = System Prompts + Tools/Skills/MCPs
        + Bundled Infrastructure (filesystem, sandbox, browser)
        + Orchestration Logic (subagent spawning, handoffs, routing)
        + Hooks/Middleware (compaction, continuation, lint checks)
```

### 核心原则

1. **人类掌舵，智能体执行**
2. **仓库即记录系统**
3. **给地图，不给说明书**
4. **约束即加速器**
5. **渐进式披露**
6. **纠错成本低，等待成本高**
7. **Agent = Model + Harness** — 模型提供智能，Harness 让智能可用
SECTION
)
  
  inject_section "$file" "CLAUDE.md" "$harness_section"
}

# ============================================================================
# 通用增量注入函数
# ============================================================================
inject_section() {
  local file="$1"
  local label="$2"
  local content="$3"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    if [[ -f "$file" ]]; then
      if grep -q "$MARKER_START" "$file" 2>/dev/null; then
        log "[dry-run] 将更新: ${label}（已存在 harness 区域）"
      else
        log "[dry-run] 将注入: ${label}（追加 harness 区域）"
      fi
    else
      log "[dry-run] 将创建: ${label}"
    fi
    return
  fi
  
  if [[ -f "$file" ]]; then
    # 文件已存在
    if grep -q "$MARKER_START" "$file" 2>/dev/null; then
      # 已有 marker → 替换区域内内容
      local tmp="${file}.tmp"
      local in_section=false
      
      while IFS= read -r line; do
        if [[ "$line" == *"$MARKER_START"* ]]; then
          in_section=true
          echo "$line" >> "$tmp"
          echo "" >> "$tmp"
          echo "$content" >> "$tmp"
          echo "" >> "$tmp"
          continue
        fi
        if [[ "$line" == *"$MARKER_END"* ]]; then
          in_section=false
          echo "$line" >> "$tmp"
          continue
        fi
        if [[ "$in_section" == "false" ]]; then
          echo "$line" >> "$tmp"
        fi
      done < "$file"
      
      mv "$tmp" "$file"
      ok "已更新: ${label}（harness 区域已刷新）"
    else
      # 无 marker → 追加到末尾
      echo "" >> "$file"
      echo "$MARKER_START" >> "$file"
      echo "" >> "$file"
      echo "$content" >> "$file"
      echo "" >> "$file"
      echo "$MARKER_END" >> "$file"
      ok "已注入: ${label}（追加 harness 区域到末尾）"
    fi
  else
    # 文件不存在 → 创建
    mkdir -p "$(dirname "$file")"
    echo "$MARKER_START" > "$file"
    echo "" >> "$file"
    echo "$content" >> "$file"
    echo "" >> "$file"
    echo "$MARKER_END" >> "$file"
    ok "已创建: ${label}"
  fi
}

# ============================================================================
# Agent 安装（仅补充缺失）
# ============================================================================
install_agents() {
  local dest="${TARGET_DIR}/.claude/agents"
  mkdir -p "$dest"
  
  local agents=(
    "orchestrator"
    "architect"
    "builder"
    "reviewer"
    "qa"
    "sre"
    "context-engineer"
  )
  
  for agent in "${agents[@]}"; do
    local file="${dest}/${agent}.md"
    
    if [[ -f "$file" ]]; then
      skip "已存在: .claude/agents/${agent}.md"
      SKIPPED_FILES=$((SKIPPED_FILES + 1))
      continue
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
      log "[dry-run] 将创建: .claude/agents/${agent}.md"
    else
      if [[ -f "${SCRIPT_DIR}/../.claude/agents/${agent}.md" ]]; then
        cp "${SCRIPT_DIR}/../.claude/agents/${agent}.md" "$file"
      else
        download_file ".claude/agents/${agent}.md" "$file"
      fi
      ok "已安装 agent: ${agent}"
    fi
  done
}

# ============================================================================
# Skill 安装（仅补充缺失）
# ============================================================================
install_skills() {
  local dest="${TARGET_DIR}/.claude/skills"
  mkdir -p "$dest"
  
  local skills=(
    "harness-orchestrator"
    "harness-init"
    "context-setup"
    "architecture-guard"
    "entropy-gc"
    "observability-setup"
    "sandbox-exec"
    "quality-gate"
    "agent-readability"
    "harness-evolve"
    "hooks-framework"
  )
  
  for skill in "${skills[@]}"; do
    local skill_dir="${dest}/${skill}"
    local skill_file="${skill_dir}/SKILL.md"
    
    if [[ -f "$skill_file" ]]; then
      skip "已存在: .claude/skills/${skill}/SKILL.md"
      SKIPPED_FILES=$((SKIPPED_FILES + 1))
      
      # 仍需检查子目录是否缺失
      for subdir in references scripts; do
        if [[ -d "${SCRIPT_DIR}/../.claude/skills/${skill}/${subdir}" ]] && [[ ! -d "${skill_dir}/${subdir}" ]]; then
          if [[ "$DRY_RUN" == "true" ]]; then
            log "[dry-run] 将补充: .claude/skills/${skill}/${subdir}/"
          else
            cp -r "${SCRIPT_DIR}/../.claude/skills/${skill}/${subdir}" "${skill_dir}/${subdir}"
            ok "已补充: .claude/skills/${skill}/${subdir}/"
          fi
        fi
      done
      continue
    fi
    
    mkdir -p "$skill_dir"
    
    if [[ "$DRY_RUN" == "true" ]]; then
      log "[dry-run] 将创建: .claude/skills/${skill}/SKILL.md"
    else
      if [[ -f "${SCRIPT_DIR}/../.claude/skills/${skill}/SKILL.md" ]]; then
        cp "${SCRIPT_DIR}/../.claude/skills/${skill}/SKILL.md" "$skill_file"
      else
        download_file ".claude/skills/${skill}/SKILL.md" "$skill_file"
      fi
      
      for subdir in references scripts; do
        if [[ -d "${SCRIPT_DIR}/../.claude/skills/${skill}/${subdir}" ]]; then
          cp -r "${SCRIPT_DIR}/../.claude/skills/${skill}/${subdir}" "${skill_dir}/${subdir}"
        fi
      done
      
      ok "已安装 skill: ${skill}"
    fi
  done
}

# ============================================================================
# docs/ 结构（仅创建缺失）
# ============================================================================
install_docs_structure() {
  local dest="${TARGET_DIR}/docs"
  
  local dirs=(
    "design-docs"
    "exec-plans/active"
    "exec-plans/completed"
    "generated"
    "product-specs"
    "references"
  )
  
  for dir in "${dirs[@]}"; do
    if [[ -d "${dest}/${dir}" ]]; then
      skip "已存在: docs/${dir}/"
    elif [[ "$DRY_RUN" == "true" ]]; then
      log "[dry-run] 将创建: docs/${dir}/"
    else
      mkdir -p "${dest}/${dir}"
      ok "已创建: docs/${dir}/"
    fi
  done
  
  local docs=(
    "ARCHITECTURE.md"
    "DESIGN.md"
    "FRONTEND.md"
    "PLANS.md"
    "PRODUCT_SENSE.md"
    "QUALITY_SCORE.md"
    "RELIABILITY.md"
    "SECURITY.md"
    "exec-plans/tech-debt-tracker.md"
    "design-docs/index.md"
    "product-specs/index.md"
  )
  
  for doc in "${docs[@]}"; do
    local file="${dest}/${doc}"
    if [[ -f "$file" ]]; then
      skip "已存在: docs/${doc}"
    elif [[ "$DRY_RUN" == "true" ]]; then
      log "[dry-run] 将创建: docs/${doc}"
    else
      mkdir -p "$(dirname "$file")"
      echo "# ${doc%.md}" > "$file"
      echo "" >> "$file"
      echo "<!-- TODO: 填充内容 -->" >> "$file"
      ok "已创建骨架: docs/${doc}"
    fi
  done
}

# ============================================================================
# 多工具适配：同步 skill 定义到 .opencode/skills/ 和 .agents/skills/
# ============================================================================
sync_codex_docs() {
  local skills=(harness-orchestrator harness-init context-setup architecture-guard entropy-gc observability-setup sandbox-exec quality-gate agent-readability harness-evolve hooks-framework)
  
  # 同步到 .opencode/skills/（OpenCode 原生，最高优先级）
  local opencode_dest="${TARGET_DIR}/.opencode/skills"
  mkdir -p "$opencode_dest"
  for skill in "${skills[@]}"; do
    local src="${TARGET_DIR}/.claude/skills/${skill}/SKILL.md"
    local dst="${opencode_dest}/${skill}/SKILL.md"
    if [[ -f "$src" ]]; then
      mkdir -p "${opencode_dest}/${skill}"
      if [[ "$DRY_RUN" == "true" ]]; then
        log "[dry-run] OpenCode 同步: .opencode/skills/${skill}/SKILL.md"
      elif [[ ! -f "$dst" ]] || [[ "$src" -nt "$dst" ]]; then
        cp "$src" "$dst"
        for subdir in references scripts; do
          if [[ -d "${TARGET_DIR}/.claude/skills/${skill}/${subdir}" ]]; then
            cp -r "${TARGET_DIR}/.claude/skills/${skill}/${subdir}" "${opencode_dest}/${skill}/${subdir}"
          fi
        done
        ok "OpenCode 同步: .opencode/skills/${skill}/"
      fi
    fi
  done
  
  # 同步到 .agents/skills/（Codex 原生）
  local codex_dest="${TARGET_DIR}/.agents/skills"
  mkdir -p "$codex_dest"
  for skill in "${skills[@]}"; do
    local src="${TARGET_DIR}/.claude/skills/${skill}/SKILL.md"
    local dst="${codex_dest}/${skill}/SKILL.md"
    if [[ -f "$src" ]]; then
      mkdir -p "${codex_dest}/${skill}"
      if [[ "$DRY_RUN" == "true" ]]; then
        log "[dry-run] Codex 同步: .agents/skills/${skill}/SKILL.md"
      elif [[ ! -f "$dst" ]] || [[ "$src" -nt "$dst" ]]; then
        cp "$src" "$dst"
        for subdir in references scripts; do
          if [[ -d "${TARGET_DIR}/.claude/skills/${skill}/${subdir}" ]]; then
            cp -r "${TARGET_DIR}/.claude/skills/${skill}/${subdir}" "${codex_dest}/${skill}/${subdir}"
          fi
        done
        ok "Codex 同步: .agents/skills/${skill}/"
      fi
    fi
  done
}

# ============================================================================
# 远程下载
# ============================================================================
download_file() {
  local remote_path="$1"
  local local_path="$2"
  local url="${REPO_URL}/raw/main/${remote_path}"
  
  if command -v curl &>/dev/null; then
    curl -fsSL "$url" -o "$local_path" 2>/dev/null || true
  elif command -v wget &>/dev/null; then
    wget -q "$url" -O "$local_path" 2>/dev/null || true
  fi
}

# ============================================================================
# 主流程
# ============================================================================
main() {
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║       harness-pilot — Harness Installer         ║"
  echo "║       v${VERSION}                                    ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
  
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  
  detect_target
  detect_ai_tools
  detect_tech_stack
  count_existing
  
  echo ""
  log "安装计划:"
  if [[ $EXISTING_AGENTS -gt 0 ]] || [[ $EXISTING_SKILLS -gt 0 ]]; then
    echo "  ┌─ Agents: ${EXISTING_AGENTS} 已存在, ${NEW_AGENTS} 将新增"
    echo "  ├─ Skills: ${EXISTING_SKILLS} 已存在, ${NEW_SKILLS} 将新增"
  else
    echo "  ┌─ Agents (7) — 全新安装"
    echo "  ├─ Skills (11) — 全新安装"
  fi
  
  if [[ -f "${TARGET_DIR}/AGENTS.md" ]]; then
    echo "  ├─ AGENTS.md — 增量注入 harness 区域"
  else
    echo "  ├─ AGENTS.md — 新建"
  fi
  
  if [[ -f "${TARGET_DIR}/CLAUDE.md" ]]; then
    echo "  ├─ CLAUDE.md — 增量注入 harness 区域"
  else
    echo "  ├─ CLAUDE.md — 新建"
  fi
  
  echo "  └─ docs/ + .opencode/skills/ + .agents/skills/ — 三轨同步"
  echo ""
  
  if [[ "$DRY_RUN" == "true" ]]; then
    warn "DRY RUN 模式 — 仅预览，不实际写入"
    echo ""
  fi
  
  # 确认安装
  if [[ "$SKIP_CONFIRM" != "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
    read -rp "确认安装到 ${TARGET_DIR}? (Y/n) " answer
    if [[ "$answer" == "n" || "$answer" == "N" ]]; then
      log "安装已取消"
      exit 0
    fi
  fi
  
  echo ""
  log "开始安装..."
  echo ""
  
  install_agents
  install_skills
  install_claude_md
  install_agents_md
  install_docs_structure
  sync_codex_docs
  
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║               安装完成!                          ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
  echo "  已安装到: ${TARGET_DIR}"
  
  if [[ $SKIPPED_FILES -gt 0 ]]; then
    echo "  跳过已有文件: ${SKIPPED_FILES} 个"
  fi
  
  echo ""
  echo "  快速开始:"
  echo "    1. 编辑 AGENTS.md 填写项目信息"
  echo "    2. 编辑 docs/ 下的骨架文档"
  echo "    3. 对 AI 工具说: \"初始化 harness\""
  echo ""
  echo "  支持的命令:"
  echo "    \"初始化 harness\"      — 全量初始化"
  echo "    \"架构检查\"            — 运行 architecture-guard"
  echo "    \"质量审查\"            — 运行 quality-gate"
  echo "    \"垃圾收集\"            — 运行 entropy-gc"
  echo "    \"改进 harness\"        — 运行 harness-evolve"
  echo ""
}

main "$@"
