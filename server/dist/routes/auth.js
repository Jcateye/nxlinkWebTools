"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User'
};
router.post('/login', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: '邮箱不能为空' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: mockUser.id, email: mockUser.email, name: mockUser.name }, process.env.JWT_SECRET || 'default-secret', { expiresIn: '7d' });
        logger_1.logger.info(`用户登录成功: ${email}`);
        res.json({
            success: true,
            data: {
                user: mockUser,
                token
            }
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('登录失败:', error);
        res.status(500).json({ error: '登录失败' });
        return;
    }
});
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: '访问令牌缺失' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default-secret');
        res.json({
            success: true,
            data: {
                user: decoded
            }
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取用户信息失败:', error);
        res.status(401).json({ error: '无效的访问令牌' });
        return;
    }
});
router.post('/logout', async (req, res) => {
    try {
        res.json({
            success: true,
            message: '登出成功'
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('登出失败:', error);
        res.status(500).json({ error: '登出失败' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map