import axios from 'axios';
import { CollaborationSession, TagUserParams, FaqUserParams } from '../types';
import { COLLABORATION_API_BASE_URL } from '../config/apiConfig';

// 配置axios实例
const collaborationApi = axios.create({
  baseURL: COLLABORATION_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 错误处理拦截器
collaborationApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('协作API请求错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 获取所有会话
export const getSessions = async (): Promise<CollaborationSession[]> => {
  try {
    const response = await collaborationApi.get('/api/sessions');
    return response.data;
  } catch (error) {
    console.error('获取协作会话列表失败:', error);
    return [];
  }
};

// 获取单个会话
export const getSession = async (id: string): Promise<CollaborationSession | null> => {
  try {
    const response = await collaborationApi.get(`/api/sessions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`获取会话[${id}]信息失败:`, error);
    return null;
  }
};

// 创建新会话
export const createSession = async (
  name: string,
  createdBy: string,
  creatorName: string,
  userParams?: {
    companyId: string;
    tenantId: string;
    token: string;
  },
  tagUserParams?: TagUserParams,
  faqUserParams?: FaqUserParams,
  companyInfo?: any
): Promise<CollaborationSession | null> => {
  try {
    const response = await collaborationApi.post('/api/sessions', { 
      name, 
      createdBy, 
      creatorName,
      userParams,
      tagUserParams, 
      faqUserParams, 
      companyInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('创建协作会话失败:', error);
    return null;
  }
};

// 加入会话
export const joinSession = async (
  sessionId: string,
  userId: string,
  username: string
): Promise<CollaborationSession | null> => {
  try {
    const response = await collaborationApi.post(`/api/sessions/${sessionId}/join`, { 
      userId,
      username,
      joinedAt: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error(`加入会话[${sessionId}]失败:`, error);
    return null;
  }
};

// 离开会话
export const leaveSession = async (
  sessionId: string,
  userId: string
): Promise<boolean> => {
  try {
    await collaborationApi.post(`/api/sessions/${sessionId}/leave`, { userId });
    return true;
  } catch (error) {
    console.error(`离开会话[${sessionId}]失败:`, error);
    return false;
  }
};

// 更新会话
export const updateSession = async (
  sessionId: string,
  updateData: Partial<CollaborationSession>
): Promise<CollaborationSession | null> => {
  try {
    // 确保更新时间
    const data = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    const response = await collaborationApi.patch(`/api/sessions/${sessionId}`, data);
    return response.data;
  } catch (error) {
    console.error(`更新会话[${sessionId}]失败:`, error);
    return null;
  }
};

// 删除会话
export const deleteSession = async (id: string): Promise<boolean> => {
  try {
    await collaborationApi.delete(`/api/sessions/${id}`);
    return true;
  } catch (error) {
    console.error(`删除会话[${id}]失败:`, error);
    return false;
  }
};

// 获取会话中的在线用户
export const getOnlineUsers = async (sessionId: string): Promise<any[]> => {
  try {
    const response = await collaborationApi.get(`/api/sessions/${sessionId}/users`);
    return response.data;
  } catch (error) {
    console.error(`获取会话[${sessionId}]在线用户失败:`, error);
    return [];
  }
};

// 同步授权信息
export const syncAuthorizationInfo = async (
  sessionId: string,
  authData: any
): Promise<boolean> => {
  try {
    const response = await collaborationApi.post(`/api/sessions/${sessionId}/sync-auth`, authData);
    return response.data.success;
  } catch (error) {
    console.error(`同步会话[${sessionId}]授权信息失败:`, error);
    return false;
  }
};

// 检查会话是否存在
export const checkSessionExists = async (sessionId: string): Promise<boolean> => {
  try {
    const response = await collaborationApi.get(`/api/sessions/${sessionId}/exists`);
    return response.data.exists;
  } catch (error) {
    console.error('检查会话是否存在时出错:', error);
    return false;
  }
};

// 获取会话通知
export const getSessionNotifications = async (sessionId: string): Promise<any[]> => {
  try {
    const response = await collaborationApi.get(`/api/sessions/${sessionId}/notifications`);
    return response.data;
  } catch (error) {
    console.error(`获取会话[${sessionId}]通知失败:`, error);
    return [];
  }
};

// 发送会话通知
export const sendSessionNotification = async (
  sessionId: string,
  notification: {
    type: string;
    message: string;
    userId: string;
    username: string;
    data?: any;
  }
): Promise<boolean> => {
  try {
    await collaborationApi.post(`/api/sessions/${sessionId}/notifications`, notification);
    return true;
  } catch (error) {
    console.error(`发送会话[${sessionId}]通知失败:`, error);
    return false;
  }
};

// 获取会话统计数据
export const getSessionStats = async (sessionId: string): Promise<any> => {
  try {
    const response = await collaborationApi.get(`/api/sessions/${sessionId}/stats`);
    return response.data;
  } catch (error) {
    console.error(`获取会话[${sessionId}]统计数据失败:`, error);
    return null;
  }
}; 