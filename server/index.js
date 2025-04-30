const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// 最大会话数
const MAX_SESSIONS = 10;
// 内存存储的会话列表
let sessions = [];

// 添加根路径响应
app.get('/', (req, res) => {
  res.json({ message: 'NXLink协作服务器运行中' });
});

// 以下为协作 WebSocket 支持
// 创建 HTTP 服务并绑定 express
const server = http.createServer(app);
// 实例化 socket.io
const io = new Server(server, { cors: { origin: '*' } });

// 客户端连接时加入对应 session 房间
io.on('connection', socket => {
  console.log('客户端连接成功', socket.id, socket.handshake.query);
  // 获取查询参数中的 sessionId
  const sessionId = socket.handshake.query.sessionId;
  if (sessionId) socket.join(`session:${sessionId}`);
  // 监听客户端触发的 auth 更新
  socket.on('auth_update', payload => {
    console.log('收到 auth_update 事件', payload);
    const room = `session:${payload.sessionId}`;
    
    // 将更新保存到内存: 分别更新 tagUserParams 和 faqUserParams
    const sessionIndex = sessions.findIndex(s => s.id === payload.sessionId);
    if (sessionIndex !== -1) {
      const session = sessions[sessionIndex];
      const authData = payload.authData || {};
      if (authData.tagUserParams) {
        session.tagUserParams = authData.tagUserParams;
      }
      if (authData.faqUserParams) {
        session.faqUserParams = authData.faqUserParams;
      }
      session.updatedAt = Date.now();
      console.log('已将授权信息分开保存到内存');
    }
    
    // 广播到所有连接的客户端
    io.to(room).emit('auth_update', payload);
  });
  
  // 客户端请求服务器当前时间，用于时钟校准
  socket.on('getServerTime', (_, ack) => {
    if (typeof ack === 'function') {
      ack(Date.now());
    }
  });

  // 客户端提交全部会话更新（带 timestamp 决胜）
  socket.on('updateSession', (sessionPayload, ack) => {
    const { id, updatedAt: clientTs } = sessionPayload;
    const room = `session:${id}`;
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) {
      return ack?.({ success: false, reason: 'notfound' });
    }
    const localTs = sessions[index].updatedAt || sessions[index].createdAt;
    // 只有当客户端 timestamp 更新更晚，才接受
    if (clientTs <= localTs) {
      return ack?.({ success: false, reason: 'stale' });
    }
    // 合并更新
    const newSession = { ...sessions[index], ...sessionPayload, updatedAt: clientTs };
    sessions[index] = newSession;
    // 广播给所有客户端
    io.to(room).emit('sessionUpdated', newSession);
    // ACK 客户端
    ack?.({ success: true, session: newSession });
  });
  
  // 监听断开连接
  socket.on('disconnect', () => {
    console.log('客户端断开连接', socket.id);
  });
});

// API路由
// 获取所有会话
app.get('/api/sessions', (req, res) => {
  console.log('获取所有会话');
  // 按更新时间倒序排序
  const sortedSessions = [...sessions].sort((a, b) => 
    (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
  );
  res.json(sortedSessions);
});

// 获取单个会话
app.get('/api/sessions/:id', (req, res) => {
  console.log('获取单个会话:', req.params.id);
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// 创建新会话
app.post('/api/sessions', (req, res) => {
  console.log('创建会话:', req.body);
  try {
    const { name, createdBy, creatorName, tagUserParams, faqUserParams, companyInfo, userParams } = req.body;
    
    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Missing name or createdBy' });
    }
    
    // 检查会话数量上限
  if (sessions.length >= MAX_SESSIONS) {
    return res.status(400).json({ error: 'Maximum sessions reached' });
  }
    
  const newSession = {
    id: uuidv4(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy,
      creatorName,
    participants: [createdBy],
    tagUserParams: tagUserParams || null,
    faqUserParams: faqUserParams || null,
      companyInfo: companyInfo || {},
      userParams: userParams || null
  };
    
  sessions.push(newSession);
    console.log('会话创建成功:', newSession.id);
  res.status(201).json(newSession);
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 加入会话
app.post('/api/sessions/:id/join', (req, res) => {
  console.log('加入会话:', req.params.id, req.body);
  try {
    const { userId, username } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }
    
    const session = sessions[sessionIndex];
    
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
    session.updatedAt = Date.now();
      // 更新会话
      sessions[sessionIndex] = session;
    }
    
    res.json(session);
  } catch (error) {
    console.error('加入会话失败:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除会话
app.delete('/api/sessions/:id', (req, res) => {
  const sessionId = req.params.id;
  console.log('删除会话:', sessionId);
  const initialLength = sessions.length;
  
  sessions = sessions.filter(s => s.id !== sessionId);
  
  if (sessions.length === initialLength) {
    // 没有找到会话
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.sendStatus(204);
});

// 更新或创建（upsert）会话
app.patch('/api/sessions/:id', (req, res) => {
  console.log('更新会话（upsert）:', req.params.id);
  try {
    const sessionId = req.params.id;
    const updateData = req.body || {};
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    let updatedSession;
    if (sessionIndex === -1) {
      // 不存在则创建新会话
      updatedSession = {
        id: sessionId,
        name: updateData.name || `Session-${sessionId}`,
        createdBy: updateData.createdBy || 'unknown',
        creatorName: updateData.creatorName || 'unknown',
        participants: Array.isArray(updateData.participants) ? updateData.participants : [],
        tagUserParams: updateData.tagUserParams || null,
        faqUserParams: updateData.faqUserParams || null,
        companyInfo: updateData.companyInfo || {},
        userParams: updateData.userParams || null,
        createdAt: updateData.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      sessions.push(updatedSession);
    } else {
      // 已存在则更新
      const session = sessions[sessionIndex];
      updatedSession = {
        ...session,
        ...updateData,
        updatedAt: Date.now()
      };
      sessions[sessionIndex] = updatedSession;
    }
    // 通知该会话房间中的所有客户端
    io.to(`session:${sessionId}`).emit('sessionUpdated', updatedSession);
    res.json(updatedSession);
  } catch (error) {
    console.error('更新会话失败:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 添加测试路由
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: '服务器正常运行' });
});

// 添加会话是否存在的检查端点
app.get('/api/sessions/:id/exists', (req, res) => {
  const sessionId = req.params.id;
  const exists = sessions.some(s => s.id === sessionId);
  res.json({ exists });
});

// 使用 http 服务启动
const PORT = process.env.PORT || 3020;
server.listen(PORT, () => {
  console.log(`Collaboration server + WebSocket running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/sessions`);
});

// 导出变量供测试使用
module.exports = { 
  sessions,
  app,
  server,
  io
}; 