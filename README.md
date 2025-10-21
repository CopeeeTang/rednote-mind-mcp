# Rednote-Mind-MCP

> 让AI接入你的小红书，就像能够了解你的备忘录一样

[![npm version](https://badge.fury.io/js/rednote-mind-mcp.svg)](https://www.npmjs.com/package/rednote-mind-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

---

## 🎯 核心价值

**一句话**：3条命令安装完成，让Claude/Cursor/VSCode等AI助手直接访问你的小红书收藏夹和搜索内容，自动分析笔记、提取关键信息、生成结构化报告。

### 解决什么问题

你在小红书积累了100+篇有价值的收藏笔记（论文分享、技术教程、美食菜谱），想让AI帮你整理分析，但遇到：

- **小红书无导出功能** - 收藏夹内容无法批量导出
- **手动复制繁琐** - 一条条复制URL和标题（30秒/篇）
- **AI无法访问** - Claude等AI助手无法直接读取小红书内容

### 这个工具如何帮你

```
安装 Rednote-Mind-MCP（1分钟）
          ↓
首次运行 init，扫码登录小红书（10秒）
          ↓
在Claude Desktop中直接提问（无需手动复制URL）：
"分析我收藏夹中最近20篇AI论文笔记，提取关键论文"
          ↓
Claude自动调用MCP工具：
  1. 获取收藏夹列表（带xsec_token的完整URL）
  2. 批量提取每篇笔记内容（标题+正文+图片）
  3. 使用Claude Vision分析图片中的图表/公式
  4. 生成结构化报告（3分钟自动完成）
          ↓
获得：论文清单、核心观点、关键图表、参考价值
```

**时间对比**：

| 任务 | 手动方式 | 使用 Rednote-Mind-MCP | 节省时间 |
|------|---------|----------------------|---------|
| 整理20篇笔记 | 30秒/篇 × 20 + 60分钟阅读 = **70分钟** | 1分钟配置 + 3分钟AI分析 = **4分钟** | **94%** |
| 搜索"AI论文"并提取TOP10 | 手动打开10篇+笔记 = **15分钟** | 1条Claude提问 = **2分钟** | **87%** |

---

## ✨ 功能特性

### 7个强大的MCP工具

#### 🔐 认证工具
- `check_login_status` - 检查登录状态（自动读取本地cookies）
- `login` - 引导式登录（浏览器窗口扫码/密码登录，自动保存凭证）

#### 📥 内容获取工具（智能提取xsec_token）
- `get_favorites_list` - 获取收藏夹笔记列表
  - ✅ **自动提取真实用户ID**（不再使用`/me`路径）
  - ✅ **自动点击提取xsec_token**（确保后续能访问笔记内容）
- `get_note_content` - 获取笔记完整内容
  - 支持`includeImages`参数：下载图片为Base64，供Claude Vision分析
  - 支持`includeData`参数：获取点赞数、评论数、收藏数等统计数据
- `get_batch_notes_from_favorites` - 批量获取收藏夹内容
  - 一次调用获取N篇笔记的完整内容（标题+正文+图片+数据）

#### 🔍 搜索工具（智能提取xsec_token）
- `search_notes_by_keyword` - 按关键词搜索
  - 支持排序：综合排序/最热/最新
  - ✅ **自动点击提取xsec_token**（确保搜索结果URL可访问）

#### 🖼️ 图片工具
- `download_note_images` - 下载笔记图片
  - Base64编码输出，直接供Claude Vision分析
  - 支持批量下载（论文截图、图表、配方图）

### 🌟 核心优势

1. **零手动复制** - AI自动获取URL和内容，无需人工介入
2. **智能Token提取** - 自动点击笔记获取带`xsec_token`的完整URL，避免403/404错误
3. **真实用户ID** - 登录时自动提取并保存用户ID（`604dbc13...`），不再使用`/me`占位符
4. **Claude Vision支持** - 图片Base64输出，AI能分析论文图表、公式、流程图
5. **8+客户端兼容** - Claude Desktop、Claude Code、Cursor、VSCode Cline、Continue.dev、Gemini CLI等
6. **首次登录引导** - `rednote-init`命令提供友好的登录向导

---

## 📦 快速开始（3分钟）

### 安装

```bash
# 全局安装
npm install -g rednote-mind-mcp

# 首次使用，运行登录向导
rednote-init
# 或
rednote-mind-mcp init
```

**登录向导流程**：
1. 自动打开浏览器窗口
2. 导航到小红书首页
3. 你扫码或密码登录（60秒内完成）
4. 自动保存cookies到`~/.mcp/rednote/cookies.json`
5. 自动提取用户ID并保存到`~/.mcp/rednote/config.json`

### 配置MCP客户端

<details>
<summary><strong>Claude Desktop</strong>（点击展开）</summary>

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
编辑 `~/.config/Claude/claude_desktop_config.json`（同macOS配置）

**重启Claude Desktop生效**

</details>

<details>
<summary><strong>Claude Code</strong>（点击展开）</summary>

在Claude Code设置中添加：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code (Cline插件)</strong>（点击展开）</summary>

1. 安装Cline插件
2. 在VS Code设置中搜索"Cline MCP"
3. 添加：

```json
{
  "cline.mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

</details>

<details>
<summary><strong>Cursor</strong>（点击展开）</summary>

1. 打开Cursor Settings → Features → MCP Servers
2. 添加：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

</details>

<details>
<summary><strong>Continue.dev</strong>（点击展开）</summary>

编辑`~/.continue/config.json`：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

</details>

<details>
<summary><strong>其他MCP客户端</strong>（Gemini CLI、OpenAI CLI等）</summary>

配置方式类似，添加：

```json
{
  "mcpServers": {
    "rednote": {
      "command": "rednote-mind-mcp"
    }
  }
}
```

</details>

---

## 🚀 使用示例

### 示例1：整理收藏夹中的AI论文

**在Claude Desktop中发送：**

```
请分析我收藏夹中最近15篇笔记，筛选出AI相关的论文分享，
提取：论文标题、核心观点、关键图表、参考价值。
生成结构化表格。
```

**Claude自动执行：**

1. 调用 `get_batch_notes_from_favorites` (limit=15, includeImages=true)
2. 使用Claude Vision分析论文截图中的图表和公式
3. 生成结构化报告：

| 笔记标题 | 论文名称 | 核心观点 | 关键图表 | 参考价值 |
|---------|---------|---------|---------|---------|
| GPT-4o解读 | GPT-4 Technical Report | 多模态架构... | Transformer架构图 | ⭐⭐⭐⭐⭐ |
| Diffusion模型原理 | Denoising Diffusion... | 去噪扩散过程... | 训练流程图 | ⭐⭐⭐⭐ |

---

### 示例2：搜索并分析热门教程

**在Claude Desktop中发送：**

```
搜索"Python数据分析"，获取最热门的10条笔记，
总结常见的工具和技术栈。
```

**Claude自动执行：**

1. 调用 `search_notes_by_keyword` (keyword="Python数据分析", limit=10, sortType="popular")
2. 对每篇笔记调用 `get_note_content` 获取完整内容
3. 分析并生成报告：

**常见工具栈**：
- Pandas（10/10篇提及）
- NumPy（9/10篇）
- Matplotlib/Seaborn（7/10篇）
- Jupyter Notebook（6/10篇）

**推荐学习路径**：
1. 入门：Pandas基础操作（笔记1、3、5）
2. 进阶：数据清洗与预处理（笔记2、4）
3. 可视化：图表制作技巧（笔记7、8）

---

### 示例3：美食菜谱整理

**在Claude Desktop中发送：**

```
我收藏了20篇川菜菜谱笔记，请帮我整理成标准化食谱，
包括：菜名、食材清单、步骤、烹饪时间。
使用图片识别提取配料表和步骤图。
```

**Claude自动执行：**

1. 调用 `get_batch_notes_from_favorites` (limit=20, includeImages=true)
2. 使用Claude Vision识别：
   - 配料表图片 → 提取食材和用量
   - 步骤图片 → 理解烹饪流程
3. 生成标准化食谱合集（Markdown格式）

---

## 🔍 使用MCP Inspector调试

MCP Inspector是官方调试工具，可交互式测试所有工具。

### 安装

```bash
npm install -g @modelcontextprotocol/inspector
```

### 启动调试

```bash
# 方法1：使用全局命令
mcp-inspector rednote-mind-mcp

# 方法2：使用本地构建
mcp-inspector node /path/to/dist/server.js
```

### 调试界面功能

启动后自动打开浏览器，显示交互式界面：

#### 1. Tools标签页
- 查看所有7个工具
- 查看参数定义和JSON Schema
- 点击工具名查看详细文档

#### 2. Test Tool功能
**示例：测试搜索功能**

1. 选择工具：`search_notes_by_keyword`
2. 填写参数（JSON格式）：
   ```json
   {
     "keyword": "AI论文",
     "limit": 10,
     "sortType": "popular"
   }
   ```
3. 点击"Call Tool"执行
4. 查看返回结果（包含带xsec_token的URL）

#### 3. Logs标签页
- 实时查看服务器日志
- 查看`console.error`输出（进度信息）
- 调试错误和警告

### 调试示例

**示例1：测试登录状态**

```bash
mcp-inspector rednote-mind-mcp
# 在界面中选择 check_login_status
# 点击Call Tool（无需参数）
# 查看返回：{"isLoggedIn": true, "message": "已登录"}
```

**示例2：测试笔记内容获取**

```bash
mcp-inspector rednote-mind-mcp
# 选择 get_note_content
# 参数：
# {
#   "noteUrl": "https://www.xiaohongshu.com/explore/xxx?xsec_token=yyy",
#   "includeImages": true,
#   "includeData": true
# }
# 查看返回的完整笔记内容和Base64图片
```

### 调试技巧

1. **先测试简单工具** - 从`check_login_status`开始
2. **使用小数据量** - 测试批量工具时先用`limit: 2`
3. **保存测试用例** - 成功的参数可复制保存
4. **监控日志** - 所有`console.error`输出都在Logs中显示

---

## ❓ 常见问题

### Q1: 首次使用需要做什么？

运行 `rednote-init` 或 `rednote-mind-mcp init`，扫码登录小红书。Cookies和用户ID会自动保存到`~/.mcp/rednote/`目录。

### Q2: Cookies过期怎么办？

再次运行 `rednote-init` 重新登录，或在Claude Desktop中直接说"使用login工具重新登录小红书"。

### Q3: 为什么要自动点击提取xsec_token？

小红书的安全机制要求笔记URL带`xsec_token`参数才能访问内容。本工具通过自动点击每个笔记链接，提取浏览器跳转后的完整URL（包含token），确保`get_note_content`工具能成功访问。

### Q4: 如何验证用户ID是否正确提取？

运行登录后，检查`~/.mcp/rednote/config.json`文件：

```json
{
  "userId": "604dbc13000000000101f8b7"
}
```

如果显示的是`me`而不是24位ID，说明提取失败，请重新运行`rednote-init`。

### Q5: 支持哪些MCP客户端？

所有支持MCP协议的AI客户端：

- ✅ Claude Desktop（官方客户端）
- ✅ Claude Code（VS Code中的Claude）
- ✅ VS Code（Cline插件）
- ✅ Cursor（AI代码编辑器）
- ✅ Continue.dev（开源AI编码助手）
- ✅ OpenAI CLI（如果支持MCP）
- ✅ Gemini CLI（如果支持MCP）
- ✅ 其他实现MCP协议的客户端

### Q6: Cookie保存在哪里？

- **macOS/Linux**: `~/.mcp/rednote/cookies.json` 和 `~/.mcp/rednote/config.json`
- **Windows**: `%USERPROFILE%\.mcp\rednote\cookies.json` 和 `config.json`

**安全提示**：不要分享或删除这些文件，它们是登录凭证。

### Q7: 如何调试工具？

使用MCP Inspector：

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector rednote-mind-mcp
```

在浏览器中交互式测试所有工具，查看实时日志。

### Q8: Playwright安装失败怎么办？

本工具会在安装时自动下载Chromium浏览器（约150MB）。如果失败：

**使用国内镜像**：
```bash
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ npm install -g rednote-mind-mcp
```

**手动安装**：
```bash
npm install -g rednote-mind-mcp
npx playwright install chromium
```

---

## 📚 完整文档

- **[设置指南](./SETUP_GUIDE.md)** - 详细安装和配置步骤
- **[使用指南](./MCP_USAGE_GUIDE.md)** - 所有7个工具的详细用法
- **[NPM发布指南](./NPM_PUBLISH_GUIDE.md)** - 开发者发布流程

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

基于 [RedNote-MCP](https://github.com/iFurySt/RedNote-MCP) 开发，感谢原作者 [@iFurySt](https://github.com/iFurySt)。

**改进点**：
- ✅ 增强用户体验：首次登录引导（`rednote-init`命令）
- ✅ 智能Token提取：自动点击笔记获取xsec_token
- ✅ 真实用户ID：自动提取并保存，不再使用`/me`占位符
- ✅ 全局npm安装：无需克隆仓库，3条命令完成配置
- ✅ 8+客户端支持：完整的MCP客户端集成文档

---

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE)

---

## 💡 设计理念

**核心哲学**：让AI接入你的小红书，就像能够了解你的备忘录一样。

- **零手动复制** - AI自动获取URL和内容
- **智能容错** - 自动提取token和用户ID，避免403/404错误
- **首次体验友好** - `rednote-init`引导式登录
- **开发者友好** - MCP Inspector交互式调试

**技术亮点**：

1. **自动Token提取** - 通过Playwright自动点击笔记，获取浏览器跳转后的完整URL（含xsec_token）
2. **真实用户ID** - 登录时访问`/user/profile/me`，提取重定向后的真实ID并保存
3. **Claude Vision集成** - 图片Base64输出，AI能分析论文图表、菜谱步骤图
4. **全局命令** - npm全局安装后，`rednote-mind-mcp`和`rednote-init`全局可用

---

**最后更新**: 2025-10-21
**版本**: 0.2.0
**GitHub**: [https://github.com/CopeeeTang/rednote-mind-mcp](https://github.com/CopeeeTang/rednote-mind-mcp)

---

**立即开始** → 运行 `npm install -g rednote-mind-mcp && rednote-init` 🚀
