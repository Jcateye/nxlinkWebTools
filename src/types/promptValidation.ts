// 提示词验证系统类型定义

// LLM厂商配置
export interface LLMProvider {
  id: string;
  name: string;
  apiKey: string;
  // Azure OpenAI 特定配置
  azureEndpoint?: string;
  azureApiVersion?: string;
  azureDeploymentName?: string;
  // Google Vertex AI 特定配置
  projectId?: string;
  region?: string;
  // Custom LLM 特定配置
  baseUrl?: string;
  customHeaders?: Record<string, string>;
  models: LLMModel[];
  createdAt: string;
  updatedAt: string;
}

// LLM模型
export interface LLMModel {
  id: string;
  providerId: string;
  name: string;
  description?: string;
  maxTokens?: number;
  temperature?: number;
}

// 提示词
export interface Prompt {
  id: string;
  name: string;
  systemPrompt?: string; // 系统提示词
  userPrompt: string; // 用户提示词
  content: string; // 保持向后兼容，将被废弃
  variables?: string[]; // 提示词中的变量
  description?: string;
  category?: string; // 提示词分类
  tags?: string[]; // 标签
  createdAt: string;
  updatedAt: string;
}

// 测试配置
export interface TestConfig {
  id: string;
  name: string;
  prompts: string[]; // 提示词ID列表
  models: string[]; // 模型ID列表
  testParams: TestParameters;
  createdAt: string;
}

// 测试参数
export interface TestParameters {
  runs: number; // 运行次数
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// 测试结果
export interface TestResult {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  promptId: string;
  promptName: string;
  promptContent: string;
  systemPrompt?: string; // 系统提示词
  userPrompt?: string; // 用户提示词
  output: string;
  duration: number; // 响应时间（毫秒）
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: string;
  iteration: number;
  temperature: number;
  maxTokens: number;
  cost?: number; // 成本
}

// 测试运行记录
export interface TestRun {
  id: string;
  name: string;
  createdAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  config: {
    providers: string[];
    prompts: string[];
    temperature: number;
    maxTokens: number;
    iterations: number;
  };
  results: TestResult[];
  totalTests: number;
  completedTests: number;
}

// 对比结果
export interface ComparisonResult {
  promptId: string;
  promptName: string;
  models: {
    modelId: string;
    modelName: string;
    outputs: string[];
    averageDuration: number;
    similarityScore?: number; // 与其他输出的相似度得分
  }[];
} 