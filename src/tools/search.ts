/**
 * 搜索工具
 * 基于小红书网页端搜索功能
 */

import type { Page } from 'playwright';
import type { SearchResult, SearchResultNote } from '../types';

/**
 * 按关键词搜索笔记
 *
 * @param page Playwright Page 实例
 * @param keyword 搜索关键词
 * @param limit 返回结果数量（默认 10）
 * @param sortType 排序方式（默认 'general'）
 * @returns 搜索结果
 *
 * @example
 * ```typescript
 * const results = await searchNotesByKeyword(page, 'AI论文', 10, 'popular');
 * console.log(`找到 ${results.results.length} 条结果`);
 * ```
 */
export async function searchNotesByKeyword(
  page: Page,
  keyword: string,
  limit: number = 10,
  sortType: 'general' | 'popular' | 'latest' = 'general'
): Promise<SearchResult> {
  console.error(`\n🔍 搜索关键词: "${keyword}"`);
  console.error(`  📊 获取数量: ${limit} 条`);
  console.error(`  📈 排序方式: ${sortType}\n`);

  try {
    // 1. 访问搜索页面
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes`;
    console.error(`  🌐 访问搜索页面...`);

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 2. 等待搜索结果加载
    console.error(`  ⏳ 等待搜索结果加载...`);
    await page.waitForTimeout(5000); // 等待页面JavaScript渲染

    // 3. 处理排序（如果需要）
    if (sortType !== 'general') {
      console.error(`  🔄 切换排序方式: ${sortType}...`);
      try {
        // 根据sortType点击对应的排序按钮
        const sortMap: Record<string, string> = {
          'popular': '最热',
          'latest': '最新'
        };

        const sortText = sortMap[sortType];
        if (sortText) {
          // 查找并点击排序按钮
          await page.evaluate((text) => {
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const sortButton = buttons.find(btn => btn.textContent?.includes(text));
            if (sortButton && sortButton instanceof HTMLElement) {
              sortButton.click();
            }
          }, sortText);

          await page.waitForTimeout(3000); // 等待排序结果加载
        }
      } catch (error) {
        console.error(`  ⚠️ 排序切换失败，使用默认排序`);
      }
    }

    // 4. 滚动页面加载更多结果（如果需要）
    if (limit > 20) {
      console.error(`  📜 滚动加载更多结果...`);
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
      });
      await page.waitForTimeout(2000);
    }

    // 5. 提取搜索结果
    console.error(`  📦 提取搜索结果...`);
    const results = await page.evaluate((maxResults) => {
      // 可能的笔记容器选择器
      const containerSelectors = [
        'section.note-item',  // 收藏夹使用的选择器
        '[class*="note-item"]',
        '[class*="search-item"]',
        '[class*="feed-item"]',
        'a[href*="/explore/"]'
      ];

      let noteElements: Element[] = [];

      // 尝试每个选择器
      for (const selector of containerSelectors) {
        noteElements = Array.from(document.querySelectorAll(selector));
        if (noteElements.length > 0) {
          break;
        }
      }

      // 如果还没找到，尝试直接查找包含explore链接的元素
      if (noteElements.length === 0) {
        const allLinks = Array.from(document.querySelectorAll('a[href*="/explore/"]'));
        // 获取链接的父容器
        const containers = new Set<Element>();
        allLinks.forEach(link => {
          let parent = link.parentElement;
          // 向上查找合适的容器（最多3层）
          for (let i = 0; i < 3 && parent; i++) {
            if (parent.querySelector('img')) {
              containers.add(parent);
              break;
            }
            parent = parent.parentElement;
          }
        });
        noteElements = Array.from(containers);
      }

      console.log(`找到 ${noteElements.length} 个笔记元素`);

      // 提取笔记信息
      return noteElements.slice(0, maxResults).map((item, idx) => {
        // 查找笔记链接
        const linkEl = item.querySelector('a[href*="/explore/"]') as HTMLAnchorElement;
        const href = linkEl?.href || '';

        // 提取笔记 ID
        const noteIdMatch = href.match(/\/explore\/([a-zA-Z0-9]+)/);
        const noteId = noteIdMatch ? noteIdMatch[1] : '';

        // 构造完整URL（可能需要添加token）
        const url = href.startsWith('http') ? href : `https://www.xiaohongshu.com${href}`;

        // 提取标题
        const titleEl = item.querySelector('[class*="title"]') ||
                       item.querySelector('[class*="content"]') ||
                       linkEl;
        const title = titleEl?.textContent?.trim() || `笔记 ${idx + 1}`;

        // 提取封面
        const imgEl = item.querySelector('img') as HTMLImageElement;
        const cover = imgEl?.src || '';

        // 提取作者信息
        const authorNameEl = item.querySelector('[class*="author"]') ||
                            item.querySelector('[class*="user"]');
        const authorLinkEl = item.querySelector('a[href*="/user/profile/"]') as HTMLAnchorElement;

        const author = {
          name: authorNameEl?.textContent?.trim() || '未知作者',
          url: authorLinkEl?.href || ''
        };

        return {
          title,
          url,
          noteId,
          cover,
          author
        };
      }).filter(note => note.noteId); // 过滤掉没有noteId的结果
    }, limit);

    console.error(`\n✅ 搜索完成！找到 ${results.length} 条结果\n`);

    return {
      keyword,
      resultCount: results.length,
      results
    };

  } catch (error: any) {
    console.error(`\n❌ 搜索失败: ${error.message}\n`);
    throw new Error(`搜索失败: ${error.message}`);
  }
}
