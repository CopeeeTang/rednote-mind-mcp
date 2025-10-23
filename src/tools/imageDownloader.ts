/**
 * 图片下载工具
 * 基于 research/test-image-download.ts 的调研结果实现
 */

import type { Page } from 'playwright';
import { logger } from './logger';
import type { ImageData } from '../types';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * 从笔记页面下载所有图片
 *
 * @param page Playwright Page 实例
 * @param noteUrl 笔记 URL
 * @returns 图片数据列表（Base64 编码）
 *
 * @example
 * ```typescript
 * const images = await downloadNoteImages(page, 'https://www.xiaohongshu.com/explore/...');
 * logger.debug(`下载了 ${images.length} 张图片`);
 * ```
 */
export async function downloadNoteImages(
  page: Page,
  noteUrl: string,
  warmup: boolean = true
): Promise<ImageData[]> {
  // 1. 预热：先访问首页建立会话（如果需要）
  if (warmup) {
    logger.debug('  🔥 预热：先访问小红书首页建立会话...');
    try {
      await page.goto('https://www.xiaohongshu.com', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      await page.waitForTimeout(2000); // 等待 2 秒
      logger.debug('  ✅ 预热完成\n');
    } catch (error) {
      logger.debug('  ⚠️ 预热失败，继续尝试访问笔记...\n');
    }
  }

  // 2. 导航到笔记详情页（非常重要！）
  logger.debug(`  📄 从收藏夹 → 笔记详情页...`);
  logger.debug(`  🔗 目标 URL: ${noteUrl.substring(0, 80)}...`);

  await page.goto(noteUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // 验证是否成功进入笔记详情页
  const currentUrl = page.url();
  logger.debug(`  ✅ 当前页面: ${currentUrl.substring(0, 80)}...`);

  // 检查是否被重定向到登录页或其他页面
  if (!currentUrl.includes('/explore/')) {
    logger.debug(`  ⚠️ 警告：页面被重定向到 ${currentUrl}`);
    logger.debug(`  💡 可能原因：`);
    logger.debug(`     1. 登录状态失效`);
    logger.debug(`     2. 笔记 URL 不正确`);
    logger.debug(`     3. 需要重新登录\n`);
  }

  // 3. 检查页面是否可访问
  const pageStatus = await page.evaluate(() => {
    const bodyText = document.body.textContent || '';

    return {
      notFound: bodyText.includes('笔记不见了') ||
                bodyText.includes('无法访问') ||
                bodyText.includes('不存在') ||
                bodyText.includes('已删除'),
      needsLogin: bodyText.includes('登录') && bodyText.includes('账号'),
      currentUrl: window.location.href
    };
  });

  if (pageStatus.notFound) {
    logger.debug('\n  ❌ 笔记无法访问！');
    logger.debug('  💡 可能的原因：');
    logger.debug('     1. 笔记已被删除或设为私密');
    logger.debug('     2. 需要登录才能查看');
    logger.debug('     3. URL 中的 token 已过期');
    logger.debug('     4. 笔记 ID 不正确\n');
    return [];
  }

  if (pageStatus.needsLogin) {
    logger.debug('\n  ⚠️ 检测到需要登录！');
    logger.debug('  💡 建议：');
    logger.debug('     1. 检查 cookies 是否有效');
    logger.debug('     2. 运行 rednote-mcp init 重新登录');
    logger.debug('     3. 等待页面加载完成（可能只是提示）\n');

    // 继续尝试，因为可能只是一个提示
    await page.waitForTimeout(3000);
  }

  // 4. 检查是否需要人工验证（仅当内容未加载时）
  const verificationStatus = await page.evaluate(() => {
    // 检查是否有验证元素
    const verificationSelectors = [
      '[class*="verify"]',
      '[class*="captcha"]',
      '[class*="slider"]',
      'iframe[src*="verify"]'
    ];
    const hasVerification = verificationSelectors.some(selector =>
      document.querySelectorAll(selector).length > 0
    );

    // 检查笔记内容是否已加载（如果已加载，说明不需要验证）
    const hasContent = document.querySelectorAll('img.note-slider-img, img[class*="note"]').length > 0 ||
                       document.querySelectorAll('[class*="note-content"]').length > 0;

    return {
      needsVerification: hasVerification && !hasContent,
      hasContent
    };
  });

  if (verificationStatus.needsVerification) {
    logger.debug('\n  ⚠️ 检测到需要人工验证！');
    logger.debug('  💡 请在浏览器窗口中完成验证（滑块/验证码）');
    logger.debug('  ⏳ 等待 30 秒供你完成验证...\n');
    await page.waitForTimeout(30000);
  } else if (verificationStatus.hasContent) {
    logger.debug('  ✅ 内容已加载，跳过验证检查');
  }

  // 3. 等待图片加载
  logger.debug('  ⏳ 等待图片加载...');
  await page.waitForTimeout(3000);

  // 4. 点击右箭头加载所有图片（轮播图）
  logger.debug('  ➡️  点击右箭头加载所有轮播图片...');

  const slideCount = await page.evaluate(async () => {
    let loadedImages = 0;
    const maxSlides = 9; // 小红书最多 9 张图片
    const rightArrowSelectors = [
      'button[aria-label*="next"]',
      'button[class*="next"]',
      'button[class*="arrow-right"]',
      '.swiper-button-next',
      '[class*="slide-next"]',
      '[class*="SlideShowContainer"] button:last-child'
    ];

    // 等待初始图片加载
    await new Promise(resolve => setTimeout(resolve, 1000));

    for (let i = 0; i < maxSlides - 1; i++) {
      // 查找右箭头按钮
      let arrowButton: HTMLElement | null = null;

      for (const selector of rightArrowSelectors) {
        const btn = document.querySelector(selector) as HTMLElement;
        if (btn && btn.offsetParent !== null) { // 确保按钮可见
          arrowButton = btn;
          break;
        }
      }

      if (!arrowButton) {
        // 未找到右箭头按钮，停止
        break;
      }

      // 点击右箭头
      arrowButton.click();
      loadedImages++;

      // 等待图片加载
      await new Promise(resolve => setTimeout(resolve, 800));

      // 检查是否还有下一张（通过检查按钮是否禁用）
      if (arrowButton.hasAttribute('disabled') ||
          arrowButton.classList.contains('disabled')) {
        break;
      }
    }

    return loadedImages;
  });

  logger.debug(`  ✅ 点击了 ${slideCount} 次右箭头，加载了 ${slideCount + 1} 张图片\n`);

  // 额外等待，确保最后一张图片加载完成
  await page.waitForTimeout(1000);

  // 5. 查找小红书 CDN 图片
  logger.debug('  🔍 查找页面中的图片...');

  const debugInfo = await page.evaluate(() => {
    const allImgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];

    return {
      totalImages: allImgs.length,
      xiaohongshuImages: allImgs.filter(img =>
        img.src && (
          img.src.includes('xhscdn') ||
          img.src.includes('xiaohongshu') ||
          img.src.includes('sns-')
        )
      ).length,
      sampleImages: allImgs.slice(0, 10).map(img => ({  // 增加到 10 张样本
        src: img.src?.substring(0, 80) || '(无 src)',
        className: img.className || '(无 class)',
        alt: img.alt || '(无 alt)'
      }))
    };
  });

  logger.debug(`  📊 找到总共 ${debugInfo.totalImages} 张图片`);
  logger.debug(`  📊 其中小红书 CDN 图片: ${debugInfo.xiaohongshuImages} 张`);

  if (debugInfo.totalImages > 0) {
    logger.debug('\n  样本图片（前 10 张）:');
    debugInfo.sampleImages.forEach((img, idx) => {
      logger.debug(`    [${idx + 1}] src: ${img.src}`);
      logger.debug(`        class: ${img.className}`);
      logger.debug(`        alt: ${img.alt}`);
    });
    logger.debug('');
  }

  const imageUrls = await page.evaluate(() => {
    const selectors = [
      'img.note-slider-img',         // 笔记轮播图片（最精确）
      'img[src*="sns-webpic"]',      // 主要 CDN（调研确认）
      'img[src*="ci.xiaohongshu"]',  // 备用 CDN
      'img[src*="sns-img"]',
      'img[src*="xhscdn"]'           // CDN 域名
    ];

    const foundImages = new Set<string>();

    // 修复：检查 xhscdn 或 sns- 开头，而不是 xiaohongshu
    const isXiaohongshuImage = (src: string) => {
      return src && (
        src.includes('xhscdn') ||
        src.includes('xiaohongshu') ||
        src.includes('sns-webpic') ||
        src.includes('sns-img') ||
        src.includes('ci.xiaohongshu')
      );
    };

    // 过滤掉太小的图片（可能是图标、头像等）
    const isValidNoteImage = (img: HTMLImageElement) => {
      // 检查图片尺寸（排除小于 200x200 的图标）
      if (img.naturalWidth && img.naturalHeight) {
        if (img.naturalWidth < 200 || img.naturalHeight < 200) {
          return false;
        }
      }
      // 检查 class 名称，排除头像、图标等
      const className = img.className || '';
      if (className.includes('avatar') ||
          className.includes('icon') ||
          className.includes('logo') ||
          className.includes('user-head')) {
        return false;
      }
      return true;
    };

    for (const selector of selectors) {
      const imgs = Array.from(document.querySelectorAll(selector)) as HTMLImageElement[];
      imgs.forEach(img => {
        if (isXiaohongshuImage(img.src) && isValidNoteImage(img)) {
          foundImages.add(img.src);
        }
      });

      if (foundImages.size > 0) {
        // 使用当前选择器找到图片，停止尝试其他选择器
        break;
      }
    }

    // 如果上面的选择器都没找到，尝试获取所有小红书 CDN 的图片（但仍然过滤小图片）
    if (foundImages.size === 0) {
      const allImgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      allImgs.forEach(img => {
        if (isXiaohongshuImage(img.src) && isValidNoteImage(img)) {
          foundImages.add(img.src);
        }
      });
    }

    return Array.from(foundImages);
  });

  if (imageUrls.length === 0) {
    logger.debug('\n  ⚠️ 未找到任何图片！');
    logger.debug('  💡 可能的原因：');
    logger.debug('     1. 页面需要更长的加载时间');
    logger.debug('     2. 笔记是视频类型（没有图片）');
    logger.debug('     3. 需要人工验证（滑块/验证码）');
    logger.debug('     4. DOM 结构已变化\n');
    return [];
  }

  logger.debug(`\n  ✅ 找到 ${imageUrls.length} 张图片，开始下载...\n`);

  // 4. 下载图片并转换为 Base64
  const images: ImageData[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    try {
      logger.debug(`  [${i + 1}/${imageUrls.length}] 下载: ${imageUrl.substring(0, 60)}...`);

      // 使用 Playwright 的 page.goto() 方法下载图片
      // 调研结果显示这种方法最可靠
      const response = await page.goto(imageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      if (!response) {
        logger.warn(`  ❌ 无法下载图片: ${imageUrl.substring(0, 60)}...`);
        continue;
      }

      const buffer = await response.body();
      if (!buffer || buffer.length === 0) {
        logger.warn(`  ❌ 图片内容为空: ${imageUrl.substring(0, 60)}...`);
        continue;
      }

      // 转换为 Base64
      const base64 = buffer.toString('base64');

      // 获取 MIME 类型
      const contentType = response.headers()['content-type'] || 'image/jpeg';

      images.push({
        url: imageUrl,
        base64,
        size: buffer.length,
        mimeType: contentType
      });

      logger.debug(`  ✅ 成功！大小: ${(buffer.length / 1024).toFixed(2)} KB`);
    } catch (error: any) {
      logger.warn(`  ❌ 下载图片失败 ${imageUrl.substring(0, 60)}...: ${error.message}`);
      continue;
    }
  }

  logger.debug(`\n  📊 下载完成: 成功 ${images.length}/${imageUrls.length} 张\n`);

  // 5. 按文件大小去重（避免重复下载相同图片的不同URL）
  const uniqueImages: ImageData[] = [];
  const seenSizes = new Set<number>();

  for (const img of images) {
    if (!seenSizes.has(img.size)) {
      uniqueImages.push(img);
      seenSizes.add(img.size);
    } else {
      logger.debug(`  🔄 跳过重复图片 (${(img.size / 1024).toFixed(2)} KB)`);
    }
  }

  if (uniqueImages.length < images.length) {
    logger.debug(`  ✂️  去重：${images.length} → ${uniqueImages.length} 张图片\n`);
  }

  // 6. 返回到笔记页面（如果需要继续提取其他信息）
  if (uniqueImages.length > 0) {
    await page.goto(noteUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
  }

  return uniqueImages;
}

/**
 * 从多个笔记 URL 批量下载图片
 *
 * @param page Playwright Page 实例
 * @param noteUrls 笔记 URL 列表
 * @returns 图片数据映射（URL -> 图片列表）
 */
export async function downloadBatchImages(
  page: Page,
  noteUrls: string[]
): Promise<Map<string, ImageData[]>> {
  const results = new Map<string, ImageData[]>();

  for (const noteUrl of noteUrls) {
    try {
      const images = await downloadNoteImages(page, noteUrl);
      results.set(noteUrl, images);
    } catch (error: any) {
      logger.debug(`下载图片失败 ${noteUrl}: ${error.message}`);
      results.set(noteUrl, []);
    }
  }

  return results;
}

/**
 * 将 ImageData 转换为 Claude Vision API 格式
 *
 * @param image 图片数据
 * @returns Claude Vision API 格式的图片对象
 */
export function toClaudeVisionFormat(image: ImageData) {
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: image.mimeType,
      data: image.base64
    }
  };
}

/**
 * 保存图片到本地文件系统
 *
 * @param images 图片数据列表
 * @param noteId 笔记 ID（用于创建目录）
 * @param outputDir 输出目录（可选，默认为临时目录）
 * @returns 保存的文件路径列表
 *
 * @example
 * ```typescript
 * const images = await downloadNoteImages(page, noteUrl);
 * const savedPaths = await saveImagesToLocal(images, '68bbe7c7000000001d009751');
 * logger.debug('图片已保存到:', savedPaths);
 * ```
 */
export function saveImagesToLocal(
  images: ImageData[],
  noteId: string,
  outputDir?: string
): string[] {
  // 默认保存到临时目录
  const baseDir = outputDir || path.join(os.tmpdir(), 'rednote-images');

  // 创建笔记专用目录
  const noteDir = path.join(baseDir, noteId);

  if (!fs.existsSync(noteDir)) {
    fs.mkdirSync(noteDir, { recursive: true });
  }

  const savedPaths: string[] = [];

  images.forEach((img, idx) => {
    // 从 MIME 类型推断文件扩展名
    const ext = img.mimeType.split('/')[1] || 'jpg';

    // 文件名：image_1.webp, image_2.jpg, etc.
    const filename = `image_${idx + 1}.${ext}`;
    const filepath = path.join(noteDir, filename);

    // 将 Base64 转换回 Buffer 并保存
    const buffer = Buffer.from(img.base64, 'base64');
    fs.writeFileSync(filepath, buffer);

    savedPaths.push(filepath);
  });

  return savedPaths;
}
