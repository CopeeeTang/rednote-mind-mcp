#!/usr/bin/env ts-node

/**
 * 测试图片下载 API
 */

import { chromium, type BrowserContext, type Page, type Cookie } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { downloadNoteImages, toClaudeVisionFormat } from '../src/tools/imageDownloader';

const COOKIE_PATH = path.join(os.homedir(), '.mcp', 'rednote', 'cookies.json');

async function loadCookies(): Promise<Cookie[]> {
  try {
    if (fs.existsSync(COOKIE_PATH)) {
      const cookieData = fs.readFileSync(COOKIE_PATH, 'utf-8');
      return JSON.parse(cookieData);
    }
  } catch (error) {
    console.error('❌ 加载 cookies 失败:', error);
  }
  return [];
}

async function main() {
  console.log('🧪 测试图片下载 API\n');

  const browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext();
  let page: Page | null = null;

  try {
    // 1. 加载 cookies
    console.log('📌 加载 cookies');
    const cookies = await loadCookies();
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`✅ 已加载 ${cookies.length} 个 cookies\n`);
    }

    page = await context.newPage();

    // 2. 测试图片下载
    // 使用调研时的测试笔记（去掉 URL 参数，只保留基础 URL）
    const fullUrl = 'https://www.xiaohongshu.com/explore/68efc1e00000000003022fc4?xsec_token=ABGWbF7sL-qZJ7E3Mp9VsEgbt5pqkPwf4vtT7O9kOte5c=&xsec_source=pc_feed';
    const testNoteUrl = fullUrl.split('?')[0]; // 去掉查询参数

    console.log('📌 测试 downloadNoteImages');
    console.log(`  原始 URL: ${fullUrl}`);
    console.log(`  测试 URL: ${testNoteUrl}\n`);

    const images = await downloadNoteImages(page, testNoteUrl);

    console.log(`✅ 下载了 ${images.length} 张图片\n`);

    images.forEach((img, idx) => {
      console.log(`[图片 ${idx + 1}]`);
      console.log(`  URL: ${img.url.substring(0, 60)}...`);
      console.log(`  大小: ${(img.size / 1024).toFixed(2)} KB`);
      console.log(`  MIME: ${img.mimeType}`);
      console.log(`  Base64 长度: ${img.base64.length} 字符`);
      console.log('');
    });

    // 3. 测试 Claude Vision 格式转换
    if (images.length > 0) {
      console.log('📌 测试 toClaudeVisionFormat');
      const claudeFormat = toClaudeVisionFormat(images[0]);
      console.log('✅ 转换成功，格式：');
      console.log(JSON.stringify(claudeFormat, null, 2).substring(0, 200) + '...\n');
    }

    console.log('=' .repeat(80));
    console.log('\n✅ API 测试完成！\n');

    console.log('💡 下一步：');
    console.log('   1. 整合收藏夹和图片下载功能');
    console.log('   2. 创建 MCP 工具注册\n');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('\n堆栈:', error.stack);
    }
  } finally {
    if (page) {
      console.log('⏳ 浏览器将在 5 秒后关闭...');
      await page.waitForTimeout(5000);
    }
    await browser.close();
  }
}

main().catch(console.error);
