#!/usr/bin/env ts-node

/**
 * 测试功能2：直接通过URL获取笔记内容和图片（带登录）
 *
 * 测试内容：
 * 1. 首先访问首页并检测登录状态，未登录则给 20 秒手动登录
 * 2. 通过指定的笔记 URL 获取完整内容
 * 3. 包含文本内容（标题、作者、正文、标签等）
 * 4. 包含所有图片（Base64 编码）
 */

import { chromium, type BrowserContext, type Page, type Cookie } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getNoteContent } from '../src/tools/noteContent';

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

async function checkLogin(page: Page): Promise<void> {
  console.log('🔐 检测登录状态...');

  try {
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(3000);

    const loginStatus = await page.evaluate(() => {
      const indicators = {
        hasCookies: document.cookie.includes('web_session') ||
                    document.cookie.includes('xsecappid') ||
                    document.cookie.includes('a1=') ||
                    document.cookie.includes('webId='),
        hasUserAvatar: document.querySelectorAll('[class*="avatar"]').length > 0,
        hasLoginButton: (() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          return buttons.some(btn => {
            const text = btn.textContent?.trim().toLowerCase() || '';
            return text.includes('登录') || text.includes('login');
          });
        })()
      };
      const isLoggedIn = (indicators.hasCookies || indicators.hasUserAvatar) && !indicators.hasLoginButton;
      return { isLoggedIn, indicators };
    });

    if (!loginStatus.isLoggedIn) {
      console.log('⚠️ 检测到未登录状态！');
      console.log('💡 指标检查：');
      console.log(`   - Cookies: ${loginStatus.indicators.hasCookies ? '✓' : '✗'}`);
      console.log(`   - 用户头像: ${loginStatus.indicators.hasUserAvatar ? '✓' : '✗'}`);
      console.log(`   - 登录按钮: ${loginStatus.indicators.hasLoginButton ? '✗ (有)' : '✓ (无)'}`);
      console.log('\n🕒 给你 20 秒手动登录...');
      console.log('💡 请在浏览器窗口中：');
      console.log('   1. 点击登录按钮');
      console.log('   2. 扫码或输入账号密码');
      console.log('   3. 完成登录\n');

      for (let i = 20; i > 0; i -= 5) {
        console.log(`⏳ 剩余 ${i} 秒...`);
        await page.waitForTimeout(5000);
      }

      console.log('✅ 继续执行...\n');
    } else {
      console.log('✅ 登录状态正常\n');
    }
  } catch (error) {
    console.log('⚠️ 首页访问失败，继续尝试...\n');
  }
}

async function main() {
  console.log('🧪 测试功能2：直接通过URL获取笔记内容和图片（带登录）\n');
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

    // 2. 检测登录状态
    console.log('=' .repeat(80));
    console.log('\n📌 步骤 2: 检测登录状态\n');
    await checkLogin(page);

    // 3. 保存 cookies
    await saveCookies(context);

    // 4. 测试获取笔记内容（使用指定的笔记 URL）
    console.log('=' .repeat(80));
    console.log('\n📌 步骤 3: 获取笔记内容和图片\n');

    // 使用从收藏夹测试中获取的 explore URL + xsec_token（重要！）
    const testNoteUrl = 'https://www.xiaohongshu.com/explore/68f20cd20000000005039099?xsec_token=ABVac4cok59CTu-meGIKPOuUNTmanNT7s-KH8gXwLzhTo%3D&xsec_source=pc_collect';

    console.log(`测试 URL: ${testNoteUrl}`);
    console.log(`包含图片: 是\n`);

    const noteContent = await getNoteContent(page, testNoteUrl, true);

    // 5. 显示结果
    console.log('\n' + '='.repeat(80));
    console.log('📊 笔记内容获取成功!\n');
    console.log('=' .repeat(80));

    console.log('\n📝 笔记基本信息:');
    console.log(`  标题: ${noteContent.title}`);
    console.log(`  笔记 ID: ${noteContent.noteId}`);
    console.log(`  URL: ${noteContent.url}`);
    console.log('');

    console.log('👤 作者信息:');
    console.log(`  名称: ${noteContent.author.name}`);
    console.log(`  主页: ${noteContent.author.url || '无'}`);
    console.log('');

    console.log('📄 正文内容:');
    console.log(`  长度: ${noteContent.content.length} 字`);
    if (noteContent.content.length > 0) {
      const preview = noteContent.content.substring(0, 200);
      console.log(`  预览: ${preview}${noteContent.content.length > 200 ? '...' : ''}`);
    }
    console.log('');

    console.log('🏷️  标签和互动:');
    console.log(`  标签: ${noteContent.tags.join(', ') || '无'}`);
    console.log(`  点赞: ${noteContent.likes}`);
    console.log(`  收藏: ${noteContent.collects}`);
    console.log(`  评论: ${noteContent.comments}`);
    console.log(`  发布时间: ${noteContent.publishTime || '未知'}`);
    console.log('');

    console.log('🖼️  图片数据:');
    console.log(`  图片数量: ${noteContent.images.length}`);
    if (noteContent.images.length > 0) {
      const totalSize = noteContent.images.reduce((sum, img) => sum + img.size, 0);
      console.log(`  总大小: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log('');
      console.log('  图片列表:');
      noteContent.images.forEach((img, idx) => {
        console.log(`    [${idx + 1}] ${img.url.substring(0, 60)}...`);
        console.log(`        大小: ${(img.size / 1024).toFixed(2)} KB`);
        console.log(`        MIME: ${img.mimeType}`);
        console.log(`        Base64长度: ${img.base64.length} 字符`);
      });
    }
    console.log('');

    console.log('=' .repeat(80));
    console.log('\n✅ 功能2测试成功！\n');

    console.log('📋 数据摘要:');
    console.log(`  笔记URL: ${noteContent.url}`);
    console.log(`  笔记ID: ${noteContent.noteId}`);
    console.log(`  正文长度: ${noteContent.content.length} 字`);
    console.log(`  图片数量: ${noteContent.images.length} 张`);
    console.log(`  标签数量: ${noteContent.tags.length} 个`);
    console.log('');

    // 显示完整的JSON数据（可选）
    const showFullJson = false; // 设置为 true 查看完整JSON
    if (showFullJson) {
      console.log('=' .repeat(80));
      console.log('\n📌 完整的笔记数据（JSON格式）:\n');
      // 不包含 Base64 图片数据（太长）
      const displayData = {
        ...noteContent,
        images: noteContent.images.map(img => ({
          url: img.url,
          size: img.size,
          mimeType: img.mimeType,
          base64Length: img.base64.length
        }))
      };
      console.log(JSON.stringify(displayData, null, 2));
      console.log('');
    }

    console.log('=' .repeat(80));
    console.log('\n💡 两个功能都测试完成！可以继续进行 MCP 集成测试\n');

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
