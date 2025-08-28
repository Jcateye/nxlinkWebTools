/**
 * Token清理工具
 * 用于检测和清理过期的token
 */

// 定义登录过期相关的错误码和消息
const EXPIRED_TOKEN_CODES = [12142, 401, 403];
export const EXPIRED_TOKEN_MESSAGES = [
  '登录过期',
  '请重新登录',
  '未登录',
  '登录失效',
  'token过期',
  'token失效',
  'unauthorized',
  'forbidden'
];

/**
 * 检查响应是否表示token过期
 */
export const isTokenExpired = (response: any): boolean => {
  if (!response) return false;
  
  // 检查HTTP状态码
  if (response.status === 401 || response.status === 403) {
    return true;
  }
  
  // 检查响应数据中的错误码
  const data = response.data || response;
  if (data.code && EXPIRED_TOKEN_CODES.includes(data.code)) {
    return true;
  }
  
  // 检查错误消息
  const message = (data.message || '').toLowerCase();
  return EXPIRED_TOKEN_MESSAGES.some(expiredMsg => 
    message.includes(expiredMsg.toLowerCase())
  );
};

/**
 * 清理指定的token（如果它与存储的token匹配）
 */
export const cleanupExpiredToken = (usedToken: string, storageKey: string): boolean => {
  if (!usedToken || !storageKey) return false;
  
  try {
    const storedToken = localStorage.getItem(storageKey);
    
    // 只有当使用的token与存储的token完全匹配时才清理
    if (storedToken && storedToken === usedToken) {
      localStorage.removeItem(storageKey);
      console.log(`🧹 [Token清理] 已清理过期token: ${storageKey}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('清理token时出错:', error);
    return false;
  }
};

/**
 * 清理会话中的过期token
 */
export const cleanupExpiredSessionToken = (
  usedToken: string, 
  sessionId: string, 
  tokenType: 'sourceAuthorization' | 'targetAuthorization'
): boolean => {
  if (!usedToken || !sessionId) return false;
  
  try {
    const storageKey = `faqUserParams_${sessionId}`;
    const faqParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // 检查使用的token是否与会话中存储的token匹配
    if (faqParams[tokenType] && faqParams[tokenType] === usedToken) {
      // 清理会话中的token
      delete faqParams[tokenType];
      localStorage.setItem(storageKey, JSON.stringify(faqParams));
      console.log(`🧹 [Token清理] 已清理会话中的过期token: ${tokenType}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('清理会话token时出错:', error);
    return false;
  }
};

/**
 * 全面清理过期token
 * 根据使用的token，检查并清理所有可能的存储位置
 */
export const cleanupAllExpiredTokens = (usedToken: string): void => {
  if (!usedToken) return;
  
  console.log(`🔍 [Token清理] 开始清理过期token: ${usedToken.substring(0, 20)}...`);
  
  let cleaned = false;
  
  // 1. 清理全局token
  if (cleanupExpiredToken(usedToken, 'nxlink_client_token')) {
    cleaned = true;
  }
  
  // 2. 清理持久化的源租户token
  if (cleanupExpiredToken(usedToken, 'nxlink_source_token')) {
    cleaned = true;
  }
  
  // 3. 清理持久化的目标租户token
  if (cleanupExpiredToken(usedToken, 'nxlink_target_token')) {
    cleaned = true;
  }
  
  // 4. 清理会话中的token
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    if (cleanupExpiredSessionToken(usedToken, sessionId, 'sourceAuthorization')) {
      cleaned = true;
    }
    if (cleanupExpiredSessionToken(usedToken, sessionId, 'targetAuthorization')) {
      cleaned = true;
    }
  }
  
  if (cleaned) {
    console.log('✅ [Token清理] 过期token清理完成');
    
    // 触发页面刷新或重新渲染（通过自定义事件）
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tokenExpired', { 
        detail: { expiredToken: usedToken } 
      }));
    }
  } else {
    console.log('ℹ️ [Token清理] 未找到匹配的过期token');
  }
};
