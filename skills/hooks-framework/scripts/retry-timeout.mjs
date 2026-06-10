#!/usr/bin/env node
/**
 * retry-timeout.mjs — Fault Tolerance
 * Handles retry logic, timeouts, and circuit breaker
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const MAX_RETRIES = 3
const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_TIMEOUT = 600000 // 10 minutes

export function retryTimeout(error, toolName, projectDir) {
  const harnessDir = join(projectDir, '.harness-polit', 'metrics')
  if (!existsSync(harnessDir)) {
    mkdirSync(harnessDir, { recursive: true })
  }

  const stateFile = join(harnessDir, 'retry-state.json')
  let state = { retries: 0, lastError: null, circuitBreaker: {} }

  if (existsSync(stateFile)) {
    try {
      state = JSON.parse(readFileSync(stateFile, 'utf-8'))
    } catch {}
  }

  // Update retry count
  state.retries++
  state.lastError = { message: error, timestamp: Date.now() }

  // Check circuit breaker
  const breaker = state.circuitBreaker[toolName] || { failures: 0, lastFailure: 0 }
  breaker.failures++
  breaker.lastFailure = Date.now()
  state.circuitBreaker[toolName] = breaker

  // Save state
  writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8')

  // Check if circuit should open
  if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    return {
      action: 'circuit_open',
      message: `Circuit breaker open for ${toolName}. Paused for 10 minutes.`,
      retryAfter: CIRCUIT_BREAKER_TIMEOUT
    }
  }

  // Check max retries
  if (state.retries >= MAX_RETRIES) {
    return {
      action: 'give_up',
      message: `Max retries (${MAX_RETRIES}) exceeded`,
      retries: state.retries
    }
  }

  return {
    action: 'retry',
    message: `Retry ${state.retries}/${MAX_RETRIES}`,
    retries: state.retries,
    waitTime: Math.pow(2, state.retries) * 1000 // Exponential backoff
  }
}

// CLI mode
if (process.argv[1]?.endsWith('retry-timeout.mjs')) {
  const input = JSON.parse(readFileSync(0, 'utf-8'))
  const result = retryTimeout(
    input.error || 'Unknown error',
    input.toolName || 'unknown',
    input.projectDir || process.cwd()
  )
  console.log(JSON.stringify(result))
  process.exit(0)
}
