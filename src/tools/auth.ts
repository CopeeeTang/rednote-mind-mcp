/**
 * 登录与认证工具
 */

import type { Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const COOKIE_PATH = path.join(os.homedir(), '.mcp', 'rednote', 'cookies.json');

/**
 * 检查登录状态
 *
 * @param page Playwright Page 实例
 * @returns 登录状态信息
 */
export async function checkLoginStatus(page: Page): Promise<{ isLoggedIn: boolean; message: string }> {
  console.error('🔐 检测登录状态...');

  try {
    // 访问首页
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(3000);

    // 检查登录状态指标
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

      return {
        isLoggedIn,
        indicators
      };
    });

    if (loginStatus.isLoggedIn) {
      console.error('✅ 已登录');
      return {
        isLoggedIn: true,
        message: '已登录小红书，cookies有效'
      };
    } else {
      console.error('❌ 未登录');
      return {
        isLoggedIn: false,
        message: '未登录。请使用 login 工具进行登录'
      };
    }
  } catch (error: any) {
    console.error('⚠️ 登录状态检查失败:', error.message);
    return {
      isLoggedIn: false,
      message: `登录状态检查失败: ${error.message}`
    };
  }
}

/**
 * 登录小红书
 *
 * @param page Playwright Page 实例
 * @param timeout 等待用户完成登录的超时时间（毫秒），默认60秒
 * @returns 登录结果
 */
export async function loginToXiaohongshu(
  page: Page,
  timeout: number = 60000
): Promise<{ success: boolean; message: string }> {
  console.error('\n🔐 开始登录流程...\n');
  console.error('=' .repeat(80));
  console.error('\n📌 登录说明：');
  console.error('  1. 浏览器窗口将打开小红书首页');
  console.error('  2. 请点击登录按钮');
  console.error('  3. 使用扫码或密码方式登录');
  console.error(`  4. 完成登录后，系统会在 ${timeout / 1000} 秒内自动检测并保存登录状态\n`);
  console.error('=' .repeat(80));

  try {
    // 访问首页
    console.error('\n🌐 正在打开小红书首页...');
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(3000);

    // 检查是否已登录
    const initialStatus = await checkLoginStatus(page);
    if (initialStatus.isLoggedIn) {
      console.error('✅ 检测到已登录状态，无需重新登录');
      return {
        success: true,
        message: '已处于登录状态'
      };
    }

    // 等待用户完成登录
    console.error('\n⏳ 等待用户完成登录...');
    console.error(`💡 请在浏览器窗口中完成登录操作（${timeout / 1000}秒超时）\n`);

    const startTime = Date.now();
    const checkInterval = 3000; // 每3秒检查一次

    while (Date.now() - startTime < timeout) {
      await page.waitForTimeout(checkInterval);

      // 检查是否已登录
      const currentStatus = await page.evaluate(() => {
        const hasCookies = document.cookie.includes('web_session') ||
                          document.cookie.includes('a1=');
        const hasAvatar = document.querySelectorAll('[class*="avatar"]').length > 0;
        const hasLoginButton = Array.from(document.querySelectorAll('button, a')).some(btn => {
          const text = btn.textContent?.trim().toLowerCase() || '';
          return text.includes('登录') || text.includes('login');
        });

        return (hasCookies || hasAvatar) && !hasLoginButton;
      });

      if (currentStatus) {
        console.error('✅ 检测到登录成功！');

        // 保存 cookies
        const context = page.context();
        const cookies = await context.cookies();

        if (cookies.length > 0) {
          const cookieDir = path.dirname(COOKIE_PATH);
          if (!fs.existsSync(cookieDir)) {
            fs.mkdirSync(cookieDir, { recursive: true });
          }
          fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
          console.error(`💾 已保存 ${cookies.length} 个 cookies 到: ${COOKIE_PATH}`);
        }

        console.error('\n' + '='.repeat(80));
        console.error('✅ 登录成功！后续操作将自动使用保存的登录状态');
        console.error('=' .repeat(80) + '\n');

        return {
          success: true,
          message: `登录成功！已保存 ${cookies.length} 个 cookies`
        };
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor((timeout - (Date.now() - startTime)) / 1000);
      console.error(`⏳ 仍在等待登录... (已等待 ${elapsed}秒，剩余 ${remaining}秒)`);
    }

    // 超时
    console.error('\n❌ 登录超时');
    return {
      success: false,
      message: `登录超时。请确保在 ${timeout / 1000} 秒内完成登录操作`
    };

  } catch (error: any) {
    console.error('\n❌ 登录过程中出错:', error.message);
    return {
      success: false,
      message: `登录失败: ${error.message}`
    };
  }
}

/**
 * 加载已保存的 cookies
 */
export function loadSavedCookies(): any[] {
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

/**
 * 检查是否有已保存的 cookies
 */
export function hasSavedCookies(): boolean {
  return fs.existsSync(COOKIE_PATH);
}
