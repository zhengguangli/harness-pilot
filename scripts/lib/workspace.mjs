/**
 * workspace.mjs — Shared workspace directory resolver
 *
 * Priority:
 *   1. HARNESS_WORKSPACE env var (user override, absolute path)
 *   2. CLAUDE_PROJECT_DIR + '.workspace'
 *   3. process.cwd() + '.workspace'
 *
 * Usage:
 *   import { getWorkspaceDir, ensureWorkspace } from './scripts/lib/workspace.mjs'
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export function getWorkspaceDir(projectDir) {
  // 1. Explicit user override
  if (process.env.HARNESS_WORKSPACE) {
    return process.env.HARNESS_WORKSPACE;
  }

  // 2. Project dir from env or arg
  const root = projectDir || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  return join(root, '.workspace');
}

export function ensureWorkspace(projectDir) {
  const dir = getWorkspaceDir(projectDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
