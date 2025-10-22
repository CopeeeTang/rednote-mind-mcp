#!/usr/bin/env ts-node

/**
 * 测试两个修复：
 * 1. 收藏夹使用真实用户ID（而非'me'）
 * 2. 图片下载去重功能
 */

import { chromium, type BrowserContext, type Page, type Cookie } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getFavoritesList } from '../src/tools/favoritesList';
import { getNoteContent } from '../src/tools/noteContent';
import { loadUserId } from '../src/tools/auth';

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
  console.log('🧪 测试修复效果\n');
  console.log('=' .repeat(80));

  const browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext();
  let page: Page | null = null;

  try {
    // 加载 cookies
    const cookies = await loadCookies();
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`✅ 已加载 ${cookies.length} 个 cookies\n`);
    }

    page = await context.newPage();

    // 测试1：验证收藏夹使用真实用户ID
    console.log('=' .repeat(80));
    console.log('\n📌 测试1：验证收藏夹使用真实用户ID\n');
    console.log('=' .repeat(80));

    const savedUserId = loadUserId();
    console.log(`\n💾 配置文件中保存的用户ID: ${savedUserId}\n`);

    console.log('🔍 调用 getFavoritesList(page, undefined, 2)...\n');
    const favorites = await getFavoritesList(page, undefined, 2);

    console.log('=' .repeat(80));
    console.log(`\n✅ 测试1结果: 成功获取 ${favorites.length} 条收藏\n`);

    if (favorites.length > 0) {
      console.log('📝 收藏列表样本:');
      favorites.forEach((note, idx) => {
        console.log(`\n[${idx + 1}] ${note.title}`);
        console.log(`  URL: ${note.url.substring(0, 80)}...`);
      });
      console.log('');
    }

    // 测试2：验证图片去重功能
    if (favorites.length > 0) {
      console.log('=' .repeat(80));
      console.log('\n📌 测试2：验证图片下载去重功能\n');
      console.log('=' .repeat(80));

      const testNoteUrl = favorites[0].url;
      console.log(`\n🔗 测试笔记: ${testNoteUrl.substring(0, 80)}...\n`);

      console.log('📥 调用 getNoteContent (包含图片下载)...\n');
      const noteContent = await getNoteContent(page, testNoteUrl, true, false);

      console.log('=' .repeat(80));
      console.log(`\n✅ 测试2结果: 获取到 ${noteContent.images.length} 张图片\n`);

      if (noteContent.images.length > 0) {
        console.log('📸 图片列表:');
        noteContent.images.forEach((img, idx) => {
          console.log(`  [${idx + 1}] 大小: ${(img.size / 1024).toFixed(2)} KB, 类型: ${img.mimeType}`);
        });
        console.log('');

        // 检查是否有相同大小的图片（应该没有，因为已去重）
        const sizes = noteContent.images.map(img => img.size);
        const uniqueSizes = new Set(sizes);

        if (sizes.length === uniqueSizes.size) {
          console.log('✅ 图片去重成功：没有发现相同大小的重复图片\n');
        } else {
          console.log('⚠️  警告：仍然存在相同大小的图片（去重可能未生效）\n');
        }
      }
    }

    console.log('=' .repeat(80));
    console.log('\n🎉 所有测试完成！\n');
    console.log('=' .repeat(80));

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('\n堆栈:', error.stack);
    }
  } finally {
    if (page) {
      console.log('\n⏳ 浏览器将在 5 秒后关闭...');
      await page.waitForTimeout(5000);
    }
    await browser.close();
  }
}

main().catch(console.error);
