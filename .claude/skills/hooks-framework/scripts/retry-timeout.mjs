#!/usr/bin/env node

/**
 * retry-timeout.mjs — 容错：重试计数 + 超时 + 熔断
 *
 * 功能：
 * 1. 管理重试计数器（指数退避）
 * 2. 超时检测
 * 3. 熔断器状态管理（持久化）
 *
 * 用法：
 *   CLI:  echo '{"tool":"bash","status":"error","attempt":1}' | node retry-timeout.mjs
 *   Import: import { shouldRetry, getCircuitState } from './retry-timeout.mjs'
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getWorkspaceDir } from '../../../../scripts/lib/workspace.mjs'

const METRICS_DIR = join(getWorkspaceDir(), 'metrics')
const CIRCUIT_BREAKER_FILE = 'circuit-breaker.json'
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // ms
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const CIRCUIT_THRESHOLD = 5
const CIRCUIT_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

function ensureMetricsDir() {
  if (!existsSync(METRICS_DIR)) {
    mkdirSync(METRICS_DIR, { recursive: true })
  }
}

function loadCircuitState() {
  ensureMetricsDir()
  const path = join(METRICS_DIR, CIRCUIT_BREAKER_FILE)
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

function saveCircuitState(state) {
  ensureMetricsDir()
  writeFileSync(join(METRICS_DIR, CIRCUIT_BREAKER_FILE), JSON.stringify(state, null, 2))
}

function shouldRetry(toolName, attempt, status) {
  if (status === 'success') return { retry: false }
  if (attempt >= MAX_RETRIES) return { retry: false, reason: 'max_retries_exceeded' }

  const state = loadCircuitState()
  const now = Date.now()

  // Check circuit breaker
  const circuitInfo = state[toolName]
  if (circuitInfo?.open) {
    if (now - circuitInfo.openedAt < CIRCUIT_TIMEOUT_MS) {
      return { retry: false, reason: 'circuit_breaker_open', opensAt: new Date(circuitInfo.openedAt + CIRCUIT_TIMEOUT_MS).toISOString() }
    }
    // Circuit timeout expired, half-open probe
    delete state[toolName]
    saveCircuitState(state)
  }

  const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
  return { retry: true, delay, attempt: attempt + 1 }
}

function recordFailure(toolName) {
  const state = loadCircuitState()
  const now = Date.now()

  if (!state[toolName]) {
    state[toolName] = { failures: [], open: false }
  }

  // Clean old failures outside window
  state[toolName].failures = state[toolName].failures
    .filter(t => now - t < CIRCUIT_WINDOW_MS)

  state[toolName].failures.push(now)

  if (state[toolName].failures.length >= CIRCUIT_THRESHOLD) {
    state[toolName].open = true
    state[toolName].openedAt = now
    state[toolName].failureCount = state[toolName].failures.length
  }

  saveCircuitState(state)
  return state[toolName]
}

function recordSuccess(toolName) {
  const state = loadCircuitState()
  delete state[toolName]
  saveCircuitState(state)
}

function main(input) {
  const { tool, status, attempt } = typeof input === 'string'
    ? JSON.parse(input)
    : input

  if (status === 'success') {
    recordSuccess(tool)
    console.log(JSON.stringify({ action: 'clear', tool }))
    return
  }

  const result = shouldRetry(tool, attempt || 0, status)
  if (result.retry) {
    recordFailure(tool)
  }

  console.log(JSON.stringify({
    ...result,
    tool,
    attempt: (attempt || 0) + 1
  }))
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
export { shouldRetry, recordFailure, recordSuccess, loadCircuitState }
