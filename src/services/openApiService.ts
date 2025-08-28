import axios from 'axios';
import { buildOpenApiHeaders, nowTs } from '../utils/openApiAuth';
import { API_CONFIG, OPENAPI_CONFIG } from '../config/apiConfig';
import {
  TaskListQuery,
  CallRecordQuery,
  CallAppendCmd,
  OrderDeleteCmd,
  PageResp,
  ApiWrap,
  CallTaskInfoVO,
  CallRecordDetail,
} from '../types/openApi';

// OpenAPI 平台基础 axios 实例（通过本地代理转发）
const openApi = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: { 'Content-Type': 'application/json' },
});

export interface OpenApiAuthConfig {
  accessKey: string;
  accessSecret: string;
  bizType: string; // 例如 8 (voice语音业务)
}

// 从本地存储读取/保存鉴权配置
const STORAGE_KEY = 'nxlink_openapi_auth';
export function saveOpenApiAuth(cfg: OpenApiAuthConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}
export function loadOpenApiAuth(): OpenApiAuthConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function ensureAuth(): OpenApiAuthConfig {
  // 优先使用用户保存的配置
  let cfg = loadOpenApiAuth();
  
  if (!cfg) {
    // 如果没有用户配置，尝试使用环境变量配置
    const envConfig = OPENAPI_CONFIG.defaultAuth;
    
    if (envConfig.accessKey && envConfig.accessSecret) {
      // 使用环境变量配置，但不在前端显示
      cfg = {
        accessKey: envConfig.accessKey,
        accessSecret: envConfig.accessSecret,
        bizType: envConfig.bizType || '8'
      };
      console.log('使用环境变量配置的OpenAPI鉴权信息');
    } else {
      throw new Error('未配置OpenAPI鉴权，请先在OpenAPI设置中填写 accessKey/accessSecret/bizType');
    }
  }
  
  return cfg;
}

// 任务列表
export async function getCallTaskList(params: TaskListQuery, apiKey?: string): Promise<PageResp<CallTaskInfoVO>> {
  if (apiKey) {
    // 使用后端代理接口，通过API Key认证
    const resp = await openApi.post<any>('/openapi/task-list', params, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log('后端代理服务响应:', resp.data);
    return resp.data.data || resp.data;
  } else {
    // 使用现有的直连逻辑
    const cfg = ensureAuth();
    const body = params;
    const headers = buildOpenApiHeaders({
      accessKey: cfg.accessKey,
      accessSecret: cfg.accessSecret,
      bizType: cfg.bizType,
      action: 'pageCallTaskInfo',
      ts: nowTs(),
    }, body);
    const resp = await openApi.post<ApiWrap<PageResp<CallTaskInfoVO>>>('/openapi/aiagent/task/list', body, { headers });
    console.log('OpenAPI服务响应:', resp.data); // 调试日志
    // 适配服务端包装结构 { code, message, data }
    return (resp.data as any).data || (resp.data as any);
  }
}

// 查询外呼记录（用于查看任务详情）
export async function getCallRecords(params: CallRecordQuery, apiKey?: string): Promise<PageResp<CallRecordDetail>> {
  if (apiKey) {
    // 使用后端代理接口，通过API Key认证
    const resp = await openApi.post<any>('/openapi/call-records', params, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    return resp.data.data || resp.data;
  } else {
    // 使用现有的直连逻辑
    const cfg = ensureAuth();
    const body = params;
    const headers = buildOpenApiHeaders({
      accessKey: cfg.accessKey,
      accessSecret: cfg.accessSecret,
      bizType: cfg.bizType,
      action: 'pageCallRecords',
      ts: nowTs(),
    }, body);
    const resp = await openApi.post<ApiWrap<PageResp<CallRecordDetail>>>('/openapi/aiagent/call/list', body, { headers });
    return (resp.data as any).data || (resp.data as any);
  }
}

// 任务追加号码
export async function appendNumbers(cmd: CallAppendCmd, apiKey?: string): Promise<any> {
  if (apiKey) {
    // 使用后端代理接口，通过API Key认证
    // 转换参数格式以适配后端接口
    const requestData = {
      taskId: cmd.taskId,
      autoFlowId: cmd.autoFlowId,
      countryCode: cmd.countryCode,
      phoneNumbers: cmd.list.map(item => ({
        phoneNumber: item.phoneNumber,
        params: item.params || []
      }))
    };
    
    console.log('=== 使用API Key追加号码接口请求详情 ===');
    console.log('API Key:', apiKey);
    console.log('请求Body:', JSON.stringify(requestData, null, 2));
    
    try {
      const resp = await openApi.post<any>('/openapi/append-numbers', requestData, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log('=== API Key接口响应详情 ===');
      console.log('响应Body:', JSON.stringify(resp.data, null, 2));
      return resp.data;
    } catch (error: any) {
      console.log('=== API Key接口错误详情 ===');
      console.log('错误信息:', error.message);
      if (error.response) {
        console.log('错误状态:', error.response.status);
        console.log('错误Body:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  } else {
    // 使用现有的直连逻辑
    const cfg = ensureAuth();
    const headers = buildOpenApiHeaders({
      accessKey: cfg.accessKey,
      accessSecret: cfg.accessSecret,
      bizType: cfg.bizType,
      action: 'callAppend',
      ts: nowTs(),
    }, cmd);
    
    console.log('=== 追加号码接口请求详情 ===');
    console.log('请求URL:', '/openapi/aiagent/call/append');
    console.log('请求Headers:', headers);
    console.log('请求Body:', JSON.stringify(cmd, null, 2));
    
    try {
      const resp = await openApi.post('/openapi/aiagent/call/append', cmd, { headers });
      console.log('=== 追加号码接口响应详情 ===');
      console.log('响应状态:', resp.status);
      console.log('响应Headers:', resp.headers);
      console.log('响应Body:', JSON.stringify(resp.data, null, 2));
      return resp.data;
    } catch (error: any) {
      console.log('=== 追加号码接口错误详情 ===');
      console.log('错误信息:', error.message);
      if (error.response) {
        console.log('错误状态:', error.response.status);
        console.log('错误Headers:', error.response.headers);
        console.log('错误Body:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
}

// 删除号码名单
export async function deleteNumber(cmd: OrderDeleteCmd, apiKey?: string): Promise<any> {
  if (apiKey) {
    // 使用后端代理接口，通过API Key认证
    const resp = await openApi.post<any>('/openapi/delete-number', cmd, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    return resp.data;
  } else {
    // 使用现有的直连逻辑
    const cfg = ensureAuth();
    const headers = buildOpenApiHeaders({
      accessKey: cfg.accessKey,
      accessSecret: cfg.accessSecret,
      bizType: cfg.bizType,
      action: 'operateCallRecords',
      ts: nowTs(),
    }, cmd);
    const resp = await openApi.post('/openapi/aiagent/order/delete', cmd, { headers });
    return resp.data;
  }
}


