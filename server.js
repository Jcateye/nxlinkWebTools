const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const os = require('os');
const crypto = require('crypto');

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

// 读取API Key配置
function getApiKeyConfig(apiKey) {
  try {
    const configPath = path.join(__dirname, 'server/config/api-keys.json');
    if (!fs.existsSync(configPath)) {
      console.log('API Key配置文件不存在:', configPath);
      return null;
    }

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const keys = configData.keys || [];

    // 先查找文件中的配置
    let apiKeyConfig = keys.find(key => key.apiKey === apiKey);
    if (apiKeyConfig) {
      return {
        ...apiKeyConfig,
        source: 'file'
      };
    }

    // 如果没找到，尝试查找环境变量中的配置
    const envApiKeys = [
      {
        apiKey: 'demo-api-key-1',
        alias: '营销云内部环境',
        openapi: {
          accessKey: process.env.DEMO_API_KEY_1_ACCESS_KEY || 'AK-764887602601150724-2786',
          accessSecret: process.env.DEMO_API_KEY_1_ACCESS_SECRET || '0de4a159402a4e3494f76669ac92d6e6',
          bizType: process.env.DEMO_API_KEY_1_BIZ_TYPE || '8',
          baseUrl: process.env.DEMO_API_KEY_1_BASE_URL || 'https://api-westus.nxlink.ai'
        }
      }
    ];

    apiKeyConfig = envApiKeys.find(key => key.apiKey === apiKey);
    if (apiKeyConfig) {
      return {
        ...apiKeyConfig,
        source: 'env'
      };
    }

    return null;
  } catch (error) {
    console.error('读取API Key配置失败:', error);
    return null;
  }
}

// 生成OpenAPI签名
function generateOpenApiSign(accessKey, action, bizType, ts, bodyJsonString, accessSecret) {
  // Step 1: 创建headers对象并按key的ASCII码升序排列
  const headers = {
    accessKey: accessKey,
    action: action,
    bizType: bizType,
    ts: ts
  };

  // 按key的ASCII码升序排列
  const sortedKeys = Object.keys(headers).sort();
  const headersStr = sortedKeys.map(key => `${key}=${headers[key]}`).join('&');

  // Step 2: 拼接body参数
  let raw = headersStr;
  // 只有当body不为空且不为'{}'时才拼接body参数
  if (bodyJsonString && bodyJsonString.trim() !== '' && bodyJsonString !== '{}') {
    raw += `&body=${bodyJsonString}`;
  }

  // Step 3: 拼接accessSecret
  raw += `&accessSecret=${accessSecret}`;

  // Debug: 打印签名原文（仅显示前50个字符和后20个字符）
  const rawPreview = raw.length > 70
    ? `${raw.substring(0, 50)}...${raw.substring(raw.length - 20)}`
    : raw;

  console.log(`[${new Date().toLocaleTimeString()}] 🔐 签名计算详情:`);
  console.log(`  Headers对象:`, headers);
  console.log(`  排序后的Keys:`, sortedKeys);
  console.log(`  HeadersStr: ${headersStr}`);
  console.log(`  Body: ${bodyJsonString}`);
  console.log(`  Raw字符串长度: ${raw.length}`);
  console.log(`  Raw预览: ${rawPreview}`);

  // Step 4: MD5哈希并转换为小写十六进制
  const sign = crypto.createHash('md5').update(raw, 'utf8').digest('hex');

  console.log(`  生成签名: ${sign}`);
  return sign;
}

const app = express();
const PORT = process.env.PORT || 8300;
const BACKEND_PORT = process.env.BACKEND_PORT || 8400;

// 批量测试日志存储
let batchTestLogs = [];

// 启用CORS
app.use(cors());

// =========================
// 1. 先挂载 API 代理（代理需要原始请求体）
// =========================

// 内部API代理 - 代理到本地的后端API服务（必须放在最前面，避免被其他API代理拦截）
app.use('/internal-api', createProxyMiddleware({
  target: `http://localhost:${BACKEND_PORT}`,
  changeOrigin: true,
  // 不进行路径重写，直接保持 /internal-api 路径
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 代理请求(Internal API): ${req.method} ${req.url} -> http://localhost:${BACKEND_PORT}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, system_id';
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 代理响应(Internal API): ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 代理错误(Internal API):`, err.message);
    res.status(502).json({ error: 'Internal API 代理出错', message: err.message });
  }
}));

// 香港数据中心代理 - 直接访问根路径，因为/hk会被重定向
app.use('/api/hk', createProxyMiddleware({
  target: 'https://nxlink.nxcloud.com',  // 不要加 /hk
  changeOrigin: true,
  secure: false,
  pathRewrite: {
    '^/api/hk': ''  // 移除 /api/hk，直接访问根路径
  },
  onProxyReq: (proxyReq, req, res) => {
    // 设置必要的请求头，避免被重定向
    proxyReq.setHeader('Host', 'nxlink.nxcloud.com');
    proxyReq.setHeader('Origin', 'https://nxlink.nxcloud.com');
    proxyReq.setHeader('Referer', 'https://nxlink.nxcloud.com');

    // 保留原始的认证和系统ID头
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    if (req.headers['system_id']) {
      proxyReq.setHeader('system_id', req.headers['system_id']);
    }

    console.log(`[${new Date().toLocaleTimeString()}] 🔄 代理请求(HK): ${req.method} ${req.url}`);
    console.log(`  目标: https://nxlink.nxcloud.com/hk${req.url.replace('/api/hk', '')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // 如果响应是重定向，修改Location头
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const originalLocation = proxyRes.headers.location;
      // 将重定向URL转换为本地代理路径
      if (originalLocation.includes('nxlink.ai')) {
        proxyRes.headers.location = originalLocation
          .replace('https://nxlink.ai/hk/', '/api/hk/')
          .replace('http://nxlink.ai/hk/', '/api/hk/');
        console.log(`[${new Date().toLocaleTimeString()}] 🔀 修改重定向: ${originalLocation} -> ${proxyRes.headers.location}`);
      }
    }

    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, system_id';
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 代理响应(HK): ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 代理错误(HK):`, err.message);
    res.status(502).send('HK API 代理出错');
  }
}));

// CHL数据中心代理
app.use('/api/chl', createProxyMiddleware({
  target: 'https://nxlink.nxcloud.com/chl',
  changeOrigin: true,
  secure: false,
  followRedirects: false,
  pathRewrite: {
    '^/api/chl': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Host', 'nxlink.nxcloud.com');
    proxyReq.setHeader('Origin', 'https://nxlink.nxcloud.com');
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 代理请求(CHL): ${req.method} ${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const originalLocation = proxyRes.headers.location;
      if (originalLocation.includes('nxlink.ai')) {
        proxyRes.headers.location = originalLocation
          .replace('https://nxlink.ai/chl/', '/api/chl/')
          .replace('http://nxlink.ai/chl/', '/api/chl/');
        console.log(`[${new Date().toLocaleTimeString()}] 🔀 修改重定向: ${originalLocation} -> ${proxyRes.headers.location}`);
      }
    }
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, system_id';
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 代理响应(CHL): ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 代理错误(CHL):`, err.message);
    res.status(502).send('CHL API 代理出错');
  }
}));

// OpenAPI 平台代理 - 代理到本地后端服务，而不是直接访问外部API
app.use('/api/openapi', createProxyMiddleware({
  target: `http://localhost:${BACKEND_PORT}`,
  changeOrigin: true,
  // 不进行路径重写，保持 /api/openapi 路径
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 代理请求(OpenAPI到后端): ${req.method} ${req.url} -> http://localhost:${BACKEND_PORT}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, system_id';
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 代理响应(OpenAPI到后端): ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 代理错误(OpenAPI):`, err.message);
    console.error(`  错误详情:`, err);
    res.status(502).json({
      error: 'OpenAPI 代理出错',
      message: err.message,
      details: err.toString()
    });
  }
}));

// 默认API代理
app.use('/api', createProxyMiddleware({
  target: 'https://nxlink.nxcloud.com',
  changeOrigin: true,
  secure: false,
  followRedirects: false,
  pathRewrite: {
    '^/api': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Host', 'nxlink.nxcloud.com');
    proxyReq.setHeader('Origin', 'https://nxlink.nxcloud.com');
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 代理请求: ${req.method} ${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const originalLocation = proxyRes.headers.location;
      if (originalLocation.includes('nxlink.ai')) {
        proxyRes.headers.location = originalLocation
          .replace('https://nxlink.ai/', '/api/')
          .replace('http://nxlink.ai/', '/api/');
        console.log(`[${new Date().toLocaleTimeString()}] 🔀 修改重定向: ${originalLocation} -> ${proxyRes.headers.location}`);
      }
    }
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, system_id';
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 代理响应: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 代理错误:`, err.message);
    res.status(502).send('API 代理出错');
  }
}));

// =========================
// 代理设置完成后，其他中间件
// =========================

// 设置 body 解析中间件（仅用于非代理路由）
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