/**
 * 批量笔记获取工具
 * 从收藏夹批量获取笔记内容（包含图片）
 */

import type { Page } from 'playwright';
import type { BatchNotesResult } from '../types';
import { getFavoritesList } from './favoritesList';
import { getNoteContent } from './noteContent';

/**
 * 从收藏夹批量获取笔记内容
 *
 * @param page Playwright Page 实例
 * @param userId 用户 ID（或 'me' 表示当前用户）
 * @param limit 获取的笔记数量（默认 10）
 * @param includeImages 是否包含图片（默认 true）
 * @returns 批量获取结果
 *
 * @example
 * ```typescript
 * const result = await getBatchNotesFromFavorites(page, 'me', 5, true);
 * console.log(`成功: ${result.successCount}, 失败: ${result.failedCount}`);
 * result.notes.forEach(note => {
 *   console.log(note.title);
 *   console.log(`图片数量: ${note.images.length}`);
 * });
 * ```
 */
export async function getBatchNotesFromFavorites(
  page: Page,
  userId: string = 'me',
  limit: number = 10,
  includeImages: boolean = true
): Promise<BatchNotesResult> {
  console.log(`\n📦 开始批量获取笔记...`);
  console.log(`   用户ID: ${userId}`);
  console.log(`   数量: ${limit}`);
  console.log(`   包含图片: ${includeImages ? '是' : '否'}\n`);

  const result: BatchNotesResult = {
    successCount: 0,
    failedCount: 0,
    notes: [],
    errors: []
  };

  try {
    // 1. 获取收藏夹列表
    console.log('📂 步骤 1: 获取收藏夹列表...');
    const favorites = await getFavoritesList(page, userId, limit);

    if (favorites.length === 0) {
      console.log('⚠️ 未找到收藏笔记\n');
      return result;
    }

    console.log(`✅ 找到 ${favorites.length} 条收藏\n`);

    // 2. 逐个获取笔记内容
    console.log(`📖 步骤 2: 获取笔记内容 (共 ${favorites.length} 条)...\n`);

    for (let i = 0; i < favorites.length; i++) {
      const favorite = favorites[i];
      console.log(`[${i + 1}/${favorites.length}] ${favorite.title}`);
      console.log(`   URL: ${favorite.url.substring(0, 60)}...`);

      try {
        // 获取笔记完整内容
        const noteContent = await getNoteContent(page, favorite.url, includeImages);

        result.notes.push(noteContent);
        result.successCount++;

        console.log(`   ✅ 成功！ 正文: ${noteContent.content.length} 字, 图片: ${noteContent.images.length} 张\n`);

        // 添加随机延迟，避免触发反爬虫
        if (i < favorites.length - 1) {
          const delay = 1000 + Math.random() * 2000; // 1-3 秒随机延迟
          console.log(`   ⏳ 等待 ${(delay / 1000).toFixed(1)} 秒...\n`);
          await page.waitForTimeout(delay);
        }

      } catch (error: any) {
        result.failedCount++;
        result.errors.push({
          url: favorite.url,
          error: error.message
        });

        console.log(`   ❌ 失败: ${error.message}\n`);
      }
    }

    // 3. 汇总统计
    console.log('='.repeat(80));
    console.log('📊 批量获取完成!\n');
    console.log(`   ✅ 成功: ${result.successCount} 条`);
    console.log(`   ❌ 失败: ${result.failedCount} 条`);

    if (result.successCount > 0) {
      const totalImages = result.notes.reduce((sum, note) => sum + note.images.length, 0);
      const avgImages = (totalImages / result.successCount).toFixed(1);
      console.log(`   📷 总图片数: ${totalImages} 张 (平均 ${avgImages} 张/笔记)`);
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️ 失败的笔记:');
      result.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.url.substring(0, 60)}...`);
        console.log(`      错误: ${err.error}`);
      });
    }

    console.log('');

  } catch (error: any) {
    console.log(`\n❌ 批量获取失败: ${error.message}\n`);
    throw error;
  }

  return result;
}

/**
 * 从指定的笔记 URL 列表批量获取内容
 *
 * @param page Playwright Page 实例
 * @param noteUrls 笔记 URL 列表
 * @param includeImages 是否包含图片（默认 true）
 * @returns 批量获取结果
 */
export async function getBatchNotesFromUrls(
  page: Page,
  noteUrls: string[],
  includeImages: boolean = true
): Promise<BatchNotesResult> {
  console.log(`\n📦 批量获取笔记（URL 列表）...`);
  console.log(`   数量: ${noteUrls.length}`);
  console.log(`   包含图片: ${includeImages ? '是' : '否'}\n`);

  const result: BatchNotesResult = {
    successCount: 0,
    failedCount: 0,
    notes: [],
    errors: []
  };

  for (let i = 0; i < noteUrls.length; i++) {
    const url = noteUrls[i];
    console.log(`[${i + 1}/${noteUrls.length}] ${url.substring(0, 60)}...`);

    try {
      const noteContent = await getNoteContent(page, url, includeImages);
      result.notes.push(noteContent);
      result.successCount++;

      console.log(`   ✅ 成功！ 正文: ${noteContent.content.length} 字, 图片: ${noteContent.images.length} 张\n`);

      // 随机延迟
      if (i < noteUrls.length - 1) {
        const delay = 1000 + Math.random() * 2000;
        await page.waitForTimeout(delay);
      }

    } catch (error: any) {
      result.failedCount++;
      result.errors.push({ url, error: error.message });
      console.log(`   ❌ 失败: ${error.message}\n`);
    }
  }

  console.log('='.repeat(80));
  console.log(`📊 完成！ 成功: ${result.successCount}, 失败: ${result.failedCount}\n`);

  return result;
}
