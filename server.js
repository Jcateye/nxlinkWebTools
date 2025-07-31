const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const os = require('os');

// 导入TTS路由
const ttsRoutes = require('./server/routes/tts');

// 获取本机IP地址
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  Object.keys(interfaces).forEach((netInterface) => {
    interfaces[netInterface].forEach((interfaceObj) => {
      // 跳过内部IP和非IPv4地址
      if (!interfaceObj.internal && interfaceObj.family === 'IPv4') {
        addresses.push(interfaceObj.address);
      }
    });
  });
  
  return addresses;
}

const app = express();
const PORT = process.env.PORT || 4000;

// 批量测试日志存储
let batchTestLogs = [];

// 启用CORS
app.use(cors());

// =========================
// 1. 先挂载 API 代理，避免 body 已被解析导致流被消耗
// =========================
app.use('/api', createProxyMiddleware({
  target: 'https://nxlink.nxcloud.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  },
  // 不再读取 req 流，防止 body 被消费
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 代理请求: ${req.method} ${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 代理响应: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 代理错误:`, err.message);
    res.status(502).send('API 代理出错');
  }
}));

// =========================
// 2. 其余中间件（会消费 body 的）放在代理之后
// =========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 批量测试日志API
app.post('/batch-test-log', (req, res) => {
  try {
    const { level, message, details, sessionId } = req.body;
    const logEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
      level: level || 'info',
      message: message || '',
      details: details || null,
      sessionId: sessionId || 'unknown'
    };
    
    batchTestLogs.push(logEntry);
    
    // 保持最多1000条日志
    if (batchTestLogs.length > 1000) {
      batchTestLogs = batchTestLogs.slice(-1000);
    }
    
    // 在服务器控制台输出日志
    const levelIcon = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    
    console.log(`[${new Date(logEntry.timestamp).toLocaleTimeString()}] ${levelIcon[level] || 'ℹ️'} [批量测试] ${message}`);
    if (details) {
      console.log('  详情:', JSON.stringify(details, null, 2));
    }
    
    res.json({ success: true, logId: logEntry.id });
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 日志记录失败:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取批量测试日志API
app.get('/batch-test-logs', (req, res) => {
  try {
    const { sessionId, limit = 100 } = req.query;
    let logs = batchTestLogs;
    
    if (sessionId) {
      logs = logs.filter(log => log.sessionId === sessionId);
    }
    
    // 限制返回数量
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
      logs = logs.slice(-limitNum);
    }
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 获取日志失败:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 清空批量测试日志API
app.delete('/batch-test-logs', (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId) {
      batchTestLogs = batchTestLogs.filter(log => log.sessionId !== sessionId);
      console.log(`[${new Date().toLocaleTimeString()}] 🗑️ 已清空会话 ${sessionId} 的日志`);
    } else {
      batchTestLogs = [];
      console.log(`[${new Date().toLocaleTimeString()}] 🗑️ 已清空所有批量测试日志`);
    }
    
    res.json({ success: true, message: '日志已清空' });
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 清空日志失败:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 静态文件目录
app.use('/audio', express.static(path.join(__dirname, 'server/public/audio')));

// 添加TTS路由
app.use('/api/tts', ttsRoutes);

// 提供静态文件
app.use(express.static(path.join(__dirname, 'dist')));

// 所有其他请求返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  const ipAddresses = getLocalIp();
  
  console.log('\n🚀 标签分组迁移工具服务已启动！\n');
  console.log(`📍 本地访问地址: http://localhost:${PORT}`);
  
  if (ipAddresses.length > 0) {
    console.log('\n🌐 通过网络访问:');
    ipAddresses.forEach(ip => {
      console.log(`   http://${ip}:${PORT}`);
    });
  }
  
  console.log('\n🔗 API代理已配置: /api -> https://nxlink.nxcloud.com');
  console.log('🎵 TTS服务已启动: /api/tts');
  console.log('📊 批量测试日志API已启动: /api/local/batch-test/log');
  console.log('\n按 Ctrl+C 停止服务\n');
}); 