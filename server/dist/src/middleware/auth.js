"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: '访问令牌缺失' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default-secret');
        req.user = decoded;
        next();
        return;
    }
    catch (error) {
        logger_1.logger.error('认证失败:', error);
        res.status(401).json({ error: '无效的访问令牌' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default-secret');
            req.user = decoded;
        }
        next();
        return;
    }
    catch (error) {
        next();
        return;
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map