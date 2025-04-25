const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const os = require('os');

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

// API代理配置
app.use('/api', createProxyMiddleware({
  target: 'https://nxlink.nxcloud.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  },
  onProxyRes: function(proxyRes, req, res) {
    // 添加CORS响应头
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, system_id';
  }
}));

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
  console.log('\n按 Ctrl+C 停止服务\n');
}); 