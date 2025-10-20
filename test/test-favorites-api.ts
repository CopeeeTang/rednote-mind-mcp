#!/usr/bin/env ts-node

/**
 * 测试收藏夹 API
 */

import { chromium, type BrowserContext, type Page, type Cookie } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getFavoritesList } from '../src/tools/favoritesList';

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

async function saveCookies(context: BrowserContext): Promise<void> {
  try {
    const cookies = await context.cookies();
    if (cookies.length > 0) {
      const cookieDir = path.dirname(COOKIE_PATH);
      if (!fs.existsSync(cookieDir)) {
        fs.mkdirSync(cookieDir, { recursive: true });
      }
      fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
      console.log(`\n💾 已保存登录状态 (${cookies.length} 个 cookies)\n`);
    }
  } catch (error) {
    console.log('⚠️ cookies 保存失败（非致命错误）\n');
  }
}

async function main() {
  console.log('🧪 测试功能1：获取收藏夹笔记列表（带登录）\n');
  console.log('=' .repeat(80));

  const browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext();
  let page: Page | null = null;

  try {
    // 1. 加载 cookies
    console.log('\n📌 步骤 1: 加载 cookies');
    const cookies = await loadCookies();
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`✅ 已加载 ${cookies.length} 个 cookies\n`);
    } else {
      console.log('⚠️ 未找到已保存的 cookies，将进行首次登录\n');
    }

    page = await context.newPage();

    // 2. 获取收藏夹列表（包含登录检测）
    console.log('=' .repeat(80));
    console.log('\n📌 步骤 2: 获取收藏夹笔记列表');
    console.log('\n💡 注意：getFavoritesList 会自动检测登录状态');
    console.log('   - 如果未登录，会给 20 秒时间手动登录');
    console.log('   - 登录成功后会自动继续\n');
    console.log('=' .repeat(80));

    const userId = '604dbc13000000000101f8b7';
    const limit = 10;

    console.log(`\n参数:`);
    console.log(`  用户ID: ${userId}`);
    console.log(`  数量: ${limit}\n`);

    const favorites = await getFavoritesList(page, userId, limit);

    // 3. 保存 cookies（如果有新的）
    await saveCookies(context);

    // 4. 显示结果
    console.log('=' .repeat(80));
    console.log(`\n📊 测试结果: 成功获取 ${favorites.length} 条收藏笔记\n`);
    console.log('=' .repeat(80));

    if (favorites.length === 0) {
      console.log('\n⚠️ 未找到收藏笔记');
      console.log('💡 可能原因:');
      console.log('   1. 收藏夹为空');
      console.log('   2. 登录状态失效');
      console.log('   3. 用户 ID 不正确\n');
    } else {
      console.log('\n📝 笔记列表:\n');

      favorites.forEach((note, idx) => {
        console.log(`[${idx + 1}/${favorites.length}] ${note.title}`);
        console.log(`  📄 笔记 URL: ${note.url}`);
        console.log(`  🆔 笔记 ID: ${note.noteId}`);
        console.log(`  🖼️  封面: ${note.cover.substring(0, 70)}...`);
        if (note.collectTime) {
          console.log(`  ⏰ 收藏时间: ${note.collectTime}`);
        }
        console.log('');
      });

      console.log('=' .repeat(80));
      console.log('\n✅ 功能1测试成功！\n');

      console.log('📋 数据摘要:');
      console.log(`  总笔记数: ${favorites.length}`);
      console.log(`  有效 URL: ${favorites.filter(n => n.url).length}`);
      console.log(`  有效笔记 ID: ${favorites.filter(n => n.noteId).length}`);
      console.log(`  有封面: ${favorites.filter(n => n.cover).length}`);
      console.log('');

      // 显示第一个笔记的完整信息作为示例
      if (favorites.length > 0) {
        console.log('=' .repeat(80));
        console.log('\n📌 第一条笔记的完整数据（JSON格式）:\n');
        console.log(JSON.stringify(favorites[0], null, 2));
        console.log('');
      }
    }

    console.log('=' .repeat(80));
    console.log('\n💡 下一步: 运行 npm run test:note-content 测试获取笔记内容和图片\n');

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
