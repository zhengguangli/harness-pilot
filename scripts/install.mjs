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
import { createHash } from 'crypto'

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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(msg) { console.log(`${colors.blue}[pilot]${colors.reset} ${msg}`) }
function ok(msg) { console.log(`${colors.green}[ok]${colors.reset} ${msg}`) }
function warn(msg) { console.log(`${colors.yellow}[warn]${colors.reset} ${msg}`) }
function err(msg) { console.error(`${colors.red}[error]${colors.reset} ${msg}`) }
function skip(msg) { console.log(`${colors.cyan}[skip]${colors.reset} ${msg}`) }
function update(msg) { console.log(`${colors.magenta}[update]${colors.reset} ${msg}`) }

// ============================================================================
// 参数解析
// ============================================================================
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    targetDir: '.',
    tool: 'claude',
    dryRun: false,
    skipConfirm: false,
    force: false
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
      case '--force':
      case '-f':
        config.force = true
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
  --force, -f    强制更新已存在的文件（sha256 对比）
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
  log(`Target: ${resolved}`)
  return resolved
}

function detectAiTools(targetDir) {
  const tools = []

  if (existsSync(join(targetDir, '.claude'))) {
    tools.push('claude-code')
  }

  if (existsSync(join(targetDir, '.agents'))) {
    tools.push('codex')
  }

  if (existsSync(join(targetDir, '.opencode'))) {
    tools.push('opencode')
  }

  if (existsSync(join(targetDir, 'AGENTS.md'))) {
    if (!tools.includes('codex')) tools.push('codex')
  }

  // 检查 opencode 命令
  try {
    execSync('opencode --version', { stdio: 'pipe' })
    if (!tools.includes('opencode')) tools.push('opencode')
  } catch {}

  if (tools.length === 0) {
    tools.push('claude-code')
    warn('No AI tool detected, defaulting to Claude Code format')
  }

  log(`Detected tools: ${tools.join(', ')}`)
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

  log(`Stack: ${stack}`)
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

  const agentsDir = join(targetDir, 'agents')
  if (existsSync(agentsDir)) {
    stats.existingAgents = readdirSync(agentsDir).filter(f => f.endsWith('.md')).length
  }

  const skillsDir = join(targetDir, 'skills')
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
function installAgentsMd(targetDir, tool, dryRun) {
  const file = join(targetDir, 'AGENTS.md')
  const templateFile = join(SCRIPT_DIR, '..', 'templates', 'AGENTS.md')

  if (!existsSync(templateFile)) {
    err(`Template not found: ${templateFile}`)
    return 0
  }

  const templateContent = readFileSync(templateFile, 'utf-8')
  const harnessSection = replacePlaceholders(templateContent, tool)

  return injectSection(file, 'AGENTS.md', harnessSection, dryRun)
}

// ============================================================================
// 增量注入 CLAUDE.md
// ============================================================================
function installClaudeMd(targetDir, dryRun) {
  const file = join(targetDir, 'CLAUDE.md')
  const templateFile = join(SCRIPT_DIR, '..', 'templates', 'CLAUDE.md')

  if (!existsSync(templateFile)) {
    err(`Template not found: ${templateFile}`)
    return 0
  }

  const templateContent = readFileSync(templateFile, 'utf-8')
  const harnessSection = replacePlaceholders(templateContent, 'claude')

  return injectSection(file, 'CLAUDE.md', harnessSection, dryRun)
}

// ============================================================================
// 占位符替换配置
// ============================================================================
const PLACEHOLDER_MAP = {
  claude: { '{{SKILLS_DIR}}': '.claude/skills', '{{AGENTS_DIR}}': '.claude/agents' },
  codex: { '{{SKILLS_DIR}}': '.agents/skills', '{{AGENTS_DIR}}': '.agents/agents' },
  opencode: { '{{SKILLS_DIR}}': '.opencode/skills', '{{AGENTS_DIR}}': '.opencode/agents' },
  all: { '{{SKILLS_DIR}}': '.claude/skills', '{{AGENTS_DIR}}': '.claude/agents' }
}

function replacePlaceholders(content, tool) {
  const map = PLACEHOLDER_MAP[tool]
  if (!map) return content
  let result = content
  for (const [placeholder, value] of Object.entries(map)) {
    result = result.replaceAll(placeholder, value)
  }
  return result
}

// ============================================================================
// Agent 安装（--force 时对比更新）
// ============================================================================
function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function copyOrUpdate(srcFile, destFile, label, force, dryRun, tool) {
  if (!existsSync(destFile)) {
    if (dryRun) { log(`[dry-run] 将创建: ${label}`); return 'install' }
    if (tool) {
      const content = readFileSync(srcFile, 'utf-8')
      writeFileSync(destFile, replacePlaceholders(content, tool))
    } else {
      copyFileSync(srcFile, destFile)
    }
    ok(`已安装: ${label}`)
    return 'install'
  }

  if (!force) {
    skip(`已存在: ${label} (use --force to update)`)
    return 'skip'
  }

  // --force: compare and update if different
  const srcContent = tool
    ? replacePlaceholders(readFileSync(srcFile, 'utf-8'), tool)
    : readFileSync(srcFile, 'utf-8')
  const destContent = readFileSync(destFile, 'utf-8')

  if (sha256(srcContent) === sha256(destContent)) {
    skip(`已存在（内容相同）: ${label}`)
    return 'skip'
  }

  if (dryRun) { log(`[dry-run] 将更新: ${label}`); return 'update' }
  writeFileSync(destFile, srcContent)
  update(`已更新: ${label}`)
  return 'update'
}

function installAgents(targetDir, tool, force, dryRun) {
  const agentDirs = []
  switch (tool) {
    case 'claude': agentDirs.push('.claude/agents'); break
    case 'codex': agentDirs.push('.agents/agents'); break
    case 'opencode': agentDirs.push('.opencode/agents'); break
    case 'all': agentDirs.push('.claude/agents', '.agents/agents', '.opencode/agents'); break
    default:
      err(`未知工具: ${tool} (可选: claude, codex, opencode, all)`)
      process.exit(1)
  }

  const agents = [
    'orchestrator', 'architect', 'builder', 'reviewer', 'qa', 'sre', 'context-engineer'
  ]

  let installed = 0, updated = 0
  for (const destDir of agentDirs) {
    const dest = join(targetDir, destDir)
    mkdirSync(dest, { recursive: true })

    for (const agent of agents) {
      const file = join(dest, `${agent}.md`)
      const srcFile = join(SCRIPT_DIR, '..', 'agents', `${agent}.md`)
      const label = `${destDir}/${agent}.md`

      if (!existsSync(srcFile)) {
        warn(`无法下载: ${label}`)
        continue
      }

      const result = copyOrUpdate(srcFile, file, label, force, dryRun, tool)
      if (result === 'install') installed++
      else if (result === 'update') updated++
    }
  }

  return { installed, updated }
}

// ============================================================================
// 按工具类型安装 skills
// ============================================================================
function installSkills(targetDir, tool, force, dryRun) {
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
  let installed = 0, updated = 0

  for (const destDir of skillDirs) {
    const dest = join(targetDir, destDir)
    mkdirSync(dest, { recursive: true })

    for (const skill of skills) {
      const skillDir = join(dest, skill)
      const skillFile = join(skillDir, 'SKILL.md')
      const srcFile = join(SCRIPT_DIR, '..', 'skills', skill, 'SKILL.md')
      const label = `${destDir}/${skill}/SKILL.md`

      if (!existsSync(srcFile)) {
        warn(`无法下载: ${label}`)
        continue
      }

      mkdirSync(skillDir, { recursive: true })
      const result = copyOrUpdate(srcFile, skillFile, label, force, dryRun, tool)
      if (result === 'install') installed++
      else if (result === 'update') updated++

      // Copy subdirectories (scripts/references), always do it
      if (!dryRun) {
        for (const subdir of ['references', 'scripts']) {
          const src = join(SCRIPT_DIR, '..', 'skills', skill, subdir)
          const dst = join(skillDir, subdir)
          if (existsSync(src) && (!existsSync(dst) || force)) {
            mkdirSync(skillDir, { recursive: true })
            copyDirSync(src, dst)
            ok(`已补充: ${destDir}/${skill}/${subdir}/`)
          }
        }
      }
    }
  }

  return { installed, updated }
}

// ============================================================================
// 安装共享 lib（scripts/lib/workspace.mjs）
// ============================================================================
function installSharedLib(targetDir, dryRun) {
  const srcFile = join(SCRIPT_DIR, 'lib', 'workspace.mjs')
  const destDir = join(targetDir, 'scripts', 'lib')
  const destFile = join(destDir, 'workspace.mjs')

  if (!existsSync(srcFile)) return

  if (existsSync(destFile)) {
    const srcContent = readFileSync(srcFile, 'utf-8')
    const destContent = readFileSync(destFile, 'utf-8')
    if (sha256(srcContent) === sha256(destContent)) return
  }

  if (dryRun) { log(`[dry-run] 将更新: scripts/lib/workspace.mjs`); return }
  mkdirSync(destDir, { recursive: true })
  copyFileSync(srcFile, destFile)
  ok(`已更新: scripts/lib/workspace.mjs`)
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
function installCiTemplates(targetDir, tool, dryRun) {
  const dest = join(targetDir, '.github', 'workflows')

  // 根据工具类型确定 skills 目录路径
  const skillsDirMap = {
    claude: '.claude/skills',
    codex: '.agents/skills',
    opencode: '.opencode/skills'
  }
  const skillsDir = skillsDirMap[tool] || '.claude/skills'

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
          if [ -f ${skillsDir}/hooks-framework/scripts/context-check.mjs ]; then
            node ${skillsDir}/hooks-framework/scripts/context-check.mjs
          fi

      - name: Post-execution hooks
        run: |
          if [ -f ${skillsDir}/hooks-framework/scripts/lint-check.mjs ]; then
            node ${skillsDir}/hooks-framework/scripts/lint-check.mjs
          fi

      - name: Upload trace logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: harness-trace
          path: .harness-polit/
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
          if [ -f ${skillsDir}/hooks-framework/scripts/context-check.mjs ]; then
            node ${skillsDir}/hooks-framework/scripts/context-check.mjs || true
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
          if [ -f ${skillsDir}/hooks-framework/scripts/quality-metric.mjs ]; then
            node ${skillsDir}/hooks-framework/scripts/quality-metric.mjs || true
          fi
          if [ -f .harness-polit/metrics/quality_$(date +%Y%m%d).json ]; then
            echo "### 质量指标" >> /tmp/doc-report.md
            echo '~~~json' >> /tmp/doc-report.md
            cat .harness-polit/metrics/quality_$(date +%Y%m%d).json >> /tmp/doc-report.md
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
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/context-check.mjs'] },
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/env-verify.mjs'] }
            ]
          }
        ],
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/lint-check.mjs'] }
            ]
          },
          {
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/tool-offload.mjs'] }
            ]
          }
        ],
        PreCompact: [
          {
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/compaction.mjs'] }
            ]
          }
        ],
        Stop: [
          {
            hooks: [
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/continuation.mjs'] },
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/trace-log.mjs'] },
              { type: 'command', command: 'node', args: ['$(git rev-parse --show-toplevel)/.agents/skills/hooks-framework/scripts/quality-metric.mjs'] }
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
  const scripts = \`\${directory}/.opencode/skills/hooks-framework/scripts\`

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
  log('Plan:')
  console.log(`  ┌─ Tool: ${config.tool}`)

  switch (config.tool) {
    case 'claude':
      console.log('  ├─ Skills → .claude/skills/')
      console.log('  ├─ Agents → .claude/agents/')
      break
    case 'codex':
      console.log('  ├─ Skills → .agents/skills/')
      console.log('  ├─ Agents → .agents/agents/')
      break
    case 'opencode':
      console.log('  ├─ Skills → .opencode/skills/')
      console.log('  ├─ Agents → .opencode/agents/')
      break
    case 'all':
      console.log('  ├─ Skills → .claude/skills/ + .agents/skills/ + .opencode/skills/')
      console.log('  ├─ Agents → .claude/agents/ + .agents/agents/ + .opencode/agents/')
      break
  }

  if (existsSync(join(targetDir, 'AGENTS.md'))) {
    console.log('  ├─ AGENTS.md — inject harness section')
  } else {
    console.log('  ├─ AGENTS.md — create new')
  }

  // CLAUDE.md 只在 Claude Code 时显示
  if (config.tool === 'claude' || config.tool === 'all') {
    if (existsSync(join(targetDir, 'CLAUDE.md'))) {
      console.log('  ├─ CLAUDE.md — inject harness section')
    } else {
      console.log('  ├─ CLAUDE.md — create new')
    }
  }

  console.log('  ├─ docs/ — fill gaps only')
  console.log('  └─ CI → .github/workflows/ (hooks + doc-gardening)')
  console.log('')

  if (config.dryRun) {
    warn('DRY RUN 模式 — 仅预览，不实际写入')
    console.log('')
  }

  // 确认安装
  if (!config.skipConfirm && !config.dryRun) {
    const ok = await confirm(`Proceed with install to ${targetDir}?`)
    if (!ok) {
      log('安装已取消')
      process.exit(0)
    }
  }

  console.log('')
  log('Starting install...')
  console.log('')

  const agentResult = installAgents(targetDir, config.tool, config.force, config.dryRun)
  const skillResult = installSkills(targetDir, config.tool, config.force, config.dryRun)
  installSharedLib(targetDir, config.dryRun)

  // CLAUDE.md 只在 Claude Code 时安装
  if (config.tool === 'claude' || config.tool === 'all') {
    installClaudeMd(targetDir, config.dryRun)
  }

  installAgentsMd(targetDir, config.tool, config.dryRun)
  installDocsStructure(targetDir, config.dryRun)
  installCiTemplates(targetDir, config.tool, config.dryRun)
  installHooksConfig(targetDir, config.tool, config.dryRun)

  console.log('')
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║           Install Complete!                      ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  Installed to: ${targetDir}`)

  if (stats.skippedFiles > 0) {
    console.log(`  跳过已有文件: ${stats.skippedFiles} 个`)
  }

  console.log('')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  You are here: Step 1/2 complete ✓')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('  Here is what happened:')

  const agentPaths = { claude: '.claude/agents/', codex: '.agents/agents/', opencode: '.opencode/agents/' }
  const skillPaths = { claude: '.claude/skills/', codex: '.agents/skills/', opencode: '.opencode/skills/' }
  const tools = config.tool === 'all' ? ['claude', 'codex', 'opencode'] : [config.tool]
  const agentPathStr = tools.map(t => agentPaths[t]).join(' + ')
  const skillPathStr = tools.map(t => skillPaths[t]).join(' + ')

  console.log(`    ✓ 7 agents → ${agentPathStr}`)
  console.log(`    ✓ 14 skills → ${skillPathStr}`)
  if (agentResult.installed > 0 || skillResult.installed > 0) {
    console.log(`    (${agentResult.installed} agent + ${skillResult.installed} skill newly installed)`)
  }
  if (agentResult.updated > 0 || skillResult.updated > 0) {
    console.log(`    (${agentResult.updated} agent + ${skillResult.updated} skill updated)`)
  }
  console.log('    ✓ AGENTS.md — harness pointer injected')
  if (config.tool === 'claude' || config.tool === 'all') {
    console.log('    ✓ CLAUDE.md — harness pointer injected')
  }
  console.log('    ✓ docs/ — skeleton directory created')

  console.log('')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Next: Step 2/2 — Let AI scan your project')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('  Open your AI tool (Claude Code / Codex / OpenCode)')
  console.log('  and send this message:')
  console.log('')
  console.log('    → "init harness / 初始化 harness"')
  console.log('')
  console.log('  AI will:')
  console.log('    1. Scan your project (stack, structure, existing docs)')
  console.log('    2. Design layered architecture rules and taste invariants')
  console.log('    3. Generate real AGENTS.md and docs/ content')
  console.log('    4. Quality review + verify')
  console.log('    5. Register CLAUDE.md, deliver complete setup')
  console.log('')
  console.log('  Once done, drive your agent team with:')
  console.log('')
  console.log('    "run harness"        — Orchestrate agents')
  console.log('    "quality gate"       — Code review gate')
  console.log('    "architecture guard" — Boundary enforcement')
  console.log('    "garbage collect"    — Clean up / tech debt')
  console.log('')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Quick Reference — All 14 Skills')
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('  Init:         init harness / 初始化 harness')
  console.log('  Orchestrate:  run harness / 运行 harness')
  console.log('  Knowledge:    context setup / 设置知识库')
  console.log('  Architecture: architecture guard / 架构检查')
  console.log('  Quality:      quality gate / 质量审查')
  console.log('  Cleanup:      entropy gc / 垃圾收集')
  console.log('  Readability:  agent readability / 优化可读性')
  console.log('  Observability: observability / 配置可观测性')
  console.log('  Sandbox:      sandbox / 沙箱')
  console.log('  Hooks:        config hooks / 配置 hooks')
  console.log('  Web Search:   web search / 搜索')
  console.log('  MCP:          mcp connect / MCP 集成')
  console.log('  Tools:        tool search / 查找工具')
  console.log('  Evolve:       evolve harness / 改进 harness')
  console.log('')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
