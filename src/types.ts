/**
 * RedNote-MCP Enhanced 类型定义
 */

/**
 * 收藏夹笔记条目
 */
export interface FavoriteNote {
  /** 笔记标题 */
  title: string;
  /** 笔记 URL */
  url: string;
  /** 笔记 ID（从 URL 提取） */
  noteId: string;
  /** 封面图片 URL */
  cover: string;
  /** 收藏时间（小红书可能不提供） */
  collectTime?: string;
}

/**
 * VLM 图片分析结果（可选）
 */
export interface VLMAnalysisResult {
  /** 是否包含文字 */
  hasText: boolean;
  /** 提取的文本内容 */
  textContent: string;
  /** 图片描述 */
  description: string;
  /** 检测到的对象/场景 */
  detectedObjects: string[];
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * 图片数据（用于 Claude Vision API）
 */
export interface ImageData {
  /** 图片 URL */
  url: string;
  /** Base64 编码的图片数据 */
  base64: string;
  /** 压缩后的图片大小（字节） */
  size: number;
  /** 原始图片大小（字节，如果启用压缩） */
  originalSize?: number;
  /** 压缩率（百分比，如果启用压缩） */
  compressionRatio?: number;
  /** 图片宽度（像素） */
  width?: number;
  /** 图片高度（像素） */
  height?: number;
  /** MIME 类型 */
  mimeType: string;
  /** VLM 预分析结果（如果启用） */
  vlmAnalysis?: VLMAnalysisResult;
}

/**
 * 扩展的笔记内容（包含图片）
 */
export interface NoteContentWithImages {
  /** 笔记 URL */
  url: string;
  /** 笔记 ID */
  noteId: string;
  /** 标题 */
  title: string;
  /** 文本内容 */
  content: string;
  /** 作者信息 */
  author: {
    name: string;
    url: string;
  };
  /** 标签 */
  tags: string[];
  /** 点赞数 */
  likes: number;
  /** 收藏数 */
  collects: number;
  /** 评论数 */
  comments: number;
  /** 图片列表（Base64 编码） */
  images: ImageData[];
  /** 发布时间 */
  publishTime: string;
}

/**
 * 批量获取结果
 */
export interface BatchNotesResult {
  /** 成功获取的笔记数量 */
  successCount: number;
  /** 失败的笔记数量 */
  failedCount: number;
  /** 笔记列表 */
  notes: NoteContentWithImages[];
  /** 错误信息 */
  errors: Array<{ url: string; error: string }>;
}

/**
 * 登录状态
 */
export interface LoginStatus {
  isLoggedIn: boolean;
  message: string;
}

/**
 * 登录结果
 */
export interface LoginResult {
  success: boolean;
  message: string;
  userIdExtracted: boolean;
  warnings?: string[];
}

/**
 * 搜索结果笔记条目
 */
export interface SearchResultNote {
  title: string;
  url: string;
  noteId: string;
  cover: string;
  author: {
    name: string;
    url: string;
  };
}

/**
 * 搜索结果
 */
export interface SearchResult {
  keyword: string;
  resultCount: number;
  results: SearchResultNote[];
}
