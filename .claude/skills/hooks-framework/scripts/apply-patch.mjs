#!/usr/bin/env node

/**
 * apply-patch.mjs — Apply Patch 补丁验证与应用
 *
 * 功能：
 * 1. 验证 unified diff 格式
 * 2. 检查行号偏移容差
 * 3. 冲突检测
 * 4. 生成补丁历史记录
 *
 * 用法：
 *   CLI:  echo '{"path":"file.ts","diff":"..."}' | node apply-patch.mjs
 *   Import: import { validatePatch, applyPatch } from './apply-patch.mjs'
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { createHash } from 'crypto'
import { getWorkspaceDir } from '../../../../scripts/lib/workspace.mjs'

const WORKSPACE_DIR = join(getWorkspaceDir(), 'patches')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function ensureWorkspace() {
  if (!existsSync(WORKSPACE_DIR)) {
    mkdirSync(WORKSPACE_DIR, { recursive: true })
  }
}

function validatePatchFormat(patch) {
  const lines = patch.split('\n')
  const errors = []

  if (!patch.includes('@@')) {
    errors.push('Missing unified diff header (@@ ... @@)')
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('@@') && !line.match(/^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/)) {
      errors.push(`Invalid hunk header at line ${i + 1}: ${line}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

function detectConflict(patch, filePath) {
  if (!existsSync(filePath)) {
    return { conflict: false, reason: null }
  }

  const content = readFileSync(filePath, 'utf-8')
  const contentLines = content.split('\n')

  const hunks = patch.split('\n').filter(l => l.startsWith('@@'))
  for (const hunk of hunks) {
    const match = hunk.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (match) {
      const origLine = parseInt(match[1])
      const newLine = parseInt(match[2])
      if (origLine > contentLines.length + 10 || newLine > contentLines.length + 10) {
        return { conflict: true, reason: `Line offset too large: target ${origLine}, file has ${contentLines.length}` }
      }
    }
  }

  return { conflict: false, reason: null }
}

function savePatchHistory(patch, filePath) {
  ensureWorkspace()
  const hash = createHash('sha256').update(`${filePath}:${patch}`).digest('hex').slice(0, 8)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const entry = {
    timestamp: new Date().toISOString(),
    file: filePath,
    hash,
    patch
  }
  writeFileSync(
    join(WORKSPACE_DIR, `${timestamp}_${hash}.json`),
    JSON.stringify(entry, null, 2)
  )
}

function main(input) {
  const { path: filePath, diff } = typeof input === 'string'
    ? JSON.parse(input)
    : input

  if (!filePath || !diff) {
    console.error('Error: path and diff are required')
    process.exit(1)
  }

  // Validate format
  const validation = validatePatchFormat(diff)
  if (!validation.valid) {
    console.error('Patch format errors:', validation.errors.join('; '))
    process.exit(1)
  }

  // Detect conflicts
  const conflict = detectConflict(diff, filePath)
  if (conflict.conflict) {
    console.error('Conflict detected:', conflict.reason)
    process.exit(1)
  }

  // Save history
  savePatchHistory(diff, filePath)

  // Return success
  console.log(JSON.stringify({ status: 'valid', file: filePath }))
}

// CLI mode
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^\.\//, ''))) {
  let input = ''
  process.stdin.setEncoding('utf-8')
  process.stdin.on('data', chunk => { input += chunk })
  process.stdin.on('end', () => {
    try { main(input) } catch (e) { console.error('Error:', e.message); process.exit(1) }
  })
}

// Import mode
export { validatePatchFormat, detectConflict, savePatchHistory, main as applyPatch }
