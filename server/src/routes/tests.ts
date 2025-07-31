import { Router, Request, Response } from 'express';
import { prisma } from '../utils/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// 内存存储
let testRuns: any[] = [];
let testResults: any[] = [];
let testLogs: any[] = [];
let nextId = 1;

// 获取测试运行列表
router.get('/runs', async (req, res) => {
  try {
    res.json({
      success: true,
      data: testRuns
    });
  } catch (error) {
    logger.error('获取测试运行列表失败:', error);
    res.status(500).json({ error: '获取测试运行列表失败' });
  }
});

// 创建测试运行
router.post('/runs', async (req, res) => {
  try {
    const {
      name,
      description,
      selectedProviders,
      selectedPrompts,
      testRounds
    } = req.body;

    if (!name || !selectedProviders || !selectedPrompts) {
      return res.status(400).json({ error: '必填字段不能为空' });
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
    
    logger.info(`创建测试运行成功: ${name}`);
    
    res.json({
      success: true,
      data: testRun
    });
  } catch (error) {
    logger.error('创建测试运行失败:', error);
    res.status(500).json({ error: '创建测试运行失败' });
  }
});

// 获取测试结果
router.get('/runs/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const results = testResults.filter(r => r.testRunId === parseInt(id));
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('获取测试结果失败:', error);
    res.status(500).json({ error: '获取测试结果失败' });
  }
});

// 记录测试日志
router.post('/logs', async (req, res) => {
  try {
    const {
      testRunId,
      sessionId,
      level,
      message,
      details,
      provider,
      model,
      prompt,
      round
    } = req.body;

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
    
    // 通过Socket.io发送实时日志
    const io = req.app.get('io');
    if (io && sessionId) {
      io.to(`test-${sessionId}`).emit('test-log', log);
    }
    
    logger.info(`记录测试日志: ${level} - ${message}`);
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    logger.error('记录测试日志失败:', error);
    res.status(500).json({ error: '记录测试日志失败' });
  }
});

// 获取测试日志
router.get('/logs', async (req, res) => {
  try {
    const { sessionId, testRunId, limit = 100 } = req.query;
    let logs = testLogs;
    
    if (sessionId) {
      logs = logs.filter(log => log.sessionId === sessionId);
    }
    
    if (testRunId) {
      logs = logs.filter(log => log.testRunId === parseInt(testRunId as string));
    }
    
    // 限制返回数量
    const limitNum = parseInt(limit as string);
    if (limitNum > 0) {
      logs = logs.slice(-limitNum);
    }
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('获取测试日志失败:', error);
    res.status(500).json({ error: '获取测试日志失败' });
  }
});

// 清空测试日志
router.delete('/logs', async (req, res) => {
  try {
    const { sessionId, testRunId } = req.body;
    
    if (sessionId) {
      testLogs = testLogs.filter(log => log.sessionId !== sessionId);
    } else if (testRunId) {
      testLogs = testLogs.filter(log => log.testRunId !== testRunId);
    } else {
      testLogs = [];
    }
    
    logger.info('清空测试日志成功');
    
    res.json({
      success: true,
      message: '日志已清空'
    });
  } catch (error) {
    logger.error('清空测试日志失败:', error);
    res.status(500).json({ error: '清空测试日志失败' });
  }
});

export default router; 