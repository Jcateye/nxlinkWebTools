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
    console.log(`代理请求: ${req.method} ${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    console.log(`代理响应: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('代理错误:', err);
    res.status(502).send('API 代理出错');
  }
}));

// =========================
// 2. 其余中间件（会消费 body 的）放在代理之后
// =========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  
  console.log('\n标签分组迁移工具服务已启动！\n');
  console.log(`本地访问地址: http://localhost:${PORT}`);
  
  if (ipAddresses.length > 0) {
    console.log('\n通过网络访问:');
    ipAddresses.forEach(ip => {
      console.log(`http://${ip}:${PORT}`);
    });
  }
  
  console.log('\nAPI代理已配置: /api -> https://nxlink.nxcloud.com');
  console.log('\nTTS服务已启动: /api/tts');
  console.log('\n按 Ctrl+C 停止服务\n');
}); 