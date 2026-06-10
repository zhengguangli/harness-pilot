#!/usr/bin/env node
/**
 * env-verify.mjs — Environment Readiness Check
 * Verifies Node.js version and required tools
 */

import { execSync } from 'child_process'

export function envVerify(projectDir) {
  const checks = []

  // Check Node.js version
  try {
    const nodeVersion = process.version
    const major = parseInt(nodeVersion.slice(1).split('.')[0])
    checks.push({ 
      name: 'node', 
      valid: major >= 18, 
      message: `Node.js ${nodeVersion}` 
    })
  } catch {
    checks.push({ name: 'node', valid: false, message: 'Node.js not found' })
  }

  // Check git
  try {
    execSync('git --version', { encoding: 'utf-8' })
    checks.push({ name: 'git', valid: true, message: 'Git available' })
  } catch {
    checks.push({ name: 'git', valid: false, message: 'Git not found' })
  }

  const failures = checks.filter(c => !c.valid)
  return {
    valid: failures.length === 0,
    message: failures.length === 0 
      ? 'Environment ready' 
      : `Missing: ${failures.map(f => f.name).join(', ')}`,
    checks
  }
}

// CLI mode
if (process.argv[1]?.endsWith('env-verify.mjs')) {
  const projectDir = process.argv[2] || process.cwd()
  const result = envVerify(projectDir)
  console.log(JSON.stringify(result))
  process.exit(result.valid ? 0 : 1)
}
