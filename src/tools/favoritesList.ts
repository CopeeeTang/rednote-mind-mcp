/**
 * 收藏夹列表获取工具
 * 基于 research/explore-favorites.ts 的调研结果实现
 */

import type { Page } from 'playwright';
import type { FavoriteNote } from '../types';
import { getUserId } from './auth';

/**
 * 从小红书收藏夹获取笔记列表
 *
 * @param page Playwright Page 实例
 * @param userId 用户 ID（从收藏夹 URL 获取，或使用 'me' 表示当前用户）
 * @param limit 返回的笔记数量限制（默认 20）
 * @returns 收藏夹笔记列表
 *
 * @example
 * ```typescript
 * const favorites = await getFavoritesList(page, '604dbc13000000000101f8b7', 10);
 * console.log(`获取到 ${favorites.length} 条收藏`);
 * ```
 */
export async function getFavoritesList(
  page: Page,
  userId?: string,
  limit: number = 20
): Promise<FavoriteNote[]> {
  // 如果未提供 userId，从配置文件读取
  const actualUserId = userId || getUserId();
  console.log(`  👤 使用用户 ID: ${actualUserId}`);
  // 1. 访问首页并检查登录状态
  console.log('  🔐 步骤 1: 访问首页并检查登录状态...');
  try {
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(3000); // 等待页面完全加载

    // 检查是否已登录（更宽松的检测）
    const loginStatus = await page.evaluate(() => {
      // 检查多个登录状态指标
      const indicators = {
        // 检查用户头像/个人中心按钮（多种可能的选择器）
        hasUserAvatar: document.querySelectorAll('[class*="user-avatar"]').length > 0 ||
                       document.querySelectorAll('[class*="user-head"]').length > 0 ||
                       document.querySelectorAll('[class*="avatar"]').length > 0 ||
                       document.querySelectorAll('img[alt*="头像"]').length > 0,

        // 检查是否有明确的登录按钮
        hasLoginButton: (() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          return buttons.some(btn => {
            const text = btn.textContent?.trim().toLowerCase() || '';
            return text.includes('登录') || text.includes('login');
          });
        })(),

        // 检查 localStorage 中的用户信息
        hasUserInfo: localStorage.getItem('user') !== null ||
                     localStorage.getItem('userId') !== null,

        // 检查 cookies 中的登录标记
        hasCookies: document.cookie.includes('web_session') ||
                    document.cookie.includes('xsecappid') ||
                    document.cookie.includes('a1=') || // 小红书特有的 cookie
                    document.cookie.includes('webId='),

        // 检查页面 URL 是否包含用户 ID（登录后首页会跳转）
        hasUserInUrl: window.location.href.includes('/user/') ||
                      window.location.href.includes('/profile/')
      };

      // 更宽松的判断：只要有 cookies 或用户信息，且没有明确的登录按钮，就认为已登录
      const isLoggedIn = (indicators.hasCookies || indicators.hasUserInfo) && !indicators.hasLoginButton;

      return {
        isLoggedIn,
        indicators
      };
    });

    if (!loginStatus.isLoggedIn) {
      console.log('  ⚠️ 检测到未登录状态！');
      console.log('  💡 指标检查：');
      console.log(`     - 用户头像: ${loginStatus.indicators.hasUserAvatar ? '✓' : '✗'}`);
      console.log(`     - 用户信息 (localStorage): ${loginStatus.indicators.hasUserInfo ? '✓' : '✗'}`);
      console.log(`     - 登录 Cookies: ${loginStatus.indicators.hasCookies ? '✓' : '✗'}`);
      console.log(`     - 用户 URL: ${loginStatus.indicators.hasUserInUrl ? '✓' : '✗'}`);
      console.log(`     - 登录按钮: ${loginStatus.indicators.hasLoginButton ? '✗ (有登录按钮)' : '✓ (无登录按钮)'}`);
      console.log('\n  🕒 给你 20 秒手动登录...');
      console.log('  💡 请在浏览器窗口中：');
      console.log('     1. 点击登录按钮');
      console.log('     2. 扫码或输入账号密码');
      console.log('     3. 完成登录');
      console.log('     4. 看到首页个人中心即表示成功\n');

      // 等待 20 秒供用户手动登录
      for (let i = 20; i > 0; i -= 5) {
        console.log(`  ⏳ 剩余 ${i} 秒...`);
        await page.waitForTimeout(5000);
      }

      // 再次检查登录状态
      const loginStatusAfter = await page.evaluate(() => {
        const hasUserAvatar = document.querySelectorAll('[class*="user-avatar"]').length > 0 ||
                             document.querySelectorAll('[class*="user-head"]').length > 0;
        const hasLoginButton = document.querySelectorAll('[class*="login"]').length > 0;
        return hasUserAvatar && !hasLoginButton;
      });

      if (loginStatusAfter) {
        console.log('  ✅ 登录成功！正在保存登录状态...\n');
        // 登录状态会在 test 脚本中自动保存 cookies
      } else {
        console.log('  ⚠️ 仍未检测到登录状态，继续尝试...\n');
      }

    } else {
      console.log('  ✅ 登录状态正常\n');
    }

  } catch (error) {
    console.log('  ⚠️ 首页访问失败，继续尝试...\n');
  }

  // 2. 导航到收藏夹页面
  console.log('  📂 访问收藏夹页面...');
  const url = `https://www.xiaohongshu.com/user/profile/${actualUserId}?tab=fav&subTab=note`;

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // 2. 等待笔记列表渲染完成
  // 根据调研结果，笔记容器是 section.note-item
  console.log('  🔍 查找收藏笔记...');
  console.log(`  📄 当前页面 URL: ${page.url()}`);
  try {
    await page.waitForSelector('section.note-item', { timeout: 30000 }); // 增加超时时间到30秒

    // 额外等待，确保 JavaScript 加载完整的链接
    console.log('  ⏳ 等待链接加载...');
    await page.waitForTimeout(3000);

    // 滚动页面，触发懒加载
    console.log('  📜 滚动页面触发懒加载...');
    await page.evaluate(() => {
      window.scrollBy(0, 500); // 向下滚动 500px
    });
    await page.waitForTimeout(2000); // 等待 2 秒

    // 调试：检查找到多少个笔记元素
    const noteCount = await page.evaluate(() => {
      return document.querySelectorAll('section.note-item').length;
    });
    console.log(`  ✅ 找到 ${noteCount} 个笔记元素`);
  } catch (error) {
    throw new Error('收藏夹页面加载失败或未找到笔记列表。请确保已登录并有收藏的笔记。');
  }

  // 3. 悬停触发链接加载，然后提取URL
  console.log('  🖱️  悬停笔记提取URL...');
  const noteElements = await page.$$('section.note-item');
  const hoverCount = Math.min(noteElements.length, limit);

  for (let i = 0; i < hoverCount; i++) {
    try {
      await noteElements[i].hover();

      // 随机延迟 800-1500ms，模拟人类行为，避免触发反爬
      const randomDelay = 800 + Math.random() * 700;
      await page.waitForTimeout(randomDelay);

      if ((i + 1) % 3 === 0) {
        // 每 3 个笔记额外暂停 1-2 秒
        console.log(`  ⏳ 已悬停 ${i + 1}/${hoverCount}，暂停片刻...`);
        await page.waitForTimeout(1000 + Math.random() * 1000);
      }
    } catch (error) {
      // 继续处理下一个
    }
  }
  console.log(`  ✅ 已悬停 ${hoverCount} 个笔记元素\n`);

  // 4. 提取笔记信息（包含xsec_token的URL）
  const rawData = await page.evaluate((maxItems) => {
    const items = Array.from(document.querySelectorAll('section.note-item')).slice(0, maxItems);

    return items.map((item) => {
      // 查找所有链接，找到包含 /explore/ 的笔记链接
      const allLinks = Array.from(item.querySelectorAll('a')) as HTMLAnchorElement[];

      let noteUrl = '';
      let noteId = '';
      let xsecToken = '';

      for (const link of allLinks) {
        const href = link.href || link.getAttribute('href') || '';

        // 从 profile 链接中提取 token 和 noteId
        if (href.includes('xsec_token=') && href.includes('/profile/')) {
          const noteIdMatch = href.match(/\/profile\/[^/]+\/([a-zA-Z0-9]+)/);
          const tokenMatch = href.match(/xsec_token=([^&]+)/);

          if (noteIdMatch && noteIdMatch[1] && noteIdMatch[1].length >= 20) {
            noteId = noteIdMatch[1];
            if (tokenMatch && tokenMatch[1]) {
              xsecToken = decodeURIComponent(tokenMatch[1]);
            }
          }
        }

        // 备用：获取 explore 链接
        if (href.includes('/explore/')) {
          const noteIdMatch = href.match(/\/explore\/([a-zA-Z0-9]+)/);
          if (noteIdMatch && noteIdMatch[1] && noteIdMatch[1].length >= 20 && !noteId) {
            noteId = noteIdMatch[1];
          }
        }
      }

      // 构造最终URL：使用 explore URL + token 参数
      if (noteId) {
        if (xsecToken) {
          // 构造带 token 的 explore URL
          noteUrl = `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${encodeURIComponent(xsecToken)}`;
        } else {
          // 没有token就用基本的 explore URL
          noteUrl = `https://www.xiaohongshu.com/explore/${noteId}`;
        }
      }

      // 提取标题
      const titleEl = item.querySelector('[class*="title"]');
      const title = titleEl?.textContent?.trim() || '';

      // 提取封面
      const imgEl = item.querySelector('img') as HTMLImageElement;
      const cover = imgEl?.src || '';

      return {
        title,
        url: noteUrl,
        noteId,
        cover
      };
    });
  }, limit);

  console.log(`\n  📊 提取结果: 共 ${rawData.length} 条`);

  // 过滤掉没有 URL 的条目
  const extractedNotes = rawData.filter(note => note.url && note.noteId);

  console.log(`  ✅ 有效笔记: ${extractedNotes.length} 条\n`);

  // 调试输出
  if (extractedNotes.length > 0) {
    console.log('  📊 样本数据（前 2 条）:');
    extractedNotes.slice(0, 2).forEach((item, idx) => {
      console.log(`\n    [${idx + 1}]`);
      console.log(`      标题: ${item.title || '(无)'}`);
      console.log(`      URL: ${item.url.substring(0, 100)}...`);
      console.log(`      笔记 ID: ${item.noteId}`);
      console.log(`      封面: ${item.cover.substring(0, 60)}...`);
    });
  }

  return extractedNotes;
}

/**
 * 从当前登录用户的收藏夹获取笔记列表
 *
 * @param page Playwright Page 实例
 * @param limit 返回的笔记数量限制（默认 20）
 * @returns 收藏夹笔记列表
 */
export async function getMyFavorites(
  page: Page,
  limit: number = 20
): Promise<FavoriteNote[]> {
  return getFavoritesList(page, 'me', limit);
}
