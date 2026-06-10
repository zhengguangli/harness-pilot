import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

const projectDir = process.argv[2] || process.cwd()
const root = resolve(projectDir)

let pass = 0
let fail = 0
let warn = 0

function check(name, value, expected) {
  if (value >= expected) {
    console.log(`  ${GREEN}✓${RESET} ${name}: ${value} (预期 ≥ ${expected})`)
    pass++
  } else {
    console.log(`  ${RED}✗${RESET} ${name}: ${value} (预期 ≥ ${expected})`)
    fail++
  }
}

function checkFile(name, filePath) {
  if (existsSync(filePath)) {
    console.log(`  ${GREEN}✓${RESET} ${name}: 存在`)
    pass++
  } else {
    console.log(`  ${RED}✗${RESET} ${name}: 缺失`)
    fail++
  }
}

function countPattern(filePath, pattern) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const regex = new RegExp(pattern, 'g')
    return (content.match(regex) || []).length
  } catch {
    return 0
  }
}

function runCommand(cmd) {
  try {
    // 使用 execSync 并合并 stdout 和 stderr
    const result = execSync(`${cmd} 2>&1`, { cwd: root, encoding: 'utf-8', stdio: 'pipe' })
    return result.trim()
  } catch (err) {
    // 如果命令失败，返回输出
    return (err.stdout || '').trim()
  }
}

console.log('')
console.log('╔══════════════════════════════════════════════════╗')
console.log('║       Harness-Pilot 质量检查                    ║')
console.log(`║       ${new Date().toISOString().slice(0, 19).replace('T', ' ')}                      ║`)
console.log('╚══════════════════════════════════════════════════╝')
console.log('')

// 1. 核心组件验证
console.log('1. 核心组件验证')
const reactCount = countPattern(join(root, '.claude/agents/orchestrator.md'), 'ReAct')
const toolOffload = countPattern(join(root, '.claude/settings.json'), 'tool-offload')
const browser = countPattern(join(root, '.claude/skills/sandbox-exec/SKILL.md'), 'chromium')
const filesystem = countPattern(join(root, '.claude/skills/context-setup/SKILL.md'), '文件系统是最基础')

check('ReAct 循环', reactCount, 3)
check('Tool Offload', toolOffload, 1)
check('浏览器配置', browser, 1)
check('文件系统原语', filesystem, 1)

// 2. Hooks 框架验证
console.log('')
console.log('2. Hooks 框架验证')
const hooks = ['context-check', 'env-verify', 'lint-check', 'tool-offload', 'compaction', 'continuation']
for (const hook of hooks) {
  checkFile(`${hook}.mjs`, join(root, `.claude/skills/hooks-framework/scripts/${hook}.mjs`))
}

// 3. Agent 团队验证
console.log('')
console.log('3. Agent 团队验证')
const agents = ['orchestrator', 'architect', 'builder', 'reviewer', 'qa', 'sre', 'context-engineer']
for (const agent of agents) {
  checkFile(agent, join(root, `.claude/agents/${agent}.md`))
}

// 4. Skill 团队验证
console.log('')
console.log('4. Skill 团队验证')
const skills = [
  'harness-orchestrator', 'harness-init', 'context-setup', 'architecture-guard',
  'entropy-gc', 'observability-setup', 'sandbox-exec', 'quality-gate',
  'agent-readability', 'harness-evolve', 'hooks-framework'
]
for (const skill of skills) {
  checkFile(skill, join(root, `.claude/skills/${skill}/SKILL.md`))
}

// 5. 配置文件验证
console.log('')
console.log('5. 配置文件验证')
const claudeHarness = countPattern(join(root, 'CLAUDE.md'), 'Harness')
const agentsAgent = countPattern(join(root, 'AGENTS.md'), 'Agent')

check('CLAUDE.md Harness 引用', claudeHarness, 1)
check('AGENTS.md Agent 引用', agentsAgent, 1)

try {
  const settings = readFileSync(join(root, '.claude/settings.json'), 'utf-8')
  JSON.parse(settings)
  const hasHooks = settings.includes('"hooks"')
  if (hasHooks) {
    console.log(`  ${GREEN}✓${RESET} .claude/settings.json: 有效 JSON (含 hooks)`)
    pass++
  } else {
    console.log(`  ${YELLOW}!${RESET} .claude/settings.json: 有效 JSON (无 hooks)`)
    warn++
  }
} catch {
  console.log(`  ${RED}✗${RESET} .claude/settings.json: 无效 JSON`)
  fail++
}

// 6. 项目测试验证
console.log('')
console.log('6. 项目测试验证')

let testRunner = null
if (existsSync(join(root, 'bun.lock'))) testRunner = 'bun'
else if (existsSync(join(root, 'package-lock.json'))) testRunner = 'npm'
else if (existsSync(join(root, 'yarn.lock'))) testRunner = 'yarn'
else if (existsSync(join(root, 'pnpm-lock.yaml'))) testRunner = 'pnpm'

if (testRunner) {
  const testCmd = testRunner === 'bun' ? 'bun test' : `${testRunner} test`
  const result = runCommand(testCmd)
  const lines = result.split('\n')
  const lastLines = lines.slice(-5).join('\n')
  
  // 检测测试结果：bun 输出 "360 pass" 和 "0 fail"，npm 输出 "Tests: 360 passed"
  const hasPass = /\d+\s+pass/i.test(result) || /passed/i.test(result)
  const hasFail = /[1-9]\d*\s+fail/i.test(result) || /failed/i.test(result)
  
  if (hasPass && !hasFail) {
    console.log(`  ${GREEN}✓${RESET} 项目测试 (${testRunner}): 全部通过`)
    console.log(`     ${lastLines}`)
    pass++
  } else if (hasFail) {
    console.log(`  ${RED}✗${RESET} 项目测试 (${testRunner}): 存在失败`)
    console.log(`     ${lastLines}`)
    fail++
  } else {
    console.log(`  ${YELLOW}!${RESET} 项目测试 (${testRunner}): 无法确定结果`)
    console.log(`     ${lastLines}`)
    warn++
  }
} else {
  console.log(`  ${YELLOW}!${RESET} 项目测试: 跳过（未找到包管理器锁文件）`)
  warn++
}

// 总结
console.log('')
console.log('╔══════════════════════════════════════════════════╗')
console.log('║               检查结果总结                      ║')
console.log('╚══════════════════════════════════════════════════╝')
console.log('')
console.log(`  通过: ${pass}`)
console.log(`  失败: ${fail}`)
console.log(`  警告: ${warn}`)
console.log('')

const total = pass + fail
if (total > 0) {
  const score = Math.round(pass * 100 / total)
  console.log(`  得分: ${score}%`)

  if (score >= 95) {
    console.log(`  等级: ${GREEN}优秀${RESET}`)
  } else if (score >= 85) {
    console.log(`  等级: ${GREEN}良好${RESET}`)
  } else if (score >= 75) {
    console.log(`  等级: ${YELLOW}合格${RESET}`)
  } else {
    console.log(`  等级: ${RED}不合格${RESET}`)
  }
}

console.log('')

if (fail === 0) {
  console.log(`${GREEN}✓ 质量检查全部通过！${RESET}`)
  process.exit(0)
} else {
  console.log(`${RED}✗ 质量检查存在失败项，请修复后重新检查。${RESET}`)
  process.exit(1)
}
