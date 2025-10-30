/**
 * VLM (Vision Language Model) 图片分析模块
 * 使用 Claude API 预分析图片内容，提取文字和结构化描述
 * 这是一个可选功能，需要设置 ANTHROPIC_API_KEY 环境变量
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger.js';
import type { VLMAnalysisResult, ImageData } from '../types.js';

/**
 * 检查 VLM 功能是否可用
 */
export function isVLMAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * 获取 Anthropic 客户端实例
 */
function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY 未设置，VLM 功能不可用');
    return null;
  }

  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
}

/**
 * 使用 VLM 分析单张图片
 *
 * @param imageBase64 图片的 Base64 编码
 * @param mimeType 图片 MIME 类型
 * @param customPrompt 自定义分析提示词（可选）
 * @returns VLM 分析结果
 */
export async function analyzeImageWithVLM(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg',
  customPrompt?: string
): Promise<VLMAnalysisResult> {
  const client = getAnthropicClient();

  if (!client) {
    throw new Error('VLM 功能不可用：请设置 ANTHROPIC_API_KEY 环境变量');
  }

  // 默认提示词：提取文字和描述图片内容
  const defaultPrompt = `请详细分析这张图片，并提供以下信息：

1. 图片中是否包含文字？如果有，请逐字提取所有可见文字（包括中英文）
2. 图片的主要内容和场景描述
3. 图片中的关键对象、元素或主题
4. 图片的类型（如：截图、照片、图表、设计稿等）

请以结构化的方式回答，清晰明了。`;

  const prompt = customPrompt || defaultPrompt;

  try {
    logger.debug('🔍 使用 Claude VLM 分析图片...');

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    });

    // 提取响应文本
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n');

    logger.debug(`✅ VLM 分析完成 (${response.usage.input_tokens} 输入 tokens, ${response.usage.output_tokens} 输出 tokens)`);

    // 解析结果
    const hasText = responseText.toLowerCase().includes('文字') ||
                    responseText.toLowerCase().includes('text') ||
                    /包含|存在|有文字/.test(responseText);

    // 简单提取文本内容（实际项目中可以使用更复杂的解析）
    const textContent = extractTextFromVLMResponse(responseText);
    const detectedObjects = extractObjectsFromVLMResponse(responseText);

    return {
      hasText,
      textContent,
      description: responseText,
      detectedObjects,
      confidence: 0.85  // Claude 模型一般置信度很高
    };

  } catch (error: any) {
    logger.error(`VLM 分析失败: ${error.message}`);
    throw new Error(`VLM 分析失败: ${error.message}`);
  }
}

/**
 * 批量分析图片
 *
 * @param images 图片数据数组
 * @param customPrompt 自定义分析提示词（可选）
 * @returns 分析结果数组
 */
export async function analyzeImages(
  images: ImageData[],
  customPrompt?: string
): Promise<VLMAnalysisResult[]> {
  if (!isVLMAvailable()) {
    logger.warn('VLM 功能不可用，跳过图片分析');
    return [];
  }

  const results: VLMAnalysisResult[] = [];

  for (let i = 0; i < images.length; i++) {
    try {
      logger.debug(`分析第 ${i + 1}/${images.length} 张图片...`);

      // 确保 MIME 类型符合 Anthropic API 要求
      const mimeType = (images[i].mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || 'image/jpeg';

      const result = await analyzeImageWithVLM(images[i].base64, mimeType, customPrompt);
      results.push(result);

      // 添加延迟以避免 API 限流
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      logger.error(`第 ${i + 1} 张图片分析失败: ${error.message}`);
      // 添加空结果
      results.push({
        hasText: false,
        textContent: '',
        description: `分析失败: ${error.message}`,
        detectedObjects: [],
        confidence: 0
      });
    }
  }

  return results;
}

/**
 * 从 VLM 响应中提取文本内容
 * 这是一个简单的实现，实际项目中可以使用更复杂的 NLP 解析
 */
function extractTextFromVLMResponse(response: string): string {
  // 查找包含文字提取的部分
  const textMatches = response.match(/文字[：:]([\s\S]+?)(?=\n\n|\n[0-9]|\n[A-Z]|$)/);
  if (textMatches && textMatches[1]) {
    return textMatches[1].trim();
  }

  // 查找引号中的文本
  const quoteMatches = response.match(/[「『"](.*?)[」』"]/g);
  if (quoteMatches && quoteMatches.length > 0) {
    return quoteMatches.map(m => m.replace(/[「『"」』"]/g, '')).join('\n');
  }

  return '';
}

/**
 * 从 VLM 响应中提取检测到的对象/元素
 */
function extractObjectsFromVLMResponse(response: string): string[] {
  const objects: string[] = [];

  // 常见的对象类型关键词
  const keywords = [
    '截图', 'screenshot', '照片', 'photo', '图表', 'chart',
    '代码', 'code', '文档', 'document', '设计', 'design',
    '界面', 'UI', '网页', 'webpage', '海报', 'poster'
  ];

  for (const keyword of keywords) {
    if (response.toLowerCase().includes(keyword.toLowerCase())) {
      objects.push(keyword);
    }
  }

  return [...new Set(objects)];  // 去重
}

/**
 * 估算 VLM API 调用成本
 *
 * @param imageCount 图片数量
 * @param avgTokensPerImage 每张图片平均 token 数（默认约 1500）
 * @returns 估算成本（美元）
 */
export function estimateVLMCost(
  imageCount: number,
  avgTokensPerImage: number = 1500
): { inputCost: number; outputCost: number; totalCost: number } {
  // Claude 3.5 Sonnet 定价（截至 2024年）
  const inputCostPerMToken = 3.0;   // $3.00 / million tokens
  const outputCostPerMToken = 15.0;  // $15.00 / million tokens

  const avgOutputTokens = 500;  // 平均输出 500 tokens

  const totalInputTokens = imageCount * avgTokensPerImage;
  const totalOutputTokens = imageCount * avgOutputTokens;

  const inputCost = (totalInputTokens / 1_000_000) * inputCostPerMToken;
  const outputCost = (totalOutputTokens / 1_000_000) * outputCostPerMToken;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost
  };
}

/**
 * 打印 VLM 成本估算
 */
export function printVLMCostEstimate(imageCount: number): void {
  const cost = estimateVLMCost(imageCount);

  logger.info(`\n💰 VLM API 成本估算 (${imageCount} 张图片):`);
  logger.info(`   输入成本: $${cost.inputCost.toFixed(4)}`);
  logger.info(`   输出成本: $${cost.outputCost.toFixed(4)}`);
  logger.info(`   总计: $${cost.totalCost.toFixed(4)}\n`);
}
