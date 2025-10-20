# Rednote-Mind-MCP 使用指南

完整的 MCP 工具使用文档，包含所有 7 个工具的详细说明和示例。

## 📚 目录

1. [工具概览](#工具概览)
2. [认证工具](#认证工具)
3. [内容获取工具](#内容获取工具)
4. [搜索工具](#搜索工具)
5. [图片工具](#图片工具)
6. [在 Claude Desktop 中的使用场景](#在-claude-desktop-中的使用场景)
7. [性能优化建议](#性能优化建议)
8. [故障排查](#故障排查)

---

## 工具概览

Rednote-Mind-MCP 提供 7 个 MCP 工具：

| 工具名称 | 功能 | 主要用途 |
|---------|------|---------|
| `check_login_status` | 检查登录状态 | 验证 cookies 是否有效 |
| `login` | 登录小红书 | 首次使用或 cookies 过期时登录 |
| `search_notes_by_keyword` | 按关键词搜索 | 发现新内容 |
| `get_favorites_list` | 获取收藏夹列表 | 快速浏览收藏 |
| `get_note_content` | 获取笔记完整内容 | 深度分析单个笔记 |
| `get_batch_notes_from_favorites` | 批量获取收藏夹内容 | 批量分析收藏笔记 |
| `download_note_images` | 下载笔记图片 | 仅需要图片，不需要文本 |

---

## 认证工具

### 1. check_login_status

**功能**: 检查小红书登录状态

**参数**: 无

**返回**:
```json
{
  "isLoggedIn": true,
  "message": "已登录小红书，cookies 有效"
}
```

**在 Claude Desktop 中使用**:

```
使用 check_login_status 检查登录状态
```

**使用场景**:
- 验证 cookies 是否过期
- 调试登录问题
- 定期检查认证状态

---

### 2. login

**功能**: 登录小红书（打开浏览器窗口引导用户登录）

**参数**:
- `timeout` (可选): 等待登录的超时时间（毫秒），默认 60000（60秒），范围 30000-120000

**返回**:
```json
{
  "success": true,
  "message": "登录成功，cookies 已保存到 ~/.mcp/rednote/cookies.json"
}
```

**在 Claude Desktop 中使用**:

```
请使用 login 工具登录小红书
```

或指定超时时间：

```
使用 login 工具登录，timeout 设置为 90000（90秒）
```

**登录流程**:
1. 工具打开浏览器窗口（非 headless 模式）
2. 导航到小红书首页
3. 等待用户完成登录（扫码或密码登录）
4. 检测到登录成功后自动保存 cookies
5. 关闭浏览器窗口

**注意事项**:
- Cookies 保存在 `~/.mcp/rednote/cookies.json`（macOS/Linux）或 `%USERPROFILE%\.mcp\rednote\cookies.json`（Windows）
- 登录成功后，后续所有工具自动使用保存的 cookies
- 如果超时未完成登录，需要重新运行工具

---

## 内容获取工具

### 3. get_favorites_list

**功能**: 获取当前用户的收藏夹笔记列表

**参数**:
- `limit` (可选): 返回的笔记数量，默认 20，范围 1-50

**返回**:
```json
[
  {
    "title": "笔记标题",
    "url": "https://www.xiaohongshu.com/explore/xxx",
    "noteId": "xxx",
    "cover": "https://sns-webpic-qc.xhscdn.com/...",
    "author": {
      "name": "作者名",
      "url": "https://www.xiaohongshu.com/user/profile/xxx"
    }
  }
]
```

**在 Claude Desktop 中使用**:

```
使用 get_favorites_list 获取我的收藏夹，限制 30 条
```

**使用场景**:
- 快速浏览收藏夹
- 获取笔记基本信息（标题、URL、封面）
- 不需要详细内容和图片

---

### 4. get_note_content

**功能**: 获取笔记的完整内容（文本 + 图片 + 互动数据）

**参数**:
- `noteUrl` (必需): 笔记 URL，如 `https://www.xiaohongshu.com/explore/xxx`
- `includeImages` (可选): 是否包含图片（Base64 编码），默认 true
- `includeData` (可选): 是否包含详细数据（标签、点赞、收藏、评论），默认 true

**返回**:
```json
{
  "url": "https://www.xiaohongshu.com/explore/xxx",
  "noteId": "xxx",
  "title": "笔记标题",
  "content": "正文内容...",
  "author": {
    "name": "作者名",
    "url": "https://..."
  },
  "tags": ["标签1", "标签2"],
  "likes": 1234,
  "collects": 567,
  "comments": 89,
  "images": [
    {
      "url": "https://...",
      "base64": "iVBORw0KG...",
      "size": 150000,
      "mimeType": "image/jpeg"
    }
  ],
  "publishTime": "2025-10-18"
}
```

**在 Claude Desktop 中使用**:

```
使用 get_note_content 获取笔记 https://www.xiaohongshu.com/explore/xxx 的完整内容
```

**参数控制示例**:

```
获取笔记内容，includeImages=false, includeData=true
```
仅返回文本和互动数据，不包含图片（性能更快）

```
获取笔记内容，includeImages=true, includeData=false
```
仅返回标题、作者、正文、图片，不包含标签和互动数据

**使用场景**:
- 深度分析单个笔记
- 使用 Claude Vision 分析图片内容
- 提取结构化数据（标签、互动数据）

---

### 5. get_batch_notes_from_favorites

**功能**: 从收藏夹批量获取笔记的完整内容

**参数**:
- `limit` (可选): 获取的笔记数量，默认 10，建议不超过 20（范围 1-20）
- `includeImages` (可选): 是否包含图片，默认 true

**返回**:
```json
{
  "successCount": 8,
  "failedCount": 2,
  "notes": [
    {
      "url": "...",
      "title": "...",
      "content": "...",
      "images": [...]
    }
  ],
  "errors": [
    {
      "url": "...",
      "error": "访问被拒绝"
    }
  ]
}
```

**在 Claude Desktop 中使用**:

```
使用 get_batch_notes_from_favorites 批量获取收藏夹前 10 条笔记的完整内容和图片
```

或不包含图片：

```
批量获取收藏夹前 15 条笔记，includeImages=false
```

**使用场景**:
- 批量分析收藏的笔记
- 趋势分析（分析收藏笔记的主题分布）
- 内容整理（如论文整理、菜谱合集）

**注意事项**:
- 每个笔记需要 2-5 秒处理时间
- 建议 limit 不超过 20 以避免超时
- 如果需要处理大量笔记，建议分批执行

---

## 搜索工具

### 6. search_notes_by_keyword

**功能**: 按关键词搜索小红书笔记

**参数**:
- `keyword` (必需): 搜索关键词
- `limit` (可选): 返回结果数量，默认 10，范围 1-50
- `sortType` (可选): 排序方式，默认 `general`（综合）
  - `general` - 综合排序（默认）
  - `popular` - 最热排序
  - `latest` - 最新排序

**返回**:
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

**在 Claude Desktop 中使用**:

```
使用 search_notes_by_keyword 搜索关键词"AI论文"，获取 20 条结果，按最热排序
```

或使用默认排序：

```
搜索"机器学习"，获取 15 条结果
```

**使用场景**:
- 发现新内容（非收藏夹中的笔记）
- 研究特定主题
- 收集特定领域的笔记

**排序方式说明**:
- `general`（综合）：小红书推荐的综合排序
- `popular`（最热）：按点赞、收藏数排序
- `latest`（最新）：按发布时间排序

---

## 图片工具

### 7. download_note_images

**功能**: 下载笔记的所有图片（包括轮播图中的所有图片）

**参数**:
- `noteUrl` (必需): 笔记 URL

**返回**:
```json
[
  {
    "url": "https://...",
    "base64": "iVBORw0KG...",
    "size": 150000,
    "mimeType": "image/jpeg"
  }
]
```

**在 Claude Desktop 中使用**:

```
使用 download_note_images 下载笔记 https://www.xiaohongshu.com/explore/xxx 的所有图片
```

**使用场景**:
- 仅需要图片，不需要文本内容
- 图片数量较多的笔记
- 使用 Claude Vision 分析图片

**注意**:
- 返回的图片是 Base64 编码，可直接传递给 Claude Vision
- 如果需要同时获取文本和图片，建议使用 `get_note_content`

---

## 在 Claude Desktop 中的使用场景

### 场景 1: 首次使用流程

**步骤 1: 检查登录状态**
```
使用 check_login_status 检查登录状态
```

**步骤 2: 如果未登录，执行登录**
```
使用 login 工具登录小红书
```
然后在打开的浏览器窗口中完成登录。

**步骤 3: 验证登录成功**
```
再次使用 check_login_status 检查登录状态
```

**步骤 4: 开始使用其他工具**
```
搜索"AI"，获取 10 条结果
```

---

### 场景 2: 趋势分析

**用户提示**:
```
我想了解我最近收藏的笔记有哪些主题趋势。
请分析我最近的 20 条收藏，总结主要话题和趋势。
```

**Claude 执行**:
1. 调用 `get_batch_notes_from_favorites` (limit=20, includeImages=false)
2. 分析文本内容中的关键词和主题
3. 使用标签和标题进行聚类
4. 生成趋势报告

---

### 场景 3: 论文整理

**用户提示**:
```
我收藏了 10 篇 AI 相关的论文笔记，
请帮我整理成结构化的论文列表，包括：
- 论文标题
- 核心观点
- 关键图表
- 参考价值
```

**Claude 执行**:
1. 调用 `get_batch_notes_from_favorites` (limit=10, includeImages=true, includeData=true)
2. 使用 Claude Vision 分析每篇论文的图片（公式、图表等）
3. 提取标签和互动数据（点赞高的论文可能更有价值）
4. 生成结构化的论文整理报告

---

### 场景 4: 内容发现

**用户提示**:
```
我想学习 Python，请帮我搜索"Python 教程"，
找出最热门的 15 条笔记，并总结学习路线。
```

**Claude 执行**:
1. 调用 `search_notes_by_keyword` (keyword="Python 教程", limit=15, sortType="popular")
2. 分析搜索结果的标题和作者
3. 对于感兴趣的笔记，调用 `get_note_content` 获取详细内容
4. 生成学习路线图

---

### 场景 5: 美食菜谱提取

**用户提示**:
```
我收藏了一些美食教程笔记，
请提取所有菜谱的步骤和配料表。
```

**Claude 执行**:
1. 调用 `get_batch_notes_from_favorites` (includeImages=true)
2. 使用 Claude Vision 分析图片中的文字（步骤图、配料表）
3. 结合正文内容提取结构化信息
4. 生成菜谱合集

---

### 场景 6: 智能筛选

**用户提示**:
```
我收藏了很多笔记，请帮我找出：
1. 包含代码的技术笔记
2. 包含论文截图的学术笔记
3. 包含产品截图的评测笔记

并分别整理。
```

**Claude 执行**:
1. 调用 `get_batch_notes_from_favorites` (limit=50, includeImages=true)
2. 使用 Claude Vision 分析图片内容（代码、论文、产品截图）
3. 结合标签进行分类
4. 生成分类报告

---

## 性能优化建议

### 1. 合理使用 includeImages 参数

**场景**: 仅需要文本分析（如趋势分析、关键词提取）

**建议**: 设置 `includeImages=false`

**效果**: 速度提升 60-80%

**示例**:
```
批量获取收藏夹前 20 条笔记，includeImages=false
```

---

### 2. 合理使用 includeData 参数

**场景**: 仅需要标题、作者、正文内容

**建议**: 设置 `includeData=false`

**效果**: 速度提升 20-30%

**示例**:
```
获取笔记内容，includeData=false, includeImages=true
```

---

### 3. 批量获取数量限制

| 场景 | 推荐 limit | 最大 limit | 预计耗时 |
|------|-----------|-----------|---------|
| 快速预览 | 5-10 | 10 | 10-50 秒 |
| 常规分析 | 10-15 | 20 | 20-75 秒 |
| 深度分析 | 不超过 20 | 20 | 40-100 秒 |

**注意**: 每个笔记需要 2-5 秒处理时间

---

### 4. 分批策略

**场景**: 需要处理大量笔记（50+）

**建议流程**:
1. 先使用 `get_favorites_list` 获取列表（仅基本信息）
2. 让 Claude 或用户筛选出需要详细分析的笔记
3. 对筛选后的笔记使用 `get_note_content` 或 `get_batch_notes_from_favorites`

**示例提示**:
```
先获取我收藏夹的前 50 条笔记列表，
然后帮我筛选出包含"AI"或"机器学习"标签的笔记，
再获取这些笔记的完整内容。
```

---

## 故障排查

### 问题 1: "未登录" 错误

**错误信息**: `未登录。请先使用 login 工具登录小红书`

**原因**: Cookies 文件不存在或已过期

**解决方法**:
```
使用 login 工具重新登录
```

---

### 问题 2: "搜索失败" 或 "页面被重定向"

**原因**: 登录状态失效或小红书页面结构变化

**解决方法**:
1. 检查登录状态:
   ```
   使用 check_login_status 检查登录状态
   ```

2. 如果未登录，重新登录:
   ```
   删除 cookies 文件，然后使用 login 工具重新登录
   ```

3. 等待一段时间后重试（避免触发反爬机制）

---

### 问题 3: "图片下载失败"

**可能原因**:
1. 笔记是视频类型（无图片）
2. 网络问题
3. 小红书 CDN 限制

**解决方法**:
1. 确认笔记类型（查看 URL 是否是图文笔记）
2. 检查网络连接
3. 设置 `includeImages=false` 仅获取文本

---

### 问题 4: 批量获取超时

**原因**: 获取数量过多或网络较慢

**解决方法**:
1. 减少 `limit` 参数（建议不超过 20）
2. 设置 `includeImages=false` 提升速度
3. 分批执行（参考 [性能优化建议](#性能优化建议)）

---

### 问题 5: MCP 工具未在 Claude Desktop 中显示

**解决方法**:
1. 检查 `claude_desktop_config.json` 配置是否正确
2. 确认路径是绝对路径
3. 重启 Claude Desktop
4. 查看 Claude Desktop 日志:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\logs\mcp*.log`

详细的环境配置请参考 [设置指南](./SETUP_GUIDE.md)。

---

## 常见使用模式

### 模式 1: 探索 → 收藏 → 分析

1. 使用 `search_notes_by_keyword` 搜索感兴趣的主题
2. 手动在小红书中收藏喜欢的笔记
3. 使用 `get_batch_notes_from_favorites` 批量分析收藏的笔记

---

### 模式 2: 快速浏览 → 深度分析

1. 使用 `get_favorites_list` 快速浏览收藏夹（仅基本信息）
2. 选择感兴趣的笔记 URL
3. 使用 `get_note_content` 获取完整内容和图片

---

### 模式 3: 批量整理

1. 使用 `get_batch_notes_from_favorites` 获取大量笔记内容
2. 让 Claude 分析并分类整理
3. 生成结构化报告（如论文列表、菜谱合集、学习路线图）

---

## 总结

Rednote-Mind-MCP 提供了从登录、搜索、获取内容到图片下载的完整工具链，配合 Claude Desktop 可以实现：

- 自动化内容获取和分析
- 批量处理收藏的笔记
- 使用 Claude Vision 分析图片内容
- 生成结构化报告和摘要

**最佳实践**:
1. 首次使用先登录
2. 定期检查登录状态
3. 合理使用参数控制数据粒度
4. 大量笔记分批处理
5. 根据场景选择合适的工具

---

**最后更新**: 2025-10-20
**版本**: 0.2.0

需要更多帮助？请查看 [设置指南](./SETUP_GUIDE.md) 或 [README](./README.md)。
