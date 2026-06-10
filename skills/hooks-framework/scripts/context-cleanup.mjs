#!/usr/bin/env node
/**
 * context-cleanup.mjs — File Reference Tracking & Auto Offload
 * Tracks file references and identifies offloadable files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const DEFAULT_TTL_MS = 300000 // 5 minutes

export function contextCleanup(projectDir, filePath, ttlMs = DEFAULT_TTL_MS) {
  const harnessDir = join(projectDir, '.harness-polit')
  if (!existsSync(harnessDir)) {
    mkdirSync(harnessDir, { recursive: true })
  }

  const refsFile = join(harnessDir, 'file-refs.json')
  let refs = {}

  if (existsSync(refsFile)) {
    try {
      refs = JSON.parse(readFileSync(refsFile, 'utf-8'))
    } catch {}
  }

  // Update reference
  if (filePath) {
    refs[filePath] = {
      lastAccessed: Date.now(),
      accessCount: (refs[filePath]?.accessCount || 0) + 1
    }
  }

  // Find offloadable files (unreferenced for > TTL)
  const now = Date.now()
  const offloadable = Object.entries(refs)
    .filter(([_, ref]) => now - ref.lastAccessed > ttlMs)
    .map(([path]) => path)

  // Save updated refs
  writeFileSync(refsFile, JSON.stringify(refs, null, 2), 'utf-8')

  // Save offloadable list
  const unloadableFile = join(harnessDir, 'unloadable-files.json')
  writeFileSync(unloadableFile, JSON.stringify(offloadable, null, 2), 'utf-8')

  return {
    success: true,
    message: offloadable.length > 0 
      ? `${offloadable.length} files offloadable` 
      : 'No files to offload',
    offloadable,
    trackedFiles: Object.keys(refs).length
  }
}

// CLI mode
if (process.argv[1]?.endsWith('context-cleanup.mjs')) {
  const input = JSON.parse(readFileSync(0, 'utf-8'))
  const result = contextCleanup(
    input.projectDir || process.cwd(),
    input.filePath,
    input.ttlMs
  )
  console.log(JSON.stringify(result))
  process.exit(0)
}
