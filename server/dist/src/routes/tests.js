"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
let testRuns = [];
let testResults = [];
let testLogs = [];
let nextId = 1;
router.get('/runs', async (req, res) => {
    try {
        res.json({
            success: true,
            data: testRuns
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取测试运行列表失败:', error);
        res.status(500).json({ error: '获取测试运行列表失败' });
        return;
    }
});
router.post('/runs', async (req, res) => {
    try {
        const { name, description, selectedProviders, selectedPrompts, testRounds } = req.body;
        if (!name || !selectedProviders || !selectedPrompts) {
            res.status(400).json({ error: '必填字段不能为空' });
            return;
        }
        const testRun = {
            id: nextId++,
            name,
            description,
            selectedProviders: JSON.stringify(selectedProviders),
            selectedPrompts: JSON.stringify(selectedPrompts),
            testRounds: testRounds || 1,
            status: 'PENDING',
            progress: 0,
            totalTests: 0,
            successTests: 0,
            failedTests: 0,
            averageLatency: 0,
            totalTokens: 0,
            totalCost: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        testRuns.push(testRun);
        logger_1.logger.info(`创建测试运行成功: ${name}`);
        res.json({
            success: true,
            data: testRun
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('创建测试运行失败:', error);
        res.status(500).json({ error: '创建测试运行失败' });
        return;
    }
});
router.get('/runs/:id/results', async (req, res) => {
    try {
        const { id } = req.params;
        const results = testResults.filter(r => r.testRunId === parseInt(id));
        res.json({
            success: true,
            data: results
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取测试结果失败:', error);
        res.status(500).json({ error: '获取测试结果失败' });
        return;
    }
});
router.post('/logs', async (req, res) => {
    try {
        const { testRunId, sessionId, level, message, details, provider, model, prompt, round } = req.body;
        const log = {
            id: nextId++,
            testRunId,
            sessionId,
            level,
            message,
            details,
            provider,
            model,
            prompt,
            round,
            createdAt: new Date().toISOString()
        };
        testLogs.push(log);
        const io = req.app.get('io');
        if (io && sessionId) {
            io.to(`test-${sessionId}`).emit('test-log', log);
        }
        logger_1.logger.info(`记录测试日志: ${level} - ${message}`);
        res.json({
            success: true,
            data: log
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('记录测试日志失败:', error);
        res.status(500).json({ error: '记录测试日志失败' });
        return;
    }
});
router.get('/logs', async (req, res) => {
    try {
        const { sessionId, testRunId, limit = 100 } = req.query;
        let logs = testLogs;
        if (sessionId) {
            logs = logs.filter(log => log.sessionId === sessionId);
        }
        if (testRunId) {
            logs = logs.filter(log => log.testRunId === parseInt(testRunId));
        }
        const limitNum = parseInt(limit);
        if (limitNum > 0) {
            logs = logs.slice(-limitNum);
        }
        res.json({
            success: true,
            data: logs
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('获取测试日志失败:', error);
        res.status(500).json({ error: '获取测试日志失败' });
        return;
    }
});
router.delete('/logs', async (req, res) => {
    try {
        const { sessionId, testRunId } = req.body;
        if (sessionId) {
            testLogs = testLogs.filter(log => log.sessionId !== sessionId);
        }
        else if (testRunId) {
            testLogs = testLogs.filter(log => log.testRunId !== testRunId);
        }
        else {
            testLogs = [];
        }
        logger_1.logger.info('清空测试日志成功');
        res.json({
            success: true,
            message: '日志已清空'
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('清空测试日志失败:', error);
        res.status(500).json({ error: '清空测试日志失败' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=tests.js.map