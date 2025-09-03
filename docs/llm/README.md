# 🤖 LLM与AI服务文档

本目录包含项目中LLM（大语言模型）和AI服务相关的所有配置和使用文档。

## 📁 目录内容

```
docs/llm/
├── llm-configuration-guide.md      # LLM配置指南 ⭐⭐⭐⭐⭐
├── llm-providers-architecture.md   # LLM提供商架构 ⭐⭐⭐⭐⭐
├── llm-usage-examples.md           # LLM使用示例 ⭐⭐⭐⭐⭐
├── vertex-ai-setup-guide.md        # Vertex AI设置指南 ⭐⭐⭐⭐
├── prompt-validation-guide.md      # Prompt验证指南 ⭐⭐⭐⭐
├── PORT_CONFIG_GUIDE.md            # 端口配置指南 ⭐⭐⭐
└── README.md                       # 本说明文档
```

## 📋 文档说明

### 核心LLM文档

#### `llm-configuration-guide.md` ⭐⭐⭐⭐⭐
LLM服务配置详细指南，包含：
- 🤖 支持的LLM提供商配置
- 🔧 API密钥管理
- ⚙️ 模型参数调优
- 🚀 性能优化配置

**重要性**: ⭐⭐⭐⭐⭐ (核心配置文档)

#### `llm-providers-architecture.md` ⭐⭐⭐⭐⭐
LLM提供商架构设计文档，包含：
- 🏗️ 系统架构设计
- 🔄 提供商切换机制
- 📊 负载均衡策略
- 🛡️ 故障转移方案

**重要性**: ⭐⭐⭐⭐⭐ (架构设计文档)

#### `llm-usage-examples.md` ⭐⭐⭐⭐⭐
LLM使用示例和最佳实践，包含：
- 💬 对话示例
- 📝 Prompt工程技巧
- 🎯 用例场景演示
- 📈 性能优化建议

**重要性**: ⭐⭐⭐⭐⭐ (使用指南)

### 专项服务文档

#### `vertex-ai-setup-guide.md` ⭐⭐⭐⭐
Google Vertex AI集成设置指南。

**内容**:
- 🔧 Vertex AI项目设置
- 🔑 认证配置
- 🎯 模型选择和配置
- 📊 使用量监控

**重要性**: ⭐⭐⭐⭐ (专项服务)

#### `prompt-validation-guide.md` ⭐⭐⭐⭐
Prompt验证和优化指南。

**内容**:
- ✅ Prompt质量检查
- 🔍 验证规则和标准
- 📏 长度和格式限制
- 🎨 优化建议

**重要性**: ⭐⭐⭐⭐ (质量保证)

#### `PORT_CONFIG_GUIDE.md` ⭐⭐⭐
端口配置和网络设置指南。

**内容**:
- 🌐 端口分配策略
- 🔒 安全配置
- 📡 网络优化
- 🚪 防火墙设置

**重要性**: ⭐⭐⭐ (基础配置)

## 🚀 LLM集成指南

### 1. 选择LLM提供商

#### 支持的提供商
- **OpenAI**: GPT-4, GPT-3.5-turbo
- **Google**: Vertex AI, PaLM
- **Anthropic**: Claude
- **本地部署**: Ollama, LM Studio

#### 配置示例
```typescript
// OpenAI配置
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000
};

// Vertex AI配置
const vertexConfig = {
  projectId: process.env.GOOGLE_PROJECT_ID,
  location: 'us-central1',
  model: 'text-bison'
};
```

### 2. Prompt工程

#### 基础Prompt结构
```javascript
const systemPrompt = `你是专业的AI助手，请：
1. 提供准确、有用的回答
2. 使用清晰的结构化格式
3. 保持友好和专业的语气`;

const userPrompt = `请分析以下数据：\n${data}`;
```

#### 高级技巧
```javascript
// 少样本学习
const fewShotPrompt = `
示例1:
输入: "你好"
输出: "你好！很高兴为您服务。"

示例2:
输入: "帮我写代码"
输出: "当然可以！请告诉我您需要什么类型的代码。"

现在请回答: ${userInput}
`;

// 思维链推理
const chainOfThoughtPrompt = `
请逐步分析以下问题:
1. 理解问题背景
2. 分析关键信息
3. 提供解决方案
4. 验证答案合理性

问题: ${question}
`;
```

### 3. 模型调优

#### 参数配置
```typescript
const modelConfig = {
  // 温度控制创造性 (0.0-2.0)
  temperature: 0.7,

  // 最大输出长度
  maxTokens: 1500,

  // 多样性控制
  topP: 0.9,

  // 重复惩罚
  frequencyPenalty: 0.5,

  // 存在惩罚
  presencePenalty: 0.3
};
```

#### 性能优化
```typescript
// 缓存配置
const cacheConfig = {
  enableCache: true,
  cacheTimeout: 3600000, // 1小时
  cacheKeyStrategy: 'semantic' // 语义缓存
};

// 批量处理
const batchConfig = {
  maxBatchSize: 10,
  timeout: 30000,
  retryAttempts: 3
};
```

## 📊 使用监控

### 指标监控
```typescript
// 响应时间监控
const metrics = {
  responseTime: measureResponseTime(),
  tokenUsage: trackTokenConsumption(),
  errorRate: calculateErrorRate(),
  costPerRequest: calculateCost()
};
```

### 日志记录
```typescript
// 结构化日志
const logEntry = {
  timestamp: new Date().toISOString(),
  provider: 'openai',
  model: 'gpt-4',
  tokens: {
    prompt: 150,
    completion: 200,
    total: 350
  },
  cost: 0.015,
  duration: 1200,
  status: 'success'
};
```

## 🔒 安全配置

### API密钥管理
```bash
# 环境变量设置
export OPENAI_API_KEY="sk-your-secret-key"
export GOOGLE_API_KEY="your-google-api-key"

# 密钥轮换
# 1. 生成新密钥
# 2. 更新环境变量
# 3. 重启服务
# 4. 验证功能
# 5. 删除旧密钥
```

### 请求限制
```typescript
const rateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  burstLimit: 10,
  backoffStrategy: 'exponential'
};
```

## 🔍 故障排除

### 常见问题

1. **API密钥无效**
   ```bash
   # 检查密钥格式
   echo $OPENAI_API_KEY | head -c 10

   # 测试API连接
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

2. **模型调用失败**
   ```bash
   # 检查网络连接
   curl -I https://api.openai.com

   # 查看错误日志
   tail -f logs/llm-errors.log
   ```

3. **响应超时**
   ```typescript
   // 调整超时设置
   const config = {
     timeout: 60000, // 60秒
     retryDelay: 1000,
     maxRetries: 3
   };
   ```

## 📈 性能优化

### 缓存策略
```typescript
// 多级缓存
const cacheStrategy = {
  memoryCache: {
    ttl: 300000, // 5分钟
    maxSize: 1000
  },
  redisCache: {
    ttl: 3600000, // 1小时
    prefix: 'llm:'
  },
  semanticCache: {
    similarityThreshold: 0.85,
    embeddingModel: 'text-embedding-ada-002'
  }
};
```

### 负载均衡
```typescript
// 多提供商负载均衡
const loadBalancer = {
  providers: ['openai', 'anthropic', 'google'],
  strategy: 'round-robin',
  healthCheck: {
    interval: 30000,
    timeout: 5000,
    retries: 3
  }
};
```

## 📚 相关文档

- [项目配置](../../config/README.md)
- [环境配置](../env/README.md)
- [API文档](../../docs/new-webhook-api-guide.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)

## 🔗 外部资源

- [OpenAI API文档](https://platform.openai.com/docs)
- [Google Vertex AI](https://cloud.google.com/vertex-ai)
- [Anthropic Claude](https://docs.anthropic.com/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

---

**最后更新**: 2025年1月
**维护者**: 开发团队
