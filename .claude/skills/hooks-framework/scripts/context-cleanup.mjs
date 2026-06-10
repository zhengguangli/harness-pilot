#!/usr/bin/env node

/**
 * context-cleanup.mjs — 文件引用追踪与自动卸载
 *
 * 功能：
 * 1. 追踪 agent 读取的文件（通过 @ref 标记或工具输出）
 * 2. 检测文件是否还在被引用
 * 3. 生成可卸载文件列表
 * 4. 在 compaction 时提供卸载建议
 *
 * 使用方式：
 * - CLI: echo '{"tool_output":"...","tool_name":"read_file"}' | node context-cleanup.mjs
 * - Import: import { trackRef, getUnloadable } from './context-cleanup.mjs'
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getWorkspaceDir } from '../../../../scripts/lib/workspace.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WORKSPACE_DIR = getWorkspaceDir();
const REFS_FILE = join(WORKSPACE_DIR, 'file-refs.json');


// 文件引用过期时间（默认 5 分钟）
const REF_TTL_MS = parseInt(process.env.REF_TTL_MS) || 5 * 60 * 1000;

/**
 * 确保工作区目录存在
 */
function ensureWorkspace() {
  if (!existsSync(WORKSPACE_DIR)) {
    mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
}

/**
 * 加载文件引用记录
 * @returns {Object} 文件引用记录
 */
function loadRefs() {
  try {
    if (existsSync(REFS_FILE)) {
      return JSON.parse(readFileSync(REFS_FILE, 'utf8'));
    }
  } catch (err) {
    // 忽略解析错误
  }
  return { files: {}, lastCleanup: Date.now() };
}

/**
 * 保存文件引用记录
 * @param {Object} refs - 文件引用记录
 */
function saveRefs(refs) {
  ensureWorkspace();
  writeFileSync(REFS_FILE, JSON.stringify(refs, null, 2));
}

/**
 * 追踪文件引用
 * @param {string} filePath - 文件路径
 * @param {string} source - 引用来源（tool, ref, manual）
 */
function trackRef(filePath, source = 'tool') {
  const refs = loadRefs();
  const now = Date.now();

  if (!refs.files[filePath]) {
    refs.files[filePath] = {
      firstSeen: now,
      lastSeen: now,
      sources: [source],
      refCount: 1
    };
  } else {
    refs.files[filePath].lastSeen = now;
    refs.files[filePath].refCount++;
    if (!refs.files[filePath].sources.includes(source)) {
      refs.files[filePath].sources.push(source);
    }
  }

  saveRefs(refs);
}

/**
 * 从工具输出中提取文件引用
 * @param {string} toolName - 工具名称
 * @param {string} toolOutput - 工具输出
 * @returns {string[]} 提取的文件路径
 */
function extractFileRefs(toolName, toolOutput) {
  const files = [];

  // 从 read_file 输出中提取
  if (toolName === 'read_file' || toolName === 'Read') {
    // 多模式匹配，捕获所有文件路径
    const patterns = [
      /filePath['":\s]+([^\s'"]+)/g,
      /([^\s]+\.(md|json|yaml|yml|ts|js|mjs))/g,
    ];
    for (const pattern of patterns) {
      const matches = [...toolOutput.matchAll(pattern)];
      for (const match of matches) {
        if (!match[1].startsWith('@ref:')) {
          files.push(match[1]);
        }
      }
    }
  }

  // 从 glob 输出中提取
  if (toolName === 'glob' || toolName === 'Glob') {
    const fileMatches = toolOutput.match(/[^\s]+\.(md|json|yaml|yml|ts|js|mjs)/g);
    if (fileMatches) files.push(...fileMatches);
  }

  // 从 grep 输出中提取
  if (toolName === 'grep' || toolName === 'Grep') {
    const fileMatches = toolOutput.match(/^([^:]+):/gm);
    if (fileMatches) files.push(...fileMatches.map(f => f.replace(/:$/, '')));
  }

  // 从 @ref 标记中提取
  const refMatches = toolOutput.match(/@ref:([^\s]+)/g);
  if (refMatches) {
    files.push(...refMatches.map(r => r.replace('@ref:', '')));
  }

  // 通用文件路径提取（作为兜底）
  if (files.length === 0) {
    // 排除 @ref 标记，只提取纯文件路径
    const cleanOutput = toolOutput.replace(/@ref:[^\s]+/g, '');
    const genericMatches = cleanOutput.match(/[^\s]+\.(md|json|yaml|yml|ts|js|mjs|txt)/g);
    if (genericMatches) {
      files.push(...genericMatches);
    }
  }

  return [...new Set(files)]; // 去重
}

/**
 * 获取可卸载的文件列表
 * 基于 TTL 和引用计数判断
 * @returns {Object[]} 可卸载文件列表
 */
function getUnloadable() {
  const refs = loadRefs();
  const now = Date.now();
  const unloadable = [];

  for (const [filePath, info] of Object.entries(refs.files)) {
    const age = now - info.lastSeen;
    if (age > REF_TTL_MS) {
      unloadable.push({
        file: filePath,
        lastSeen: info.lastSeen,
        ageMs: age,
        refCount: info.refCount,
        sources: info.sources
      });
    }
  }

  // 按最后访问时间排序（最旧的在前）
  unloadable.sort((a, b) => a.lastSeen - b.lastSeen);

  return unloadable;
}

/**
 * 清理过期的文件引用记录
 */
function cleanupOldRefs() {
  const refs = loadRefs();
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 小时

  for (const [filePath, info] of Object.entries(refs.files)) {
    if (now - info.lastSeen > maxAge) {
      delete refs.files[filePath];
    }
  }

  refs.lastCleanup = now;
  saveRefs(refs);
}

/**
 * 生成卸载建议（用于 compaction）
 * @returns {string} 卸载建议文本
 */
function generateUnloadSuggestion() {
  const unloadable = getUnloadable();

  if (unloadable.length === 0) {
    return '';
  }

  const lines = [
    '## 可卸载文件',
    '',
    '以下文件已超过 TTL 未被引用，建议在 compaction 时移除：',
    ''
  ];

  for (const file of unloadable.slice(0, 10)) { // 最多显示 10 个
    const ageMin = Math.round(file.ageMs / 60000);
    lines.push(`- \`${file.file}\` (${ageMin} 分钟前引用)`);
  }

  if (unloadable.length > 10) {
    lines.push(`- ... 还有 ${unloadable.length - 10} 个文件`);
  }

  return lines.join('\n');
}

/**
 * 主处理函数（CLI 模式）
 */
async function main() {
  // 读取 stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const { tool_name, tool_output } = data;

    if (tool_output) {
      // 提取并追踪文件引用
      const files = extractFileRefs(tool_name || '', tool_output);
      for (const file of files) {
        trackRef(file, 'tool');
      }
    }

    // 定期清理旧引用
    cleanupOldRefs();

    // 生成卸载建议
    const suggestion = generateUnloadSuggestion();

    // 输出结果
    const result = {
      tracked: extractFileRefs(tool_name || '', tool_output || '').length,
      unloadable: getUnloadable().length,
      suggestion: suggestion || null
    };

    // 如果有卸载建议，输出到 stderr（不阻塞主流程）
    if (suggestion) {
      process.stderr.write('\n' + suggestion + '\n');
    }

    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    // 解析失败时静默退出
    process.stdout.write(JSON.stringify({ tracked: 0, unloadable: 0, error: err.message }));
  }
}

// CLI 模式
if (process.argv[1] && process.argv[1].endsWith('context-cleanup.mjs')) {
  main();
}

// Export for import mode
export { trackRef, getUnloadable, extractFileRefs, generateUnloadSuggestion };
