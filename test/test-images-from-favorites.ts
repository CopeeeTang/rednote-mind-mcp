#!/usr/bin/env ts-node

/**
 * 测试图片下载 API - 从收藏夹中获取笔记
 * 这个方法更可靠，因为：
 * 1. 先访问收藏夹建立会话
 * 2. 使用真实的收藏笔记 URL
 * 3. 避免 token 过期问题
 */

import { chromium, type BrowserContext, type Page, type Cookie } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getFavoritesList } from '../src/tools/favoritesList';
import { downloadNoteImages, toClaudeVisionFormat, saveImagesToLocal } from '../src/tools/imageDownloader';

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
  console.log('🧪 测试图片下载 API - 从收藏夹获取笔记\n');

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
    }

    page = await context.newPage();

    // 2. 从收藏夹获取笔记列表
    console.log('📌 步骤 2: 从收藏夹获取笔记列表');
    const favorites = await getFavoritesList(page, '604dbc13000000000101f8b7', 5);

    // 2.5. 保存登录状态（如果有新的 cookies）
    try {
      const newCookies = await context.cookies();
      if (newCookies.length > 0) {
        // 确保目录存在
        const cookieDir = path.dirname(COOKIE_PATH);
        if (!fs.existsSync(cookieDir)) {
          fs.mkdirSync(cookieDir, { recursive: true });
        }

        fs.writeFileSync(COOKIE_PATH, JSON.stringify(newCookies, null, 2), 'utf-8');
        console.log(`\n  💾 已保存登录状态 (${newCookies.length} 个 cookies)\n`);
      }
    } catch (error) {
      console.log('  ⚠️ cookies 保存失败（非致命错误）\n');
    }

    if (favorites.length === 0) {
      console.log('❌ 未找到收藏笔记\n');
      return;
    }

    console.log(`✅ 获取到 ${favorites.length} 条收藏\n`);

    // 3. 选择第一个笔记进行测试
    const testNote = favorites[0];
    console.log('📌 步骤 3: 测试下载第一个笔记的图片');
    console.log(`  笔记标题: ${testNote.title}`);
    console.log(`  笔记 URL: ${testNote.url}`);
    console.log(`  笔记 ID: ${testNote.noteId}\n`);

    // 4. 下载图片（warmup = false，因为已经访问过收藏夹了）
    console.log('  💡 注意：下载笔记图片需要访问笔记详情页\n');
    const images = await downloadNoteImages(page, testNote.url, false);

    console.log(`\n✅ 下载了 ${images.length} 张图片\n`);

    // 只在真正下载到图片时才保存
    if (images.length > 0) {
      images.forEach((img, idx) => {
        console.log(`[图片 ${idx + 1}]`);
        console.log(`  URL: ${img.url.substring(0, 60)}...`);
        console.log(`  大小: ${(img.size / 1024).toFixed(2)} KB`);
        console.log(`  MIME: ${img.mimeType}`);
        console.log(`  Base64 长度: ${img.base64.length} 字符`);
        console.log('');
      });

      // 5. 测试 Claude Vision 格式转换
      console.log('📌 步骤 4: 测试 Claude Vision 格式转换');
      const claudeFormat = toClaudeVisionFormat(images[0]);
      console.log('✅ 转换成功\n');
      console.log('Claude Vision 格式示例:');
      console.log(JSON.stringify({
        type: claudeFormat.type,
        source: {
          type: claudeFormat.source.type,
          media_type: claudeFormat.source.media_type,
          data: claudeFormat.source.data.substring(0, 100) + '...'
        }
      }, null, 2));

      // 6. 保存图片到本地
      console.log('\n📌 步骤 5: 保存图片到本地');
      const savedPaths = saveImagesToLocal(images, testNote.noteId);
      console.log('✅ 图片已保存！\n');
      console.log('保存位置:');
      savedPaths.forEach((filepath, idx) => {
        console.log(`  [${idx + 1}] ${filepath}`);
      });
      console.log('');
    } else {
      console.log('⚠️ 该笔记没有图片，或图片下载失败');
      console.log('💡 建议：尝试收藏夹中的其他笔记\n');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ API 测试完成！\n');

    console.log('💡 总结：');
    console.log(`   - 收藏夹笔记: ${favorites.length} 条`);
    console.log(`   - 测试笔记: ${testNote.title}`);
    console.log(`   - 下载图片: ${images.length} 张`);
    if (images.length > 0) {
      const totalSize = images.reduce((sum, img) => sum + img.size, 0);
      console.log(`   - 总大小: ${(totalSize / 1024).toFixed(2)} KB`);

      // 显示保存路径
      const tmpDir = path.join(os.tmpdir(), 'rednote-images', testNote.noteId);
      console.log(`   - 保存目录: ${tmpDir}`);

      console.log('\n🎉 图片下载功能正常工作！');
      console.log('\n💡 查看图片：');
      console.log(`   macOS: open ${tmpDir}`);
      console.log(`   或直接在 Finder 中打开: ${tmpDir}`);
    } else {
      console.log('\n⚠️ 该笔记可能是视频类型，建议测试其他笔记');
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('\n堆栈:', error.stack);
    }
  } finally {
    if (page) {
      console.log('⏳ 浏览器将在 10 秒后关闭...');
      await page.waitForTimeout(10000);
    }
    await browser.close();
  }
}

main().catch(console.error);
