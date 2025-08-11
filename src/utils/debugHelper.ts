/**
 * 调试辅助工具
 * 用于诊断和修复API请求问题
 */

// 拦截并记录所有XMLHttpRequest
export function interceptXHR() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
    // 记录请求
    console.log(`[XHR拦截] ${method} ${url}`);
    
    // 检测并警告错误的域名
    if (url.includes('nxlink.ai')) {
      console.error(`[XHR拦截] 🚫 检测到错误的域名 nxlink.ai！应该使用 nxlink.nxcloud.com`);
      console.trace('调用栈：');
      
      // 自动修正URL
      const correctedUrl = url.replace(/nxlink\.ai/g, 'nxlink.nxcloud.com');
      console.log(`[XHR拦截] ✅ 自动修正为: ${correctedUrl}`);
      url = correctedUrl;
    }
    
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(data?: any) {
    this.addEventListener('load', function() {
      if (this.status >= 400) {
        console.error(`[XHR拦截] 请求失败: ${this.status} ${this.statusText}`, this.responseURL);
      }
    });
    
    return originalSend.apply(this, arguments as any);
  };
}

// 拦截并记录所有fetch请求
export function interceptFetch() {
  const originalFetch = window.fetch;
  
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    let url = '';
    
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    }
    
    console.log(`[Fetch拦截] ${init?.method || 'GET'} ${url}`);
    
    // 检测并警告错误的域名
    if (url.includes('nxlink.ai')) {
      console.error(`[Fetch拦截] 🚫 检测到错误的域名 nxlink.ai！应该使用 nxlink.nxcloud.com`);
      console.trace('调用栈：');
      
      // 自动修正URL
      const correctedUrl = url.replace(/nxlink\.ai/g, 'nxlink.nxcloud.com');
      console.log(`[Fetch拦截] ✅ 自动修正为: ${correctedUrl}`);
      
      if (typeof input === 'string') {
        input = correctedUrl;
      } else if (input instanceof URL) {
        input = new URL(correctedUrl);
      } else if (input instanceof Request) {
        input = new Request(correctedUrl, input);
      }
    }
    
    return originalFetch.apply(this, [input, init])
      .then(response => {
        if (!response.ok) {
          console.error(`[Fetch拦截] 请求失败: ${response.status} ${response.statusText}`, response.url);
        }
        return response;
      });
  };
}

// 初始化调试工具
export function initDebugHelpers() {
  if (import.meta.env.DEV) {
    console.log('🔧 调试工具已启动');
    interceptXHR();
    interceptFetch();
    
    // 监听未捕获的错误
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('nxlink.ai')) {
        console.error('🚫 未捕获的错误包含错误域名:', event.reason);
      }
    });
  }
}