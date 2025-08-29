"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            totalTests: 156,
            successRate: 85.2,
            avgLatency: 1250,
            totalTokens: 125000,
            totalCost: 12.45,
            topProviders: [
                { name: 'OpenAI', count: 45, successRate: 92.3 },
                { name: 'Anthropic', count: 38, successRate: 89.5 },
                { name: 'Google', count: 32, successRate: 87.1 }
            ],
            recentTrends: [
                { date: '2024-01-01', tests: 12, successRate: 83.3 },
                { date: '2024-01-02', tests: 18, successRate: 88.9 },
                { date: '2024-01-03', tests: 15, successRate: 86.7 },
                { date: '2024-01-04', tests: 22, successRate: 90.9 },
                { date: '2024-01-05', tests: 19, successRate: 84.2 }
            ]
        };
        res.json({
            success: true,
            data: stats
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取统计数据失败:', error);
        res.status(500).json({ error: '获取统计数据失败' });
        return;
    }
});
router.get('/performance', async (req, res) => {
    try {
        const performance = {
            latencyDistribution: [
                { range: '0-500ms', count: 45, percentage: 28.8 },
                { range: '500-1000ms', count: 62, percentage: 39.7 },
                { range: '1000-2000ms', count: 38, percentage: 24.4 },
                { range: '2000ms+', count: 11, percentage: 7.1 }
            ],
            tokenUsage: [
                { provider: 'OpenAI', inputTokens: 45000, outputTokens: 38000 },
                { provider: 'Anthropic', inputTokens: 32000, outputTokens: 28000 },
                { provider: 'Google', inputTokens: 28000, outputTokens: 24000 }
            ],
            costAnalysis: [
                { provider: 'OpenAI', cost: 5.67, percentage: 45.5 },
                { provider: 'Anthropic', cost: 4.23, percentage: 34.0 },
                { provider: 'Google', cost: 2.55, percentage: 20.5 }
            ]
        };
        res.json({
            success: true,
            data: performance
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取性能分析失败:', error);
        res.status(500).json({ error: '获取性能分析失败' });
        return;
    }
});
router.get('/errors', async (req, res) => {
    try {
        const errors = {
            errorTypes: [
                { type: 'API_TIMEOUT', count: 8, percentage: 34.8 },
                { type: 'RATE_LIMIT', count: 6, percentage: 26.1 },
                { type: 'INVALID_REQUEST', count: 5, percentage: 21.7 },
                { type: 'NETWORK_ERROR', count: 4, percentage: 17.4 }
            ],
            errorsByProvider: [
                { provider: 'OpenAI', errors: 12, total: 45, rate: 26.7 },
                { provider: 'Anthropic', errors: 8, total: 38, rate: 21.1 },
                { provider: 'Google', errors: 3, total: 32, rate: 9.4 }
            ],
            recentErrors: [
                {
                    timestamp: '2024-01-05T10:30:00Z',
                    provider: 'OpenAI',
                    model: 'gpt-4',
                    error: 'API_TIMEOUT',
                    message: '请求超时'
                },
                {
                    timestamp: '2024-01-05T09:15:00Z',
                    provider: 'Anthropic',
                    model: 'claude-3',
                    error: 'RATE_LIMIT',
                    message: '速率限制'
                }
            ]
        };
        res.json({
            success: true,
            data: errors
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取错误分析失败:', error);
        res.status(500).json({ error: '获取错误分析失败' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map