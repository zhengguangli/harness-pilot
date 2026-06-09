import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, extname } from 'path'

function detectStack(projectDir) {
  if (existsSync(join(projectDir, 'package.json'))) return 'node'
  if (existsSync(join(projectDir, 'Cargo.toml'))) return 'rust'
  if (existsSync(join(projectDir, 'go.mod'))) return 'go'
  if (existsSync(join(projectDir, 'pyproject.toml'))) return 'python'
  return 'unknown'
}

function findSourceFiles(projectDir, exts, maxDepth = 5) {
  const results = []
  const skip = new Set(['node_modules', '.git', 'target', 'dist', 'build', '.next'])

  function walk(dir, depth) {
    if (depth > maxDepth) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (skip.has(e.name)) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) walk(full, depth + 1)
      else if (exts.has(extname(e.name))) results.push(full)
    }
  }
  walk(projectDir, 0)
  return results
}

export function lintCheck(projectDir) {
  const errors = []
  const warnings = []

  if (!existsSync(join(projectDir, 'docs', 'ARCHITECTURE.md'))) {
    console.error('[lint-check] docs/ARCHITECTURE.md 不存在 — 建议运行"架构检查"')
  }

  const exts = new Set(['.ts', '.js', '.py', '.go', '.rs', '.tsx', '.jsx'])
  const files = findSourceFiles(projectDir, exts)

  let largeFiles = 0
  for (const f of files) {
    try {
      const content = readFileSync(f, 'utf-8')
      const lines = content.split('\n').length
      if (lines > 500) {
        warnings.push(`文件过大: ${f.replace(projectDir + '/', '')} (${lines} 行)`)
        largeFiles++
      }
    } catch {}
  }

  if (largeFiles > 5) errors.push(`${largeFiles} 个大文件（>500 行）— 考虑拆分`)

  if (errors.length > 0) return { exitCode: 1, message: `[lint-check] ${errors.length} 个问题\n${errors.join('\n')}` }
  return { exitCode: 0, message: '[lint-check] 架构检查通过' }
}

if (process.argv[1]?.endsWith('lint-check.mjs')) {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.env.PROJECT_DIR || process.cwd()
  const r = lintCheck(dir)
  if (r.message) console.log(r.message)
  process.exit(r.exitCode)
}
