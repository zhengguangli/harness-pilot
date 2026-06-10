/**
 * OpenCode Plugin Template — Hooks Framework Adapter
 *
 * Translates the hooks-framework abstract events to OpenCode's
 * plugin event system. Install via:
 *   cp opencode-plugin.ts <project>/.opencode/plugins/harness-hooks.ts
 *
 * Events mapped:
 *   session.created       → on_session_start
 *   file.edited           → on_file_edit
 *   tool.executed         → on_tool_output
 *   tool.executed(apply_patch) → on_apply_patch
 *   session.compacting    → on_compact
 *   session.idle          → on_turn_end
 *   tool.executed(error)  → on_error
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

interface HookContext {
  projectDir: string
  toolName?: string
  toolOutput?: string
  toolInput?: unknown
  filePath?: string
  error?: Error
}

interface HookResult {
  success: boolean
  message?: string
  data?: unknown
}

type HookHandler = (ctx: HookContext) => Promise<HookResult> | HookResult

const SCRIPTS_DIR = '{{SKILLS_DIR}}/hooks-framework/scripts'

function runScript(scriptName: string, input?: unknown): HookResult {
  try {
    const scriptPath = join(process.cwd(), SCRIPTS_DIR, scriptName)
    if (!existsSync(scriptPath)) {
      return { success: false, message: `Script not found: ${scriptName}` }
    }
    const inputJson = input ? JSON.stringify(input) : ''
    const cmd = `echo '${inputJson}' | node ${scriptPath}`
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 })
    return { success: true, data: JSON.parse(output) }
  } catch (err: any) {
    return { success: false, message: err.message }
  }
}

// ── Hook Handlers ──

const onSessionStart: HookHandler = async (ctx) => {
  const checks = [
    runScript('context-check.mjs', { projectDir: ctx.projectDir }),
    runScript('env-verify.mjs', { projectDir: ctx.projectDir }),
  ]
  const failures = checks.filter((c) => !c.success)
  if (failures.length > 0) {
    return { success: false, message: `Session start checks failed: ${failures.map((f) => f.message).join(', ')}` }
  }
  return { success: true, message: 'Session initialized' }
}

const onFileEdit: HookHandler = async (ctx) => {
  if (!ctx.filePath) return { success: true, message: 'No file path provided' }
  return runScript('lint-check.mjs', { filePath: ctx.filePath, projectDir: ctx.projectDir })
}

const onApplyPatch: HookHandler = async (ctx) => {
  return runScript('apply-patch.mjs', { toolOutput: ctx.toolOutput, projectDir: ctx.projectDir })
}

const onToolOutput: HookHandler = async (ctx) => {
  // Capture todowrite state
  if (ctx.toolName === 'todowrite' && ctx.toolInput) {
    try {
      const harnessDir = join(ctx.projectDir, '.harness-polit')
      if (!existsSync(harnessDir)) {
        mkdirSync(harnessDir, { recursive: true })
      }
      const todoPath = join(harnessDir, 'todo-state.json')
      writeFileSync(todoPath, JSON.stringify({
        todos: (ctx.toolInput as any).todos || [],
        updatedAt: new Date().toISOString()
      }, null, 2), 'utf-8')
    } catch {}
  }

  const outputLength = ctx.toolOutput?.length ?? 0
  if (outputLength > 2000) {
    return runScript('tool-offload.mjs', {
      tool_output: ctx.toolOutput,
      tool_name: ctx.toolName,
      projectDir: ctx.projectDir,
    })
  }
  return { success: true, message: 'Output within threshold' }
}

const onCompact: HookHandler = async (ctx) => {
  return runScript('compaction.mjs', { projectDir: ctx.projectDir })
}

const onTurnEnd: HookHandler = async (ctx) => {
  runScript('todo-sync.mjs', { projectDir: ctx.projectDir })
  runScript('continuation.mjs', { projectDir: ctx.projectDir })
  runScript('quality-metric.mjs', { projectDir: ctx.projectDir })
  runScript('trace-log.mjs', { projectDir: ctx.projectDir })
  return { success: true, message: 'Turn ended' }
}

const onError: HookHandler = async (ctx) => {
  return runScript('retry-timeout.mjs', {
    error: ctx.error?.message,
    toolName: ctx.toolName,
    projectDir: ctx.projectDir,
  })
}

// ── Plugin Registration ──

export const hooks = {
  'session.created': onSessionStart,
  'file.edited': onFileEdit,
  'tool.executed': onToolOutput,
  'tool.executed(apply_patch)': onApplyPatch,
  'session.compacting': onCompact,
  'session.idle': onTurnEnd,
  'tool.executed(error)': onError,
}

export default hooks
