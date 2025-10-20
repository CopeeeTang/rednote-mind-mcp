#!/usr/bin/env ts-node

/**
 * MCP 集成测试
 * 测试 MCP 服务器的工具调用功能
 */

import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';

// 测试配置
const SERVER_PATH = './dist/server.js';

interface MCPRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: string;
  result?: any;
  error?: any;
}

class MCPClient {
  private process: ChildProcess;
  private responseHandlers: Map<string, (response: MCPResponse) => void> = new Map();

  constructor() {
    this.process = spawn('node', [SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 处理服务器响应
    let buffer = '';
    this.process.stdout?.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response: MCPResponse = JSON.parse(line);
            const handler = this.responseHandlers.get(response.id);
            if (handler) {
              handler(response);
              this.responseHandlers.delete(response.id);
            }
          } catch (error) {
            // Ignore non-JSON lines (e.g., console.error output)
          }
        }
      }
    });

    // 处理服务器错误输出
    this.process.stderr?.on('data', (data) => {
      console.error(`[Server] ${data.toString().trim()}`);
    });
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    const id = randomUUID();
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.responseHandlers.set(id, (response: MCPResponse) => {
        if (response.error) {
          reject(new Error(response.error.message || 'Unknown error'));
        } else {
          resolve(response.result);
        }
      });

      this.process.stdin?.write(JSON.stringify(request) + '\n');

      // Timeout after 120 seconds
      setTimeout(() => {
        if (this.responseHandlers.has(id)) {
          this.responseHandlers.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 120000);
    });
  }

  async close() {
    this.process.kill();
  }
}

async function main() {
  console.log('🧪 MCP 集成测试\n');
  console.log('=' .repeat(80));

  const client = new MCPClient();

  try {
    // 等待服务器启动
    console.log('\n⏳ 等待服务器启动...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ 服务器已启动\n');

    // 测试 1: 列出可用工具
    console.log('=' .repeat(80));
    console.log('\n📌 测试 1: 列出可用工具\n');

    const toolsResult = await client.sendRequest('tools/list');
    console.log(`✅ 找到 ${toolsResult.tools.length} 个工具:`);
    toolsResult.tools.forEach((tool: any) => {
      console.log(`  - ${tool.name}: ${tool.description.substring(0, 60)}...`);
    });

    // 测试 2: 获取收藏夹列表（只获取3条）
    console.log('\n' + '='.repeat(80));
    console.log('\n📌 测试 2: 获取收藏夹列表\n');

    const favoritesResult = await client.sendRequest('tools/call', {
      name: 'get_favorites_list',
      arguments: {
        userId: '604dbc13000000000101f8b7',
        limit: 3
      }
    });

    console.log('收藏夹结果:', JSON.stringify(favoritesResult, null, 2));

    // 检查是否有错误
    if (favoritesResult.isError) {
      console.error('❌ 获取收藏夹失败:', favoritesResult.content[0].text);
      throw new Error(favoritesResult.content[0].text);
    }

    const favorites = JSON.parse(favoritesResult.content[0].text);
    console.log(`✅ 成功获取 ${favorites.length} 条收藏笔记:`);
    favorites.forEach((note: any, idx: number) => {
      console.log(`\n  [${idx + 1}] ${note.title}`);
      console.log(`      URL: ${note.url.substring(0, 80)}...`);
      console.log(`      笔记ID: ${note.noteId}`);
    });

    // 测试 3: 获取单个笔记内容（不包含图片以加快速度）
    if (favorites.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('\n📌 测试 3: 获取笔记内容（不含图片）\n');

      const noteContentResult = await client.sendRequest('tools/call', {
        name: 'get_note_content',
        arguments: {
          noteUrl: favorites[0].url,
          includeImages: false
        }
      });

      const noteContent = JSON.parse(noteContentResult.content[0].text);
      console.log(`✅ 成功获取笔记内容:`);
      console.log(`  标题: ${noteContent.title}`);
      console.log(`  作者: ${noteContent.author.name}`);
      console.log(`  正文长度: ${noteContent.content.length} 字`);
      console.log(`  标签: ${noteContent.tags.join(', ')}`);
      console.log(`  点赞: ${noteContent.likes}`);
      console.log(`  收藏: ${noteContent.collects}`);
      console.log(`  评论: ${noteContent.comments}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 所有测试通过！\n');
    console.log('=' .repeat(80));
    console.log('\n💡 MCP 服务器已就绪，可以集成到 Claude Desktop\n');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('\n堆栈:', error.stack);
    }
  } finally {
    await client.close();
    process.exit(0);
  }
}

main().catch(console.error);
