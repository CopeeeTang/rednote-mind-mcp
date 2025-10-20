# Rednote-Mind-MCP 设置指南

## 📋 目录

1. [环境要求](#环境要求)
2. [安装步骤](#安装步骤)
3. [首次登录](#首次登录)
4. [配置 Claude Desktop](#配置-claude-desktop)
5. [验证安装](#验证安装)
6. [故障排除](#故障排除)

## 环境要求

### 必需软件

- **Node.js**: >= 18.0.0（推荐使用 LTS 版本）
- **npm**: >= 8.0.0
- **Claude Desktop**: 最新版本

### 操作系统支持

- macOS 10.15+
- Windows 10/11
- Linux（主流发行版）

### 网络要求

- 能够访问小红书网站（xiaohongshu.com）
- 稳定的网络连接

## 安装步骤

### 1. 克隆或下载项目

```bash
git clone <repository-url>
cd rednote-mind-mcp
```

### 2. 安装依赖

```bash
npm install
```

这将自动安装所有必需的依赖包：

- `@modelcontextprotocol/sdk` - MCP SDK
- `playwright` - 浏览器自动化工具
- `zod` - TypeScript 模式验证
- 其他依赖...

### 3. 安装 Playwright 浏览器

```bash
npx playwright install chromium
```

这会下载 Chromium 浏览器（约 300MB），用于网页抓取。

### 4. 编译项目

```bash
npm run build
```

编译成功后，`dist/` 目录将包含以下文件：

```
dist/
├── server.js         # MCP 服务器入口
├── index.js          # 导出模块
├── types.d.ts        # TypeScript 类型定义
└── tools/            # 所有工具函数
    ├── auth.js
    ├── search.js
    ├── favoritesList.js
    ├── noteContent.js
    ├── batchNotes.js
    └── imageDownloader.js
```

## 首次登录

### 方法 1: 使用 MCP 工具登录（推荐）

启动 Claude Desktop 后，在对话中发送：

```
请使用 login 工具登录小红书
```

这会：

1. 打开浏览器窗口（非 headless 模式）
2. 导航到小红书登录页面
3. 等待你完成登录（扫码或密码登录）
4. 检测登录成功后自动保存 cookies
5. 关闭浏览器窗口

**登录超时**: 默认 60 秒，可通过 `timeout` 参数调整（30-120 秒）

### 方法 2: 手动测试登录

运行编译后的服务器测试登录：

```bash
node dist/server.js
```

然后在 Claude Desktop 中调用 `login` 工具。

### Cookies 存储位置

登录成功后，cookies 保存在：

- **macOS/Linux**: `~/.mcp/rednote/cookies.json`
- **Windows**: `%USERPROFILE%\.mcp\rednote\cookies.json`

**重要**: 不要删除或修改此文件，它是后续所有操作的凭证。

## 配置 Claude Desktop

### macOS 配置

1. 打开配置文件：

   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. 添加以下配置：

   ```json
   {
     "mcpServers": {
       "rednote": {
         "command": "node",
         "args": ["/绝对路径/rednote-mind-mcp/dist/server.js"]
       }
     }
   }
   ```

   **注意**: 将 `/绝对路径/` 替换为你的实际项目路径。

3. 保存文件并重启 Claude Desktop

### Windows 配置

1. 打开配置文件：

   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. 添加以下配置：

   ```json
   {
     "mcpServers": {
       "rednote": {
         "command": "node",
         "args": ["C:\\绝对路径\\rednote-mind-mcp\\dist\\server.js"]
       }
     }
   }
   ```

   **注意**: 使用双反斜杠 `\\` 或正斜杠 `/`

3. 保存文件并重启 Claude Desktop

### Linux 配置

1. 打开配置文件：

   ```bash
   nano ~/.config/Claude/claude_desktop_config.json
   ```

2. 添加配置（同 macOS）

3. 保存文件并重启 Claude Desktop

## 验证安装

### 1. 检查 MCP 服务器状态

重启 Claude Desktop 后，在对话中发送：

```
列出所有可用的 MCP 工具
```

应该看到 7 个工具：

- `check_login_status`
- `login`
- `search_notes_by_keyword`
- `get_favorites_list`
- `get_note_content`
- `get_batch_notes_from_favorites`
- `download_note_images`

### 2. 检查登录状态

```
使用 check_login_status 检查登录状态
```

预期返回：

```json
{
  "isLoggedIn": true,
  "message": "已登录小红书，cookies 有效"
}
```

### 3. 测试基本功能

#### 测试搜索

```
使用 search_notes_by_keyword 搜索"AI"，获取 5 条结果
```

#### 测试收藏夹

```
使用 get_favorites_list 获取收藏夹前 5 条笔记
```

#### 测试笔记内容获取

```
使用 get_note_content 获取笔记 <你的笔记URL> 的内容
```

如果以上测试全部通过，说明安装成功！

## 故障排除

### 问题 1: "未找到 node 命令"

**原因**: Node.js 未正确安装或未添加到 PATH

**解决方案**:

1. 下载并安装 Node.js: <https://nodejs.org/>
2. 验证安装: `node --version`
3. 确保 PATH 环境变量包含 Node.js 路径

### 问题 2: "MCP 服务器未启动"

**原因**: Claude Desktop 配置错误或路径不正确

**解决方案**:

1. 检查 `claude_desktop_config.json` 中的路径是否为绝对路径
2. 确保 `dist/server.js` 文件存在
3. 查看 Claude Desktop 日志:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\logs\mcp*.log`

### 问题 3: "未登录" 错误

**原因**: Cookies 文件不存在或已过期

**解决方案**:

1. 运行 `login` 工具重新登录
2. 检查 cookies 文件是否存在: `~/.mcp/rednote/cookies.json`
3. 删除旧 cookies 并重新登录

### 问题 4: "搜索失败" 或 "获取内容失败"

**原因**: 小红书页面结构变化或反爬机制

**解决方案**:

1. 确保登录状态有效
2. 等待一段时间后重试（避免频繁请求）
3. 检查是否能在浏览器中正常访问小红书
4. 查看错误日志获取详细信息

### 问题 5: Playwright 安装失败

**原因**: 网络问题或权限不足

**解决方案**:

1. 使用国内镜像:

   ```bash
   PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ npx playwright install chromium
   ```

2. 或手动指定代理:

   ```bash
   export HTTPS_PROXY=http://your-proxy:port
   npx playwright install chromium
   ```

### 问题 6: 编译错误

**原因**: TypeScript 依赖或配置问题

**解决方案**:

1. 清除缓存并重新安装:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. 确保 TypeScript 版本 >= 5.0:

   ```bash
   npm install -D typescript@latest
   ```

3. 重新编译:

   ```bash
   npm run build
   ```

## 高级配置

### 自定义 Cookies 存储路径

编辑 `src/tools/auth.ts`，修改 `COOKIE_PATH` 常量：

```typescript
const COOKIE_PATH = path.join('/your/custom/path', 'cookies.json');
```

重新编译项目。

### 调整登录超时时间

在 Claude Desktop 中调用 `login` 工具时指定 `timeout` 参数：

```
使用 login 工具登录，timeout 设置为 90000（90秒）
```

### 启用调试模式

编辑 `src/server.ts`，将浏览器启动改为非 headless 模式（已默认）：

```typescript
browser = await chromium.launch({ headless: false });
```

这样可以看到浏览器操作过程，便于调试。

## 下一步

安装成功后，请阅读 [使用指南](./MCP_USAGE_GUIDE.md) 了解所有工具的详细用法和示例。

## 需要帮助？

如果遇到其他问题，请：

1. 查看项目 [README](./README.md)
2. 检查 [使用指南](./MCP_USAGE_GUIDE.md)
3. 提交 Issue 到 GitHub 仓库
