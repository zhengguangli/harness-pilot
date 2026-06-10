import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join, basename } from 'path'
import { getWorkspaceDir } from '../../../../scripts/lib/workspace.mjs'

export function continuation(projectDir) {
  const ws = getWorkspaceDir(projectDir)
  if (!existsSync(ws)) return { exitCode: 0, message: '' }

  let interrupted = false
  let reason = ''

  const flagFile = join(ws, 'interrupted.flag')
  if (existsSync(flagFile)) {
    interrupted = true
    reason = readFileSync(flagFile, 'utf-8').trim()
  }

  const taskFile = join(ws, 'current_task.md')
  if (existsSync(taskFile)) {
    const content = readFileSync(taskFile, 'utf-8')
    if (/incomplete|未完成|interrupted|中断/i.test(content)) {
      interrupted = true
      reason = reason || '任务标记为未完成'
    }
  }

  try {
    const entries = readdirSync(ws).filter(f => f.startsWith('progress_') && f.endsWith('.md'))
    for (const f of entries) {
      const stat = statSync(join(ws, f))
      if (Date.now() - stat.mtimeMs < 1800000) {
        interrupted = true
        reason = reason || `发现最近的进度文件: ${f}`
        break
      }
    }
  } catch {}

  if (!interrupted) return { exitCode: 0, message: '' }

  const currentTask = existsSync(taskFile) ? readFileSync(taskFile, 'utf-8') : 'No task record'
  const progressFiles = readdirSync(ws).filter(f => f.startsWith('progress_') && f.endsWith('.md')).slice(0, 3)
  const progressList = progressFiles.map(f => `- ${f}`).join('\n') || 'None'
  const wsName = basename(getWorkspaceDir(projectDir))

  const prompt = `# Continuation Prompt (Ralph Loop)\n\n**Interruption detected:** ${reason}\n\n## Original Task\n\n${currentTask}\n\n## Completed Progress\n\n${progressList}\n\n## Continuation Instructions\n\n1. Read the progress files above to understand completed work\n2. Continue execution from the interruption point\n3. Update ${wsName}/current_task.md status upon completion\n`

  try { mkdirSync(join(ws, 'tool_output'), { recursive: true }) } catch {}
  writeFileSync(join(ws, 'continuation_prompt.md'), prompt)
  try { unlinkSync(flagFile) } catch {}

  return { exitCode: 0, message: `[continuation] Continuation prompt generated: ${reason}` }
}

if (process.argv[1]?.endsWith('continuation.mjs')) {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.env.PROJECT_DIR || process.cwd()
  const r = continuation(dir)
  if (r.message) console.error(r.message)
  process.exit(0)
}
