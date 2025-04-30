const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // 生产环境中应该设置为特定的域名
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 存储活跃会话和用户
const activeSessions = new Map();
const activeUsers = new Map();

// 处理WebSocket连接
io.on('connection', (socket) => {
  console.log('新连接:', socket.id);
  
  // 从查询参数中获取会话信息
  const { sessionId, userId, username } = socket.handshake.query;
  
  if (!sessionId || !userId) {
    console.error('连接缺少必要参数');
    socket.disconnect();
    return;
  }
  
  // 将用户与会话关联
  socket.join(sessionId);
  
  // 存储用户信息
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, new Set());
  }
  
  activeSessions.get(sessionId).add(userId);
  activeUsers.set(userId, { socketId: socket.id, username, sessionId });
  
  // 通知会话中的其他用户有新用户加入
  socket.to(sessionId).emit('userJoined', { userId, username });
  
  // 获取会话中的所有用户
  const sessionUsers = [];
  activeSessions.get(sessionId).forEach(uid => {
    if (activeUsers.has(uid)) {
      const { username } = activeUsers.get(uid);
      sessionUsers.push({ userId: uid, username });
    }
  });
  
  // 向新用户发送当前在线用户列表
  socket.emit('activeUsers', sessionUsers);
  
  // 监听用户离开会话
  socket.on('leaveSession', () => {
    handleUserLeave(socket, userId, sessionId);
  });
  
  // 监听会话数据更新
  socket.on('updateSessionData', (data) => {
    console.log('会话数据更新:', data);
    socket.to(sessionId).emit('sessionDataUpdate', data);
  });
  
  // 监听授权信息同步
  socket.on('syncAuth', (authData) => {
    try {
      console.log(`接收到授权信息同步请求，来自用户 ${userId} (${username})，会话 ${sessionId}`);
      console.log('授权信息内容:', JSON.stringify(authData).substring(0, 100) + '...');
      
      // 将信息广播给会话中除了发送者之外的所有用户
      console.log(`正在广播授权信息到会话 ${sessionId} 的所有其他用户`);
      
      // 添加发送者信息
      const enrichedData = {
        ...authData,
        senderName: username,
        senderId: userId,
        timestamp: authData.timestamp || Date.now()
      };
      
      // 使用to方法广播到指定会话中的所有客户端，除了发送者
      socket.to(sessionId).emit('authUpdate', enrichedData);
      
      // 确认发送成功
      console.log(`授权信息广播成功，会话 ${sessionId}，${getSessionUserCount(sessionId) - 1} 位接收者`);
      
      // 向发送者返回确认
      socket.emit('syncAuthConfirm', {
        success: true,
        timestamp: Date.now(),
        recipients: getSessionUserCount(sessionId) - 1
      });
    } catch (error) {
      console.error('处理授权信息同步时出错:', error);
      socket.emit('syncAuthConfirm', {
        success: false,
        error: error.message
      });
    }
  });
  
  // 添加广播到会话的功能
  socket.on('broadcastToSession', (message) => {
    try {
      if (!message || !message.sessionId || !message.event) {
        console.error('广播消息格式不正确:', message);
        return;
      }
      
      console.log(`接收到广播请求，用户 ${userId}，事件 ${message.event}，目标会话 ${message.sessionId}`);
      
      // 添加发送者信息
      const enrichedMessage = {
        ...message,
        senderName: username,
        senderId: userId,
        timestamp: message.timestamp || Date.now()
      };
      
      socket.to(message.sessionId).emit('broadcastMessage', enrichedMessage);
      
      // 如果是授权信息，也直接发送authUpdate事件
      if (message.event === 'authUpdate' && message.data) {
        // 确保数据中包含发送者信息
        const enrichedData = {
          ...message.data,
          senderName: username,
          senderId: userId,
          timestamp: message.data.timestamp || Date.now()
        };
        
        console.log(`通过broadcastToSession发送授权信息到会话 ${message.sessionId}`);
        socket.to(message.sessionId).emit('authUpdate', enrichedData);
      }
      
      console.log(`广播消息发送成功，会话 ${message.sessionId}`);
    } catch (error) {
      console.error('处理广播消息时出错:', error);
    }
  });
  
  // 监听消息发送
  socket.on('message', (message) => {
    const user = activeUsers.get(userId);
    if (!user) return;
    
    const messageData = {
      id: Date.now().toString(),
      userId,
      username: user.username,
      text: message,
      timestamp: Date.now()
    };
    
    socket.to(sessionId).emit('message', messageData);
  });
  
  // 监听断开连接事件
  socket.on('disconnect', () => {
    console.log('断开连接:', socket.id);
    handleUserLeave(socket, userId, sessionId);
  });
});

// 处理用户离开
function handleUserLeave(socket, userId, sessionId) {
  if (!userId || !sessionId) return;
  
  const user = activeUsers.get(userId);
  if (!user) return;
  
  // 从会话中移除用户
  const session = activeSessions.get(sessionId);
  if (session) {
    session.delete(userId);
    
    // 如果会话中没有用户了，则删除会话
    if (session.size === 0) {
      activeSessions.delete(sessionId);
    }
  }
  
  // 从活跃用户中移除
  activeUsers.delete(userId);
  
  // 通知其他用户
  socket.to(sessionId).emit('userLeft', { userId, username: user.username });
}

// API路由: 检查服务器状态
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: activeSessions.size,
    activeUsers: activeUsers.size
  });
});

// 获取会话中的用户数量
function getSessionUserCount(sessionId) {
  const session = activeSessions.get(sessionId);
  return session ? session.size : 0;
}

// 启动服务器
const PORT = process.env.PORT || 3020;
server.listen(PORT, () => {
  console.log(`协作服务器运行在端口 ${PORT}`);
}); 