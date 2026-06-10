#!/usr/bin/env node
/**
 * context-check.mjs — AGENTS.md Freshness Check
 * Checks if AGENTS.md exists and is recent enough
 */

import { readFileSync, statSync, existsSync } from 'fs'
import { join } from 'path'

const MAX_AGE_DAYS = 30

export function contextCheck(projectDir) {
  const agentsPath = join(projectDir, 'AGENTS.md')
  
  if (!existsSync(agentsPath)) {
    return { valid: false, message: 'AGENTS.md not found' }
  }

  const stat = statSync(agentsPath)
  const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24)
  
  if (ageDays > MAX_AGE_DAYS) {
    return { 
      valid: false, 
      message: `AGENTS.md is ${Math.floor(ageDays)} days old (max: ${MAX_AGE_DAYS})` 
    }
  }

  return { valid: true, message: 'AGENTS.md is fresh' }
}

// CLI mode
if (process.argv[1]?.endsWith('context-check.mjs')) {
  const projectDir = process.argv[2] || process.cwd()
  const result = contextCheck(projectDir)
  console.log(JSON.stringify(result))
  process.exit(result.valid ? 0 : 1)
}
