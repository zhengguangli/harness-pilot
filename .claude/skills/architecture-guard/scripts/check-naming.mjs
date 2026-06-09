import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, extname, basename, relative } from 'path'

// 命名约定规则
const RULES = {
  // 文件命名
  file: {
    // 组件文件：PascalCase
    component: { pattern: /^[A-Z][a-zA-Z]*\.(tsx|jsx|vue|svelte)$/, desc: '组件文件应使用 PascalCase' },
    // 工具/脚本：camelCase 或 kebab-case
    utility: { pattern: /^([a-z][a-zA-Z]*|[a-z][a-z0-9-]*)\.(ts|js|mjs)$/, desc: '工具文件应使用 camelCase 或 kebab-case' },
    // 常量/配置：kebab-case 或 snake_case
    config: { pattern: /^[a-z][a-z0-9-]*\.(ts|js|mjs|json|yaml|yml|toml)$/, desc: '配置文件应使用 kebab-case' },
    // 测试文件：与源文件同名 + .test/.spec
    test: { pattern: /^[a-zA-Z]+\.(test|spec)\.(ts|js|tsx|jsx|mjs)$/, desc: '测试文件应使用 .test/.spec 后缀' },
  },
  // 变量命名（代码内）
  variable: {
    // 常量：UPPER_SNAKE_CASE
    constant: { pattern: /^[A-Z][A-Z0-9_]*$/, desc: '常量应使用 UPPER_SNAKE_CASE' },
    // 变量/函数：camelCase
    identifier: { pattern: /^[a-z][a-zA-Z0-9]*$/, desc: '变量/函数应使用 camelCase' },
    // 类/接口/类型：PascalCase
    type: { pattern: /^[A-Z][a-zA-Z0-9]*$/, desc: '类型应使用 PascalCase' },
    // 私有成员：_camelCase 或 #camelCase
    private: { pattern: /^[_#][a-z][a-zA-Z0-9]*$/, desc: '私有成员应使用 _camelCase 或 #camelCase' },
  },
}

// 检测文件类型
function classifyFile(filePath) {
  const name = basename(filePath)
  const ext = extname(filePath)

  if (/\.(tsx|jsx|vue|svelte)$/.test(ext)) return 'component'
  if (/\.(test|spec)\./.test(name)) return 'test'
  if (/\.(json|yaml|yml|toml|env|config)/.test(name) || name.includes('config')) return 'config'
  if (/\.(ts|js|mjs)$/.test(ext)) return 'utility'
  return null
}

function findFiles(dir, exts, maxDepth = 5) {
  const results = []
  const skip = new Set(['node_modules', '.git', 'target', 'dist', 'build', '.next', '.workspace'])
  function walk(d, depth) {
    if (depth > maxDepth) return
    let entries
    try { entries = readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (skip.has(e.name)) continue
      const full = join(d, e.name)
      if (e.isDirectory()) walk(full, depth + 1)
      else if (exts.has(extname(e.name))) results.push(full)
    }
  }
  walk(dir, 0)
  return results
}

function checkCodeNaming(content, filePath) {
  const violations = []
  const ext = extname(filePath)

  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) return violations

  // 检测常量声明
  const constRegex = /(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=:]/g
  let m
  while ((m = constRegex.exec(content)) !== null) {
    const name = m[1]
    // 全大写应为 UPPER_SNAKE_CASE
    if (name === name.toUpperCase() && name.length > 1 && !/^[A-Z][A-Z0-9_]*$/.test(name)) {
      violations.push(`常量命名: "${name}" 应使用 UPPER_SNAKE_CASE`)
    }
  }

  // 检测 class 声明
  const classRegex = /class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g
  while ((m = classRegex.exec(content)) !== null) {
    const name = m[1]
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      violations.push(`类命名: "${name}" 应使用 PascalCase`)
    }
  }

  // 检测 interface/type 声明
  const typeRegex = /(?:interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g
  while ((m = typeRegex.exec(content)) !== null) {
    const name = m[1]
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      violations.push(`类型命名: "${name}" 应使用 PascalCase`)
    }
  }

  return violations
}

export function checkNaming(projectDir) {
  const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.vue', '.svelte'])
  const files = findFiles(projectDir, exts)
  const violations = []

  for (const file of files) {
    const relPath = relative(projectDir, file)
    const fileName = basename(file)
    const fileType = classifyFile(file)

    // 文件名检查
    if (fileType && RULES.file[fileType]) {
      const rule = RULES.file[fileType]
      if (!rule.pattern.test(fileName)) {
        violations.push(`文件命名: ${relPath} — ${rule.desc}`)
      }
    }

    // 代码内命名检查
    try {
      const content = readFileSync(file, 'utf-8')
      const codeViolations = checkCodeNaming(content, file)
      for (const v of codeViolations) {
        violations.push(`${relPath}: ${v}`)
      }
    } catch {}
  }

  if (violations.length > 0) {
    console.error(`[check-naming] ${violations.length} 个命名违规:`)
    for (const v of violations.slice(0, 10)) console.error(`  - ${v}`)
    if (violations.length > 10) console.error(`  ... 还有 ${violations.length - 10} 个`)
  }

  return { exitCode: 0, violations: violations.length, details: violations }
}

if (process.argv[1]?.endsWith('check-naming.mjs')) {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.env.PROJECT_DIR || process.cwd()
  const r = checkNaming(dir)
  if (r.violations === 0) console.log('[check-naming] 命名规范正确')
  process.exit(0)
}
