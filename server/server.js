const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const ttsRoutes = require('./routes/tts');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 创建静态音频目录
const audioDir = path.join(__dirname, 'public/audio');
const fs = require('fs');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// 路由
app.use('/api/tts', ttsRoutes);

// 服务静态文件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('服务器错误');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口: ${PORT}`);
}); 