/**
 * Rednote-Mind-MCP
 * 小红书 MCP 服务器，为 AI 客户端提供收藏夹、搜索和内容获取能力
 */

export * from './types';
export * from './tools/auth';
export * from './tools/search';
export * from './tools/favoritesList';
export * from './tools/imageDownloader';
export * from './tools/noteContent';
export * from './tools/batchNotes';

// 版本信息
export const VERSION = '0.2.0';
export const DESCRIPTION = 'Rednote-Mind-MCP - Enhanced RedNote-MCP with login, favorites, search and image download support';
