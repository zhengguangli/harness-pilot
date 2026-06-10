#!/usr/bin/env node
/**
 * compaction.mjs — Context Compaction
 * Generates summary for context compaction with task state and metrics
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

export function compaction(projectDir) {
  const harnessDir = join(projectDir, '.harness-polit')
  if (!existsSync(harnessDir)) {
    mkdirSync(harnessDir, { recursive: true })
  }

  // Read pending tasks from todo state
  let tasks = []
  const todoFile = join(harnessDir, 'todo-state.json')
  if (existsSync(todoFile)) {
    try {
      const todoData = JSON.parse(readFileSync(todoFile, 'utf-8'))
      tasks = (todoData.todos || []).filter(t => t.status === 'pending' || t.status === 'in_progress')
    } catch {}
  }

  // Read recent trace logs
  let recentLogs = []
  const traceDir = join(harnessDir, 'trace')
  if (existsSync(traceDir)) {
    try {
      const traceFile = join(traceDir, 'execution.jsonl')
      if (existsSync(traceFile)) {
        const lines = readFileSync(traceFile, 'utf-8').trim().split('\n')
        recentLogs = lines.slice(-5).map(line => {
          try { return JSON.parse(line) } catch { return null }
        }).filter(Boolean)
      }
    } catch {}
  }

  // Read quality metrics
  let metrics = null
  const metricsFile = join(harnessDir, 'metrics', 'quality.jsonl')
  if (existsSync(metricsFile)) {
    try {
      const lines = readFileSync(metricsFile, 'utf-8').trim().split('\n')
      const lastLine = lines[lines.length - 1]
      if (lastLine) metrics = JSON.parse(lastLine)
    } catch {}
  }

  // Read workspace stats
  let workspaceStats = { fileCount: 0 }
  try {
    const output = execSync(`find "${projectDir}" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l`, { encoding: 'utf-8' })
    workspaceStats.fileCount = parseInt(output.trim())
  } catch {}

  // Build summary
  const summary = `# 上下文摘要

生成时间: ${new Date().toISOString()}
workspace 文件数: ${workspaceStats.fileCount}

## 当前任务

${tasks.length > 0 
  ? tasks.map(t => `- [${t.status === 'in_progress' ? '→' : ' '}] ${t.content}`).join('\n')
  : '无任务记录'}

## 最近执行记录

${recentLogs.length > 0
  ? recentLogs.map(log => {
      const time = log.timestamp ? new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19) : '?'
      return `${time} [${log.level || 'INFO'}] ${log.action || ''}: ${JSON.stringify(log.data || log.message || '')}`
    }).join('\n')
  : '无执行记录'}

## 质量指标

${metrics 
  ? JSON.stringify(metrics, null, 2)
  : '无质量指标'}
`

  const summaryPath = join(harnessDir, 'context_summary.md')
  writeFileSync(summaryPath, summary, 'utf-8')

  return { 
    success: true, 
    message: 'Compaction summary generated',
    path: summaryPath,
    data: {
      tasks: tasks.length,
      logs: recentLogs.length,
      hasMetrics: !!metrics
    }
  }
}

// CLI mode
if (process.argv[1]?.endsWith('compaction.mjs')) {
  const input = JSON.parse(readFileSync(0, 'utf-8'))
  const result = compaction(input.projectDir || process.cwd())
  console.log(JSON.stringify(result))
  process.exit(0)
}
