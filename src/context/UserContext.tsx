import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TagUserParams, FaqUserParams } from '../types';

// 本地存储键名
const TAG_PARAMS_KEY_PREFIX = 'tagUserParams_';
const FAQ_PARAMS_KEY_PREFIX = 'faqUserParams_';

interface UserContextType {
  tagUserParams: TagUserParams | null;
  faqUserParams: FaqUserParams | null;
  setTagUserParams: (params: TagUserParams) => void;
  setFaqUserParams: (params: FaqUserParams) => void;
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

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tagUserParams, setTagUserParamsState] = useState<TagUserParams | null>(null);
  const [faqUserParams, setFaqUserParamsState] = useState<FaqUserParams | null>(null);
  const [sessionId] = useState<string>(getSessionId());

  // 设置Tag参数
  const setTagUserParams = (params: TagUserParams) => {
    saveParamsToStorage(TAG_PARAMS_KEY_PREFIX, sessionId, params);
    setTagUserParamsState(params);
  };

  // 设置FAQ参数
  const setFaqUserParams = (params: FaqUserParams) => {
    saveParamsToStorage(FAQ_PARAMS_KEY_PREFIX, sessionId, params);
    setFaqUserParamsState(params);
  };

  // 组件加载时从本地存储读取参数
  useEffect(() => {
    const savedTagParams = getParamsFromStorage<TagUserParams>(TAG_PARAMS_KEY_PREFIX, sessionId);
    if (savedTagParams) {
      setTagUserParamsState(savedTagParams);
    }

    const savedFaqParams = getParamsFromStorage<FaqUserParams>(FAQ_PARAMS_KEY_PREFIX, sessionId);
    if (savedFaqParams) {
      setFaqUserParamsState(savedFaqParams);
    }
  }, [sessionId]);

  return (
    <UserContext.Provider 
      value={{ 
        tagUserParams, 
        faqUserParams, 
        setTagUserParams, 
        setFaqUserParams,
        sessionId 
      }}
    >
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