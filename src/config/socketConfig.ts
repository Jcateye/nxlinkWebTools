import { io, Socket } from 'socket.io-client';
import { COLLABORATION_API_BASE_URL } from './apiConfig';

// Socket.io 事件常量
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
  SESSION_UPDATED: 'session_updated',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  SESSION_DELETED: 'session_deleted',
  SESSION_ACTIVITY: 'session_activity',
  PARAMS_UPDATED: 'params_updated',
  ERROR: 'error'
};

// 创建Socket.io客户端实例
let socket: Socket | null = null;

/**
 * 初始化Socket.io连接
 * @param token 用户认证令牌
 * @returns Socket实例
 */
export const initializeSocket = (token: string): Socket => {
  if (socket) {
    return socket;
  }

  const SOCKET_URL = COLLABORATION_API_BASE_URL || 'http://localhost:3020';
  
  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    auth: {
      token
    },
    transports: ['websocket', 'polling']
  });

  // 添加连接事件监听器
  socket.on(SOCKET_EVENTS.CONNECT, () => {
    console.log('Socket.io连接成功');
  });

  socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
    console.error('Socket.io连接失败:', error);
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
    console.log('Socket.io断开连接:', reason);
  });

  return socket;
};

/**
 * 获取当前Socket实例
 * @returns 当前Socket实例或null
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * 关闭Socket连接
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * 加入协作会话
 * @param sessionId 会话ID
 * @param userData 用户数据
 */
export const joinCollaborationSession = (sessionId: string, userData: any): void => {
  if (socket) {
    socket.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId, userData });
  }
};

/**
 * 离开协作会话
 * @param sessionId 会话ID
 * @param userId 用户ID
 */
export const leaveCollaborationSession = (sessionId: string, userId: string): void => {
  if (socket) {
    socket.emit(SOCKET_EVENTS.LEAVE_SESSION, { sessionId, userId });
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinCollaborationSession,
  leaveCollaborationSession,
  SOCKET_EVENTS
}; 