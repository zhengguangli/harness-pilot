#!/usr/bin/env node
/**
 * trace-log.mjs — Execution Logging
 * Logs execution traces and syncs todo state
 */

import { mkdirSync, existsSync, appendFileSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

export function traceLog(projectDir, logEntry = {}) {
  const harnessDir = join(projectDir, '.harness-polit')
  const traceDir = join(harnessDir, 'trace')
  if (!existsSync(traceDir)) {
    mkdirSync(traceDir, { recursive: true })
  }

  // Log to execution trace
  const entry = {
    timestamp: new Date().toISOString(),
    ...logEntry
  }
  const logPath = join(traceDir, 'execution.jsonl')
  appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8')

  // Sync todo state if provided
  if (logEntry.todos) {
    const todoPath = join(harnessDir, 'todo-state.json')
    writeFileSync(todoPath, JSON.stringify({ 
      todos: logEntry.todos,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8')
  }

  return { 
    success: true, 
    message: 'Trace logged',
    path: logPath
  }
}

// CLI mode
if (process.argv[1]?.endsWith('trace-log.mjs')) {
  const input = JSON.parse(readFileSync(0, 'utf-8'))
  const result = traceLog(input.projectDir || process.cwd(), input)
  console.log(JSON.stringify(result))
  process.exit(0)
}
