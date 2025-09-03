# LLM厂商API配置架构重构

## 概述

本次重构将分散在各个组件中的LLM厂商API配置统一抽取到配置文件中，提高了代码的维护性和可扩展性。

## 架构改进

### 1. 统一配置文件 (`src/config/llmProviders.ts`)

#### 核心接口定义
```typescript
export interface LLMProviderConfig {
  name: string;
  displayName: string;
  region: 'North America' | 'Asia' | 'Europe' | 'Infrastructure';
  apiConfig: {
    baseUrl: string;
    endpoint: string;
    method: 'POST' | 'GET';
    headers: Record<string, string>;
    authType: 'Bearer' | 'ApiKey' | 'Custom';
    authHeader?: string;
  };
  requestFormat: string;
  responseFormat: string;
  supportedFeatures: {
    chat: boolean;
    completion: boolean;
    streaming: boolean;
    multimodal: boolean;
  };
  specialConfig?: {
    requiresAzureConfig?: boolean;
    requiresAwsConfig?: boolean;
    customEndpointRequired?: boolean;
    apiVersionRequired?: boolean;
  };
}
```

#### 支持的厂商配置
- **北美厂商(8个)**：OpenAI、Google Gemini、Anthropic、Meta AI、Microsoft Azure、Amazon Bedrock、Cohere、xAI
- **亚洲厂商(6个)**：百度千帆、阿里云DashScope、智谱AI、深言科技DeepSeek、零一万物、Naver & Sakana AI
- **欧洲厂商(2个)**：Mistral AI、Aleph Alpha
- **基础设施厂商(2个)**：Groq、Cerebras

### 2. 工具类

#### URLBuilder
负责根据配置动态构建API请求URL，支持占位符替换：
- Azure配置：`{azureEndpoint}`, `{deploymentName}`
- 模型占位符：`{model}`
- 自定义端点：`{customBaseUrl}`

#### HeaderBuilder
根据不同的认证类型构建请求头：
- `Bearer Token`：标准OAuth Bearer认证
- `ApiKey`：API密钥认证（如Google Gemini）
- `Custom`：自定义认证头（如Anthropic的x-api-key）

#### RequestFormatBuilder
根据厂商格式构建请求体：
- OpenAI格式：标准的messages数组格式
- Anthropic格式：max_tokens + messages格式
- Google格式：contents + generationConfig格式
- 百度格式：简化的messages格式
- 阿里云格式：input + parameters格式
- 其他专有格式

#### ResponseFormatParser
统一解析不同厂商的响应格式：
- 提取文本内容
- 解析Token使用统计
- 标准化错误处理

### 3. 配置示例

```typescript
'OpenAI': {
  name: 'OpenAI',
  displayName: 'OpenAI',
  region: 'North America',
  apiConfig: {
    baseUrl: 'https://api.openai.com',
    endpoint: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    authType: 'Bearer',
  },
  requestFormat: 'OpenAI',
  responseFormat: 'OpenAI',
  supportedFeatures: {
    chat: true,
    completion: true,
    streaming: true,
    multimodal: true,
  },
}
```

## 使用方式

### 在BatchTest组件中的使用
```typescript
// 获取厂商配置
const providerConfig = LLM_PROVIDERS_CONFIG[provider.name];

// 构建请求URL
let url = URLBuilder.buildURL(providerConfig, provider, modelId);

// 构建请求头
const headers = HeaderBuilder.buildHeaders(providerConfig, provider);

// 构建请求体
const requestBody = RequestFormatBuilder.buildRequest(
  providerConfig.requestFormat, 
  prompt, 
  modelId, 
  { temperature, maxTokens }
);

// 发送请求
const response = await fetch(url, {
  method: providerConfig.apiConfig.method,
  headers,
  body: JSON.stringify(requestBody),
});

// 解析响应
const { output, tokens } = ResponseFormatParser.parseResponse(
  providerConfig.responseFormat,
  data,
  provider.name
);
```

## 优势

### 1. 维护性提升
- **集中管理**：所有API配置集中在一个文件中
- **统一格式**：标准化的配置接口
- **易于修改**：修改API端点只需更新配置文件

### 2. 可扩展性增强
- **新厂商接入**：只需添加配置，无需修改业务逻辑
- **格式支持**：新的请求/响应格式可轻松扩展
- **特性标记**：通过supportedFeatures标记厂商能力

### 3. 代码复用
- **通用工具类**：URL构建、请求头构建、格式转换等可复用
- **统一错误处理**：标准化的错误处理流程
- **类型安全**：TypeScript类型定义确保配置正确性

### 4. 配置灵活性
- **环境适配**：支持不同环境的API端点配置
- **认证方式**：支持多种认证方式（Bearer、ApiKey、Custom）
- **特殊配置**：支持Azure、AWS等特殊配置需求

## 特殊处理

### 1. Google Gemini
- API Key通过URL参数传递，而非请求头

### 2. Microsoft Azure
- 需要额外的endpoint、deploymentName、apiVersion配置
- 使用api-key认证头

### 3. Amazon Bedrock
- 需要AWS SDK，当前使用模拟响应
- 支持多区域配置

### 4. 第三方平台
- Meta AI通过Together AI平台访问
- Naver/Sakana AI通过Hugging Face访问

## 未来扩展

1. **动态配置加载**：支持从远程配置中心加载厂商配置
2. **配置版本管理**：支持配置的版本控制和回滚
3. **性能监控**：添加API调用性能监控和统计
4. **缓存机制**：实现响应缓存以提高性能
5. **负载均衡**：支持多个API端点的负载均衡

## 总结

通过这次架构重构，我们实现了：
- 16个厂商的统一配置管理
- 100+个模型的标准化接入
- 可扩展的架构设计
- 类型安全的开发体验
- 简化的维护流程

这为后续的功能扩展和新厂商接入奠定了坚实的基础。 