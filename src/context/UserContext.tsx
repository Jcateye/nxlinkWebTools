import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TagUserParams, FaqUserParams, CollaborationSession } from '../types';
import * as collabApi from '../services/collaborationApi';
import * as collaborationService from '../services/collaboration';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';

declare global {
  interface Window {
    saveIdentityInfo?: () => void;
  }
}

// 本地存储键名（仅用于非会话相关的本地数据）
const TAG_PARAMS_KEY_PREFIX = 'tagUserParams_';
const FAQ_PARAMS_KEY_PREFIX = 'faqUserParams_';
const ACTIVE_COLLABORATION_SESSION_KEY = 'activeCollaborationSession';

export interface UserContextType {
  tagUserParams: TagUserParams | null;
  faqUserParams: FaqUserParams | null;
  setTagUserParams: (params: TagUserParams | null) => void;
  setFaqUserParams: (params: FaqUserParams | null) => void;
  sessionId: string;
  
  // 协作模式相关
  isCollaborationMode: boolean;
  setCollaborationMode: (mode: boolean) => void;
  collaborationSessions: CollaborationSession[];
  activeCollaborationSession: CollaborationSession | null;
  createCollaborationSession: (session: CollaborationSession) => void;
  joinCollaborationSession: (session: CollaborationSession | string) => void;
  leaveCollaborationSession: () => void;
  updateCollaborationSession: (session: CollaborationSession) => void;
  deleteCollaborationSession: (sessionId: string) => void;
  userInfo: {
    userId: string;
    username: string;
  } | null;
  fetchCollaborationSessions: () => Promise<CollaborationSession[]>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// 获取或创建会话ID
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId as string;
};

// 从本地存储获取参数
const getParamsFromStorage = <T extends object>(prefix: string, sessionId: string): T | null => {
  const storageKey = `${prefix}${sessionId}`;
  const storedData = localStorage.getItem(storageKey);
  return storedData ? JSON.parse(storedData) : null;
};

// 保存参数到本地存储
const saveParamsToStorage = <T extends object>(prefix: string, sessionId: string, params: T): void => {
  const storageKey = `${prefix}${sessionId}`;
  localStorage.setItem(storageKey, JSON.stringify(params));
};

// 从本地存储中获取活跃协作会话
const getActiveCollaborationSessionFromStorage = (): CollaborationSession | null => {
  try {
    const storedSession = localStorage.getItem(ACTIVE_COLLABORATION_SESSION_KEY);
    if (!storedSession) return null;
    
    return JSON.parse(storedSession);
  } catch (error) {
    console.error('解析活跃协作会话时出错:', error);
    // 清除损坏的数据
    localStorage.removeItem(ACTIVE_COLLABORATION_SESSION_KEY);
    return null;
  }
};

// 保存当前活动的协作会话
const saveActiveCollaborationSessionToStorage = (session: CollaborationSession | null): void => {
  try {
    if (session) {
      localStorage.setItem(ACTIVE_COLLABORATION_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_COLLABORATION_SESSION_KEY);
    }
  } catch (error) {
    console.error('保存活跃协作会话时出错:', error);
    // 出错时清除数据
    localStorage.removeItem(ACTIVE_COLLABORATION_SESSION_KEY);
  }
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 用户参数状态
  const [tagUserParamsState, setTagUserParamsState] = useState<TagUserParams | null>(null);
  const [faqUserParamsState, setFaqUserParamsState] = useState<FaqUserParams | null>(null);
  
  // 协作模式状态
  const [isCollaborationMode, setIsCollaborationMode] = useState<boolean>(false);
  const [collaborationSessions, setCollaborationSessions] = useState<CollaborationSession[]>([]);
  const [activeCollaborationSession, setActiveCollaborationSession] = useState<CollaborationSession | null>(getActiveCollaborationSessionFromStorage);
  
  // 用户信息
  const [userInfo, setUserInfo] = useState<{
    userId: string;
    username: string;
  } | null>(() => {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (userId && username) {
      return { userId, username };
    }
    
    // 生成随机用户ID和默认用户名
    const randomId = Math.random().toString(36).substring(2, 15);
    const defaultName = `用户${randomId.substring(0, 4)}`;
    
    localStorage.setItem('userId', randomId);
    localStorage.setItem('username', defaultName);
    
    return { userId: randomId, username: defaultName };
  });

  // 从同步好的会话中更新当前组件状态
  const syncStateFromSession = (session: CollaborationSession) => {
    // 同步用户参数
    if (session.userParams) {
      localStorage.setItem('companyId', session.userParams.companyId);
      localStorage.setItem('tenantId', session.userParams.tenantId);
      localStorage.setItem('token', session.userParams.token);

      // 标签用户参数
      const tagParams: TagUserParams = {
        nxCloudUserID: session.userParams.companyId,
        sourceTenantID: session.userParams.tenantId,
        targetTenantID: session.userParams.tenantId, // 使用相同的tenantId
        authorization: session.userParams.token
      };
      
      // FAQ用户参数
      const faqParams: FaqUserParams = {
        sourceAuthorization: session.userParams.token,
        targetAuthorization: session.userParams.token // 使用相同的token
      };
      
      setTagUserParamsState(tagParams);
      setFaqUserParamsState(faqParams);
    }
  };

  // 监听活动会话变更，建立/重建 socket 连接
  useEffect(() => {
    // 如果有活动会话，我们需要同步状态并连接socket
    if (isCollaborationMode && activeCollaborationSession) {
      syncStateFromSession(activeCollaborationSession);
    }
  }, [isCollaborationMode, activeCollaborationSession]);

  // 初始化时从服务端获取会话列表
  useEffect(() => {
    const fetchSessions = async () => {
      if (isCollaborationMode) {
        try {
          const sessions = await collabApi.getSessions();
          if (sessions && sessions.length > 0) {
            setCollaborationSessions(sessions);
          }
        } catch (error) {
          console.error('获取会话列表失败:', error);
        }
      }
    };
    
    fetchSessions();
  }, [isCollaborationMode]);

  // 添加定期从服务端拉取会话列表的功能
  useEffect(() => {
    const fetchServerSessions = async () => {
      if (isCollaborationMode) {
        try {
          const serverSessions = await collabApi.getSessions();
          if (serverSessions && serverSessions.length > 0) {
            console.log('从服务端获取到会话列表:', serverSessions);
            
            // 更新服务器上的会话列表
            setCollaborationSessions(serverSessions);
            
            // 如果有活跃会话，确保其状态是最新的
            if (activeCollaborationSession) {
              const updatedActiveSession = serverSessions.find(s => s.id === activeCollaborationSession.id);
              if (updatedActiveSession && 
                  (updatedActiveSession.updatedAt || 0) > (activeCollaborationSession.updatedAt || 0)) {
                setActiveCollaborationSession(updatedActiveSession);
                saveActiveCollaborationSessionToStorage(updatedActiveSession);
              }
            }
          } else {
            // 如果服务器上没有会话，清空本地列表
            setCollaborationSessions([]);
          }
        } catch (error) {
          console.error('从服务端获取会话列表失败:', error);
        }
      }
    };
    
    // 设置定期拉取
    const intervalId = setInterval(fetchServerSessions, 30000); // 每30秒拉取一次
    
    // 初次拉取
    fetchServerSessions();
    
    return () => clearInterval(intervalId);
  }, [isCollaborationMode, activeCollaborationSession]);

  // 监听授权信息更新
  // useEffect(() => {
  //   const handleAuthUpdate = (payload: any) => {
  //     ... // 省略原有内容
  //   };
  //   if (isCollaborationMode) {
  //     collaborationService.onAuthUpdate(handleAuthUpdate);
  //   }
  //   return () => {
  //     collaborationService.removeAllListeners();
  //   };
  // }, [isCollaborationMode, tagUserParamsState, faqUserParamsState, activeCollaborationSession]);

  // 监听会话更新（时间戳决胜）
  // const onSessionUpdated = (updatedSession: CollaborationSession) => {
  //   ... // 省略原有内容
  // };
  // collaborationService.onSessionUpdate(onSessionUpdated);

  // 定义会话上下文方法
  const fetchSessions = async () => {
    try {
      const sessions = await collabApi.getSessions();
      setCollaborationSessions(sessions || []);
      return sessions || [];
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  };

  const setTagUserParams = (params: TagUserParams | null) => {
    setTagUserParamsState(params);
    
    // 将更新同步到协作会话
    if (isCollaborationMode && activeCollaborationSession && params) {
      // 构建同步数据
      const syncData = {
        companyId: params.nxCloudUserID,
        tenantId: params.sourceTenantID,
        token: params.authorization
      };
      
      // 发送同步事件到协作服务器
      // collaborationService.syncAuthInfo(activeCollaborationSession.id, syncData);
    } else {
      // 非协作模式，使用本地存储
      const sessionId = getSessionId();
      if (params) {
        saveParamsToStorage(TAG_PARAMS_KEY_PREFIX, sessionId, params);
      } else {
        // 清除本地存储的参数
        localStorage.removeItem(`${TAG_PARAMS_KEY_PREFIX}${sessionId}`);
      }
    }
  };

  const setFaqUserParams = (params: FaqUserParams | null) => {
    setFaqUserParamsState(params);
    
    // 将更新同步到协作会话
    if (isCollaborationMode && activeCollaborationSession && params) {
      // 更新活跃会话的FAQ用户参数
      const updatedSession = {
        ...activeCollaborationSession,
        faqUserParams: params
      };
      
      updateCollaborationSession(updatedSession);
    } else {
      // 非协作模式，使用本地存储
      const sessionId = getSessionId();
      if (params) {
        saveParamsToStorage(FAQ_PARAMS_KEY_PREFIX, sessionId, params);
      } else {
        // 清除本地存储的参数
        localStorage.removeItem(`${FAQ_PARAMS_KEY_PREFIX}${sessionId}`);
      }
    }
  };

  const setCollaborationMode = (mode: boolean) => {
    setIsCollaborationMode(mode);
    
    if (mode) {
      // 开启协作模式，获取会话列表
      fetchSessions();
    } else {
      // 关闭协作模式，清除活跃会话
      setActiveCollaborationSession(null);
      saveActiveCollaborationSessionToStorage(null);
    }
  };

  const fetchCollaborationSessions = async () => {
    return await fetchSessions();
  };

  const createCollaborationSession = async (session: CollaborationSession) => {
    try {
      if (!userInfo) {
        message.error('用户信息不存在，无法创建会话');
        return;
      }
      
      // 准备会话数据
      const sessionData = {
        name: session.name,
        createdBy: userInfo.userId,
        creatorName: userInfo.username,
        userParams: {
          companyId: localStorage.getItem('companyId') || '',
          tenantId: localStorage.getItem('tenantId') || '',
          token: localStorage.getItem('token') || ''
        },
        // 如果有标签用户参数，也添加进去
        tagUserParams: tagUserParamsState,
        // 如果有FAQ用户参数，也添加进去
        faqUserParams: faqUserParamsState
      };
      
      // 创建会话
      const createdSession = await collabApi.createSession(
        sessionData.name,
        sessionData.createdBy,
        sessionData.creatorName,
        sessionData.userParams,
        sessionData.tagUserParams || undefined,
        sessionData.faqUserParams || undefined
      );
      
      if (createdSession) {
        // 刷新会话列表
        const sessions = await fetchSessions();
        
        // 设置活跃会话
        setActiveCollaborationSession(createdSession);
        saveActiveCollaborationSessionToStorage(createdSession);
        
        message.success(`会话 ${createdSession.name} 已创建`);
      } else {
        message.error('创建会话失败');
      }
    } catch (error) {
      console.error('创建会话出错:', error);
      message.error('创建会话时发生错误');
    }
  };

  const joinCollaborationSession = async (sessionOrId: CollaborationSession | string) => {
    try {
      if (!userInfo) {
        message.error('用户信息不存在，无法加入会话');
        return;
      }
      
      const sessionId = typeof sessionOrId === 'string' ? sessionOrId : sessionOrId.id;
      
      // 从服务器获取最新的会话信息
      const session = await collabApi.getSession(sessionId);
      
      if (session) {
        // 加入会话
        await collabApi.joinSession(sessionId, userInfo.userId, userInfo.username);
        
        // 设置活跃会话
        setActiveCollaborationSession(session);
        saveActiveCollaborationSessionToStorage(session);
        
        // 同步会话状态
        syncStateFromSession(session);
        
        message.success(`已加入会话 ${session.name}`);
      } else {
        message.error('会话不存在或无法加入');
      }
    } catch (error) {
      console.error('加入会话出错:', error);
      message.error('加入会话时发生错误');
    }
  };

  const leaveCollaborationSession = () => {
    setActiveCollaborationSession(null);
    saveActiveCollaborationSessionToStorage(null);
  };

  const updateCollaborationSession = async (session: CollaborationSession) => {
    try {
      // 更新服务器上的会话
      const updatedSession = await collabApi.updateSession(session.id, session);
      
      if (updatedSession) {
        // 如果这是活跃会话，则更新本地状态
        if (activeCollaborationSession && activeCollaborationSession.id === session.id) {
          setActiveCollaborationSession(updatedSession);
          saveActiveCollaborationSessionToStorage(updatedSession);
        }
        
        // 更新会话列表
        await fetchSessions();
        
        return true;
      } else {
        message.error('更新会话失败');
        return false;
      }
    } catch (error) {
      console.error('更新会话出错:', error);
      message.error('更新会话时发生错误');
      return false;
    }
  };

  const deleteCollaborationSession = async (sessionId: string) => {
    try {
      // 删除服务器上的会话
      const success = await collabApi.deleteSession(sessionId);
      
      if (success) {
        // 如果删除的是活跃会话，清除活跃会话
        if (activeCollaborationSession && activeCollaborationSession.id === sessionId) {
          setActiveCollaborationSession(null);
          saveActiveCollaborationSessionToStorage(null);
        }
        
        // 更新会话列表
        await fetchSessions();
        
        message.success('会话已删除');
      } else {
        message.error('删除会话失败');
      }
    } catch (error) {
      console.error('删除会话出错:', error);
      message.error('删除会话时发生错误');
    }
  };

  return (
    <UserContext.Provider value={{
      tagUserParams: tagUserParamsState,
      faqUserParams: faqUserParamsState,
      setTagUserParams,
      setFaqUserParams,
      sessionId: getSessionId(),
      
      isCollaborationMode,
      setCollaborationMode,
      collaborationSessions,
      activeCollaborationSession,
      createCollaborationSession,
      joinCollaborationSession,
      leaveCollaborationSession,
      updateCollaborationSession,
      deleteCollaborationSession,
      userInfo,
      fetchCollaborationSessions
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

export default UserContext; 