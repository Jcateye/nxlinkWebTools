import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserParams } from '../types';
import { getUserParams, saveUserParams } from '../services/api';

interface UserContextType {
  userParams: UserParams | null;
  setUserParams: (params: UserParams) => void;
  sessionId: string;
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

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userParams, setUserParamsState] = useState<UserParams | null>(null);
  const [sessionId] = useState<string>(getSessionId());

  // 使用会话ID作为存储键的一部分，实现会话隔离
  const setUserParams = (params: UserParams) => {
    saveUserParams(params, sessionId);
    setUserParamsState(params);
  };

  // 组件加载时从本地存储读取用户参数，使用会话ID隔离
  useEffect(() => {
    const savedParams = getUserParams(sessionId);
    if (savedParams.nxCloudUserID) {
      setUserParamsState(savedParams);
    }
  }, [sessionId]);

  return (
    <UserContext.Provider value={{ userParams, setUserParams, sessionId }}>
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