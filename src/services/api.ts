import axios, { InternalAxiosRequestConfig } from 'axios';
import { 
  ApiResponse, 
  PaginatedResponse, 
  Tag, 
  TagGroup, 
  TagGroupAddRequest, 
  TagAddRequest,
  UserParams
} from '../types';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
});

// 请求拦截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 尝试从localStorage获取会话ID
    const sessionId = localStorage.getItem('sessionId');
    // 使用会话ID获取对应的用户参数
    const userParams = getUserParams(sessionId || undefined);
    
    if (userParams.authorization) {
      config.headers.authorization = userParams.authorization;
      config.headers.system_id = '4';
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// 获取标签分组列表
export const getTagGroupList = async (nxCloudUserID: string, tenantId: string): Promise<TagGroup[]> => {
  try {
    const response = await api.get<ApiResponse<TagGroup[]>>(
      `/admin/nx_flow_manager/mgrPlatform/tag/typeDetails`,
      {
        params: {
          nxCloudUserID,
          tenantId
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('获取标签分组列表失败', error);
    throw error;
  }
};

// 创建标签分组
export const createTagGroup = async (data: TagGroupAddRequest): Promise<number> => {
  try {
    const response = await api.post<ApiResponse<number>>(
      '/admin/nx_flow_manager/mgrPlatform/tagGroup',
      data
    );
    return response.data.data;
  } catch (error) {
    console.error('创建标签分组失败', error);
    throw error;
  }
};

// 获取标签列表
export const getTagList = async (
  nxCloudUserID: string, 
  tenantId: string, 
  groupId: number,
  pageNumber: number = 1,
  pageSize: number = 100
): Promise<PaginatedResponse<Tag>> => {
  try {
    const response = await api.get<ApiResponse<PaginatedResponse<Tag>>>(
      '/admin/nx_flow_manager/mgrPlatform/tag',
      {
        params: {
          page_number: pageNumber,
          page_size: pageSize,
          name: '',
          group_id: groupId,
          nxCloudUserID,
          tenantId
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('获取标签列表失败', error);
    throw error;
  }
};

// 创建标签
export const createTag = async (data: TagAddRequest): Promise<any> => {
  try {
    const response = await api.post<ApiResponse<any>>(
      '/admin/nx_flow_manager/mgrPlatform/tag',
      data
    );
    return response.data.data;
  } catch (error) {
    console.error('创建标签失败', error);
    throw error;
  }
};

// 保存用户参数到本地存储
export const saveUserParams = (params: UserParams, sessionId: string): void => {
  const storageKey = `userParams_${sessionId}`;
  localStorage.setItem(storageKey, JSON.stringify(params));
};

// 获取用户参数
export const getUserParams = (sessionId?: string): UserParams => {
  const storageKey = sessionId ? `userParams_${sessionId}` : 'userParams';
  return JSON.parse(localStorage.getItem(storageKey) || '{}') as UserParams;
};

// 迁移标签分组和标签
export const migrateTagGroups = async (
  userParams: UserParams,
  selectedGroupIds: number[]
): Promise<string[]> => {
  const { nxCloudUserID, sourceTenantID, targetTenantID } = userParams;
  const successGroups: string[] = [];
  
  try {
    // 获取所有源标签分组
    const sourceGroups = await getTagGroupList(
      nxCloudUserID,
      sourceTenantID
    );
    
    // 筛选出选中的标签分组
    const groupsToMigrate = sourceGroups.filter(group => selectedGroupIds.includes(group.id));
    
    // 依次迁移每个分组
    for (const group of groupsToMigrate) {
      try {
        // 1. 在目标租户创建同名标签分组
        const newGroupId = await createTagGroup({
          group_name: group.group_name,
          group_type: 0,
          type: 7,
          nxCloudUserID,
          tenantId: targetTenantID
        });
        
        // 2. 获取源分组下的所有标签
        const tagResponse = await getTagList(nxCloudUserID, sourceTenantID, group.id);
        const tags = tagResponse.list;
        
        // 3. 在目标租户创建标签
        for (const tag of tags) {
          await createTag({
            group_id: newGroupId,
            name: tag.name,
            describes: tag.describes,
            nxCloudUserID,
            tenantId: targetTenantID
          });
        }
        
        // 标记迁移成功
        successGroups.push(group.group_name);
      } catch (error) {
        console.error(`迁移分组 ${group.group_name} 失败`, error);
      }
    }
    
    return successGroups;
  } catch (error) {
    console.error('迁移标签分组和标签失败', error);
    throw error;
  }
};

// 删除标签
export const deleteTag = async (
  tagId: number,
  nxCloudUserID: string,
  tenantId: string
): Promise<boolean> => {
  try {
    const response = await api.delete<ApiResponse<null>>(
      '/admin/nx_flow_manager/mgrPlatform/tag/delete',
      {
        params: {
          id: tagId,
          nxCloudUserID,
          tenantId
        }
      }
    );
    return response.data.code === 0;
  } catch (error) {
    console.error('删除标签失败', error);
    throw error;
  }
};

// 根据名称查找标签分组
export const findTagGroupByName = async (
  groupName: string,
  nxCloudUserID: string,
  tenantId: string
): Promise<TagGroup | null> => {
  try {
    const groups = await getTagGroupList(nxCloudUserID, tenantId);
    const foundGroup = groups.find(group => group.group_name === groupName);
    return foundGroup || null;
  } catch (error) {
    console.error('查找标签分组失败', error);
    throw error;
  }
};

// 批量导入标签
export const batchImportTags = async (
  tags: {
    name: string;
    describes: string | null;
    groupName: string;
  }[],
  nxCloudUserID: string, 
  tenantId: string
): Promise<{ success: number; failed: number; groupsCreated: string[] }> => {
  let successCount = 0;
  let failedCount = 0;
  const groupsCreated: string[] = [];
  const groupCache: Record<string, number> = {};

  try {
    // 逐个处理标签
    for (const tag of tags) {
      try {
        let groupId: number;

        // 检查缓存中是否已有此分组
        if (groupCache[tag.groupName] !== undefined) {
          groupId = groupCache[tag.groupName];
        } else {
          // 查找标签分组是否存在
          const existingGroup = await findTagGroupByName(tag.groupName, nxCloudUserID, tenantId);
          
          if (existingGroup) {
            // 已存在的分组
            groupId = existingGroup.id;
          } else {
            // 创建新的标签分组
            groupId = await createTagGroup({
              group_name: tag.groupName,
              group_type: 0,
              type: 7,
              nxCloudUserID,
              tenantId
            });
            
            // 记录新创建的分组
            groupsCreated.push(tag.groupName);
          }
          
          // 缓存分组ID
          groupCache[tag.groupName] = groupId;
        }
        
        // 创建标签
        await createTag({
          group_id: groupId,
          name: tag.name,
          describes: tag.describes,
          nxCloudUserID,
          tenantId
        });
        
        successCount++;
      } catch (error) {
        console.error(`导入标签 "${tag.name}" 失败`, error);
        failedCount++;
      }
    }
    
    return {
      success: successCount,
      failed: failedCount,
      groupsCreated
    };
  } catch (error) {
    console.error('批量导入标签失败', error);
    throw error;
  }
};

// 导出标签数据
export const exportTagsFromGroups = async (
  groupIds: number[],
  nxCloudUserID: string,
  tenantId: string
): Promise<{
  name: string;
  describes: string | null;
  groupName: string;
}[]> => {
  try {
    const allTags: {
      name: string;
      describes: string | null;
      groupName: string;
    }[] = [];

    // 获取所有选中的分组
    const groupsResponse = await getTagGroupList(nxCloudUserID, tenantId);
    const selectedGroups = groupsResponse.filter(group => groupIds.includes(group.id));

    // 遍历每个分组获取标签
    for (const group of selectedGroups) {
      let currentPage = 1;
      const pageSize = 100;
      let hasMoreTags = true;

      // 分页获取所有标签
      while (hasMoreTags) {
        const tagResponse = await getTagList(
          nxCloudUserID,
          tenantId,
          group.id,
          currentPage,
          pageSize
        );

        if (tagResponse.list.length > 0) {
          // 转换为导出格式
          const formattedTags = tagResponse.list.map(tag => ({
            name: tag.name,
            describes: tag.describes,
            groupName: group.group_name
          }));

          allTags.push(...formattedTags);

          // 检查是否还有更多标签
          if (tagResponse.list.length < pageSize) {
            hasMoreTags = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreTags = false;
        }
      }
    }

    return allTags;
  } catch (error) {
    console.error('导出标签数据失败', error);
    throw error;
  }
}; 