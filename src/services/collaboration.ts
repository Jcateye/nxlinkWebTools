import { io, Socket } from 'socket.io-client';
import { COLLABORATION_API_BASE_URL } from '../config/apiConfig';
import { CollaborationSession, TagUserParams, FaqUserParams } from '../types';
import { getSessions } from './collaborationApi';

let socket: Socket | null = null;

// 添加同步确认回调类型
type SyncConfirmCallback = (result: {
  success: boolean;
  timestamp?: number;
  recipients?: number;
  error?: string;
}) => void;

// 存储同步确认回调
let syncConfirmCallback: SyncConfirmCallback | null = null;

/**
 * 初始化Socket.io连接
 */
export const initSocket = (sessionId: string, userId: string, username: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (socket) {
      console.log('Socket已经初始化，无需重新连接');
      resolve();
      return;
    }

    socket = io(COLLABORATION_API_BASE_URL, {
      query: {
        sessionId,
        userId,
        username
      },
      transports: ['websocket'],
      // @ts-ignore: unsupported option in type definitions
      pingInterval: 25000,
      // @ts-ignore: unsupported option in type definitions
      pingTimeout: 60000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('Socket.io连接成功');
      resolve();
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io连接错误:', error);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.io断开连接:', reason);
    });

    // 设置重新连接事件处理
    socket.io.on('reconnect', (attempt) => {
      console.log(`Socket.io重新连接成功，尝试次数: ${attempt}`);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`Socket.io尝试重新连接，尝试次数: ${attempt}`);
    });

    socket.io.on('reconnect_error', (error) => {
      console.error('Socket.io重新连接错误:', error);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('Socket.io重新连接失败');
    });
  });
};

/**
 * 断开Socket.io连接
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket.io连接已断开');
  }
};

/**
 * 获取当前Socket实例
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * 加入协作会话
 */
export const joinSession = (sessionId: string, userId: string, username: string): void => {
  if (!socket) {
    console.error('Socket未初始化，无法加入会话');
    return;
  }

  socket.emit('joinSession', { sessionId, userId, username });
};

/**
 * 更新协作会话数据
 */
export const updateSessionData = (
  sessionId: string, 
  data: Partial<CollaborationSession>
): void => {
  if (!socket) {
    console.error('Socket未初始化，无法更新会话数据');
    return;
  }

  socket.emit('updateSession', { sessionId, data });
};

/**
 * 从服务端拉取会话列表
 */
export const fetchSessionsSocket = (): Promise<CollaborationSession[]> => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      console.error('Socket未初始化，无法获取会话列表');
      getSessions().then(resolve).catch(reject);
      return;
    }

    socket.emit('getSessions');
    socket.once('sessionsList', (sessions: CollaborationSession[]) => {
      resolve(sessions);
    });

    // 设置超时，防止永久等待
    setTimeout(() => {
      reject(new Error('获取会话列表超时'));
    }, 5000);
  });
};

/**
 * 同步授权信息到服务端并更新本地值
 * @param authData 授权数据
 * @param callback 同步确认回调
 * @param shouldUpdateLocal 是否应该更新本地值
 */
export const syncAuthInfo = (
  sessionId: string, 
  authData: {
    companyId?: string;
    tenantId?: string;
    token?: string;
    tagUserParams?: TagUserParams;
    faqUserParams?: FaqUserParams;
    companyInfo?: any;
  }
): void => {
  if (!socket) {
    console.error('Socket未初始化，无法同步授权信息');
    return;
  }

  socket.emit('syncAuth', { sessionId, authData });
};

/**
 * 发送消息到会话
 */
export const sendMessage = (
  sessionId: string, 
  userId: string, 
  username: string, 
  content: string
): void => {
  if (!socket) {
    console.error('Socket未初始化，无法发送消息');
    return;
  }

  socket.emit('message', { 
    sessionId, 
    userId, 
    username, 
    content, 
    timestamp: new Date().toISOString() 
  });
};

/**
 * 离开协作会话
 */
export const leaveSession = (sessionId: string, userId: string): void => {
  if (!socket) {
    console.error('Socket未初始化，无法离开会话');
    return;
  }

  socket.emit('leaveSession', { sessionId, userId });
};

/**
 * 注册会话数据更新监听
 */
export const onSessionDataUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('sessionDataUpdate', callback);
  }
};

/**
 * 注册用户加入会话监听
 */
export const onUserJoined = (callback: (user: any) => void) => {
  if (socket) {
    socket.on('userJoined', callback);
  }
};

/**
 * 注册用户离开会话监听
 */
export const onUserLeft = (callback: (user: any) => void) => {
  if (socket) {
    socket.on('userLeft', callback);
  }
};

/**
 * 注册消息接收监听
 */
export const onMessage = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('message', callback);
  }
};

/**
 * 注册授权信息更新监听
 */
export const onAuthUpdate = (callback: (data: any) => void) => {
  if (socket) {
    console.log('注册授权信息更新监听器');
    
    // 先移除可能存在的旧监听器，避免重复
    socket.off('authUpdate');
    
    socket.on('authUpdate', (data) => {
      console.log('接收到authUpdate事件:', data);
      callback(data);
    });
    
    // 添加广播事件监听（作为备份方法）
    socket.off('broadcastMessage');
    socket.on('broadcastMessage', (message) => {
      console.log('接收到广播消息:', message);
      if (message.event === 'authUpdate') {
        console.log('从广播消息中提取授权信息:', message.data);
        callback(message.data);
      }
    });
    
    return true;
  } else {
    console.error('Socket未连接，无法注册授权信息更新监听器');
    return false;
  }
};

/**
 * 移除所有事件监听
 */
export const removeAllListeners = () => {
  if (socket) {
    socket.removeAllListeners();
  }
};

/**
 * 在服务端创建新会话
 */
export const createSessionSocket = (sessionData: Partial<CollaborationSession>): void => {
  if (!socket) {
    console.error('Socket未初始化，无法创建会话');
    return;
  }

  socket.emit('createSession', sessionData);
};

/**
 * 在服务端更新会话
 */
export const updateSessionOnServer = async (session: CollaborationSession): Promise<boolean> => {
  try {
    if (!socket) {
      console.error('Socket未连接，无法更新会话');
      return false;
    }
    
    return new Promise((resolve, reject) => {
      const currentSocket = socket;
      if (!currentSocket) {
        reject(new Error('Socket连接已断开'));
        return;
      }
      
      currentSocket.emit('updateSession', session, (response: any) => {
        if (response.success) {
          console.log('成功在服务端更新会话:', response.session);
          resolve(true);
        } else {
          console.error('在服务端更新会话失败:', response.error);
          reject(new Error(response.error || '未知错误'));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        reject(new Error('更新会话超时'));
      }, 5000);
    });
  } catch (error) {
    console.error('更新会话发生错误:', error);
    return false;
  }
};

/**
 * 在服务端删除会话
 */
export const deleteSessionSocket = (sessionId: string, createdBy: string): void => {
  if (!socket) {
    console.error('Socket未初始化，无法删除会话');
    return;
  }

  socket.emit('deleteSession', { sessionId, createdBy });
};

/**
 * 获取在线用户
 */
export const getOnlineUsersSocket = (sessionId: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      console.error('Socket未初始化，无法获取在线用户');
      reject(new Error('Socket未初始化'));
      return;
    }

    socket.emit('getOnlineUsers', { sessionId });
    socket.once('onlineUsers', (users: any[]) => {
      resolve(users);
    });

    // 设置超时，防止永久等待
    setTimeout(() => {
      reject(new Error('获取在线用户超时'));
    }, 5000);
  });
};

/**
 * 注册会话更新事件监听器
 */
export const onSessionUpdate = (callback: (session: CollaborationSession) => void): void => {
  if (!socket) {
    console.error('Socket未初始化，无法注册会话更新事件');
    return;
  }
  // 避免重复注册
  socket.off('sessionUpdated');
  socket.on('sessionUpdated', callback);
};

/**
 * 注册会话列表更新事件监听器
 */
export const onSessionsListUpdate = (callback: (sessions: CollaborationSession[]) => void): void => {
  if (!socket) {
    console.error('Socket未初始化，无法注册会话列表更新事件');
    return;
  }

  socket.on('sessionsList', callback);
};

/**
 * 注册用户加入事件监听器
 */
export const onUserJoin = (callback: (data: { sessionId: string; userId: string; username: string }) => void): void => {
  if (!socket) {
    console.error('Socket未初始化，无法注册用户加入事件');
    return;
  }

  socket.on('userJoined', callback);
};

/**
 * 注册用户离开事件监听器
 */
export const onUserLeave = (callback: (data: { sessionId: string; userId: string; username: string }) => void): void => {
  if (!socket) {
    console.error('Socket未初始化，无法注册用户离开事件');
    return;
  }

  socket.on('userLeft', callback);
};

/**
 * 注册消息接收事件监听器
 */
export const onMessageReceived = (callback: (message: any) => void): void => {
  if (!socket) {
    console.error('Socket未初始化，无法注册消息接收事件');
    return;
  }

  socket.on('messageReceived', callback);
};

/**
 * 注册在线用户更新事件监听器
 */
export const onOnlineUsersUpdate = (callback: (data: { sessionId: string; users: any[] }) => void): void => {
  if (!socket) {
    console.error('Socket未初始化，无法注册在线用户更新事件');
    return;
  }

  socket.on('onlineUsers', callback);
};

/**
 * 检查Socket连接状态
 */
export const isConnected = (): boolean => {
  return socket?.connected || false;
};

/**
 * 获取当前Socket ID
 */
export const getSocketId = (): string | null => {
  return socket?.id || null;
}; 