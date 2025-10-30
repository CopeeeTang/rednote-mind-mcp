/**
 * 图片智能压缩模块
 * 使用 sharp 库对图片进行高质量压缩，减少 Base64 传输体积
 */

import sharp from 'sharp';
import { logger } from './logger.js';

/**
 * 压缩配置选项
 */
export interface CompressionOptions {
  maxWidth: number;          // 最大宽度（像素）
  maxHeight: number;         // 最大高度（像素）
  quality: number;           // 压缩质量 50-100
  format: 'jpeg' | 'webp';   // 输出格式
}

/**
 * 压缩结果元数据
 */
export interface CompressionMetadata {
  originalSize: number;      // 原始大小（字节）
  compressedSize: number;    // 压缩后大小（字节）
  compressionRatio: number;  // 压缩率（百分比）
  width: number;             // 实际宽度
  height: number;            // 实际高度
  format: string;            // 输出格式
}

/**
 * 压缩结果
 */
export interface CompressionResult {
  compressed: Buffer;
  metadata: CompressionMetadata;
}

/**
 * 默认压缩配置
 */
export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 75,
  format: 'jpeg'
};

/**
 * 图片类型检测结果
 */
export type ImageType = 'text-heavy' | 'photo' | 'mixed';

/**
 * 智能检测图片类型（未来可扩展为基于内容的检测）
 *
 * @param buffer 图片二进制数据
 * @returns 图片类型
 */
export function detectImageType(buffer: Buffer): ImageType {
  // 简单策略：目前统一使用 mixed 类型
  // 未来可以基于图片特征（如边缘密度、颜色分布）进行智能检测
  return 'mixed';
}

/**
 * 根据图片类型获取推荐的压缩配置
 *
 * @param imageType 图片类型
 * @param baseOptions 基础配置
 * @returns 优化后的压缩配置
 */
export function getOptimalCompressionOptions(
  imageType: ImageType,
  baseOptions: Partial<CompressionOptions> = {}
): CompressionOptions {
  const defaults = { ...DEFAULT_COMPRESSION_OPTIONS };

  switch (imageType) {
    case 'text-heavy':
      // 文本截图：使用更高质量以保持文字清晰
      return {
        ...defaults,
        quality: 85,
        format: 'jpeg',
        ...baseOptions
      };

    case 'photo':
      // 风景照片：可以使用较低质量
      return {
        ...defaults,
        quality: 70,
        format: 'jpeg',
        ...baseOptions
      };

    case 'mixed':
    default:
      // 混合类型：使用中等质量
      return {
        ...defaults,
        quality: 75,
        format: 'jpeg',
        ...baseOptions
      };
  }
}

/**
 * 压缩图片
 *
 * @param originalBuffer 原始图片 Buffer
 * @param options 压缩选项
 * @returns 压缩结果
 */
export async function compressImage(
  originalBuffer: Buffer,
  options: Partial<CompressionOptions> = {}
): Promise<CompressionResult> {
  try {
    // 合并默认配置
    const finalOptions: CompressionOptions = {
      ...DEFAULT_COMPRESSION_OPTIONS,
      ...options
    };

    logger.debug(`开始压缩图片，配置: ${JSON.stringify(finalOptions)}`);

    // 创建 sharp 实例
    const sharpInstance = sharp(originalBuffer);

    // 获取原始图片元数据
    const metadata = await sharpInstance.metadata();
    logger.debug(`原始图片元数据: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}, 大小: ${originalBuffer.length} 字节`);

    // 调整图片大小（保持宽高比，不放大小图）
    let processedImage = sharpInstance.resize(finalOptions.maxWidth, finalOptions.maxHeight, {
      fit: 'inside',              // 保持宽高比，完整显示图片
      withoutEnlargement: true,   // 不放大小于目标尺寸的图片
      kernel: 'lanczos3'          // 使用高质量的缩放算法
    });

    // 根据格式进行压缩
    if (finalOptions.format === 'jpeg') {
      processedImage = processedImage.jpeg({
        quality: finalOptions.quality,
        progressive: true,         // 渐进式 JPEG（先加载低质量，再加载高质量）
        optimizeScans: true,       // 优化扫描次序
        mozjpeg: true              // 使用 MozJPEG 编码器（更好的压缩）
      });
    } else if (finalOptions.format === 'webp') {
      processedImage = processedImage.webp({
        quality: finalOptions.quality,
        effort: 6                  // 压缩努力程度 0-6，6 为最高质量
      });
    }

    // 执行压缩
    const compressedBuffer = await processedImage.toBuffer();

    // 获取压缩后的图片元数据
    const compressedMetadata = await sharp(compressedBuffer).metadata();

    // 计算压缩率
    const compressionRatio = ((1 - compressedBuffer.length / originalBuffer.length) * 100);

    const result: CompressionResult = {
      compressed: compressedBuffer,
      metadata: {
        originalSize: originalBuffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        width: compressedMetadata.width || 0,
        height: compressedMetadata.height || 0,
        format: finalOptions.format
      }
    };

    logger.info(
      `图片压缩完成: ${result.metadata.originalSize} → ${result.metadata.compressedSize} 字节 ` +
      `(节省 ${result.metadata.compressionRatio.toFixed(1)}%), ` +
      `尺寸: ${result.metadata.width}x${result.metadata.height}`
    );

    return result;

  } catch (error: any) {
    logger.error(`图片压缩失败: ${error.message}`);
    throw new Error(`图片压缩失败: ${error.message}`);
  }
}

/**
 * 批量压缩图片
 *
 * @param buffers 图片 Buffer 数组
 * @param options 压缩选项
 * @returns 压缩结果数组
 */
export async function compressImages(
  buffers: Buffer[],
  options: Partial<CompressionOptions> = {}
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (let i = 0; i < buffers.length; i++) {
    try {
      logger.debug(`压缩第 ${i + 1}/${buffers.length} 张图片`);
      const result = await compressImage(buffers[i], options);
      results.push(result);
    } catch (error: any) {
      logger.error(`第 ${i + 1} 张图片压缩失败: ${error.message}`);
      // 如果压缩失败，保留原图
      results.push({
        compressed: buffers[i],
        metadata: {
          originalSize: buffers[i].length,
          compressedSize: buffers[i].length,
          compressionRatio: 0,
          width: 0,
          height: 0,
          format: 'original'
        }
      });
    }
  }

  // 统计总体压缩效果
  const totalOriginalSize = results.reduce((sum, r) => sum + r.metadata.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.metadata.compressedSize, 0);
  const overallRatio = ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);

  logger.info(
    `批量压缩完成: ${buffers.length} 张图片, ` +
    `总大小: ${totalOriginalSize} → ${totalCompressedSize} 字节 ` +
    `(节省 ${overallRatio}%)`
  );

  return results;
}

/**
 * 智能压缩（自动降级策略）
 * 如果压缩后仍然超过目标大小，会自动降低质量重新压缩
 *
 * @param originalBuffer 原始图片
 * @param targetSizeBytes 目标大小（字节）
 * @param options 基础压缩选项
 * @returns 压缩结果
 */
export async function smartCompress(
  originalBuffer: Buffer,
  targetSizeBytes: number = 500 * 1024,  // 默认目标 500KB
  options: Partial<CompressionOptions> = {}
): Promise<CompressionResult> {
  // 第一次尝试：使用默认质量
  let result = await compressImage(originalBuffer, options);

  // 如果仍然超过目标大小，逐步降级
  if (result.metadata.compressedSize > targetSizeBytes) {
    logger.warn(`压缩后仍超过目标大小 (${targetSizeBytes} 字节)，启动降级策略`);

    const fallbackConfigs: Array<Partial<CompressionOptions>> = [
      { quality: 65, maxWidth: 1600, maxHeight: 1600 },
      { quality: 60, maxWidth: 1280, maxHeight: 1280 },
      { quality: 55, maxWidth: 960, maxHeight: 960 },
    ];

    for (const fallbackConfig of fallbackConfigs) {
      const newOptions = { ...options, ...fallbackConfig };
      result = await compressImage(originalBuffer, newOptions);

      logger.debug(
        `降级尝试 (质量: ${newOptions.quality}, 尺寸: ${newOptions.maxWidth}): ` +
        `${result.metadata.compressedSize} 字节`
      );

      if (result.metadata.compressedSize <= targetSizeBytes) {
        logger.info(`降级成功，达到目标大小`);
        break;
      }
    }
  }

  return result;
}
