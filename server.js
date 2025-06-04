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

// JSON解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件目录
app.use('/audio', express.static(path.join(__dirname, 'server/public/audio')));

// 添加TTS路由
app.use('/api/tts', ttsRoutes);

// API代理配置
app.use('/api', createProxyMiddleware({
  target: 'https://nxlink.nxcloud.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // 打印代理请求信息
    console.log(`\n=== 代理请求开始: ${req.method} ${req.url} ===`);
    
    // 特别关注标签迁移接口
    if (req.url.includes('/mgrPlatform/tagGroup/migrate')) {
      console.log('=== 标签迁移请求详情 ===');
      console.log('URL:', req.url);
      console.log('Method:', req.method);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      
      // 获取请求体数据
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          if (body) {
            console.log('Request Body:', body);
            // 尝试解析JSON
            try {
              const jsonBody = JSON.parse(body);
              console.log('Parsed Request Body:', JSON.stringify(jsonBody, null, 2));
            } catch (e) {
              console.log('Body不是有效JSON');
            }
          }
        } catch (error) {
          console.error('读取请求体错误:', error);
        }
      });
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // 添加CORS头
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    
    // 记录响应状态和头信息
    console.log(`\n=== 代理响应: ${req.method} ${req.url} ===`);
    console.log('Status:', proxyRes.statusCode);
    console.log('Headers:', JSON.stringify(proxyRes.headers, null, 2));
    
    // 特别关注标签迁移接口
    if (req.url.includes('/mgrPlatform/tagGroup/migrate')) {
      console.log('=== 标签迁移响应详情 ===');
      
      // 收集响应体
      let responseBody = '';
      proxyRes.on('data', chunk => {
        responseBody += chunk.toString('utf8');
      });
      
      proxyRes.on('end', () => {
        try {
          console.log('Response Body:', responseBody);
          // 尝试解析JSON
          try {
            const jsonResponse = JSON.parse(responseBody);
            console.log('Parsed Response:', JSON.stringify(jsonResponse, null, 2));
          } catch (e) {
            console.log('响应体不是有效JSON');
          }
        } catch (error) {
          console.error('读取响应体错误:', error);
        }
        console.log('=== 标签迁移响应结束 ===\n');
      });
    }
  },
  onError: (err, req, res) => {
    console.error('代理错误:', err);
    res.status(500).send('代理请求出错');
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
  console.log('\nTTS服务已启动: /api/tts');
  console.log('\n按 Ctrl+C 停止服务\n');
}); 