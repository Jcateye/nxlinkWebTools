# LLM厂商使用示例

本文档提供了各主要LLM厂商的配置和使用示例，帮助您快速上手提示词验证系统。

## 快速开始

### 1. 基本配置流程

1. **进入系统**：访问左侧菜单的"提示词验证"
2. **配置LLM**：点击"LLM配置"选项卡，添加厂商配置
3. **创建提示词**：在"提示词管理"中创建测试用的提示词
4. **执行测试**：在"批量测试"中选择提示词和模型进行测试
5. **查看结果**：在"测试结果"中分析不同模型的表现

### 2. 常用配置示例

#### OpenAI配置
```
厂商名称: OpenAI
API Key: sk-xxxxxxxxxxxxxxxxxxxx
选择模型: GPT-4o, GPT-4.5 Preview, O1, O3, GPT-4o Mini
```

#### Google Gemini配置
```
厂商名称: Google Gemini
API Key: AIxxxxxxxxxxxxxxxxxxxxxxx
选择模型: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash
```

#### Anthropic配置
```
厂商名称: Anthropic
API Key: sk-ant-xxxxxxxxxxxxxxxx
选择模型: Claude Opus 4, Claude Sonnet 4, Claude 3.5 Sonnet
```

#### Microsoft Azure配置
```
厂商名称: Microsoft Azure
API Key: xxxxxxxxxxxxxxxxxxxxxxxx
Azure Endpoint: https://your-resource.openai.azure.com/
API Version: 2024-02-01
Deployment Name: your-deployment-name
选择模型: O3 Pro (Azure), GPT-4.1 (Azure), GPT-4o (Azure)
```

#### 百度千帆配置
```
厂商名称: 百度千帆
API Key: xxxxxxxxxxxxxxxxxxxxxxxx
选择模型: ERNIE-4.5-8K, ERNIE-X1-8K, ERNIE-4.0-8K
```

#### 阿里云DashScope配置
```
厂商名称: 阿里云DashScope
API Key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
选择模型: Qwen Max Latest, Qwen Plus Latest, Qwen VL Max
```

## 实际使用场景

### 场景1：多模型性能对比

**目标**：比较不同厂商的主力模型在创意写作任务上的表现

**配置**：
- 厂商：OpenAI (GPT-4o), Anthropic (Claude Opus 4), Google (Gemini 2.5 Pro)
- 提示词：`请写一个关于{{主题}}的创意故事，要求情节新颖，人物鲜活。`
- 测试参数：运行次数=3, Temperature=0.8, Max Tokens=2000

**预期结果**：
- GPT-4o：可能在创意性和叙事结构上表现优秀
- Claude Opus 4：可能在人物刻画和细节描述上突出
- Gemini 2.5 Pro：可能在逻辑性和信息整合上见长

### 场景2：代码生成能力测试

**目标**：评估不同模型的编程能力

**配置**：
- 厂商：OpenAI (GPT-4o), DeepSeek (DeepSeek Coder V2), Meta AI (CodeLlama 70B)
- 提示词：`用{{编程语言}}实现一个{{功能描述}}的函数，要求代码简洁、高效、包含注释。`
- 测试参数：运行次数=2, Temperature=0.3, Max Tokens=1500

**预期结果**：
- GPT-4o：通用编程能力强，支持多种语言
- DeepSeek Coder V2：专业代码模型，可能在代码质量上领先
- CodeLlama 70B：开源代码模型，性价比高

### 场景3：多语言支持测试

**目标**：测试模型的多语言理解和生成能力

**配置**：
- 厂商：Google (Gemini 2.5 Pro), 阿里云 (Qwen Max), Cohere (Aya 23 35B)
- 提示词：`请用{{语言}}解释{{概念}}，要求表达准确、易于理解。`
- 测试参数：运行次数=2, Temperature=0.5, Max Tokens=1000

**预期结果**：
- Gemini 2.5 Pro：支持100+语言，国际化程度高
- Qwen Max：中文表现优秀，支持多种亚洲语言
- Aya 23 35B：专门为多语言优化的模型

### 场景4：推理能力评估

**目标**：比较模型的逻辑推理和问题解决能力

**配置**：
- 厂商：OpenAI (O1, O3), 智谱AI (GLM-Z1 Air), DeepSeek (DeepSeek R1)
- 提示词：`请解决这个逻辑问题：{{问题描述}}。要求展示推理过程，给出最终答案。`
- 测试参数：运行次数=3, Temperature=0.2, Max Tokens=2000

**预期结果**：
- O1/O3：OpenAI专门为推理优化的模型
- GLM-Z1 Air：智谱AI的推理专用模型
- DeepSeek R1：DeepSeek的推理模型

### 场景5：成本效益分析

**目标**：在保证质量的前提下找到最经济的解决方案

**配置**：
- 厂商：OpenAI (GPT-4o Mini), Google (Gemini 2.0 Flash), Groq (Llama 3 70B)
- 提示词：`请总结以下文章的主要观点：{{文章内容}}`
- 测试参数：运行次数=5, Temperature=0.3, Max Tokens=500

**预期结果**：
- GPT-4o Mini：OpenAI的轻量级模型，平衡性能和成本
- Gemini 2.0 Flash：Google的快速模型，延迟低
- Llama 3 70B (Groq)：开源模型，成本最低

## 最佳实践

### 1. 厂商选择建议

**高性能需求**：
- 首选：OpenAI (GPT-4o, O3), Anthropic (Claude Opus 4), Google (Gemini 2.5 Pro)
- 备选：智谱AI (GLM-4 Plus), DeepSeek (DeepSeek V3)

**成本敏感场景**：
- 首选：Groq托管模型, OpenAI (GPT-4o Mini), Google (Gemini 2.0 Flash)
- 备选：阿里云 (Qwen Turbo), 百度 (ERNIE-Speed-8K)

**特定领域**：
- 代码生成：DeepSeek Coder, CodeLlama, OpenAI Codex Mini
- 多语言：Google Gemini, Cohere Aya, 阿里云Qwen
- 推理思考：OpenAI O系列, 智谱GLM-Z1, DeepSeek R1

### 2. 参数调优建议

**Temperature设置**：
- 创意写作：0.7-0.9
- 代码生成：0.1-0.3
- 事实问答：0.0-0.2
- 头脑风暴：0.8-1.0

**Max Tokens设置**：
- 简短回答：100-500
- 中等长度：500-1500
- 长文本生成：1500-4000
- 文档级别：4000+

**运行次数建议**：
- 快速测试：1-2次
- 可靠性评估：3-5次
- 正式评测：5-10次

### 3. 错误处理

**常见问题及解决方案**：

1. **API密钥错误**
   - 检查密钥格式是否正确
   - 确认密钥是否已激活
   - 验证密钥权限

2. **模型不可用**
   - 确认模型名称拼写正确
   - 检查账户是否有访问权限
   - 查看模型是否在维护中

3. **配额超限**
   - 检查账户余额
   - 确认API调用限制
   - 考虑升级账户等级

4. **网络连接问题**
   - 检查网络连接状态
   - 确认防火墙设置
   - 尝试更换网络环境

## 高级功能

### 1. 批量配置导入

系统支持批量导入LLM配置（待开发功能）：

```json
{
  "providers": [
    {
      "name": "OpenAI",
      "apiKey": "sk-xxxx",
      "models": ["gpt-4o", "gpt-4o-mini"]
    },
    {
      "name": "Anthropic",
      "apiKey": "sk-ant-xxxx",
      "models": ["claude-opus-4", "claude-sonnet-4"]
    }
  ]
}
```

### 2. 自动化测试脚本

定期运行模型性能测试（待开发功能）：

```javascript
// 自动化测试配置
const testSuite = {
  schedule: "daily",
  providers: ["OpenAI", "Anthropic", "Google"],
  prompts: ["prompt-1", "prompt-2"],
  metrics: ["quality", "speed", "cost"]
};
```

### 3. 结果导出

支持测试结果导出为多种格式（待开发功能）：
- CSV：用于数据分析
- PDF：用于报告生成
- JSON：用于程序处理

## 总结

提示词验证系统现已支持全球16个主要LLM厂商的100+个模型，提供了强大的多模型测试和对比能力。通过合理配置和使用，您可以：

1. **快速验证**不同模型在特定任务上的表现
2. **科学对比**各厂商模型的优劣势
3. **优化成本**选择性价比最高的解决方案
4. **持续监控**模型性能的变化趋势

开始您的AI模型评测之旅吧！ 