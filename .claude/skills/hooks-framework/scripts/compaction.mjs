import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export function compaction(projectDir) {
  const ws = join(projectDir, '.workspace')
  try { mkdirSync(ws, { recursive: true }) } catch {}

  let fileCount = 0
  let totalSize = 0
  try {
    const entries = readdirSync(ws, { recursive: true })
    fileCount = entries.length
    for (const f of entries) {
      try {
        const stat = statSync(join(ws, f.toString()))
        if (stat.isFile()) totalSize += stat.size
      } catch {}
    }
  } catch {}

  const decisionFiles = []
  try {
    for (const f of readdirSync(ws)) {
      if (!f.endsWith('.md')) continue
      try {
        const content = readFileSync(join(ws, f), 'utf-8')
        if (/决策|decision|选择|确定/.test(content)) decisionFiles.push(f)
        if (decisionFiles.length >= 5) break
      } catch {}
    }
  } catch {}

  const currentTask = existsSync(join(ws, 'current_task.md')) ? readFileSync(join(ws, 'current_task.md'), 'utf-8') : '无任务记录'
  const decisions = decisionFiles.map(f => `### ${f}`).join('\n') || '无'

  const summary = `# 上下文摘要

**生成时间:** ${new Date().toISOString()}
**workspace 文件数:** ${fileCount}
**workspace 大小:** ${(totalSize / 1024).toFixed(1)}KB

## 关键决策记录

${decisions}

## 未完成任务

${currentTask}
`

  writeFileSync(join(ws, 'context_summary.md'), summary)

  // 输出到 stdout — Claude Code PreCompact hook 会注入到新上下文
  console.log(summary)

  return { exitCode: 0, message: '[compaction] 摘要已生成' }
}

if (process.argv[1]?.endsWith('compaction.mjs')) {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.env.PROJECT_DIR || process.cwd()
  const r = compaction(dir)
  if (r.message) console.error(r.message)
  process.exit(0)
}
