/**
 * 笔记内容获取工具（支持图片）
 */

import type { Page } from 'playwright';
import { logger } from './logger';
import type { NoteContentWithImages } from '../types';
import { downloadNoteImages, type ImageDownloadOptions } from './imageDownloader';

/**
 * 笔记内容获取选项
 */
export interface NoteContentOptions {
  /** 是否包含图片 */
  includeImages?: boolean;
  /** 是否包含详细数据（标签、点赞、收藏、评论） */
  includeData?: boolean;
  /** 是否压缩图片 */
  compressImages?: boolean;
  /** 图片质量 (50-95) */
  imageQuality?: number;
  /** 最大图片尺寸（像素） */
  maxImageSize?: number;
}

/**
 * 获取笔记的完整内容（包含文本和图片）
 *
 * @param page Playwright Page 实例
 * @param noteUrl 笔记 URL
 * @param options 获取选项
 * @returns 笔记完整内容（包含 Base64 图片）
 *
 * @example
 * ```typescript
 * const note = await getNoteContent(page, 'https://www.xiaohongshu.com/explore/xxx', {
 *   includeImages: true,
 *   compressImages: true,
 *   imageQuality: 75
 * });
 * logger.debug(note.title);
 * logger.debug(note.images.length); // 图片数量
 * ```
 */
export async function getNoteContent(
  page: Page,
  noteUrl: string,
  options: NoteContentOptions = {}
): Promise<NoteContentWithImages> {
  // 解构选项，设置默认值
  const {
    includeImages = true,
    includeData = true,
    compressImages = true,
    imageQuality = 75,
    maxImageSize = 1920
  } = options;
  logger.debug(`📖 正在获取笔记内容: ${noteUrl.substring(0, 60)}...`);

  // 1. 预热：先访问首页建立会话（重要！避免403/404）
  logger.debug('  🔥 预热：先访问小红书首页建立会话...');
  try {
    await page.goto('https://www.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(2000);
    logger.debug('  ✅ 预热完成');
  } catch (error) {
    logger.debug('  ⚠️ 预热失败，继续尝试访问笔记...');
  }

  // 2. 访问笔记详情页
  logger.debug(`  📄 访问笔记详情页: ${noteUrl.substring(0, 60)}...`);
  await page.goto(noteUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // 验证是否成功进入笔记详情页
  const currentUrl = page.url();
  if (!currentUrl.includes('/explore/')) {
    throw new Error(`页面被重定向到 ${currentUrl}，可能需要重新登录`);
  }

  // 等待内容加载
  await page.waitForTimeout(2000);

  // 2. 提取笔记元数据和文本内容
  const metadata = await page.evaluate((needsDetailedData) => {
    // 提取笔记 ID
    const noteIdMatch = window.location.pathname.match(/\/explore\/([a-zA-Z0-9]+)/);
    const noteId = noteIdMatch ? noteIdMatch[1] : '';

    // 提取标题
    const metaTitleEl = document.querySelector('meta[property="og:title"]');
    const titleEl = document.querySelector('[class*="title"]');
    const title = metaTitleEl instanceof HTMLMetaElement
      ? metaTitleEl.content
      : (titleEl as HTMLElement | null)?.textContent?.trim() || '';

    // 提取正文内容
    const contentSelectors = [
      '[class*="note-content"]',
      '[class*="desc"]',
      '[class*="detail-desc"]',
      'div.content',
      'div.note-text'
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const contentEl = document.querySelector(selector);
      if (contentEl && contentEl.textContent) {
        content = contentEl.textContent.trim();
        if (content.length > 10) break; // 确保获取到有效内容
      }
    }

    // 提取作者信息
    const authorNameEl = document.querySelector('[class*="author-name"]') ||
                         document.querySelector('[class*="user-name"]');
    const authorLinkEl = document.querySelector('a[href*="/user/profile/"]') as HTMLAnchorElement;

    const author = {
      name: authorNameEl?.textContent?.trim() || '未知作者',
      url: authorLinkEl?.href || ''
    };

    // 根据 includeData 决定是否提取详细数据
    let tags: string[] = [];
    let likes = 0;
    let collects = 0;
    let comments = 0;
    let publishTime = '';

    if (needsDetailedData) {
      // 提取标签
      const tagElements = Array.from(document.querySelectorAll('[class*="tag"]'));
      tags = tagElements
        .map(el => el.textContent?.trim())
        .filter((tag): tag is string => !!tag && tag.startsWith('#'))
        .map(tag => tag.substring(1)); // 移除 # 符号

      // 提取互动数据
      const extractNumber = (selector: string): number => {
        const el = document.querySelector(selector);
        if (!el) return 0;
        const text = el.textContent?.trim() || '0';
        // 处理 "1.2万" 这样的格式
        if (text.includes('万')) {
          return Math.round(parseFloat(text) * 10000);
        }
        return parseInt(text) || 0;
      };

      likes = extractNumber('[class*="like"]') ||
              extractNumber('[class*="liked"]');
      collects = extractNumber('[class*="collect"]') ||
                 extractNumber('[class*="favorite"]');
      comments = extractNumber('[class*="comment"]');

      // 提取发布时间
      const timeEl = document.querySelector('[class*="time"]') ||
                     document.querySelector('meta[property="article:published_time"]') as HTMLMetaElement;
      publishTime = timeEl instanceof HTMLMetaElement
        ? timeEl.content
        : timeEl?.textContent?.trim() || '';
    }

    return {
      noteId,
      title,
      content,
      author,
      tags,
      likes,
      collects,
      comments,
      publishTime
    };
  }, includeData);

  logger.debug(`  ✅ 标题: ${metadata.title}`);
  logger.debug(`  ✅ 作者: ${metadata.author.name}`);
  logger.debug(`  ✅ 正文长度: ${metadata.content.length} 字`);
  if (includeData) {
    logger.debug(`  ✅ 标签: ${metadata.tags.join(', ') || '无'}`);
  }

  // 3. 下载图片（如果需要）
  let images: any[] = [];
  if (includeImages) {
    try {
      // warmup=false 因为我们已经在上面预热过了
      const downloadOptions: ImageDownloadOptions = {
        warmup: false,
        compressImages,
        imageQuality,
        maxImageSize
      };
      images = await downloadNoteImages(page, noteUrl, downloadOptions);
      logger.debug(`  ✅ 图片数量: ${images.length}`);
    } catch (error: any) {
      logger.debug(`  ⚠️ 图片下载失败: ${error.message}`);
      // 图片下载失败不影响文本内容获取
    }
  }

  return {
    url: noteUrl,
    noteId: metadata.noteId,
    title: metadata.title,
    content: metadata.content,
    author: metadata.author,
    tags: metadata.tags,
    likes: metadata.likes,
    collects: metadata.collects,
    comments: metadata.comments,
    images,
    publishTime: metadata.publishTime
  };
}
