import type { 
  LLMProvider, 
  Prompt, 
  TestRun, 
  TestResult, 
  LLMModel 
} from '../types/promptValidation';

const API_BASE_URL = '/api/prompt-validation';

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 统计数据类型
interface AnalyticsStats {
  totalTests: number;
  totalPrompts: number;
  totalProviders: number;
  successRate: number;
  averageResponseTime: number;
  totalCost: number;
  testsLast7Days: number;
  topProviders: Array<{
    name: string;
    count: number;
    successRate: number;
  }>;
  topModels: Array<{
    name: string;
    count: number;
    avgResponseTime: number;
  }>;
}

class PromptValidationApiService {
  private static instance: PromptValidationApiService;

  static getInstance(): PromptValidationApiService {
    if (!PromptValidationApiService.instance) {
      PromptValidationApiService.instance = new PromptValidationApiService();
    }
    return PromptValidationApiService.instance;
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 厂商管理
  async getProviders(): Promise<ApiResponse<LLMProvider[]>> {
    return this.request<LLMProvider[]>('/providers');
  }

  async createProvider(provider: Omit<LLMProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<LLMProvider>> {
    return this.request<LLMProvider>('/providers', {
      method: 'POST',
      body: JSON.stringify(provider),
    });
  }

  async updateProvider(id: string, provider: Partial<LLMProvider>): Promise<ApiResponse<LLMProvider>> {
    return this.request<LLMProvider>(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(provider),
    });
  }

  async deleteProvider(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/providers/${id}`, {
      method: 'DELETE',
    });
  }

  // 提示词管理
  async getPrompts(): Promise<ApiResponse<Prompt[]>> {
    return this.request<Prompt[]>('/prompts');
  }

  async createPrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Prompt>> {
    return this.request<Prompt>('/prompts', {
      method: 'POST',
      body: JSON.stringify(prompt),
    });
  }

  async updatePrompt(id: string, prompt: Partial<Prompt>): Promise<ApiResponse<Prompt>> {
    return this.request<Prompt>(`/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(prompt),
    });
  }

  async deletePrompt(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/prompts/${id}`, {
      method: 'DELETE',
    });
  }

  // 测试管理
  async getTestRuns(): Promise<ApiResponse<TestRun[]>> {
    return this.request<TestRun[]>('/tests');
  }

  async createTestRun(testRun: {
    name: string;
    providerIds: string[];
    promptIds: string[];
    modelIds: string[];
    iterations: number;
    temperature?: number;
    maxTokens?: number;
    concurrency?: number;
  }): Promise<ApiResponse<TestRun>> {
    return this.request<TestRun>('/tests', {
      method: 'POST',
      body: JSON.stringify(testRun),
    });
  }

  async startTestRun(runId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tests/${runId}/start`, {
      method: 'POST',
    });
  }

  async stopTestRun(runId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tests/${runId}/stop`, {
      method: 'POST',
    });
  }

  async deleteTestRun(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tests/${id}`, {
      method: 'DELETE',
    });
  }

  // 测试结果
  async getTestResults(runId: string): Promise<ApiResponse<TestResult[]>> {
    return this.request<TestResult[]>(`/tests/${runId}/results`);
  }

  // 测试日志
  async getTestLogs(runId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/tests/${runId}/logs`);
  }

  async addTestLog(log: {
    runId?: string;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
    sessionId?: string;
  }): Promise<ApiResponse<void>> {
    return this.request<void>('/tests/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  // 统计分析
  async getAnalyticsStats(): Promise<ApiResponse<AnalyticsStats>> {
    return this.request<AnalyticsStats>('/analytics/stats');
  }

  // 健康检查
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // 批量测试日志 (兼容现有API)
  async sendBatchTestLog(log: {
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
    sessionId: string;
  }): Promise<void> {
    try {
      await fetch('/batch-test-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });
    } catch (error) {
      console.error('发送批量测试日志失败:', error);
    }
  }

  // 获取批量测试日志 (兼容现有API)
  async getBatchTestLogs(sessionId?: string): Promise<any[]> {
    try {
      const url = sessionId ? `/batch-test-logs?sessionId=${sessionId}` : '/batch-test-logs';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取批量测试日志失败:', error);
      return [];
    }
  }

  // 实时日志订阅 (WebSocket)
  subscribeToLogs(callback: (log: any) => void): () => void {
    // 这里可以实现WebSocket连接
    // 暂时返回空的取消订阅函数
    return () => {};
  }
}

export default PromptValidationApiService;
export type { ApiResponse, AnalyticsStats }; 