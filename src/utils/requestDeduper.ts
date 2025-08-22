// 请求去重工具
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduper {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 5000; // 5秒超时

  // 生成请求的唯一键
  private getRequestKey(url: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${url}::${paramStr}`;
  }

  // 清理过期的请求
  private cleanExpiredRequests() {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  // 执行去重请求
  async dedupedRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // 清理过期请求
    this.cleanExpiredRequests();

    // 检查是否有相同的请求正在进行
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`[RequestDeduper] 复用已有请求: ${key}`);
      return pending.promise;
    }

    // 创建新请求
    console.log(`[RequestDeduper] 发起新请求: ${key}`);
    const promise = requestFn().finally(() => {
      // 请求完成后移除
      this.pendingRequests.delete(key);
    });

    // 保存请求引用
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  // 清除所有待处理的请求
  clear() {
    this.pendingRequests.clear();
  }
}

// 导出单例
export const requestDeduper = new RequestDeduper();
