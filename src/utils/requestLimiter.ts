/**
 * 请求限流工具
 * 用于限制API请求频率，防止服务器过载
 */

// 请求限制配置类型
export interface RequestLimitConfig {
  // 时间窗口大小，单位毫秒
  windowMs: number;
  // 在时间窗口内允许的最大请求次数
  maxRequests: number;
}

// 默认限制配置：5秒内最多3次请求
export const DEFAULT_LIMIT_CONFIG: RequestLimitConfig = {
  windowMs: 5000,
  maxRequests: 3
};

// 请求记录类型
interface RequestRecord {
  // 请求时间戳数组
  timestamps: number[];
}

/**
 * 请求限流管理器
 * 对不同的API接口进行请求频率限制
 */
class RequestLimiter {
  // 存储各个接口的请求记录
  private requestMap: Map<string, RequestRecord>;
  // 各接口的限流配置
  private configMap: Map<string, RequestLimitConfig>;
  // 默认配置
  private defaultConfig: RequestLimitConfig;

  constructor(defaultConfig: RequestLimitConfig = DEFAULT_LIMIT_CONFIG) {
    this.requestMap = new Map();
    this.configMap = new Map();
    this.defaultConfig = defaultConfig;
  }

  /**
   * 设置特定接口的限流配置
   * @param apiKey 接口标识
   * @param config 限流配置
   */
  setConfig(apiKey: string, config: RequestLimitConfig): void {
    this.configMap.set(apiKey, config);
  }

  /**
   * 设置默认限流配置
   * @param config 限流配置
   */
  setDefaultConfig(config: RequestLimitConfig): void {
    this.defaultConfig = config;
  }

  /**
   * 检查是否可以发送请求
   * @param apiKey 接口标识
   * @returns 是否可以发送请求
   */
  canRequest(apiKey: string): boolean {
    // 获取当前时间戳
    const now = Date.now();
    
    // 获取指定接口的限流配置
    const config = this.configMap.get(apiKey) || this.defaultConfig;
    
    // 获取请求记录，如果不存在则创建
    if (!this.requestMap.has(apiKey)) {
      this.requestMap.set(apiKey, { timestamps: [] });
    }
    
    const record = this.requestMap.get(apiKey)!;
    
    // 过滤出在时间窗口内的请求
    const validTimestamps = record.timestamps.filter(
      timestamp => now - timestamp < config.windowMs
    );
    
    // 更新记录
    record.timestamps = validTimestamps;
    
    // 检查是否超过限制
    if (validTimestamps.length >= config.maxRequests) {
      const oldestRequest = Math.min(...validTimestamps);
      const remainingTimeMs = config.windowMs - (now - oldestRequest);
      console.warn(
        `请求频率限制: ${apiKey} 在 ${config.windowMs}ms 内已请求 ${validTimestamps.length}/${config.maxRequests} 次，` +
        `需等待 ${Math.ceil(remainingTimeMs / 1000)} 秒后重试`
      );
      return false;
    }
    
    // 添加当前请求时间戳
    record.timestamps.push(now);
    return true;
  }

  /**
   * 等待直到可以发送请求
   * @param apiKey 接口标识
   * @returns Promise，解析为true表示可以请求
   */
  async waitUntilReady(apiKey: string): Promise<boolean> {
    if (this.canRequest(apiKey)) {
      return true;
    }
    
    // 获取限流配置
    const config = this.configMap.get(apiKey) || this.defaultConfig;
    
    // 计算需要等待的时间
    const record = this.requestMap.get(apiKey)!;
    const now = Date.now();
    const oldestRequest = Math.min(...record.timestamps);
    const waitTimeMs = config.windowMs - (now - oldestRequest) + 100; // 额外等待100ms以防边界情况
    
    // 等待
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.canRequest(apiKey));
      }, waitTimeMs);
    });
  }
}

// 导出单例实例
export const requestLimiter = new RequestLimiter();

export default requestLimiter; 