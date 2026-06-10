#!/usr/bin/env node

/**
 * harness-pilot — Harness Engineering 技能包安装器
 * 
 * 用法:
 *   node install.mjs
 *   node install.mjs --dir /path/to/project
 *   node install.mjs --dry-run
 *   node install.mjs --tool codex
 * 
 * 支持: Claude Code / Codex / OpenCode (跨平台)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

// ============================================================================
// 配置
// ============================================================================
const REPO_URL = 'https://github.com/zhengguangli/harness-pilot'
const VERSION = '1.2.0'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const SCRIPT_DIR = __dirname

// Marker 标记 harness 注入区域
const MARKER_START = '<!-- HARNESS-PILOT:START -->'
const MARKER_END = '<!-- HARNESS-PILOT:END -->'

// 颜色（跨平台支持）
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(msg) { console.log(`${colors.blue}[pilot]${colors.reset} ${msg}`) }
function ok(msg) { console.log(`${colors.green}[ok]${colors.reset} ${msg}`) }
function warn(msg) { console.log(`${colors.yellow}[warn]${colors.reset} ${msg}`) }
function err(msg) { console.error(`${colors.red}[error]${colors.reset} ${msg}`) }
function skip(msg) { console.log(`${colors.cyan}[skip]${colors.reset} ${msg}`) }

// ============================================================================
// 参数解析
// ============================================================================
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    targetDir: '.',
    tool: 'claude',
    dryRun: false,
    skipConfirm: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dir':
        config.targetDir = args[++i]
        break
      case '--tool':
        config.tool = args[++i]
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--yes':
      case '-y':
        config.skipConfirm = true
        break
      case '--version':
        console.log(`harness-pilot v${VERSION}`)
        process.exit(0)
      case '--help':
      case '-h':
        console.log(`
用法: node install.mjs [--dir <path>] [--tool <name>] [--dry-run] [--yes]

选项:
  --dir <path>   目标项目目录 (默认: 当前目录)
  --tool <name>  目标 AI 工具 (默认: claude)
                   claude   — 安装到 .claude/skills/
                   codex    — 安装到 .agents/skills/
                   opencode — 安装到 .opencode/skills/
                   all      — 安装到全部三个目录
  --dry-run      仅预览，不实际写入
  --yes, -y      跳过确认提示
  --version      显示版本号
  --help, -h     显示帮助
`)
        process.exit(0)
      default:
        err(`未知参数: ${args[i]}`)
        process.exit(1)
    }
  }

  return config
}

// ============================================================================
// 环境检测
// ============================================================================
function detectTarget(targetDir) {
  const resolved = resolve(targetDir)
  if (!existsSync(resolved)) {
    err(`目录不存在: ${targetDir}`)
    process.exit(1)
  }
  log(`目标目录: ${resolved}`)
  return resolved
}

function detectAiTools(targetDir) {
  const tools = []

  if (existsSync(join(targetDir, '.claude'))) {
    tools.push('claude-code')
  }

  if (existsSync(join(targetDir, 'AGENTS.md'))) {
    tools.push('codex')
  }

  // 检查 opencode 命令
  try {
    execSync('opencode --version', { stdio: 'pipe' })
    tools.push('opencode')
  } catch {}

  if (tools.length === 0) {
    tools.push('claude-code')
    warn('未检测到 AI 工具，默认使用 Claude Code 格式')
  }

  log(`检测到工具: ${tools.join(', ')}`)
  return tools
}

function detectTechStack(targetDir) {
  let stack = 'unknown'

  if (existsSync(join(targetDir, 'package.json'))) {
    const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'))
    stack = 'node'
    if (pkg.dependencies?.next || pkg.devDependencies?.next) stack = 'nextjs'
    else if (pkg.dependencies?.react || pkg.devDependencies?.react) stack = 'react'
  } else if (existsSync(join(targetDir, 'Cargo.toml'))) {
    stack = 'rust'
  } else if (existsSync(join(targetDir, 'go.mod'))) {
    stack = 'go'
  } else if (existsSync(join(targetDir, 'pyproject.toml')) || existsSync(join(targetDir, 'requirements.txt'))) {
    stack = 'python'
  }

  log(`技术栈: ${stack}`)
  return stack
}

// ============================================================================
// 状态统计
// ============================================================================
function countExisting(targetDir) {
  const stats = {
    existingAgents: 0,
    existingSkills: 0,
    newAgents: 0,
    newSkills: 0,
    skippedFiles: 0
  }

  const agentsDir = join(targetDir, '.claude', 'agents')
  if (existsSync(agentsDir)) {
    stats.existingAgents = readdirSync(agentsDir).filter(f => f.endsWith('.md')).length
  }

  const skillsDir = join(targetDir, '.claude', 'skills')
  if (existsSync(skillsDir)) {
    stats.existingSkills = readdirSync(skillsDir, { recursive: true })
      .filter(f => typeof f === 'string' && f.endsWith('SKILL.md')).length
  }

  const allAgents = ['orchestrator', 'architect', 'builder', 'reviewer', 'qa', 'sre', 'context-engineer']
  for (const agent of allAgents) {
    if (!existsSync(join(agentsDir, `${agent}.md`))) {
      stats.newAgents++
    }
  }

  const allSkills = [
    'harness-orchestrator', 'harness-init', 'context-setup', 'architecture-guard',
    'entropy-gc', 'observability-setup', 'sandbox-exec', 'quality-gate',
    'agent-readability', 'harness-evolve', 'hooks-framework',
    'web-search', 'mcp-connector', 'tool-search'
  ]
  for (const skill of allSkills) {
    if (!existsSync(join(skillsDir, skill, 'SKILL.md'))) {
      stats.newSkills++
    }
  }

  return stats
}

// ============================================================================
// 通用增量注入函数
// ============================================================================
function injectSection(file, label, content, dryRun) {
  if (dryRun) {
    if (existsSync(file)) {
      const existing = readFileSync(file, 'utf-8')
      if (existing.includes(MARKER_START)) {
        log(`[dry-run] 将更新: ${label}（已存在 harness 区域）`)
      } else {
        log(`[dry-run] 将注入: ${label}（追加 harness 区域）`)
      }
    } else {
      log(`[dry-run] 将创建: ${label}`)
    }
    return 0
  }

  if (existsSync(file)) {
    const existing = readFileSync(file, 'utf-8')
    if (existing.includes(MARKER_START)) {
      // 已有 marker → 替换区域内内容
      const lines = existing.split('\n')
      const result = []
      let inSection = false

      for (const line of lines) {
        if (line.includes(MARKER_START)) {
          inSection = true
          result.push(line)
          result.push('')
          result.push(content)
          result.push('')
          continue
        }
        if (line.includes(MARKER_END)) {
          inSection = false
          result.push(line)
          continue
        }
        if (!inSection) {
          result.push(line)
        }
      }

      writeFileSync(file, result.join('\n'))
      ok(`已更新: ${label}（harness 区域已刷新）`)
      return 1
    } else {
      // 无 marker → 追加到末尾
      const appendContent = `\n${MARKER_START}\n\n${content}\n\n${MARKER_END}\n`
      writeFileSync(file, existing + appendContent)
      ok(`已注入: ${label}（追加 harness 区域到末尾）`)
      return 1
    }
  } else {
    // 文件不存在 → 创建
    mkdirSync(dirname(file), { recursive: true })
    const newContent = `${MARKER_START}\n\n${content}\n\n${MARKER_END}\n`
    writeFileSync(file, newContent)
    ok(`已创建: ${label}`)
    return 1
  }
}

// ============================================================================
// 增量注入 AGENTS.md
// ============================================================================
function installAgentsMd(targetDir, dryRun) {
  const file = join(targetDir, 'AGENTS.md')
  
  const harnessSection = `## 架构地图
- 详见 [CLAUDE.md](CLAUDE.md) — 项目主文档和 harness 指针
- Agent 定义：\`.claude/agents/\` — 7 个专业 agent
- Skill 定义：\`.claude/skills/\` — 11 个标准技能
- 安装脚本：\`scripts/install.mjs\` — 统一安装器

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
| web-search | Web 搜索集成 |
| mcp-connector | MCP 工具连接 |
| tool-search | 动态工具发现 |

## 导航指引
- 新项目初始化？使用 \`harness-init\` 或 \`harness-orchestrator\` skill
- 架构设计？读 \`.claude/agents/architect.md\`
- 质量审查？读 \`.claude/skills/quality-gate/SKILL.md\`
- 知识库管理？读 \`.claude/skills/context-setup/SKILL.md\`
- 演进反馈？读 \`.claude/skills/harness-evolve/SKILL.md\`
- Hooks 配置？读 \`.claude/skills/hooks-framework/SKILL.md\`
- Web 搜索？读 \`.claude/skills/web-search/SKILL.md\`
- MCP 集成？读 \`.claude/skills/mcp-connector/SKILL.md\`
- 安装部署？读 \`README.md\` 或运行 \`node scripts/install.mjs --help\``

  return injectSection(file, 'AGENTS.md', harnessSection, dryRun)
}

// ============================================================================
// 增量注入 CLAUDE.md
// ============================================================================
function installClaudeMd(targetDir, dryRun) {
  const file = join(targetDir, 'CLAUDE.md')
  
  const harnessSection = `## Harness: Harness Engineering

**Goal:** 为任意项目一键配置 AI agent 团队和 harness 体系

**Trigger:** 工作请求涉及 harness 配置、agent 团队搭建、知识库架构时，使用 \`harness-orchestrator\` skill。简单问题直接回答。

### 架构地图

- [AGENTS.md](AGENTS.md) — 项目主文档和 harness 指针
- Agent 定义：\`.claude/agents/\`（7 个）
- Skill 定义：\`.claude/skills/\`（14 个）
- 安装脚本：\`scripts/install.mjs\`

### 核心原则

1. **人类掌舵，智能体执行**
2. **仓库即记录系统**
3. **给地图，不给说明书**
4. **约束即加速器**
5. **渐进式披露**
6. **纠错成本低，等待成本高**
7. **Agent = Model + Harness** — 模型提供智能，Harness 让智能可用`

  return injectSection(file, 'CLAUDE.md', harnessSection, dryRun)
}

// ============================================================================
// Agent 安装（仅补充缺失）
// ============================================================================
function installAgents(targetDir, dryRun) {
  const dest = join(targetDir, '.claude', 'agents')
  mkdirSync(dest, { recursive: true })

  const agents = [
    'orchestrator', 'architect', 'builder', 'reviewer', 'qa', 'sre', 'context-engineer'
  ]

  let installed = 0
  for (const agent of agents) {
    const file = join(dest, `${agent}.md`)

    if (existsSync(file)) {
      skip(`已存在: .claude/agents/${agent}.md`)
      continue
    }

    if (dryRun) {
      log(`[dry-run] 将创建: .claude/agents/${agent}.md`)
    } else {
      const srcFile = join(SCRIPT_DIR, '..', '.claude', 'agents', `${agent}.md`)
      if (existsSync(srcFile)) {
        copyFileSync(srcFile, file)
      } else {
        // 从远程下载
        try {
          const url = `${REPO_URL}/raw/main/.claude/agents/${agent}.md`
          execSync(`curl -fsSL "${url}" -o "${file}"`, { stdio: 'pipe' })
        } catch {
          warn(`无法下载: .claude/agents/${agent}.md`)
          continue
        }
      }
      ok(`已安装 agent: ${agent}`)
      installed++
    }
  }

  return installed
}

// ============================================================================
// 按工具类型安装 skills
// ============================================================================
function installSkills(targetDir, tool, dryRun) {
  const skillDirs = []
  switch (tool) {
    case 'claude': skillDirs.push('.claude/skills'); break
    case 'codex': skillDirs.push('.agents/skills'); break
    case 'opencode': skillDirs.push('.opencode/skills'); break
    case 'all': skillDirs.push('.claude/skills', '.agents/skills', '.opencode/skills'); break
    default:
      err(`未知工具: ${tool} (可选: claude, codex, opencode, all)`)
      process.exit(1)
  }

  const skills = [
    'harness-orchestrator', 'harness-init', 'context-setup', 'architecture-guard',
    'entropy-gc', 'observability-setup', 'sandbox-exec', 'quality-gate',
    'agent-readability', 'harness-evolve', 'hooks-framework',
    'web-search', 'mcp-connector', 'tool-search'
  ]

  let installed = 0
  for (const destDir of skillDirs) {
    const dest = join(targetDir, destDir)
    mkdirSync(dest, { recursive: true })

    for (const skill of skills) {
      const skillDir = join(dest, skill)
      const skillFile = join(skillDir, 'SKILL.md')

      if (existsSync(skillFile)) {
        skip(`已存在: ${destDir}/${skill}/SKILL.md`)
      } else {
        mkdirSync(skillDir, { recursive: true })

        if (dryRun) {
          log(`[dry-run] 将创建: ${destDir}/${skill}/SKILL.md`)
        } else {
          const srcFile = join(SCRIPT_DIR, '..', '.claude', 'skills', skill, 'SKILL.md')
          if (existsSync(srcFile)) {
            copyFileSync(srcFile, skillFile)
          } else {
            // 从远程下载
            try {
              const url = `${REPO_URL}/raw/main/.claude/skills/${skill}/SKILL.md`
              execSync(`curl -fsSL "${url}" -o "${skillFile}"`, { stdio: 'pipe' })
            } catch {
              warn(`无法下载: ${destDir}/${skill}/SKILL.md`)
              continue
            }
          }
          ok(`已安装: ${destDir}/${skill}/SKILL.md`)
          installed++
        }
      }

      // 始终复制子目录（scripts/references），即使 SKILL.md 已存在
      if (!dryRun) {
        for (const subdir of ['references', 'scripts']) {
          const src = join(SCRIPT_DIR, '..', '.claude', 'skills', skill, subdir)
          const dst = join(skillDir, subdir)
          if (existsSync(src) && !existsSync(dst)) {
            mkdirSync(skillDir, { recursive: true })
            copyDirSync(src, dst)
            ok(`已补充: ${destDir}/${skill}/${subdir}/`)
          }
        }
      }
    }
  }

  return installed
}

function copyDirSync(src, dest) {
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// ============================================================================
// docs/ 结构（仅创建缺失）
// ============================================================================
function installDocsStructure(targetDir, dryRun) {
  const dest = join(targetDir, 'docs')

  const dirs = [
    'design-docs', 'exec-plans/active', 'exec-plans/completed',
    'generated', 'product-specs', 'references'
  ]

  for (const dir of dirs) {
    const fullDir = join(dest, dir)
    if (existsSync(fullDir)) {
      skip(`已存在: docs/${dir}/`)
    } else if (dryRun) {
      log(`[dry-run] 将创建: docs/${dir}/`)
    } else {
      mkdirSync(fullDir, { recursive: true })
      ok(`已创建: docs/${dir}/`)
    }
  }

  const docs = [
    'ARCHITECTURE.md', 'DESIGN.md', 'FRONTEND.md', 'PLANS.md',
    'PRODUCT_SENSE.md', 'QUALITY_SCORE.md', 'RELIABILITY.md', 'SECURITY.md',
    'exec-plans/tech-debt-tracker.md', 'design-docs/index.md', 'product-specs/index.md'
  ]

  for (const doc of docs) {
    const file = join(dest, doc)
    if (existsSync(file)) {
      skip(`已存在: docs/${doc}`)
    } else if (dryRun) {
      log(`[dry-run] 将创建: docs/${doc}`)
    } else {
      mkdirSync(dirname(file), { recursive: true })
      const title = doc.replace('.md', '').replace(/\//g, ' / ')
      writeFileSync(file, `# ${title}\n\n<!-- TODO: 填充内容 -->\n`)
      ok(`已创建骨架: docs/${doc}`)
    }
  }
}

// ============================================================================
// CI 模板生成（GitHub Actions）
// ============================================================================
function installCiTemplates(targetDir, dryRun) {
  const dest = join(targetDir, '.github', 'workflows')

  // hooks.yml — push/PR 时运行 harness hooks
  const hooksFile = join(dest, 'harness-hooks.yml')
  if (existsSync(hooksFile)) {
    skip('已存在: .github/workflows/harness-hooks.yml')
  } else if (dryRun) {
    log('[dry-run] 将创建: .github/workflows/harness-hooks.yml')
  } else {
    mkdirSync(dest, { recursive: true })
    writeFileSync(hooksFile, `name: Harness Hooks
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  hooks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Pre-execution hooks
        run: |
          if [ -f .claude/skills/hooks-framework/scripts/context-check.mjs ]; then
            node .claude/skills/hooks-framework/scripts/context-check.mjs
          fi

      - name: Post-execution hooks
        run: |
          if [ -f .claude/skills/hooks-framework/scripts/lint-check.mjs ]; then
            node .claude/skills/hooks-framework/scripts/lint-check.mjs
          fi

      - name: Upload trace logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: harness-trace
          path: .workspace/
          retention-days: 7
`)
    ok('已创建: .github/workflows/harness-hooks.yml')
  }

  // doc-gardening.yml — 每周检查文档新鲜度
  const gardeningFile = join(dest, 'doc-gardening.yml')
  if (existsSync(gardeningFile)) {
    skip('已存在: .github/workflows/doc-gardening.yml')
  } else if (dryRun) {
    log('[dry-run] 将创建: .github/workflows/doc-gardening.yml')
  } else {
    mkdirSync(dest, { recursive: true })
    writeFileSync(gardeningFile, `name: Doc Gardening
on:
  schedule:
    - cron: '0 9 * * 1'  # 每周一 09:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  garden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Check AGENTS.md freshness
        run: |
          if [ -f .claude/skills/hooks-framework/scripts/context-check.mjs ]; then
            node .claude/skills/hooks-framework/scripts/context-check.mjs || true
          fi

      - name: Check for stale docs
        run: |
          echo "## 文档新鲜度报告" > /tmp/doc-report.md
          echo "" >> /tmp/doc-report.md
          stale=0
          for doc in docs/*.md; do
            if [ -f "$doc" ]; then
              age_days=$(node -e "
                const fs = require('fs');
                const stat = fs.statSync('$doc');
                const age = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
                console.log(age);
              ")
              if [ "$age_days" -gt 30 ]; then
                echo "- ⚠️ \`$doc\` — $age_days 天未更新" >> /tmp/doc-report.md
                stale=$((stale + 1))
              fi
            fi
          done
          if [ $stale -eq 0 ]; then
            echo "- ✅ 所有文档新鲜（<30 天）" >> /tmp/doc-report.md
          fi
          cat /tmp/doc-report.md

      - name: Quality metrics
        run: |
          if [ -f .claude/skills/hooks-framework/scripts/quality-metric.mjs ]; then
            node .claude/skills/hooks-framework/scripts/quality-metric.mjs || true
          fi
          if [ -f .workspace/metrics/quality_$(date +%Y%m%d).json ]; then
            echo "### 质量指标" >> /tmp/doc-report.md
            echo '~~~json' >> /tmp/doc-report.md
            cat .workspace/metrics/quality_$(date +%Y%m%d).json >> /tmp/doc-report.md
            echo '~~~' >> /tmp/doc-report.md
          fi
`)
    ok('已创建: .github/workflows/doc-gardening.yml')
  }
}

// ============================================================================
// Hooks 配置生成（三工具统一）
// ============================================================================
function installHooksConfig(targetDir, tool, dryRun) {
  switch (tool) {
    case 'claude': installClaudeHooks(targetDir, dryRun); break
    case 'codex': installCodexHooks(targetDir, dryRun); break
    case 'opencode': installOpencodeHooks(targetDir, dryRun); break
    case 'all':
      installClaudeHooks(targetDir, dryRun)
      installCodexHooks(targetDir, dryRun)
      installOpencodeHooks(targetDir, dryRun)
      break
  }
}

function installClaudeHooks(targetDir, dryRun) {
  const settingsFile = join(targetDir, '.claude', 'settings.json')
  const hooksJson = {
    hooks: {
      SessionStart: [
        {
          hooks: [
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/context-check.mjs'] },
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/env-verify.mjs'] }
          ]
        }
      ],
      PostToolUse: [
        {
          matcher: 'Edit|Write',
          hooks: [
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/lint-check.mjs'] }
          ]
        },
        {
          hooks: [
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/tool-offload.mjs'] }
          ]
        }
      ],
      PreCompact: [
        {
          hooks: [
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/compaction.mjs'] }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/continuation.mjs'] },
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/trace-log.mjs'] },
            { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/skills/hooks-framework/scripts/quality-metric.mjs'] }
          ]
        }
      ]
    }
  }

  if (existsSync(settingsFile)) {
    const existing = JSON.parse(readFileSync(settingsFile, 'utf-8'))
    if (existing.hooks) {
      skip('已存在: .claude/settings.json (含 hooks)')
      return
    }
    if (dryRun) {
      log('[dry-run] 将合并 hooks 到: .claude/settings.json')
    } else {
      existing.hooks = hooksJson.hooks
      writeFileSync(settingsFile, JSON.stringify(existing, null, 2))
      ok('已合并 hooks 到: .claude/settings.json')
    }
  } else {
    if (dryRun) {
      log('[dry-run] 将创建: .claude/settings.json (含 hooks)')
    } else {
      mkdirSync(dirname(settingsFile), { recursive: true })
      writeFileSync(settingsFile, JSON.stringify(hooksJson, null, 2))
      ok('已创建: .claude/settings.json (含 hooks)')
    }
  }
}

function installCodexHooks(targetDir, dryRun) {
  const hooksFile = join(targetDir, '.codex', 'hooks.json')

  if (existsSync(hooksFile)) {
    skip('已存在: .codex/hooks.json')
    return
  }

  if (dryRun) {
    log('[dry-run] 将创建: .codex/hooks.json')
  } else {
    mkdirSync(dirname(hooksFile), { recursive: true })
    const hooksJson = {
      hooks: {
        SessionStart: [
          {
            matcher: 'startup|resume',
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/context-check.mjs'] },
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/env-verify.mjs'] }
            ]
          }
        ],
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/lint-check.mjs'] }
            ]
          },
          {
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/tool-offload.mjs'] }
            ]
          }
        ],
        PreCompact: [
          {
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/compaction.mjs'] }
            ]
          }
        ],
        Stop: [
          {
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/continuation.mjs'] },
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/trace-log.mjs'] },
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.claude/skills/hooks-framework/scripts/quality-metric.mjs'] }
            ]
          }
        ]
      }
    }
    writeFileSync(hooksFile, JSON.stringify(hooksJson, null, 2))
    ok('已创建: .codex/hooks.json')
  }
}

function installOpencodeHooks(targetDir, dryRun) {
  const pluginFile = join(targetDir, '.opencode', 'plugins', 'harness-hooks.ts')

  if (existsSync(pluginFile)) {
    skip('已存在: .opencode/plugins/harness-hooks.ts')
    return
  }

  if (dryRun) {
    log('[dry-run] 将创建: .opencode/plugins/harness-hooks.ts')
  } else {
    mkdirSync(dirname(pluginFile), { recursive: true })
    writeFileSync(pluginFile, `import type { Plugin } from "@opencode-ai/plugin"

export const HarnessHooks: Plugin = async ({ $, directory }) => {
  const scripts = \`\${directory}/.claude/skills/hooks-framework/scripts\`

  return {
    "session.created": async () => {
      try { await $\`node \${scripts}/context-check.mjs\`.quiet() } catch {}
      try { await $\`node \${scripts}/env-verify.mjs\`.quiet() } catch {}
    },

    "file.edited": async () => {
      try { await $\`node \${scripts}/lint-check.mjs\`.quiet() } catch {}
    },

    "tool.executed": async () => {
      try { await $\`node \${scripts}/tool-offload.mjs\`.quiet() } catch {}
    },

    "experimental.session.compacting": async (_input, output) => {
      try {
        const result = await $\`node \${scripts}/compaction.mjs\`.text()
        if (result) output.context.push(result)
      } catch {}
    },

    "session.idle": async () => {
      try { await $\`node \${scripts}/continuation.mjs\`.quiet() } catch {}
      try { await $\`node \${scripts}/trace-log.mjs\`.quiet() } catch {}
      try { await $\`node \${scripts}/quality-metric.mjs\`.quiet() } catch {}
    },
  }
}
`)
    ok('已创建: .opencode/plugins/harness-hooks.ts')
  }
}

// ============================================================================
// 确认提示
// ============================================================================
async function confirm(message) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`${message} (Y/n) `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() !== 'n')
    })
  })
}

// ============================================================================
// 主流程
// ============================================================================
async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║       harness-pilot — Harness Installer         ║')
  console.log(`║       v${VERSION}                                    ║`)
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('')

  const config = parseArgs()
  const targetDir = detectTarget(config.targetDir)
  const detectedTools = detectAiTools(targetDir)
  const techStack = detectTechStack(targetDir)
  const stats = countExisting(targetDir)

  console.log('')
  log('安装计划:')
  console.log(`  ┌─ 目标工具: ${config.tool}`)

  switch (config.tool) {
    case 'claude': console.log('  ├─ Skills → .claude/skills/'); break
    case 'codex': console.log('  ├─ Skills → .agents/skills/'); break
    case 'opencode': console.log('  ├─ Skills → .opencode/skills/'); break
    case 'all': console.log('  ├─ Skills → .claude/skills/ + .agents/skills/ + .opencode/skills/'); break
  }

  if (existsSync(join(targetDir, 'AGENTS.md'))) {
    console.log('  ├─ AGENTS.md — 增量注入 harness 区域')
  } else {
    console.log('  ├─ AGENTS.md — 新建')
  }

  if (existsSync(join(targetDir, 'CLAUDE.md'))) {
    console.log('  ├─ CLAUDE.md — 增量注入 harness 区域')
  } else {
    console.log('  ├─ CLAUDE.md — 新建')
  }

  console.log('  ├─ Agents → .claude/agents/')
  console.log('  ├─ docs/ — 仅补充缺失')
  console.log('  └─ CI → .github/workflows/（hooks + doc-gardening）')
  console.log('')

  if (config.dryRun) {
    warn('DRY RUN 模式 — 仅预览，不实际写入')
    console.log('')
  }

  // 确认安装
  if (!config.skipConfirm && !config.dryRun) {
    const ok = await confirm(`确认安装到 ${targetDir}?`)
    if (!ok) {
      log('安装已取消')
      process.exit(0)
    }
  }

  console.log('')
  log('开始安装...')
  console.log('')

  installAgents(targetDir, config.dryRun)
  installSkills(targetDir, config.tool, config.dryRun)
  installClaudeMd(targetDir, config.dryRun)
  installAgentsMd(targetDir, config.dryRun)
  installDocsStructure(targetDir, config.dryRun)
  installCiTemplates(targetDir, config.dryRun)
  installHooksConfig(targetDir, config.tool, config.dryRun)

  console.log('')
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║               安装完成!                          ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  已安装到: ${targetDir}`)

  if (stats.skippedFiles > 0) {
    console.log(`  跳过已有文件: ${stats.skippedFiles} 个`)
  }

  console.log('')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  你在这里:  Step 1/2 完成 ✓')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('  刚才发生了什么:')
  console.log('    ✓ 7 个 agent 定义 → .claude/agents/')
  console.log('    ✓ 11 个 skill 定义 → .claude/skills/')
  console.log('    ✓ AGENTS.md / CLAUDE.md — 已注入 harness 指针')
  console.log('    ✓ docs/ — 骨架目录已创建')
  console.log('')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  下一步:  Step 2/2 — 让 AI 扫描项目并定制化')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('  打开你的 AI 工具（Claude Code / Codex / OpenCode）')
  console.log('  在项目目录下，发送这一条消息:')
  console.log('')
  console.log('    → "初始化 harness"')
  console.log('')
  console.log('  AI 会自动:')
  console.log('    1. 扫描你的项目（技术栈、目录结构、现有文档）')
  console.log('    2. 设计分层架构规则和品味不变量')
  console.log('    3. 生成有实际内容的 AGENTS.md 和 docs/ 文档')
  console.log('    4. 质量审查 + 验证')
  console.log('    5. 注册 CLAUDE.md 完成交付')
  console.log('')
  console.log('  完成后，你就可以用以下命令驱动 AI 团队:')
  console.log('')
  console.log('    "运行 harness"   — 启动 agent 团队执行任务')
  console.log('    "质量审查"       — 代码审查门禁')
  console.log('    "架构检查"       — 架构边界验证')
  console.log('    "垃圾收集"       — 代码清理 / 技术债务')
  console.log('')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  完整命令参考（按需查阅）')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('  初始化:   "初始化 harness" / "搭建 harness"')
  console.log('  编排:     "运行 harness" / "harness run"')
  console.log('  知识库:   "设置知识库" / "生成 AGENTS.md"')
  console.log('  架构:     "架构检查" / "边界验证" / "品味检查"')
  console.log('  质量:     "质量审查" / "代码审查"')
  console.log('  维护:     "垃圾收集" / "漂移检测" / "技术债务"')
  console.log('  可读性:   "智能体可读性" / "让智能体看懂"')
  console.log('  可观测:   "配置可观测性" / "设置日志"')
  console.log('  钩子:     "配置 hooks" / "中间件"')
  console.log('  沙箱:     "沙箱" / "安全执行"')
  console.log('  演进:     "改进 harness" / "反馈整合"')
  console.log('')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
