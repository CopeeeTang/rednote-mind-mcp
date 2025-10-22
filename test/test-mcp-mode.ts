#!/usr/bin/env ts-node

/**
 * 测试 MCP 模式下日志是否被禁用
 */

// 设置 MCP 模式
process.env.MCP_MODE = 'true';

import { logger } from '../src/tools/logger';

console.log('\n🧪 测试 MCP 模式下日志输出\n');
console.log('=' .repeat(80));

console.log('\n📌 MCP_MODE 环境变量:', process.env.MCP_MODE);
console.log('\n📝 尝试输出日志（应该被禁用）:\n');

logger.debug('这条日志不应该被输出（MCP模式）');
logger.info('这条日志不应该被输出（MCP模式）');
logger.warn('这条日志不应该被输出（MCP模式）');
logger.error('这条ERROR日志应该被输出（即使在MCP模式）');

console.log('\n✅ 如果你只看到了 ERROR 日志，说明 MCP 模式工作正常\n');

// 测试非 MCP 模式
process.env.MCP_MODE = 'false';

console.log('=' .repeat(80));
console.log('\n📌 切换到非 MCP 模式\n');
console.log('MCP_MODE 环境变量:', process.env.MCP_MODE);
console.log('\n📝 尝试输出日志（应该全部显示）:\n');

// 需要重新导入以应用新的环境变量
delete require.cache[require.resolve('../src/tools/logger')];
const { logger: logger2 } = require('../src/tools/logger');

logger2.debug('这条 DEBUG 日志应该被输出');
logger2.info('这条 INFO 日志应该被输出');
logger2.warn('这条 WARN 日志应该被输出');
logger2.error('这条 ERROR 日志应该被输出');

console.log('\n✅ 测试完成！\n');
console.log('=' .repeat(80) + '\n');
