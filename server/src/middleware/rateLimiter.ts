import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15分钟
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  
  const key = req.ip || 'unknown';
  const now = Date.now();
  
  // 清理过期的记录
  if (store[key] && now > store[key].resetTime) {
    delete store[key];
  }
  
  // 初始化或更新计数
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs
    };
  } else {
    store[key].count++;
  }
  
  // 检查是否超过限制
  if (store[key].count > maxRequests) {
    const resetTimeSeconds = Math.ceil((store[key].resetTime - now) / 1000);
    
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter: resetTimeSeconds
    });
    return;
  }
  
  // 设置响应头
  res.set({
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': (maxRequests - store[key].count).toString(),
    'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString()
  });
  
  next();
}; 