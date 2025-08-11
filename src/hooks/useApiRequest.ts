import { useRef, useCallback } from 'react';

/**
 * 防止重复API请求的Hook
 * 
 * @param fn 要执行的异步函数
 * @param delay 防抖延迟时间（毫秒）
 * @returns 包装后的函数
 */
export function useDebounceRequest<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const requestInProgressRef = useRef(false);

  return useCallback((...args: Parameters<T>) => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果有请求正在进行，不发起新请求
    if (requestInProgressRef.current) {
      console.log('[useDebounceRequest] 请求正在进行中，跳过新请求');
      return;
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(async () => {
      try {
        requestInProgressRef.current = true;
        await fn(...args);
      } finally {
        requestInProgressRef.current = false;
      }
    }, delay);
  }, [fn, delay]);
}

/**
 * 管理API请求状态的Hook
 */
export function useRequestManager() {
  const pendingRequests = useRef(new Map<string, AbortController>());

  const makeRequest = useCallback(async (
    key: string,
    requestFn: () => Promise<any>
  ) => {
    // 取消之前的同类请求
    const previousController = pendingRequests.current.get(key);
    if (previousController) {
      previousController.abort();
      console.log(`[useRequestManager] 取消之前的请求: ${key}`);
    }

    // 创建新的AbortController
    const controller = new AbortController();
    pendingRequests.current.set(key, controller);

    try {
      const result = await requestFn();
      return result;
    } finally {
      // 清理完成的请求
      if (pendingRequests.current.get(key) === controller) {
        pendingRequests.current.delete(key);
      }
    }
  }, []);

  // 组件卸载时取消所有pending请求
  const cancelAllRequests = useCallback(() => {
    pendingRequests.current.forEach((controller, key) => {
      controller.abort();
      console.log(`[useRequestManager] 取消请求: ${key}`);
    });
    pendingRequests.current.clear();
  }, []);

  return { makeRequest, cancelAllRequests };
}