#!/usr/bin/env node

/**
 * Rednote-Mind-MCP CLI
 * Init 命令 - 引导用户登录小红书
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { loginToXiaohongshu, hasSavedCookies } from './tools/auth';

async function main() {
  console.log('\n🚀 Rednote-Mind-MCP 初始化向导\n');

  // 检查是否已经登录
  if (hasSavedCookies()) {
    console.log('✅ 检测到已保存的登录凭证\n');
    console.log('如果需要重新登录，请删除 cookies 文件：');
    console.log('  - macOS/Linux: ~/.mcp/rednote/cookies.json');
    console.log('  - Windows: %USERPROFILE%\\.mcp\\rednote\\cookies.json\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('是否要重新登录？(y/N): ', async (answer: string) => {
      readline.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('\n✅ 初始化完成！你可以开始使用 Rednote-Mind-MCP 了。\n');
        process.exit(0);
      }

      console.log('\n🔄 准备重新登录...\n');
      await performLogin();
    });
  } else {
    console.log('📝 首次使用，需要登录小红书\n');
    await performLogin();
  }
}

async function performLogin() {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    console.log('🌐 正在启动浏览器...\n');

    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
    page = await context.newPage();

    console.log('🔐 开始登录流程...');
    console.log('⏱️  等待时间：60 秒\n');
    console.log('请在打开的浏览器窗口中完成以下操作：');
    console.log('  1. 扫码或密码登录小红书');
    console.log('  2. 登录成功后会自动检测并保存 cookies');
    console.log('  3. 请勿手动关闭浏览器窗口\n');

    const result = await loginToXiaohongshu(page, 60000);

    if (result.success) {
      console.log('\n✅ 登录成功！\n');
      console.log('Cookies 已保存到：');
      console.log('  - macOS/Linux: ~/.mcp/rednote/cookies.json');
      console.log('  - Windows: %USERPROFILE%\\.mcp\\rednote\\cookies.json\n');
      console.log('🎉 初始化完成！你可以开始使用 Rednote-Mind-MCP 了。\n');
      console.log('下一步：');
      console.log('  1. 配置你的 MCP 客户端（Claude Desktop、Cline、Cursor 等）');
      console.log('  2. 在配置文件中添加：');
      console.log('     {');
      console.log('       "mcpServers": {');
      console.log('         "rednote": {');
      console.log('           "command": "rednote-mind-mcp"');
      console.log('         }');
      console.log('       }');
      console.log('     }');
      console.log('  3. 重启 MCP 客户端\n');
      console.log('📚 查看完整文档：https://github.com/your-username/rednote-mind-mcp\n');
    } else {
      console.error('\n❌ 登录失败：', result.message);
      console.error('\n请重试：rednote-mind-mcp init\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ 发生错误：', error.message);
    console.error('\n请检查：');
    console.error('  1. Playwright 浏览器是否已安装：npx playwright install chromium');
    console.error('  2. 网络连接是否正常');
    console.error('  3. 是否有足够的磁盘空间\n');
    process.exit(1);
  } finally {
    // 清理资源
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

// 运行
main().catch((error) => {
  console.error('\n❌ 初始化失败：', error.message);
  process.exit(1);
});
