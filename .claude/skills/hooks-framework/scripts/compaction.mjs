import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export function compaction(projectDir) {
  const ws = join(projectDir, '.workspace')
  if (!existsSync(ws)) return { exitCode: 0, message: '[compaction] .workspace/ 不存在 — 无上下文可压缩' }

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

  console.error(`[compaction] workspace 状态: ${fileCount} 个文件, ${(totalSize / 1024).toFixed(1)}KB`)

  if (fileCount < 10) return { exitCode: 0, message: '[compaction] 文件数量正常 — 无需压缩' }

  const decisionFiles = []
  try {
    for (const f of readdirSync(ws)) {
      if (!f.endsWith('.md')) continue
      const content = readFileSync(join(ws, f), 'utf-8')
      if (/决策|decision|选择|确定/.test(content)) decisionFiles.push(f)
      if (decisionFiles.length >= 5) break
    }
  } catch {}

  const currentTask = existsSync(join(ws, 'current_task.md')) ? readFileSync(join(ws, 'current_task.md'), 'utf-8') : '无任务记录'
  const decisions = decisionFiles.map(f => `### ${f}`).join('\n') || '无'

  const summary = `# 上下文摘要\n\n**生成时间:** ${new Date().toISOString()}\n**workspace 文件数:** ${fileCount}\n**workspace 大小:** ${(totalSize / 1024).toFixed(1)}KB\n\n## 关键决策记录\n\n${decisions}\n\n## 未完成任务\n\n${currentTask}\n`

  try { mkdirSync(ws, { recursive: true }) } catch {}
  writeFileSync(join(ws, 'context_summary.md'), summary)

  return { exitCode: 0, message: '[compaction] 摘要已生成' }
}

if (process.argv[1]?.endsWith('compaction.mjs')) {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.env.PROJECT_DIR || process.cwd()
  const r = compaction(dir)
  if (r.message) console.log(r.message)
  process.exit(r.exitCode)
}
