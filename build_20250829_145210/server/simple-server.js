const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3010",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8001;

// 内存存储
let users = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    createdAt: new Date().toISOString()
  }
];

let providers = [];
let prompts = [];
let testRuns = [];
let testResults = [];
let testLogs = [];
let nextId = 1;

// 中间件
app.use(cors({
  origin: "http://localhost:3010",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'memory',
    providers: providers.length,
    prompts: prompts.length,
    testRuns: testRuns.length
  });
});

// 认证路由
app.post('/api/auth/login', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '邮箱不能为空' });
    }
    
    const user = users.find(u => u.email === email) || users[0];
    
    // 模拟JWT令牌
    const token = Buffer.from(JSON.stringify({ 
      id: user.id, 
      email: user.email, 
      name: user.name,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天
    })).toString('base64');
    
    console.log(`✅ 用户登录成功: ${email}`);
    
    res.json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    res.status(500).json({ error: '登录失败' });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '访问令牌缺失' });
    }
    
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (decoded.exp < Date.now()) {
      return res.status(401).json({ error: '访问令牌已过期' });
    }
    
    res.json({
      success: true,
      data: {
        user: decoded
      }
    });
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error.message);
    res.status(401).json({ error: '无效的访问令牌' });
  }
});

// LLM厂商路由
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    data: providers
  });
});

app.post('/api/providers', (req, res) => {
  try {
    const {
      name,
      displayName,
      category,
      apiKey,
      baseUrl,
      azureEndpoint,
      azureApiVersion,
      azureDeploymentName,
      projectId,
      region,
      customHeaders
    } = req.body;

    if (!name || !displayName || !category || !apiKey) {
      return res.status(400).json({ error: '必填字段不能为空' });
    }

    const provider = {
      id: nextId++,
      name,
      displayName,
      category,
      apiKey,
      baseUrl: baseUrl || null,
      azureEndpoint: azureEndpoint || null,
      azureApiVersion: azureApiVersion || null,
      azureDeploymentName: azureDeploymentName || null,
      projectId: projectId || null,
      region: region || null,
      customHeaders: customHeaders || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    providers.push(provider);
    
    console.log(`✅ 创建厂商配置成功: ${displayName}`);
    
    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('❌ 创建厂商配置失败:', error.message);
    res.status(500).json({ error: '创建厂商配置失败' });
  }
});

app.put('/api/providers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const providerIndex = providers.findIndex(p => p.id === parseInt(id));
    if (providerIndex === -1) {
      return res.status(404).json({ error: '厂商配置不存在' });
    }

    providers[providerIndex] = {
      ...providers[providerIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ 更新厂商配置成功: ${id}`);

    res.json({
      success: true,
      data: providers[providerIndex]
    });
  } catch (error) {
    console.error('❌ 更新厂商配置失败:', error.message);
    res.status(500).json({ error: '更新厂商配置失败' });
  }
});

app.delete('/api/providers/:id', (req, res) => {
  try {
    const { id } = req.params;

    const providerIndex = providers.findIndex(p => p.id === parseInt(id));
    if (providerIndex === -1) {
      return res.status(404).json({ error: '厂商配置不存在' });
    }

    providers.splice(providerIndex, 1);

    console.log(`✅ 删除厂商配置成功: ${id}`);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('❌ 删除厂商配置失败:', error.message);
    res.status(500).json({ error: '删除厂商配置失败' });
  }
});

// 提示词路由
app.get('/api/prompts', (req, res) => {
  res.json({
    success: true,
    data: prompts
  });
});

app.post('/api/prompts', (req, res) => {
  try {
    const {
      name,
      description,
      systemPrompt,
      userPrompt,
      variables,
      category,
      tags
    } = req.body;

    if (!name || !userPrompt) {
      return res.status(400).json({ error: '名称和用户提示词不能为空' });
    }

    const prompt = {
      id: nextId++,
      name,
      description: description || null,
      systemPrompt: systemPrompt || null,
      userPrompt,
      variables: variables || null,
      category: category || null,
      tags: tags || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    prompts.push(prompt);
    
    console.log(`✅ 创建提示词成功: ${name}`);
    
    res.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    console.error('❌ 创建提示词失败:', error.message);
    res.status(500).json({ error: '创建提示词失败' });
  }
});

app.put('/api/prompts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const promptIndex = prompts.findIndex(p => p.id === parseInt(id));
    if (promptIndex === -1) {
      return res.status(404).json({ error: '提示词不存在' });
    }

    prompts[promptIndex] = {
      ...prompts[promptIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ 更新提示词成功: ${id}`);

    res.json({
      success: true,
      data: prompts[promptIndex]
    });
  } catch (error) {
    console.error('❌ 更新提示词失败:', error.message);
    res.status(500).json({ error: '更新提示词失败' });
  }
});

app.delete('/api/prompts/:id', (req, res) => {
  try {
    const { id } = req.params;

    const promptIndex = prompts.findIndex(p => p.id === parseInt(id));
    if (promptIndex === -1) {
      return res.status(404).json({ error: '提示词不存在' });
    }

    prompts.splice(promptIndex, 1);

    console.log(`✅ 删除提示词成功: ${id}`);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('❌ 删除提示词失败:', error.message);
    res.status(500).json({ error: '删除提示词失败' });
  }
});

// 测试运行路由
app.get('/api/tests/runs', (req, res) => {
  res.json({
    success: true,
    data: testRuns
  });
});

app.post('/api/tests/runs', (req, res) => {
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
      description: description || null,
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
    
    console.log(`✅ 创建测试运行成功: ${name}`);
    
    res.json({
      success: true,
      data: testRun
    });
  } catch (error) {
    console.error('❌ 创建测试运行失败:', error.message);
    res.status(500).json({ error: '创建测试运行失败' });
  }
});

app.get('/api/tests/runs/:id/results', (req, res) => {
  try {
    const { id } = req.params;
    const results = testResults.filter(r => r.testRunId === parseInt(id));
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ 获取测试结果失败:', error.message);
    res.status(500).json({ error: '获取测试结果失败' });
  }
});

// 测试日志路由
app.post('/api/tests/logs', (req, res) => {
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
      testRunId: testRunId || null,
      sessionId,
      level,
      message,
      details: details || null,
      provider: provider || null,
      model: model || null,
      prompt: prompt || null,
      round: round || null,
      createdAt: new Date().toISOString()
    };

    testLogs.push(log);
    
    // 保持最多1000条日志
    if (testLogs.length > 1000) {
      testLogs = testLogs.slice(-1000);
    }
    
    // 通过Socket.io发送实时日志
    if (sessionId) {
      io.to(`test-${sessionId}`).emit('test-log', log);
    }
    
    // 在服务器控制台输出日志
    const levelIcon = {
      'DEBUG': '🔍',
      'INFO': 'ℹ️',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌'
    };
    
    console.log(`[${new Date(log.createdAt).toLocaleTimeString()}] ${levelIcon[level] || 'ℹ️'} [${sessionId}] ${message}`);
    if (details) {
      console.log('  详情:', JSON.stringify(details, null, 2));
    }
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('❌ 记录测试日志失败:', error.message);
    res.status(500).json({ error: '记录测试日志失败' });
  }
});

app.get('/api/tests/logs', (req, res) => {
  try {
    const { sessionId, testRunId, limit = 100 } = req.query;
    let logs = testLogs;
    
    if (sessionId) {
      logs = logs.filter(log => log.sessionId === sessionId);
    }
    
    if (testRunId) {
      logs = logs.filter(log => log.testRunId === parseInt(testRunId));
    }
    
    // 限制返回数量
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
      logs = logs.slice(-limitNum);
    }
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('❌ 获取测试日志失败:', error.message);
    res.status(500).json({ error: '获取测试日志失败' });
  }
});

app.delete('/api/tests/logs', (req, res) => {
  try {
    const { sessionId, testRunId } = req.body;
    
    if (sessionId) {
      testLogs = testLogs.filter(log => log.sessionId !== sessionId);
      console.log(`🗑️ 已清空会话 ${sessionId} 的日志`);
    } else if (testRunId) {
      testLogs = testLogs.filter(log => log.testRunId !== testRunId);
      console.log(`🗑️ 已清空测试运行 ${testRunId} 的日志`);
    } else {
      testLogs = [];
      console.log('🗑️ 已清空所有测试日志');
    }
    
    res.json({
      success: true,
      message: '日志已清空'
    });
  } catch (error) {
    console.error('❌ 清空测试日志失败:', error.message);
    res.status(500).json({ error: '清空测试日志失败' });
  }
});

// 分析统计路由
app.get('/api/analytics/stats', (req, res) => {
  try {
    const stats = {
      totalTests: testResults.length,
      successRate: testResults.length > 0 ? 
        (testResults.filter(r => r.status === 'SUCCESS').length / testResults.length * 100).toFixed(1) : 0,
      avgLatency: testResults.length > 0 ? 
        Math.round(testResults.reduce((sum, r) => sum + (r.latency || 0), 0) / testResults.length) : 0,
      totalTokens: testResults.reduce((sum, r) => sum + (r.totalTokens || 0), 0),
      totalCost: testResults.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(2),
      totalProviders: providers.length,
      totalPrompts: prompts.length,
      totalTestRuns: testRuns.length
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ 获取统计数据失败:', error.message);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log(`🔗 客户端已连接: ${socket.id}`);
  
  // 加入测试会话
  socket.on('join-test-session', (sessionId) => {
    socket.join(`test-${sessionId}`);
    console.log(`📝 客户端 ${socket.id} 加入测试会话: ${sessionId}`);
  });
  
  // 离开测试会话
  socket.on('leave-test-session', (sessionId) => {
    socket.leave(`test-${sessionId}`);
    console.log(`📤 客户端 ${socket.id} 离开测试会话: ${sessionId}`);
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log(`❌ 客户端已断开连接: ${socket.id}`);
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
server.listen(PORT, () => {
  console.log('\n🚀 LLM测试系统后端服务已启动！');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🌐 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔗 WebSocket已启用`);
  console.log(`💾 数据存储: 内存模式`);
  console.log(`\n按 Ctrl+C 停止服务\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
}); 