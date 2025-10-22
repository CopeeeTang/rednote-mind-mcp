/**
 * 登录与认证工具
 */

import type { Page } from 'playwright';
import { logger } from './logger';
import type { LoginResult } from '../types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TIMING, USER_CONSTANTS } from './constants';

export const COOKIE_PATH = path.join(os.homedir(), '.mcp', 'rednote', 'cookies.json');
export const CONFIG_PATH = path.join(os.homedir(), '.mcp', 'rednote', 'config.json');

/**
 * 检查登录状态
 *
 * @param page Playwright Page 实例
 * @returns 登录状态信息
 */
export async function checkLoginStatus(page: Page): Promise<{ isLoggedIn: boolean; message: string }> {
  logger.debug('🔐 检测登录状态...');

  try {
    // 访问首页
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(TIMING.INITIAL_PAGE_WAIT_MS);

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
      logger.debug('✅ 已登录');
      return {
        isLoggedIn: true,
        message: '已登录小红书，cookies有效'
      };
    } else {
      logger.debug('❌ 未登录');
      return {
        isLoggedIn: false,
        message: '未登录。请使用 login 工具进行登录'
      };
    }
  } catch (error: any) {
    logger.debug('⚠️ 登录状态检查失败:', error.message);
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
): Promise<LoginResult> {
  logger.debug('\n🔐 开始登录流程...\n');
  logger.debug('=' .repeat(80));
  logger.debug('\n📌 登录说明：');
  logger.debug('  1. 浏览器窗口将打开小红书首页');
  logger.debug('  2. 请点击登录按钮');
  logger.debug('  3. 使用扫码或密码方式登录');
  logger.debug(`  4. 完成登录后，系统会在 ${timeout / 1000} 秒内自动检测并保存登录状态\n`);
  logger.debug('=' .repeat(80));

  try {
    // 访问首页
    logger.debug('\n🌐 正在打开小红书首页...');
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(TIMING.INITIAL_PAGE_WAIT_MS);

    // 检查是否已登录
    const initialStatus = await checkLoginStatus(page);
    if (initialStatus.isLoggedIn) {
      logger.debug('✅ 检测到已登录状态，无需重新登录');
      const existingUserId = loadUserId();
      const hasValidUserId = Boolean(
        existingUserId &&
        existingUserId !== 'me' &&
        existingUserId.length >= USER_CONSTANTS.MIN_USER_ID_LENGTH
      );
      let warnings: string[] | undefined;
      if (!hasValidUserId) {
        const warning = '已检测到登录状态，但未找到有效的用户 ID。收藏夹功能可能受限，请手动访问个人主页或重新运行 rednote-init。';
        logger.debug(`⚠️  ${warning}`);
        warnings = [warning];
      }
      return {
        success: true,
        message: '已处于登录状态',
        userIdExtracted: hasValidUserId,
        warnings
      };
    }

    // 等待用户完成登录
    logger.debug('\n⏳ 等待用户完成登录...');
    logger.debug(`💡 请在浏览器窗口中完成登录操作（${timeout / 1000}秒超时）\n`);

    const startTime = Date.now();
    const checkInterval = TIMING.LOGIN_CHECK_INTERVAL_MS; // 每3秒检查一次

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
        logger.debug('✅ 检测到登录成功！');

        const context = page.context();
        const cookies = await context.cookies();

        if (cookies.length > 0) {
          const cookieDir = path.dirname(COOKIE_PATH);
          if (!fs.existsSync(cookieDir)) {
            fs.mkdirSync(cookieDir, { recursive: true });
          }
          fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
          logger.debug(`💾 已保存 ${cookies.length} 个 cookies 到: ${COOKIE_PATH}`);
        }

        const warnings: string[] = [];
        let userIdExtracted = false;
        const appendWarning = (message: string) => {
          warnings.push(message);
          logger.debug(`⚠️  ${message}`);
        };

        try {
          logger.debug('🔍 正在提取用户 ID...');

          await page.goto('https://www.xiaohongshu.com', {
            waitUntil: 'domcontentloaded',
            timeout: TIMING.PROFILE_NAVIGATION_TIMEOUT_MS
          });
          await page.waitForTimeout(TIMING.USER_ID_EXTRACTION_DELAY_MS);

          logger.debug('   正在查找"我"的按钮...');

          const profileButtonHandle = await page.evaluateHandle<HTMLElement | null>(() => {
            const findProfileButton = () => {
              const links = Array.from(document.querySelectorAll('a, button, div[role="button"]'));
              let profileLink = links.find(el => {
                const text = el.textContent?.trim() || '';
                return text === '我' || text.includes('个人中心') || text.includes('我的');
              }) as HTMLElement | undefined;

              if (!profileLink) {
                const avatarLinks = Array.from(document.querySelectorAll('a[href*="/user/profile/"]'));
                if (avatarLinks.length > 0) {
                  profileLink = avatarLinks[0] as HTMLElement;
                }
              }

              return profileLink ?? null;
            };

            return findProfileButton();
          });

          try {
            const profileElement = profileButtonHandle.asElement();

            if (profileElement) {
              let navigationSucceeded = false;
              try {
                await Promise.all([
                  page.waitForNavigation({
                    waitUntil: 'domcontentloaded',
                    timeout: TIMING.PROFILE_NAVIGATION_TIMEOUT_MS
                  }),
                  profileElement.click()
                ]);
                navigationSucceeded = true;
              } catch (navigationError: any) {
                appendWarning(`点击个人主页后未能完成导航：${navigationError?.message || navigationError}`);
              }

              if (navigationSucceeded) {
                logger.debug('   已点击"我"的按钮，等待页面跳转...');
                await page.waitForTimeout(TIMING.POST_PROFILE_NAV_DELAY_MS);

                const currentUrl = page.url();
                logger.debug(`   跳转后URL: ${currentUrl}`);

                const userId = await page.evaluate((minLength: number) => {
                  const match = window.location.pathname.match(/\/user\/profile\/([a-zA-Z0-9]+)/);
                  const extracted = match ? match[1] : null;
                  if (extracted && extracted !== 'me' && extracted.length >= minLength) {
                    return extracted;
                  }
                  return null;
                }, USER_CONSTANTS.MIN_USER_ID_LENGTH);

                logger.debug(`   提取到的用户ID: ${userId}`);

                if (userId) {
                  saveUserId(userId);
                  logger.debug(`✅ 用户 ID 已保存到配置文件: ${userId}`);
                  logger.debug(`   配置文件路径: ${CONFIG_PATH}`);
                  userIdExtracted = true;
                } else {
                  appendWarning('登录成功，但未能提取有效的用户 ID。请手动访问个人主页或重新运行 rednote-init。');
                }
              } else {
                appendWarning('登录成功，但未能完成跳转至个人主页，无法提取用户 ID。请手动访问个人主页后重试。');
              }
            } else {
              appendWarning('未找到"我"按钮或个人主页入口，无法自动提取用户 ID。请手动访问个人主页后重试。');
            }
          } finally {
            await profileButtonHandle.dispose();
          }
        } catch (error: any) {
          appendWarning('登录成功，但用户 ID 提取失败。收藏夹功能可能受限。请手动访问个人主页或重新运行 rednote-init。');
          appendWarning(`提取用户 ID 时出错：${error.message}`);
        }

        logger.debug('\n' + '='.repeat(80));
        logger.debug('✅ 登录成功！后续操作将自动使用保存的登录状态');
        logger.debug('=' .repeat(80) + '\n');

        return {
          success: true,
          message: `登录成功！已保存 ${cookies.length} 个 cookies`,
          userIdExtracted,
          warnings: warnings.length > 0 ? warnings : undefined
        };
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor((timeout - (Date.now() - startTime)) / 1000);
      logger.debug(`⏳ 仍在等待登录... (已等待 ${elapsed}秒，剩余 ${remaining}秒)`);
    }

    // 超时
    logger.debug('\n❌ 登录超时');
    return {
      success: false,
      message: `登录超时。请确保在 ${timeout / 1000} 秒内完成登录操作`,
      userIdExtracted: false
    };

  } catch (error: any) {
    logger.debug('\n❌ 登录过程中出错:', error.message);
    return {
      success: false,
      message: `登录失败: ${error.message}`,
      userIdExtracted: false
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
    logger.debug('❌ 加载 cookies 失败:', error);
  }
  return [];
}

/**
 * 检查是否有已保存的 cookies
 */
export function hasSavedCookies(): boolean {
  return fs.existsSync(COOKIE_PATH);
}

/**
 * 保存用户 ID
 */
export function saveUserId(userId: string): void {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const config = { userId };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    logger.debug('❌ 保存用户 ID 失败:', error);
  }
}

/**
 * 加载用户 ID
 */
export function loadUserId(): string | null {
  if (!fs.existsSync(CONFIG_PATH)) {
    return null;
  }

  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');

    if (!configData.trim()) {
      logger.debug('⚠️ config.json 文件为空，将忽略并等待重新生成。');
      return null;
    }

    let config: any;
    try {
      config = JSON.parse(configData);
    } catch (parseError) {
      logger.debug('❌ config.json 格式错误，将删除并重新创建:', parseError);
      try {
        fs.unlinkSync(CONFIG_PATH);
        logger.debug(`🧹 已删除损坏的配置文件: ${CONFIG_PATH}`);
      } catch (unlinkError) {
        logger.debug('⚠️ 删除损坏的 config.json 失败:', unlinkError);
      }
      return null;
    }

    const userId = typeof config.userId === 'string' ? config.userId.trim() : '';
    if (userId && userId !== 'me' && userId.length >= USER_CONSTANTS.MIN_USER_ID_LENGTH) {
      return userId;
    }

    if (userId) {
      logger.debug('⚠️ config.json 中的 userId 格式无效，将忽略该值。');
    }
  } catch (error) {
    logger.debug('❌ 加载用户 ID 失败:', error);
  }
  return null;
}

/**
 * 获取用户 ID（带默认值）
 */
export function getUserId(): string {
  const userId = loadUserId();
  return userId || 'me';
}
