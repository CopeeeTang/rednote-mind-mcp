#!/usr/bin/env ts-node

/**
 * 测试批量笔记获取功能
 * 从收藏夹批量获取笔记内容（包含文本和图片）
 */

import { chromium, type BrowserContext, type Page, type Cookie } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getBatchNotesFromFavorites } from '../src/tools/batchNotes';

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
  console.log('🧪 测试批量笔记获取功能\n');

  const browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext();
  let page: Page | null = null;

  try {
    // 1. 加载 cookies
    console.log('📌 步骤 1: 加载 cookies');
    const cookies = await loadCookies();
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`✅ 已加载 ${cookies.length} 个 cookies\n`);
    } else {
      console.log('⚠️ 未找到已保存的 cookies，可能需要先运行 test:images-favorites 登录\n');
    }

    page = await context.newPage();

    // 2. 批量获取笔记（从收藏夹）
    console.log('📌 步骤 2: 从收藏夹批量获取笔记内容');
    console.log('   数量: 3 条');
    console.log('   包含图片: 是\n');

    const result = await getBatchNotesFromFavorites(
      page,
      '604dbc13000000000101f8b7', // 替换成你的用户 ID，或使用 'me'
      3,
      true
    );

    console.log('\n' + '='.repeat(80));
    console.log('📊 批量获取完成!\n');

    console.log(`✅ 成功: ${result.successCount} 条`);
    console.log(`❌ 失败: ${result.failedCount} 条\n`);

    if (result.notes.length > 0) {
      console.log('📝 笔记列表:\n');
      result.notes.forEach((note, idx) => {
        console.log(`[${idx + 1}] ${note.title}`);
        console.log(`    笔记 ID: ${note.noteId}`);
        console.log(`    作者: ${note.author.name}`);
        console.log(`    正文: ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}`);
        console.log(`    标签: ${note.tags.join(', ') || '无'}`);
        console.log(`    互动: 👍 ${note.likes} | ⭐ ${note.collects} | 💬 ${note.comments}`);
        console.log(`    图片: ${note.images.length} 张`);
        console.log('');
      });
    }

    if (result.errors.length > 0) {
      console.log('⚠️ 失败的笔记:\n');
      result.errors.forEach((err, idx) => {
        console.log(`[${idx + 1}] ${err.url.substring(0, 60)}...`);
        console.log(`    错误: ${err.error}\n`);
      });
    }

    console.log('✅ 测试完成!\n');

    // 3. 保存测试结果到 JSON 文件
    const outputPath = path.join(os.tmpdir(), 'rednote-batch-notes-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 结果已保存到: ${outputPath}\n`);

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
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
