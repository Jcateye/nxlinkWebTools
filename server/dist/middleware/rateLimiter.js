"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const store = {};
const rateLimiter = (req, res, next) => {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    const key = req.ip || 'unknown';
    const now = Date.now();
    if (store[key] && now > store[key].resetTime) {
        delete store[key];
    }
    if (!store[key]) {
        store[key] = {
            count: 1,
            resetTime: now + windowMs
        };
    }
    else {
        store[key].count++;
    }
    if (store[key].count > maxRequests) {
        const resetTimeSeconds = Math.ceil((store[key].resetTime - now) / 1000);
        res.status(429).json({
            success: false,
            message: '请求过于频繁，请稍后再试',
            retryAfter: resetTimeSeconds
        });
        return;
    }
    res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - store[key].count).toString(),
        'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString()
    });
    next();
};
exports.rateLimiter = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map