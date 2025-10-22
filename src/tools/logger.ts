/**
 * 统一日志管理
 *
 * MCP 协议要求：
 * - stdout: 仅用于 JSON-RPC 协议消息
 * - stderr: 可用于日志，但某些客户端可能无法正确处理
 *
 * 解决方案：
 * - MCP 模式下完全禁用控制台输出
 * - 非 MCP 模式下输出到 stderr
 */

/**
 * 动态检测是否为 MCP 模式
 * 必须每次调用时检查，不能缓存为常量
 */
function isMcpMode(): boolean {
  return process.env.MCP_MODE === 'true';
}

/**
 * 调试日志输出
 * MCP 模式下静默，非 MCP 模式输出到 stderr
 */
export function debug(...args: any[]): void {
  if (!isMcpMode()) {
    console.error(...args);
  }
}

/**
 * 信息日志输出
 * MCP 模式下静默，非 MCP 模式输出到 stderr
 */
export function info(...args: any[]): void {
  if (!isMcpMode()) {
    console.error(...args);
  }
}

/**
 * 警告日志输出
 * MCP 模式下静默，非 MCP 模式输出到 stderr
 */
export function warn(...args: any[]): void {
  if (!isMcpMode()) {
    console.warn(...args);
  }
}

/**
 * 错误日志输出
 * 总是输出到 stderr（即使在 MCP 模式下，错误信息也应该被记录）
 */
export function error(...args: any[]): void {
  console.error(...args);
}

/**
 * 日志对象导出
 */
export const logger = {
  debug,
  info,
  warn,
  error
};
