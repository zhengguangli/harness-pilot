---
name: sandbox-exec
description: 安全代码执行环境。配置沙箱、命令白名单、网络隔离，使智能体可安全运行代码。当用户说"沙箱"、"安全执行"、"sandbox"、"代码隔离"、"安全运行"时触发。也用于调整沙箱安全策略。
---

# Sandbox Exec — 安全代码执行环境

## 核心理念

**智能体需要安全的操作环境。** 运行智能体生成的代码有风险，沙箱提供隔离执行环境，支持按需创建、扇出执行、任务完成后销毁。

**Bash 是通用执行引擎。** Bash + Code 执行是智能体自主解决问题的关键：
- **自主工具创建**：模型可动态设计自己的工具，而不是受限于预配置的工具集
- **通用问题解决**：给模型"一台计算机"，让它自己想办法
- **代码即工具**：模型可通过编写和执行代码来解决任意问题

**Git 是版本控制原语。** Git 为文件系统添加版本控制能力：
- **工作跟踪**：智能体可跟踪工作进度和历史
- **错误回滚**：出错时可回滚到之前的状态
- **分支实验**：支持在独立分支上尝试不同方案
- **多智能体协作**：多个智能体可通过 git 协调工作

## Shell 工具规范

**Bash 是通用执行引擎，但裸 bash 调用不可控。** 基于 OpenAI Codex 的 `shell_command` 标准，定义统一的 Shell 工具接口。

### 标准 Shell 工具 Schema

```json
{
  "name": "shell_command",
  "description": "在用户默认 shell 中执行命令并返回输出。始终设置 workdir 参数，避免在命令字符串中使用 cd。",
  "parameters": {
    "command": "要执行的 shell 命令（string，非数组）",
    "workdir": "工作目录（推荐始终设置）",
    "timeout_ms": "超时毫秒数（默认 120000）",
    "with_escalated_permissions": "是否需要沙箱外权限（bool）",
    "justification": "提升权限的原因（仅 with_escalated_permissions=true 时需要）"
  }
}
```

### 专用终端封装工具指导

当需要限制模型使用裸终端时，创建与底层命令一致的专用工具：

- **工具名与输出格式贴近原生命令**：如 `list_dir` 而非 `terminal('ls')`
- **参数和返回格式与命令对齐**：模型主要用终端工具训练，贴近原生命令可保持分布一致
- **Prompt 中声明优先使用专用工具**：如 "git 操作请使用 `git` 工具而非 `shell_command`"

### 专用 Git 工具示例

```json
{
  "name": "git",
  "description": "执行 git 命令。用法与 git CLI 一致。",
  "parameters": {
    "command": "git 命令字符串（如 'status'、'diff'、'log --oneline'）",
    "workdir": "仓库根目录路径"
  }
}
```

### view_image 工具

标准图像查看工具，用于验证 UI 截图、设计稿、图表等：

```json
{
  "name": "view_image",
  "description": "将本地图像文件加载到对话上下文中供模型查看。",
  "parameters": {
    "path": "图像文件的本地文件系统路径"
  }
}
```

## 浏览器工具封装

浏览器是核心捆绑基础设施。当前 Dockerfile 中已安装 Chromium，需要进一步封装为 agent 可直接调用的工具。

### 浏览器工具 Schema（Playwright 封装）

```json
{
  "name": "browser",
  "description": "使用无头浏览器执行 Web 操作。支持导航、截图、DOM 查询、表单交互。",
  "parameters": {
    "action": "navigate | screenshot | click | type | evaluate | pdf",
    "url": "目标 URL（navigate 时必填）",
    "selector": "CSS 选择器（click/type/evaluate 时必填）",
    "value": "输入值或 JavaScript 代码（type/evaluate 时必填）",
    "full_page": "是否全页截图（bool，默认 false）"
  }
}
```

### 典型使用场景

| 场景 | 操作 | 用途 |
|------|------|------|
| UI 验证 | `screenshot` | 截取页面完整或局部截图，视觉回归对比 |
| 表单交互 | `navigate` + `type` + `click` | 自动化用户流程、端到端测试 |
| DOM 检查 | `evaluate` | 执行 JS 获取页面状态、性能指标 |
| 网络监控 | `evaluate` | 拦截网络请求、验证 API 调用 |
| PDF 报告 | `pdf` | 生成页面 PDF 作为证据附件 |

### 浏览器安全

- 始终在沙箱容器内运行（网络隔离 + 只读文件系统）
- 禁止访问 localhost 和内部网络地址
- 浏览器进程任务完成后自动终止（timeout 60s）

### Computer Use 工具

**Computer Use** 是浏览器、Shell 和截图的组合能力——agent 可像人类一样操作 GUI 界面。

```json
{
  "name": "computer_use",
  "description": "模拟人类操作计算机：查看屏幕、移动鼠标、点击、键入。用于 GUI 应用交互和自动化测试。",
  "parameters": {
    "action": "screenshot | click | type | key | mouse_move | scroll | wait",
    "x": "鼠标 X 坐标（click/mouse_move 时必填）",
    "y": "鼠标 Y 坐标（click/mouse_move 时必填）",
    "text": "键入文本（type 时必填）",
    "keys": "组合键如 'Enter'、'Ctrl+C'（key 时必填）"
  }
}
```

**适用场景：**
- **GUI 应用测试**：操作非 Web 的桌面应用（通过 VNC）
- **验收测试**：录制 + 回放用户交互序列
- **无障碍验证**：Tab 导航 + 屏幕阅读器兼容性
- **安装向导**：自动化软件安装流程

**安全约束：**
- Computer Use 仅在高安全级别沙箱中启用（`network_mode: none`）
- 交互序列有硬超时（30s/步）
- 执行前截图 → 执行 → 执行后截图，全程审计

## 质量标准

- 沙箱容器启动时间 < 60s
- 命令白名单覆盖所有必要开发工具
- 沙箱间完全网络隔离（`network_mode: none`）
- 任务完成后沙箱自动销毁（无残留容器）
- 浏览器进程超时 60s 自动终止

## 执行流程

### Step 1: 环境需求分析

1. 识别项目语言和运行时需求
2. 确定需要的 CLI 工具（git, npm, pytest 等）
3. 确定网络访问需求
4. 确定安全级别

### Step 2: 配置沙箱容器

```dockerfile
FROM ubuntu:22.04

# 基础工具
RUN apt-get update && apt-get install -y \
    git curl wget \
    python3 python3-pip \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# 浏览器（用于 UI 验证和 web 交互）
RUN apt-get update && apt-get install -y \
    chromium-browser \
    chromium-chromedriver \
    && rm -rf /var/lib/apt/lists/*

# 安全配置
RUN useradd -m agent
USER agent
WORKDIR /workspace

# 命令白名单
COPY allowed-commands.txt /etc/allowed-commands.txt
```

**浏览器用途：**
- **UI 验证**：截图、DOM 快照、视觉回归测试
- **Web 交互**：自动化用户流程、表单填写
- **网络观察**：监控网络请求、API 调用
- **录屏证据**：录制故障/修复演示视频

### Step 3: 命令白名单

```bash
# allowed-commands.txt
git
npm
node
python3
pip3
pytest
cargo
go
ls
cat
grep
find
```

### Step 4: 网络隔离

```yaml
# docker-compose.sandbox.yml
services:
  sandbox:
    build: .
    network_mode: "none"  # 完全隔离
    # 或使用自定义网络限制访问
    # networks:
    #   - sandbox-net
    volumes:
      - ./workspace:/workspace
    tmpfs:
      - /tmp:size=512M
```

### Step 5: Git Worktree 隔离

每个任务使用独立的 git worktree，避免状态污染：

```bash
# 为任务创建独立 worktree
WORKTREE=".worktrees/task-$(date +%s)"
git worktree add "$WORKTREE" -b "task-$(date +%s)"

# 在 worktree 中启动沙箱
docker run --rm \
  -v "$(pwd)/$WORKTREE":/workspace \
  --network none \
  sandbox-image \
  bash -c "cd /workspace && npm test"

# 任务完成后清理
git worktree remove "$WORKTREE"
```

**优势：**
- 每个任务有独立的工作目录和分支
- 多个任务可并行执行，互不干扰
- 任务完成后 worktree 可销毁，不留残留状态

### Step 6: 智能体集成

为智能体提供沙箱执行工具：

```bash
# 在沙箱中执行命令
docker run --rm \
  -v $(pwd):/workspace \
  --network none \
  sandbox-image \
  bash -c "cd /workspace && npm test"
```

## 安全策略

| 级别 | 网络 | 命令 | 文件系统 | 适用场景 |
|------|------|------|----------|----------|
| 低 | 允许 | 无限制 | 可写 | 开发环境 |
| 中 | 白名单 | 白名单 | 可写 | 测试环境 |
| 高 | 禁止 | 白名单 | 只读+工作区 | 生产验证 |

## 输入/输出协议

**输入：**
- 项目技术栈
- 安全级别需求
- 网络访问需求

**输出：**
- Dockerfile
- docker-compose.sandbox.yml
- 命令白名单
- 安全策略文档
