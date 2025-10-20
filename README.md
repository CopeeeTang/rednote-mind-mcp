# Rednote-Mind-MCP

> 小红书 MCP 服务器，为 Claude Desktop 等 AI 客户端提供收藏夹、搜索、内容获取能力

[![npm version](https://badge.fury.io/js/rednote-mind-mcp.svg)](https://www.npmjs.com/package/rednote-mind-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 使用场景

<!-- 截图占位符：展示在 Claude Desktop 中使用的界面 -->
![Demo Screenshot](./docs/images/demo-screenshot.png)

<!-- GIF 占位符：展示完整操作流程 -->
![Demo GIF](./docs/images/demo.gif)

### 典型场景

**场景 1: 学术研究助手**
使用 Claude 批量分析收藏夹中的论文笔记，自动提取关键观点、图表和公式，生成结构化论文列表。

**场景 2: 内容趋势分析**
搜索特定关键词，分析小红书热门内容趋势，为内容创作提供数据支持。

**场景 3: 美食教程整理**
批量获取收藏的菜谱笔记，使用 Claude Vision 识别步骤图和配料表，生成标准化菜谱合集。

<!-- 你可以在此添加更多场景描述 -->

---

## ✨ 功能特性

提供 **7 个 MCP 工具**，覆盖认证、内容获取、搜索和图片下载：

### 🔐 认证工具
- `check_login_status` - 检查登录状态
- `login` - 登录小红书（浏览器引导）

### 📥 内容获取工具
- `get_favorites_list` - 获取收藏夹笔记列表
- `get_note_content` - 获取笔记完整内容（支持 `includeData` 参数控制数据粒度）
- `get_batch_notes_from_favorites` - 批量获取收藏夹内容

### 🔍 搜索工具
- `search_notes_by_keyword` - 按关键词搜索（支持综合/最热/最新排序）

### 🖼️ 图片工具
- `download_note_images` - 下载笔记图片（Base64 编码，支持 Claude Vision 分析）

---

## 📦 安装

### 方法 1: NPM 全局安装（推荐）

```bash
npm install -g rednote-mind-mcp

# 首次使用，运行 init 命令登录
rednote-mind-mcp init
# 或使用简短命令
rednote-init
```

### 方法 2: 本地安装

```bash
git clone https://github.com/your-username/rednote-mind-mcp.git
cd rednote-mind-mcp
npm install
npm run build

# 首次登录
node dist/cli.js
```

---

## 🔧 MCP 客户端接入

### Claude Desktop

#### macOS
编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

#### Windows
编辑 `%APPDATA%\Claude\claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

#### Linux
编辑 `~/.config/Claude/claude_desktop_config.json`（同 macOS）

**重启 Claude Desktop 生效**

---

### Claude Code

在 Claude Code 设置中添加 MCP 服务器，或编辑配置文件：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

---

### VS Code (Cline)

安装 Cline 插件后，在设置中添加 MCP 服务器：

1. 打开 VS Code 设置
2. 搜索 "Cline MCP"
3. 添加服务器配置：

```json
{
  "cline.mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

---

### Cursor

在 Cursor 的设置中添加 MCP 服务器：

1. 打开 Cursor Settings → Features → MCP Servers
2. 添加配置：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

---

### Continue.dev

在 `~/.continue/config.json` 中添加：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

---

### 其他 MCP 客户端

如果你的 MCP 客户端（如 OpenAI CLI、Codex、Gemini CLI）支持 MCP 协议，配置方式类似：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

---

## 🔍 使用 MCP Inspector 调试

MCP Inspector 是官方提供的调试工具，可以交互式测试所有 MCP 工具。

### 安装 MCP Inspector

```bash
npm install -g @modelcontextprotocol/inspector
```

### 启动调试会话

```bash
# 方法 1: 使用全局安装的命令
mcp-inspector rednote-mind-mcp

# 方法 2: 使用本地构建
mcp-inspector node dist/server.js
```

### 调试界面功能

启动后会打开浏览器，显示交互式调试界面：

#### 1. Tools 标签页
- 查看所有 7 个工具的列表
- 查看每个工具的参数定义和 schema
- 点击工具名称查看详细文档

#### 2. Test Tool 功能
- 选择要测试的工具（如 `search_notes_by_keyword`）
- 填写参数（JSON 格式）：
  ```json
  {
    "keyword": "AI论文",
    "limit": 10,
    "sortType": "popular"
  }
  ```
- 点击 "Call Tool" 执行
- 查看返回结果（格式化的 JSON）

#### 3. Logs 标签页
- 实时查看服务器日志
- 查看 `console.error` 输出（进度信息）
- 调试错误和警告信息

### 调试示例流程

**示例 1: 测试登录状态检查**
```bash
mcp-inspector rednote-mind-mcp
# 在界面中选择 check_login_status 工具
# 点击 Call Tool（无需参数）
# 查看返回结果确认 cookie 状态
```

**示例 2: 测试搜索功能**
```bash
mcp-inspector rednote-mind-mcp
# 选择 search_notes_by_keyword 工具
# 填写参数: {"keyword": "AI", "limit": 5, "sortType": "popular"}
# 点击 Call Tool
# 查看返回的搜索结果
```

**示例 3: 测试笔记内容获取**
```bash
mcp-inspector rednote-mind-mcp
# 选择 get_note_content 工具
# 填写参数: {"noteUrl": "https://www.xiaohongshu.com/explore/xxx", "includeImages": true, "includeData": true}
# 点击 Call Tool
# 查看返回的完整笔记内容和图片
```

### 调试技巧

1. **先测试简单工具**: 从 `check_login_status` 开始，确保基础连接正常
2. **使用小数据量**: 测试批量工具时先用 `limit: 2`，确认逻辑正确后再增加
3. **保存测试用例**: 在 Inspector 中测试成功的参数，可以复制保存作为文档示例
4. **监控日志**: 所有 `console.error` 输出都会显示在 Logs 中，便于跟踪执行进度

---

## 🚀 使用示例

### 示例 1: 搜索笔记

**在 Claude Desktop 中发送：**
```
使用 search_notes_by_keyword 搜索"AI论文"，获取 20 条最热结果
```

**返回结果：**
```json
{
  "keyword": "AI论文",
  "resultCount": 20,
  "results": [
    {
      "title": "最新AI论文解读...",
      "url": "https://www.xiaohongshu.com/explore/xxx",
      "noteId": "xxx",
      "cover": "https://...",
      "author": {
        "name": "作者名",
        "url": "https://..."
      }
    }
  ]
}
```

---

### 示例 2: 分析收藏夹

**提示词：**
```
请分析我收藏夹中前 15 条笔记的主题分布，
并总结主要趋势和热门话题。
```

**Claude 自动执行：**
1. 调用 `get_batch_notes_from_favorites` (limit=15)
2. 分析文本和标签
3. 生成趋势报告

---

### 示例 3: 论文整理

**提示词：**
```
我收藏了 10 篇 AI 论文笔记，
请帮我整理成结构化列表，包括：
- 论文标题
- 核心观点
- 关键图表
- 参考价值
```

**Claude 自动执行：**
1. 调用 `get_batch_notes_from_favorites` (limit=10, includeImages=true)
2. 使用 Claude Vision 分析论文图表
3. 生成结构化报告

---

## 📚 完整文档

- **[设置指南](./SETUP_GUIDE.md)** - 详细的安装和配置
- **[使用指南](./MCP_USAGE_GUIDE.md)** - 所有工具的详细说明
- **[NPM 发布指南](./NPM_PUBLISH_GUIDE.md)** - 发布到 npm 的完整流程

---

## ❓ 常见问题

**Q: 首次使用需要做什么？**
A: 运行 `rednote-mind-mcp init` 或 `rednote-init` 登录小红书，cookies 会自动保存。

**Q: Cookies 过期怎么办？**
A: 再次运行 `rednote-mind-mcp init` 重新登录，或在 Claude Desktop 中使用 `login` 工具。

**Q: 支持哪些 MCP 客户端？**
A: Claude Desktop、Claude Code、VS Code (Cline)、Cursor、Continue.dev 等所有支持 MCP 协议的客户端。

**Q: 如何调试工具？**
A: 使用 `mcp-inspector rednote-mind-mcp` 启动调试界面，交互式测试所有工具。

**Q: Cookie 保存在哪里？**
A: `~/.mcp/rednote/cookies.json`（macOS/Linux）或 `%USERPROFILE%\.mcp\rednote\cookies.json`（Windows）

**Q: 如何贡献代码？**
A: 欢迎提交 Issue 和 Pull Request 到 GitHub 仓库！

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

基于 [RedNote-MCP](https://github.com/iFurySt/RedNote-MCP) 开发，感谢原作者 [@iFurySt](https://github.com/iFurySt)。

---

## 📄 License

MIT

---

**最后更新**: 2025-10-20
**版本**: 0.2.0
