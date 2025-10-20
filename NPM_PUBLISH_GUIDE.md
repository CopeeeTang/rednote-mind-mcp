# NPM 发布指南 - Rednote-Mind-MCP

本文档提供完整的 npm 发布流程，从账号创建到发布和更新。

## 📋 前置准备

### 1. 创建 npm 账号

访问 https://www.npmjs.com/signup 创建账号：

1. 填写用户名（Username）
2. 填写邮箱（Email）
3. 设置密码（Password）
4. 完成邮箱验证

### 2. 安装 Node.js 和 npm

确保已安装 Node.js >= 18.0.0：

```bash
node --version  # 应该 >= v18.0.0
npm --version   # 应该 >= 8.0.0
```

### 3. 登录 npm

```bash
npm login
```

按提示输入：
- **Username**: 你的 npm 用户名
- **Password**: 你的密码
- **Email**: 你的邮箱

登录成功后，可以验证：

```bash
npm whoami
# 应显示你的用户名
```

---

## 🔧 发布前配置

### 1. 更新 package.json 信息

打开 `package.json`，修改以下占位符：

```json
{
  "name": "rednote-mind-mcp",
  "version": "0.2.0",
  "author": "你的名字 <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/rednote-mind-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/your-username/rednote-mind-mcp/issues"
  },
  "homepage": "https://github.com/your-username/rednote-mind-mcp#readme"
}
```

**必须修改**：
- `author`: 你的名字和邮箱
- `repository.url`: 你的 GitHub 仓库地址
- `bugs.url`: Issue 地址
- `homepage`: 项目主页

### 2. 更新 LICENSE 文件

打开 `LICENSE` 文件，将 `[Your Name]` 替换为你的名字。

### 3. 检查包名是否可用

```bash
npm view rednote-mind-mcp
```

如果返回 `404`，说明包名可用。如果已被占用，需要在 `package.json` 中修改 `name` 字段。

---

## 📦 首次发布

### 1. 构建项目

```bash
npm run build
```

确认 `dist/` 目录已生成，包含：
- `dist/server.js` - MCP 服务器
- `dist/cli.js` - Init 命令
- `dist/tools/` - 所有工具函数
- `dist/*.d.ts` - TypeScript 类型定义

### 2. 预览发布内容

使用 `--dry-run` 预览将要发布的文件：

```bash
npm publish --dry-run
```

检查输出，确保：
- ✅ 包含 `dist/` 目录
- ✅ 包含 `README.md`
- ✅ 包含 `LICENSE`
- ❌ 不包含 `src/`、`test/`、`research/` 等开发文件

### 3. 发布到 npm

```bash
npm publish
```

如果是首次发布，可能需要确认邮箱或添加双因素认证。

### 4. 验证发布

**在 npm 网站查看**：
访问 https://www.npmjs.com/package/rednote-mind-mcp

**本地测试安装**：
```bash
# 在新的目录测试
npm install -g rednote-mind-mcp

# 测试命令是否可用
rednote-mind-mcp --version
rednote-init --help
```

---

## 🚀 使用 GitHub CLI 推送代码

### 1. 安装 GitHub CLI (gh)

**macOS**:
```bash
brew install gh
```

**Windows**:
```bash
winget install --id GitHub.cli
```

**Linux**:
```bash
# Debian/Ubuntu
sudo apt install gh

# Fedora/RHEL
sudo dnf install gh
```

### 2. 登录 GitHub

```bash
gh auth login
```

按提示选择：
1. **What account do you want to log into?** → GitHub.com
2. **What is your preferred protocol for Git operations?** → HTTPS
3. **Authenticate Git with your GitHub credentials?** → Yes
4. **How would you like to authenticate?** → Login with a web browser

浏览器会打开，授权后即可登录。

### 3. 创建 GitHub 仓库

```bash
gh repo create rednote-mind-mcp --public --source=. --remote=origin
```

参数说明：
- `--public`: 创建公开仓库
- `--source=.`: 使用当前目录作为源
- `--remote=origin`: 设置 remote 名称为 origin

### 4. 推送代码

```bash
# 添加所有文件
git add .

# 创建提交
git commit -m "Initial commit: Rednote-Mind-MCP v0.2.0"

# 推送到 GitHub
git push -u origin main
```

### 5. 验证推送成功

```bash
# 在浏览器中打开仓库
gh repo view --web
```

---

## 🔄 更新发布流程

### 1. 更新版本号

使用 `npm version` 命令自动更新版本：

```bash
# Patch 版本 (0.2.0 -> 0.2.1): 修复 bug
npm version patch

# Minor 版本 (0.2.0 -> 0.3.0): 新增功能
npm version minor

# Major 版本 (0.2.0 -> 1.0.0): 破坏性更新
npm version major
```

这会自动：
1. 更新 `package.json` 中的 `version`
2. 创建 git commit
3. 创建 git tag

### 2. 推送更新

```bash
# 推送代码和标签
git push && git push --tags
```

### 3. 发布新版本

```bash
# 构建
npm run build

# 发布
npm publish
```

### 4. 创建 GitHub Release

```bash
gh release create v0.2.1 --title "v0.2.1" --notes "修复 bug 和性能优化"
```

---

## ✅ 发布检查清单

在发布前，确保完成以下检查：

### 代码质量
- [ ] 所有 TypeScript 编译无错误：`npm run build`
- [ ] 所有测试通过：`npm run test:favorites` 等
- [ ] 代码格式正确

### 文档完整性
- [ ] README.md 内容完整
- [ ] SETUP_GUIDE.md 配置说明清晰
- [ ] MCP_USAGE_GUIDE.md 工具说明完整
- [ ] 占位符已替换（author、repository URL 等）

### 版本信息
- [ ] `package.json` 版本号正确
- [ ] `src/server.ts` 版本号与 package.json 一致
- [ ] `src/index.ts` VERSION 常量正确

### 文件配置
- [ ] `.npmignore` 正确配置
- [ ] `LICENSE` 文件存在且信息正确
- [ ] `dist/` 目录已生成

### npm 配置
- [ ] 已登录 npm：`npm whoami`
- [ ] 包名可用：`npm view rednote-mind-mcp`
- [ ] 干运行成功：`npm publish --dry-run`

---

## ❓ 常见问题

### Q: 发布时提示 "403 Forbidden"

**原因**: 包名已被占用或无权限

**解决方案**:
1. 检查是否已登录：`npm whoami`
2. 更换包名（在 package.json 中修改 `name`）
3. 如果是更新，确保你是包的所有者

### Q: 发布时提示 "401 Unauthorized"

**原因**: 未登录或 token 过期

**解决方案**:
```bash
npm logout
npm login
```

### Q: 发布后无法安装

**原因**: npm 同步延迟（通常 5-10 分钟）

**解决方案**:
等待几分钟后重试：
```bash
npm install -g rednote-mind-mcp
```

### Q: 如何撤销已发布的版本？

**24 小时内可撤销**:
```bash
npm unpublish rednote-mind-mcp@0.2.0
```

**注意**: 超过 24 小时无法撤销，只能发布新版本。

### Q: 如何设置双因素认证（2FA）？

访问 https://www.npmjs.com/settings/your-username/twofa/enable

建议启用 2FA 保护你的包。

---

## 📚 版本号规范（Semver）

遵循语义化版本规范：`MAJOR.MINOR.PATCH`

- **MAJOR**: 破坏性更新（API 不兼容）
  - 示例：移除工具、修改参数结构
  - 0.2.0 → 1.0.0

- **MINOR**: 新增功能（向后兼容）
  - 示例：添加新工具、新增可选参数
  - 0.2.0 → 0.3.0

- **PATCH**: 修复 bug（向后兼容）
  - 示例：修复错误、性能优化
  - 0.2.0 → 0.2.1

---

## 🎉 发布成功后

### 1. 通知用户

在 GitHub 发布 Release，包含更新日志：

```bash
gh release create v0.2.0 \
  --title "v0.2.0 - Initial Release" \
  --notes "首次发布，提供 7 个 MCP 工具"
```

### 2. 更新文档

如果 README 或使用指南有变化，确保 GitHub 仓库中的文档也已更新。

### 3. 监控反馈

- 查看 npm 下载量：https://www.npmjs.com/package/rednote-mind-mcp
- 关注 GitHub Issues
- 响应用户问题

---

## 📞 需要帮助？

- **npm 文档**: https://docs.npmjs.com/
- **GitHub CLI 文档**: https://cli.github.com/manual/
- **语义化版本规范**: https://semver.org/

祝发布顺利！🚀
