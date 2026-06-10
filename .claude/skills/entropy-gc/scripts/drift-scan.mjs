#!/usr/bin/env node

// ============================================================================
// drift-scan — 漂移扫描
// 快速检测架构漂移、文档过期、品味违规
//
// 用法:
//   node drift-scan.mjs [--quick|--full]
//
// --quick  : 仅检查架构漂移和文档过期（默认，适合每日）
// --full   : 检查所有维度（适合每周）
// ============================================================================

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { globSync } from 'fs';

const MODE = process.argv[2] || '--quick';
const REPORT_FILE = process.env.REPORT_FILE || `.workspace/drift-scan-${getDateStr()}.md`;
let errors = 0;
let warnings = 0;

function getDateStr() {
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}

function getTimestamp() {
  return new Date().toISOString();
}

mkdirSync(dirname(REPORT_FILE), { recursive: true });

let report = `# 漂移扫描报告

**日期:** ${getTimestamp()}
**模式:** ${MODE}

`;

// ─── 1. 架构漂移 ─────────────────────────────────
report += '## 架构漂移\n\n';

if (existsSync('docs/ARCHITECTURE.md')) {
  // 检查分层违规
  if (existsSync('src/types') && existsSync('src/services')) {
    try {
      const grepResult = execSync('grep -r "from.*services" src/types/ 2>/dev/null | grep -v node_modules | wc -l', { encoding: 'utf8' });
      const violations = parseInt(grepResult.trim()) || 0;
      if (violations > 0) {
        report += `- ❌ types 层导入了 services 层: ${violations} 处\n`;
        errors++;
      } else {
        report += '- ✅ 分层方向正确\n';
      }
    } catch (e) {}
  }

  // 检查循环依赖
  if (existsSync('go.mod')) {
    try {
      const goVet = execSync('go vet ./... 2>&1 | grep -i "import cycle" || true', { encoding: 'utf8' });
      if (goVet.trim()) {
        report += '- ❌ 检测到循环依赖\n';
        errors++;
      } else {
        report += '- ✅ 无循环依赖\n';
      }
    } catch (e) {}
  }
} else {
  report += '- ⚠️ docs/ARCHITECTURE.md 不存在 — 无法检查架构漂移\n';
  warnings++;
}

report += '\n';

// ─── 2. 文档漂移 ─────────────────────────────────
report += '## 文档漂移\n\n';

let staleDocs = 0;
const docFiles = globSync('docs/**/*.md');
const now = Date.now();

for (const doc of docFiles) {
  try {
    const stat = statSync(doc);
    const ageDays = Math.floor((now - stat.mtimeMs) / (1000 * 60 * 60 * 24));
    if (ageDays > 30) {
      report += `- ⚠️ \`${doc}\` — ${ageDays} 天未更新\n`;
      staleDocs++;
    }
  } catch (e) {}
}

if (staleDocs === 0) {
  report += '- ✅ 所有文档新鲜（<30 天）\n';
} else {
  warnings += staleDocs;
}

report += '\n';

// ─── 3. 品味漂移（仅 full 模式）──────────────────
if (MODE === '--full') {
  report += '## 品味漂移\n\n';

  // 文件大小检查
  let largeFiles = 0;
  const srcPatterns = ['**/*.ts', '**/*.js', '**/*.py', '**/*.go', '**/*.rs'];
  const ignoreDirs = ['node_modules', '.git', 'target', 'dist', 'build'];

  for (const pattern of srcPatterns) {
    const files = globSync(pattern, { ignore: ignoreDirs.map(d => `**/${d}/**`) });
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n').length;
        if (lines > 500) {
          report += `- ⚠️ \`${file}\` — ${lines} 行（>500）\n`;
          largeFiles++;
        }
      } catch (e) {}
    }
  }

  if (largeFiles === 0) {
    report += '- ✅ 无过大的文件\n';
  } else {
    warnings += largeFiles;
  }

  // TODO/FIXME 检查
  let todoCount = 0;
  try {
    const rgResult = execSync('rg -c "TODO|FIXME" --type ts --type js --type py --type go --type rust -g \'!node_modules\' -g \'!.git\' . 2>/dev/null || true', { encoding: 'utf8' });
    if (rgResult.trim()) {
      todoCount = rgResult.trim().split('\n').reduce((sum, line) => {
        const count = parseInt(line.split(':').pop()) || 0;
        return sum + count;
      }, 0);
    }
  } catch (e) {}

  if (todoCount > 20) {
    report += `- ⚠️ TODO/FIXME 过多: ${todoCount} 个\n`;
  } else {
    report += `- ✅ TODO/FIXME 数量正常 (${todoCount})\n`;
  }

  report += '\n';
}

// ─── 4. 工具漂移（仅 full 模式）──────────────────
if (MODE === '--full') {
  report += '## 工具漂移\n\n';

  // 检查未使用的依赖
  if (existsSync('package.json')) {
    report += '- ℹ️ 运行 `npx depcheck` 检查未使用的依赖\n';
  }

  if (existsSync('Cargo.toml')) {
    report += '- ℹ️ 运行 `cargo udeps` 检查未使用的依赖\n';
  }

  report += '\n';
}

// ─── 汇总 ────────────────────────────────────────
report += '## 汇总\n\n';
report += `- 错误: ${errors}\n`;
report += `- 警告: ${warnings}\n`;

writeFileSync(REPORT_FILE, report);
console.log(`[drift-scan] 报告已生成: ${REPORT_FILE}`);
console.log(`[drift-scan] 错误: ${errors}, 警告: ${warnings}`);

if (errors > 0) {
  process.exit(1);
}
