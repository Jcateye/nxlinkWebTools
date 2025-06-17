// FAQ API 错误监控工具

interface ErrorStats {
  totalErrors: number;
  npeErrors: number;
  lastError: Date | null;
  errorPatterns: Record<string, number>;
}

class FaqErrorMonitor {
  private static instance: FaqErrorMonitor;
  private errorStats: ErrorStats = {
    totalErrors: 0,
    npeErrors: 0,
    lastError: null,
    errorPatterns: {}
  };
  private errorHistory: Array<{
    timestamp: Date;
    error: any;
    context: string;
  }> = [];

  static getInstance(): FaqErrorMonitor {
    if (!FaqErrorMonitor.instance) {
      FaqErrorMonitor.instance = new FaqErrorMonitor();
    }
    return FaqErrorMonitor.instance;
  }

  // 记录错误
  recordError(error: any, context: string = 'unknown'): void {
    this.errorStats.totalErrors++;
    this.errorStats.lastError = new Date();
    
    // 检查是否是NPE错误
    const errorMessage = error?.message || error?.response?.data?.message || '';
    if (errorMessage.includes('NullPointerException') || 
        errorMessage.includes('系统内部异常') ||
        error?.response?.status === 500) {
      this.errorStats.npeErrors++;
    }
    
    // 记录错误模式
    const pattern = this.getErrorPattern(error);
    this.errorStats.errorPatterns[pattern] = (this.errorStats.errorPatterns[pattern] || 0) + 1;
    
    // 添加到历史记录（最多保留100条）
    this.errorHistory.push({
      timestamp: new Date(),
      error,
      context
    });
    
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }
    
    console.warn(`[FaqErrorMonitor] 记录错误: ${context}`, {
      error,
      stats: this.errorStats
    });
  }

  // 获取错误模式
  private getErrorPattern(error: any): string {
    if (error?.response?.status === 500) {
      return 'server_error_500';
    }
    if (error?.response?.status === 401) {
      return 'unauthorized_401';
    }
    if (error?.code === 'NETWORK_ERROR') {
      return 'network_error';
    }
    if (error?.code === 'TIMEOUT') {
      return 'timeout_error';
    }
    return 'unknown_error';
  }

  // 检查是否应该重试
  shouldRetry(error: any): boolean {
    const pattern = this.getErrorPattern(error);
    
    // 不重试的错误类型
    const noRetryPatterns = ['unauthorized_401'];
    if (noRetryPatterns.includes(pattern)) {
      return false;
    }
    
    // 服务器错误可以重试
    if (pattern === 'server_error_500') {
      return true;
    }
    
    // 网络错误可以重试
    if (pattern === 'network_error') {
      return true;
    }
    
    return false;
  }

  // 获取统计信息
  getStats(): ErrorStats {
    return { ...this.errorStats };
  }

  // 获取最近错误
  getRecentErrors(count: number = 10): Array<{
    timestamp: Date;
    error: any;
    context: string;
  }> {
    return this.errorHistory.slice(-count);
  }

  // 重置统计
  resetStats(): void {
    this.errorStats = {
      totalErrors: 0,
      npeErrors: 0,
      lastError: null,
      errorPatterns: {}
    };
    this.errorHistory = [];
  }

  // 检查是否需要报警
  shouldAlert(): boolean {
    // 如果NPE错误超过5次，需要报警
    if (this.errorStats.npeErrors >= 5) {
      return true;
    }
    
    // 如果总错误数超过10次，需要报警
    if (this.errorStats.totalErrors >= 10) {
      return true;
    }
    
    return false;
  }

  // 生成错误报告
  generateReport(): string {
    const stats = this.getStats();
    const recentErrors = this.getRecentErrors(5);
    
    let report = `FAQ API 错误监控报告\n`;
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;
    report += `统计信息:\n`;
    report += `- 总错误数: ${stats.totalErrors}\n`;
    report += `- NPE错误数: ${stats.npeErrors}\n`;
    report += `- 最后错误时间: ${stats.lastError?.toLocaleString() || '无'}\n\n`;
    
    report += `错误模式分布:\n`;
    Object.entries(stats.errorPatterns).forEach(([pattern, count]) => {
      report += `- ${pattern}: ${count}次\n`;
    });
    
    if (recentErrors.length > 0) {
      report += `\n最近错误记录:\n`;
      recentErrors.forEach((record, index) => {
        report += `${index + 1}. ${record.timestamp.toLocaleString()} [${record.context}]\n`;
        report += `   错误: ${record.error?.message || '未知错误'}\n`;
      });
    }
    
    return report;
  }
}

// 导出单例实例
export const faqErrorMonitor = FaqErrorMonitor.getInstance();

// 增强的API调用包装器
export const withErrorMonitoring = async <T>(
  apiCall: () => Promise<T>,
  context: string,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      
      // 成功时，如果之前有错误，记录恢复
      if (attempt > 1) {
        console.log(`[withErrorMonitoring] ${context} 在第${attempt}次尝试后成功恢复`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      faqErrorMonitor.recordError(error, context);
      
      console.error(`[withErrorMonitoring] ${context} 第${attempt}次尝试失败:`, error);
      
      // 检查是否应该重试
      if (attempt < maxRetries && faqErrorMonitor.shouldRetry(error)) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最大5秒
        console.log(`[withErrorMonitoring] ${context} 将在${delay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  // 检查是否需要报警
  if (faqErrorMonitor.shouldAlert()) {
    console.error(`[withErrorMonitoring] FAQ API错误频发，需要关注！\n${faqErrorMonitor.generateReport()}`);
  }
  
  throw lastError;
}; 