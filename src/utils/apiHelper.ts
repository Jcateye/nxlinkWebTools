/**
 * API辅助工具
 * 确保所有API请求都使用正确的代理路径
 */

/**
 * 修正API URL，确保使用相对路径以启用代理
 * @param url 原始URL
 * @returns 修正后的URL
 */
export function fixApiUrl(url: string): string {
  // 如果URL已经是相对路径，直接返回
  if (url.startsWith('/')) {
    return url;
  }
  
  // 替换常见的生产环境URL为代理路径
  const urlMappings = [
    { pattern: /^https?:\/\/nxlink\.nxcloud\.com\/hk\//i, replacement: '/api/hk/' },
    { pattern: /^https?:\/\/nxlink\.nxcloud\.com\/chl\//i, replacement: '/api/chl/' },
    { pattern: /^https?:\/\/nxlink\.nxcloud\.com\//i, replacement: '/api/' },
  ];
  
  for (const mapping of urlMappings) {
    if (mapping.pattern.test(url)) {
      const fixedUrl = url.replace(mapping.pattern, mapping.replacement);
      console.log(`[fixApiUrl] 转换URL: ${url} -> ${fixedUrl}`);
      return fixedUrl;
    }
  }
  
  // 如果没有匹配的模式，返回原URL
  console.warn(`[fixApiUrl] 未能转换URL: ${url}`);
  return url;
}

/**
 * 检查是否在开发环境
 */
export function isDevelopment(): boolean {
  return import.meta.env.MODE === 'development' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

/**
 * 获取正确的API基础URL
 * @param dataCenter 数据中心配置
 */
export function getApiBaseUrl(dataCenter: { baseURL: string }): string {
  // 在开发环境始终使用代理路径
  if (isDevelopment()) {
    return dataCenter.baseURL;
  }
  
  // 生产环境可能需要完整URL（取决于部署配置）
  // 这里仍然返回代理路径，因为通常生产环境也会配置Nginx代理
  return dataCenter.baseURL;
}