

# Rednote-Mind-Skills

> 让 AI 成为你的知识管理助手：本地代码库 + 社交媒体热点追踪

[![npm version](https://badge.fury.io/js/rednote-mind-mcp.svg)](https://www.npmjs.com/package/rednote-mind-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

---

## 这是什么？

**Rednote-Mind-Skills** 是一套 Claude Code Skills + MCP 工具的组合，帮助你：

| 功能 | 描述 |
|------|------|
| **本地知识库** | 管理 `~/github` 下的仓库，AI 主动查询解决问题 (DeepWiki 风格) |
| **小红书研究** | 搜索笔记、分析收藏夹、提取图片文字 |
| **Twitter/X 抓取** | 获取推文完整内容 |
| **热点发现** | 多源搜索发现新仓库并自动 clone |

### 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                          │
├─────────────────────────────────────────────────────────┤
│  /github-kb skill                                       │
│  ├── search     → 搜索本地知识库                         │
│  ├── update     → 同步仓库索引                           │
│  ├── discover   → 多源发现新仓库                         │
│  ├── xiaohongshu → 小红书搜索                            │
│  └── twitter    → 推文抓取                               │
├─────────────────────────────────────────────────────────┤
│  MCP 工具层                                              │
│  ├── rednote-mind-mcp  → 小红书 7 个工具                 │
│  ├── tavily            → Web 搜索                       │
│  └── gh CLI            → GitHub 操作                    │
└─────────────────────────────────────────────────────────┘
```

---

## 快速开始 (5 分钟)

### 1. 安装 MCP 工具

```bash
# 安装小红书 MCP
npm install -g rednote-mind-mcp

# 首次登录小红书（扫码）
rednote-init
```

### 2. 配置 MCP 服务器

编辑 `~/.claude.json`（或 Claude Desktop 配置）:

```json
{
  "mcpServers": {
    "rednote": {
      "command": "npx",
      "args": ["-y", "rednote-mind-mcp"]
    },
    "tavily": {
      "command": "npx",
      "args": ["-y", "@tavily/mcp"],
      "env": {
        "TAVILY_API_KEY": "your_key"
      }
    }
  }
}
```

### 3. 安装 Skill

```bash
# 克隆仓库
git clone https://github.com/CopeeeTang/rednote-mind-skills.git

# 复制 skill 到 Claude Code skills 目录
cp -r rednote-mind-skills/skills/github-kb ~/.claude/skills/
```

### 4. 设置环境变量

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export JINA_API_KEY="your_jina_key"          # Twitter 抓取（必需）
export ZZZ_API_KEY="your_zzz_key"            # VLM 图片分析（可选，推荐）
export ZHIPU_API_KEY="your_zhipu_key"        # VLM 备选（有内置测试 Key）
```

### 5. 初始化知识库

```bash
mkdir -p ~/github
```

---

## Skill 使用指南

### `/github-kb search <keyword>`

搜索本地知识库中的仓库。

```
/github-kb search MCP
→ 匹配: mcp-servers, rednote-mind-mcp
→ 是否查看详情？
```

### `/github-kb update`

同步本地仓库到索引。

```
/github-kb update
→ 扫描 ~/github 下 15 个仓库
→ 新增: 2, 更新: 1, 删除: 0
→ 确认更新索引？
```

### `/github-kb discover <topic>`

多源发现并 clone 新仓库。

```
/github-kb discover Claude MCP tools
→ 搜索小红书、Twitter、Tavily...
→ 发现 5 个相关仓库:
  1. anthropics/claude-code (⭐ 12.3k)
  2. modelcontextprotocol/servers (⭐ 8.1k)
  ...
→ 选择要 clone 的仓库
```

### `/github-kb xiaohongshu <keyword>`

直接搜索小红书笔记。

```
/github-kb xiaohongshu Python 数据分析
→ 找到 10 条笔记
→ 是否分析收藏夹中的相关内容？
```

### `/github-kb twitter <url>`

抓取推文内容。

```
/github-kb twitter https://x.com/karpathy/status/123456
→ [Andrej Karpathy]
→ This is the tweet content...
```

---

## DeepWiki 模式

**AI 主动查询本地知识库**：当你问技术问题时，AI 会先检查本地仓库是否有答案。

```
你: 如何在 Python 中使用 MCP 工具？

AI: [检查本地知识库...]
    找到相关仓库: ~/github/mcp-python-sdk
    [读取 README.md 和 examples/]

    根据你本地的 mcp-python-sdk 仓库，使用方法如下：

    from mcp import Client
    client = Client()
    ...
```

**触发条件**：
- "How does X work?"
- "Show me an example of X"
- "What's the best practice for X?"

---

## MCP 工具详情

### 小红书 MCP (rednote-mind-mcp)

7 个工具，完整文档见 [skills/github-kb/references/xiaohongshu.md](skills/github-kb/references/xiaohongshu.md)

| 工具 | 功能 |
|------|------|
| `check_login_status` | 检查登录状态 |
| `login` | 扫码登录 |
| `search_notes_by_keyword` | 关键词搜索 |
| `get_favorites_list` | 获取收藏夹 |
| `get_note_content` | 获取笔记内容 |
| `get_batch_notes_from_favorites` | 批量获取收藏 |
| `download_note_images` | 下载图片 |

#### 图片处理模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `original` | 返回压缩后的 Base64 图片 | 需要查看原图 |
| `vlm` | VLM 分析，返回文字描述 | OCR、理解图片内容 |

#### VLM 提供商优先级

1. **智增增** (`ZZZ_API_KEY`) - 推荐，成本低
2. **智谱 GLM-4V** (`ZHIPU_API_KEY`) - 备选，有内置测试 Key

### Twitter/X 抓取

使用 Jina.ai Reader API，需要 `JINA_API_KEY`。

免费获取：https://jina.ai/

---

## 使用示例

### 示例 1：整理收藏夹中的 AI 论文

```
请分析我小红书收藏夹中最近 15 篇 AI 论文笔记，
提取论文标题、核心观点、关键图表，生成表格。
```

### 示例 2：发现热门开源项目

```
/github-kb discover LLM fine-tuning
→ 搜索多个来源...
→ 推荐仓库列表
→ Clone 到本地知识库
```

### 示例 3：技术问题查询

```
你: 如何配置 MCP 服务器？

AI: [检查本地知识库]
    找到: ~/github/modelcontextprotocol-servers
    根据本地文档，配置方法如下...
```

### 示例 4：VLM 分析图片

```
获取笔记 https://www.xiaohongshu.com/explore/xxx?xsec_token=...，
使用 VLM 模式分析图片中的文字和公式。
```

---

## 配置参考

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `JINA_API_KEY` | Twitter 功能 | [Jina.ai](https://jina.ai/) 免费获取 |
| `ZZZ_API_KEY` | 可选 | [智增增](https://zhizengzeng.com) VLM API |
| `ZHIPU_API_KEY` | 可选 | [智谱](https://bigmodel.cn) GLM-4V API |
| `TAVILY_API_KEY` | discover 功能 | [Tavily](https://tavily.com) 搜索 API |

### 数据存储

| 数据 | 路径 |
|------|------|
| 知识库目录 | `~/github/` (可配置) |
| 知识库索引 | `~/github/CLAUDE.md` |
| 小红书 Cookies | `~/.mcp/rednote/cookies.json` |
| 下载的图片 | `~/.mcp/rednote/images/` |

### 自定义知识库路径

在项目的 `CLAUDE.md` 中添加：

```markdown
KB_PATH: /your/custom/path
```

---

## 故障排除

### 小红书登录过期

```bash
rm ~/.mcp/rednote/cookies.json
rednote-init
```

### Twitter 抓取失败

```bash
# 检查 API Key
echo $JINA_API_KEY

# 测试 API
curl -s "https://r.jina.ai/https://x.com" -H "Authorization: Bearer $JINA_API_KEY" | head -20
```

### VLM 分析不工作

- 检查 `ZZZ_API_KEY` 或 `ZHIPU_API_KEY` 是否设置
- 智谱有内置测试 Key，应该开箱即用

### Skill 未加载

```bash
# 确认 skill 目录存在
ls ~/.claude/skills/github-kb/

# 检查 SKILL.md 格式
cat ~/.claude/skills/github-kb/SKILL.md
```

---

## 项目结构

```
rednote-mind-skills/
├── README.md                    # 本文件
├── skills/
│   └── github-kb/               # Claude Code Skill
│       ├── SKILL.md             # Skill 定义
│       ├── references/
│       │   ├── xiaohongshu.md   # 小红书工具文档
│       │   ├── twitter.md       # Twitter 工具文档
│       │   └── setup.md         # 配置指南
│       └── scripts/
│           ├── fetch_tweet.py   # 推文抓取脚本
│           └── fetch_tweets.sh  # 批量抓取脚本
├── src/                         # MCP 服务器源码
├── package.json                 # npm 包 (rednote-mind-mcp)
└── ...
```

---

## 贡献

欢迎提交 Issue 和 Pull Request！

基于 [RedNote-MCP](https://github.com/iFurySt/RedNote-MCP) 开发，感谢原作者 [@iFurySt](https://github.com/iFurySt)。

---

## License

MIT License - 详见 [LICENSE](./LICENSE)

---

**GitHub**: [https://github.com/CopeeeTang/rednote-mind-skills](https://github.com/CopeeeTang/rednote-mind-skills)

**npm**: [rednote-mind-mcp](https://www.npmjs.com/package/rednote-mind-mcp)

---

**立即开始**：
```bash
npm install -g rednote-mind-mcp && rednote-init
```
