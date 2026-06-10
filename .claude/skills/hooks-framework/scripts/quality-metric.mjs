#!/usr/bin/env node
/**
 * quality-metric.mjs — Quality Metrics Recording
 * Records quality metrics for the session
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, appendFileSync } from 'fs'
import { join } from 'path'

export function qualityMetric(projectDir, metrics = {}) {
  const harnessDir = join(projectDir, '.harness-polit', 'metrics')
  if (!existsSync(harnessDir)) {
    mkdirSync(harnessDir, { recursive: true })
  }

  const entry = {
    timestamp: new Date().toISOString(),
    ...metrics
  }

  const logPath = join(harnessDir, 'quality.jsonl')
  appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8')

  return { 
    success: true, 
    message: 'Quality metric recorded',
    path: logPath
  }
}

// CLI mode
if (process.argv[1]?.endsWith('quality-metric.mjs')) {
  const input = JSON.parse(readFileSync(0, 'utf-8'))
  const result = qualityMetric(input.projectDir || process.cwd(), input.metrics)
  console.log(JSON.stringify(result))
  process.exit(0)
}
