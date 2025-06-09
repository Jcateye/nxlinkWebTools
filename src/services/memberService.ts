import { message } from 'antd';
import React from 'react';

// 基础配置
const BASE_URL = 'https://nxlink.nxcloud.com/admin/saas_plat';

// 通用请求头 - 改为使用源租户的Authorization token
const getHeaders = () => {
  // 先尝试从faqUserParams中获取token（与FAQ管理一致）
  let token = '';
  
  try {
    // 获取当前会话ID
    const sessionId = localStorage.getItem('sessionId') || 'default';
    const faqParamsKey = `faqUserParams_${sessionId}`;
    const faqParams = localStorage.getItem(faqParamsKey);
    
    if (faqParams) {
      const params = JSON.parse(faqParams);
      token = params.sourceAuthorization || '';
    }
    
    // 如果faqParams中没有，再尝试从source_config中获取（兼容性）
    if (!token) {
      const sourceConfig = localStorage.getItem('source_config');
      if (sourceConfig) {
        const config = JSON.parse(sourceConfig);
        token = config.Authorization || '';
      }
    }
  } catch (error) {
    console.error('解析token配置失败:', error);
  }
  
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en,zh;q=0.9,zh-CN;q=0.8,fil;q=0.7,de;q=0.6',
    'authorization': token,
    'cache-control': 'no-cache',
    'lang': 'zh_CN',
    'system_id': '5',
    'time_zone': 'UTC+08:00',
    'createts': Date.now().toString(),
  };
};

// 处理401错误 - 清除源租户token
const handle401Error = (error: any) => {
  if (error?.message?.includes('用户未登录') || error?.code === 401) {
    console.log('检测到401错误，清除源租户token');
    
    try {
      // 获取当前会话ID
      const sessionId = localStorage.getItem('sessionId') || 'default';
      const faqParamsKey = `faqUserParams_${sessionId}`;
      const faqParams = localStorage.getItem(faqParamsKey);
      
      if (faqParams) {
        const params = JSON.parse(faqParams);
        // 只清除sourceAuthorization字段，保留其他配置
        delete params.sourceAuthorization;
        localStorage.setItem(faqParamsKey, JSON.stringify(params));
        console.log('已清除faqUserParams中的sourceAuthorization');
      }
      
      // 同时清除source_config中的Authorization token（兼容性）
      const sourceConfig = localStorage.getItem('source_config');
      if (sourceConfig) {
        const config = JSON.parse(sourceConfig);
        delete config.Authorization;
        localStorage.setItem('source_config', JSON.stringify(config));
        console.log('已清除source_config中的Authorization');
      }
      
      message.warning('登录已过期，请重新设置源租户Authorization Token');
      
    } catch (parseError) {
      console.error('处理token配置时出错:', parseError);
      message.warning('登录已过期，请重新设置源租户参数');
    }
    
    return true; // 表示已处理401错误
  }
  return false; // 不是401错误
};

// 通用API响应处理
const handleApiResponse = async (response: Response, apiName: string) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  // 检查业务层面的401错误
  if (result.code === 401 || (result.message && result.message.includes('用户未登录'))) {
    const handled = handle401Error(result);
    if (handled) {
      throw new Error('用户未登录，已清除过期token');
    }
  }
  
  if (result.code === 0) {
    return result;
  } else {
    throw new Error(result.message || `${apiName}失败`);
  }
};

// 数据类型定义
export interface MemberGroup {
  id: string;
  group_name: string;
  group_size: number;
  child?: any;
}

export interface Member {
  id: number;
  nickname: string;
  email: string;
  phone?: string;
  company?: string;
  role_id: number;
  role_name: string;
  accessible_system: string;
  last_login_at: string;
  online_status: number;
  text_seat: boolean;
  voice_seat: boolean;
  one_owner: boolean;
  source: number;
  user_type: number;
  device_online_status: boolean;
}

export interface Role {
  role_id: number;
  role_name: string;
  describe: string;
  one_owner: boolean;
  role_unique_key: string;
}

export interface MemberListResponse {
  total: number;
  items: Member[];
  pageNum: number;
  pageSize: number;
}

export interface InviteMemberData {
  invitee_email: string;
  invitee_name: string;
  system_roles: Array<{
    role_id: number;
    system_id: number;
  }>;
  text_seat: boolean;
  voice_seat: boolean;
  user_group_ids: string[];
}

// API调用方法
class MemberService {
  // 获取成员分组列表
  async getMemberGroups(): Promise<MemberGroup[]> {
    try {
      const response = await fetch(`${BASE_URL}/tagGroup/teamGroupCount`, {
        method: 'GET',
        headers: getHeaders(),
      });

      const result = await handleApiResponse(response, '获取成员分组列表');
      return result.data || [];
    } catch (error: any) {
      console.error('获取成员分组失败:', error);
      
      // 如果是401错误，不显示额外的错误提示
      if (!error?.message?.includes('用户未登录')) {
        message.error(error.message || '获取成员分组失败');
      }
      return [];
    }
  }

  // 获取指定分组的成员列表
  async getMembersByGroup(
    userGroupId: string,
    pageNum: number = 1,
    pageSize: number = 10,
    searchText: string = ''
  ): Promise<MemberListResponse> {
    try {
      const params = new URLSearchParams({
        pageNum: pageNum.toString(),
        pageSize: pageSize.toString(),
        input: searchText,
        userGroupId,
      });

      const response = await fetch(`${BASE_URL}/tagGroup/userList?${params}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      const result = await handleApiResponse(response, '获取成员列表');
      return result.data || { total: 0, items: [], pageNum: 1, pageSize: 10 };
    } catch (error: any) {
      console.error('获取成员列表失败:', error);
      
      // 如果是401错误，不显示额外的错误提示
      if (!error?.message?.includes('用户未登录')) {
        message.error(error.message || '获取成员列表失败');
      }
      return { total: 0, items: [], pageNum: 1, pageSize: 10 };
    }
  }

  // 获取角色列表
  async getRoles(): Promise<Role[]> {
    try {
      const response = await fetch(`${BASE_URL}/system/roleLists`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'content-length': '0',
        },
      });

      const result = await handleApiResponse(response, '获取角色列表');
      // 筛选出system_id为5的数据
      const systemData = result.data?.find((item: any) => item.system_id === 5);
      return systemData?.list || [];
    } catch (error: any) {
      console.error('获取角色列表失败:', error);
      
      // 如果是401错误，不显示额外的错误提示
      if (!error?.message?.includes('用户未登录')) {
        message.error(error.message || '获取角色列表失败');
      }
      return [];
    }
  }

  // 邀请成员
  async inviteMember(data: InviteMemberData): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/tenant/send_invite`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'content-type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(data),
      });

      // handleApiResponse 会在业务失败时抛出错误
      await handleApiResponse(response, '邀请成员');
      
      message.success(`成功邀请 ${data.invitee_email}`);
      return true;
    } catch (error: any) {
      console.error(`邀请成员 ${data.invitee_email} 失败:`, error);
      
      // 如果是401错误，不显示额外的错误提示
      if (!error?.message?.includes('用户未登录')) {
        // 直接将错误往上抛，让调用者（如批量邀请）可以捕获
        throw error;
      }
      return false; // 只有401才返回false，避免中断批量操作
    }
  }

  // 批量邀请成员
  async batchInviteMembers(
    members: Array<{ email: string; name: string; }>, 
    roleId: number, 
    groupIds: string[],
    seats: { text_seat: boolean; voice_seat: boolean; }
  ): Promise<void> {
    const results = await Promise.allSettled(
      members.map(member => 
        this.inviteMember({
          invitee_email: member.email.trim(),
          invitee_name: member.name.trim(),
          system_roles: [{ role_id: roleId, system_id: 5 }],
          text_seat: seats.text_seat,
          voice_seat: seats.voice_seat,
          user_group_ids: groupIds,
        })
      )
    );

    const successes = results.filter(r => r.status === 'fulfilled' && r.value);
    const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));

    if (failures.length === 0) {
      message.success(`成功邀请全部 ${successes.length} 名成员！`);
    } else {
      const successCount = successes.length;
      const failureCount = failures.length;
      
      const failureDetailsPromises = failures.map(async (failure) => {
        const resultIndex = results.findIndex(res => res === failure);
        const originalEmail = members[resultIndex].email;

        if (failure.status === 'rejected') {
          return `${originalEmail}: ${failure.reason.message}`;
        }
        // 对于 fulfilled 但值为 false 的情况，这通常是401错误，已经被特殊处理
        return `${originalEmail}: 邀请失败 (可能是登录过期)`;
      });
      
      const failureDetails = await Promise.all(failureDetailsPromises);

      const content = React.createElement(
        'div',
        null,
        React.createElement('p', null, `批量邀请完成：${successCount} 个成功，${failureCount} 个失败。`),
        failureCount > 0 && React.createElement(
          'div',
          { style: { maxHeight: 150, overflowY: 'auto', marginTop: 10 } },
          React.createElement('strong', null, '失败详情:'),
          React.createElement(
            'ul',
            { style: { paddingLeft: 20, margin: 0 } },
            ...failureDetails.map((detail, i) => React.createElement('li', { key: i }, detail))
          )
        )
      );
      
      message.warning(content, 10);
    }
  }
}

export const memberService = new MemberService(); 