"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    let { statusCode = 500, message } = err;
    if (err.name === 'PrismaClientKnownRequestError') {
        statusCode = 400;
        message = '数据库操作失败';
    }
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = '无效的访问令牌';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = '访问令牌已过期';
    }
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = '请求参数验证失败';
    }
    logger_1.logger.error('API错误:', {
        error: message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode
    });
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map