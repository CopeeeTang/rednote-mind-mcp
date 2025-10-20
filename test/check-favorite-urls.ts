#!/usr/bin/env ts-node

/**
 * 检查收藏夹URL是否包含token参数
 */

import { chromium, type BrowserContext, type Cookie } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const COOKIE_PATH = path.join(os.homedir(), '.mcp', 'rednote', 'cookies.json');

async function main() {
  console.log('🔍 检查收藏夹URL是否包含token参数\n');

  const browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext();

  try {
    // 加载cookies
    if (fs.existsSync(COOKIE_PATH)) {
      const cookies: Cookie[] = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
      await context.addCookies(cookies);
      console.log(`✅ 已加载 ${cookies.length} 个 cookies\n`);
    }

    const page = await context.newPage();

    // 访问收藏夹页面
    console.log('📂 访问收藏夹页面...');
    await page.goto('https://www.xiaohongshu.com/user/profile/604dbc13000000000101f8b7?tab=fav&subTab=note', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // 提取前3个笔记的链接
    const linkData = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('section.note-item')).slice(0, 3);

      return items.map(item => {
        const links = Array.from(item.querySelectorAll('a')) as HTMLAnchorElement[];
        const allHrefs: string[] = [];

        for (const link of links) {
          const href = link.href;
          allHrefs.push(href);
        }

        return {
          allLinks: allHrefs
        };
      });
    });

    console.log('\n📋 前3个笔记的链接详情:\n');
    linkData.forEach((data, idx) => {
      console.log(`[${idx + 1}]`);
      console.log(`  找到 ${data.allLinks.length} 个链接:`);
      data.allLinks.forEach((link, i) => {
        console.log(`    [${i + 1}] ${link}`);

        // 分析URL
        try {
          const url = new URL(link);
          if (url.searchParams.toString()) {
            console.log(`        查询参数: ${url.searchParams.toString()}`);
          }
        } catch (e) {
          // 不是有效的URL
        }
      });
      console.log('');
    });

    console.log('⏳ 浏览器将在10秒后关闭...');
    await page.waitForTimeout(10000);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
