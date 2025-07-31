# LLM 厂商配置指南

本指南详细说明了如何配置各个LLM厂商，包括API密钥获取方式和配置参数说明。

**系统现已支持16个厂商的100+个模型，覆盖全球主要AI服务提供商。**

## 支持的LLM厂商

### 北美厂商 (8个)

### 1. OpenAI

**主要模型**：
- GPT-4o - 最新、最强大的多模态模型
- GPT-4.5 Preview - 下一代GPT-4预览版
- O1 - 推理能力优化的模型
- O3 - 最新的推理模型
- GPT-4o Mini - 轻量级的多模态模型

**配置要求**：
- **API Key**：在 [OpenAI Platform](https://platform.openai.com/) 注册账户并创建API Key

### 2. Google Gemini

**主要模型**：
- Gemini 2.5 Pro - 最新的旗舰模型
- Gemini 2.5 Flash - 高速版本
- Gemini 2.0 Flash - 实时交互优化
- Gemma 2 27B IT - 指令调优版本
- PaliGemma 2 28B - 视觉语言模型

**配置要求**：
- **API Key**：在 [Google AI Studio](https://aistudio.google.com/) 创建API Key

### 3. Anthropic

**主要模型**：
- Claude Opus 4 - 最新的Opus模型
- Claude Sonnet 4 - 最新的Sonnet模型
- Claude 3.5 Sonnet - 增强版Sonnet
- Claude 3.5 Haiku - 最新的Haiku模型

**配置要求**：
- **API Key**：在 [Anthropic Console](https://console.anthropic.com/) 注册账户并创建API Key

### 4. Meta AI (Llama)

**主要模型**：
- Llama 4 400B Maverick - 最大的Llama 4模型
- Llama 4 109B Scout - Llama 4 中等规模模型
- Llama 3.1 405B - 最大的Llama 3.1模型
- Llama 3.1 70B - 高性能Llama 3.1模型
- CodeLlama 70B - 代码专用Llama模型

**配置要求**：
- **API Key**：通过 [Together AI](https://api.together.xyz/) 或 [Hugging Face](https://huggingface.co/) 访问

### 5. Microsoft Azure

**主要模型**：
- O3 Pro (Azure) - Azure部署的O3 Pro
- GPT-4.1 (Azure) - Azure部署的GPT-4.1
- GPT-4.5 Preview (Azure) - Azure部署的GPT-4.5预览版
- GPT-4o (Azure) - Azure部署的GPT-4o
- Codex Mini (Azure) - Azure部署的Codex Mini

**配置要求**：
- **API Key**：Azure OpenAI服务的密钥
- **Azure Endpoint**：您的Azure OpenAI资源端点URL
- **API Version**：API版本号（推荐：2024-02-01）
- **Deployment Name**：在Azure中为模型创建的部署名称

### 6. Amazon Bedrock

**主要模型**：
- Titan Text Express - 高速文本生成模型
- Titan Text Lite - 轻量级文本模型
- Titan Embed Text V2 - 文本嵌入模型
- Titan Image Generator - 图像生成模型

**配置要求**：
- **API Key**：AWS访问密钥（需要AWS SDK配置）
- **注意**：需要配置AWS区域和凭据

### 7. Cohere

**主要模型**：
- Command R+ - 增强版命令模型
- Command A - 通用命令模型
- Rerank English V3 - 英文重排序模型
- Embed English V3 - 英文嵌入模型
- Aya 23 35B - 多语言对话模型

**配置要求**：
- **API Key**：在 [Cohere Platform](https://dashboard.cohere.ai/) 注册账户并创建API Key

### 8. xAI

**主要模型**：
- Grok 3 - 最新的Grok模型
- Grok 2 - Grok第二代模型
- Grok 1.5 - Grok增强版
- Grok 1 - 原始Grok模型

**配置要求**：
- **API Key**：在 [xAI Platform](https://x.ai/) 注册账户并创建API Key

### 亚洲厂商 (6个)

### 9. 百度千帆

**主要模型**：
- ERNIE-4.5-8K - 百度最新大模型
- ERNIE-X1-8K - 百度多模态模型
- ERNIE-4.0-8K - 百度主力模型
- ERNIE-3.5-8K - 百度高性价比模型
- ERNIE-Speed-8K - 百度高速模型

**配置要求**：
- **API Key**：在 [百度智能云千帆大模型平台](https://console.bce.baidu.com/qianfan/) 创建应用并获取API Key

### 10. 阿里云DashScope

**主要模型**：
- Qwen Max Latest - 通义千问最新旗舰模型
- Qwen Plus Latest - 通义千问增强版
- Qwen Turbo Latest - 通义千问快速版
- Qwen VL Max - 通义千问视觉语言模型
- Qwen2.5 72B Instruct - 通义千问2.5 72B指令模型

**配置要求**：
- **API Key**：在 [阿里云百炼平台](https://bailian.console.aliyun.com/) 创建应用并获取API Key

### 11. 智谱AI

**主要模型**：
- GLM-4 Plus - 智谱AI最强模型
- GLM-4 AirX - 智谱AI轻量化模型
- GLM-4 Long - 智谱AI长文本模型
- GLM-Z1 Air - 智谱AI推理模型
- GLM-4V Plus - 智谱AI多模态模型

**配置要求**：
- **API Key**：在 [智谱AI开放平台](https://open.bigmodel.cn/) 注册账户并创建API Key

### 12. 深言科技DeepSeek

**主要模型**：
- DeepSeek R1 - DeepSeek推理模型
- DeepSeek V3 - DeepSeek第三代模型
- DeepSeek Coder V2 - DeepSeek代码模型V2
- Janus Pro - DeepSeek多模态模型
- DeepSeek VL2 - DeepSeek视觉语言模型

**配置要求**：
- **API Key**：在 [DeepSeek Platform](https://platform.deepseek.com/) 注册账户并创建API Key

### 13. 零一万物

**主要模型**：
- Yi Large Turbo - 零一万物大模型
- Yi Large FC - 零一万物函数调用模型
- Yi Vision - 零一万物视觉模型
- Yi 1.5 34B Chat - 零一万物对话模型
- Yi Coder 34B - 零一万物代码模型

**配置要求**：
- **API Key**：在 [零一万物开放平台](https://platform.01.ai/) 注册账户并创建API Key

### 14. Naver & Sakana AI

**Naver模型**：
- HyperCLOVAX Vision 3B - Naver视觉指令模型
- HyperCLOVAX Text 1.5B - Naver文本指令模型
- HyperCLOVAX Text 0.5B - Naver轻量文本模型

**Sakana AI模型**：
- TinySwallow 1.5B - Sakana AI轻量指令模型
- TAID LLM 1.5B - Sakana AI语言模型
- TAID VLM 2B - Sakana AI视觉语言模型

**配置要求**：
- **API Key**：通过 [Hugging Face](https://huggingface.co/) 访问

### 欧洲厂商 (2个)

### 15. Mistral AI

**主要模型**：
- Mistral Large Latest - 最新的旗舰模型
- Mistral Small Latest - 高效的中等规模模型
- Open Mixtral 8x22B - 超大规模MoE模型
- Open Mixtral 8x7B - 开源MoE模型
- Open Mistral 7B - 开源基础模型

**配置要求**：
- **API Key**：在 [Mistral Console](https://console.mistral.ai/) 注册账户并创建API Key

### 16. Aleph Alpha

**主要模型**：
- Luminous Supreme - 最强的Luminous模型
- Luminous Supreme Control - 可控生成版本
- Luminous Extended - 扩展版本
- Luminous Base - 基础版本
- Luminous Explore - 探索版本

**配置要求**：
- **API Key**：在 [Aleph Alpha Platform](https://app.aleph-alpha.com/) 注册账户并创建API Key

### 基础设施与硬件厂商 (2个)

### 17. Groq

**托管模型**：
- Llama 3 70B - 托管的Llama 3大模型
- Mixtral 8x7B - 托管的Mixtral模型
- Gemma 7B IT - 托管的Gemma指令模型
- DeepSeek Coder V2 Lite - 托管的DeepSeek代码模型
- Qwen2 72B Instruct - 托管的Qwen2模型

**配置要求**：
- **API Key**：在 [GroqCloud Console](https://console.groq.com/) 注册账户并创建API Key

### 18. Cerebras

**主要模型**：
- Cerebras-GPT 13B - Cerebras训练的13B模型
- Llama3 DocChat 8B - 文档对话优化模型
- Cerebras LLaVA 13B - 视觉语言模型
- Llama-3 CBHybridL 8B - 混合优化模型
- Dragon DocChat Encoder - 文档上下文编码器

**配置要求**：
- **API Key**：需要联系Cerebras获取企业级访问权限

### 自定义LLM

**适用场景**：
- 本地部署的模型（如Ollama）
- 第三方平台托管的模型
- 兼容OpenAI API格式的任何服务

**配置要求**：
- **API Key**：根据具体服务要求（本地服务可能不需要）
- **Base URL**：服务的API端点地址

---

## 系统更新总结

### ✅ 已实现功能

1. **16个LLM厂商支持** - 覆盖全球主要AI服务提供商
2. **100+个模型** - 包括最新的GPT-4o、Claude 4、Gemini 2.5等
3. **真实API调用** - 支持各厂商的实际API接口
4. **自动格式处理** - 自动处理不同厂商的请求和响应格式
5. **地区分类** - 按北美、亚洲、欧洲等地区组织厂商

### 🔧 技术特性

1. **统一接口** - 不同厂商使用相同的调用方式
2. **错误处理** - 完善的API调用错误处理机制
3. **Token统计** - 支持各厂商的Token使用统计
4. **响应解析** - 自动解析不同厂商的响应格式

### 2. OpenAI

**主要模型**：
- GPT-4o - 最新、最强大的多模态模型
- GPT-4 Turbo - 针对速度和成本优化的GPT-4
- GPT-3.5-Turbo - 性价比极高的模型

**配置要求**：
- **API Key**：在 [OpenAI Platform](https://platform.openai.com/) 注册账户并创建API Key

### 3. Azure OpenAI

**主要模型**：
- GPT-4o (Azure) - Azure部署的GPT-4o
- GPT-4 Turbo (Azure) - Azure部署的GPT-4 Turbo
- GPT-3.5-Turbo (Azure) - Azure部署的GPT-3.5-Turbo

**配置要求**：
- **API Key**：Azure OpenAI服务的密钥
- **Azure Endpoint**：您的Azure OpenAI资源端点URL（格式：https://your-resource.openai.azure.com/）
- **API Version**：API版本号（推荐：2024-02-01）
- **Deployment Name**：在Azure中为模型创建的部署名称

**获取方式**：
1. 在Azure Portal中创建OpenAI资源
2. 在资源管理页面获取端点和密钥
3. 在Azure OpenAI Studio中部署模型并获取部署名称

### 4. Anthropic (Claude)

**主要模型**：
- Claude 3 Opus - 性能最强的模型，适用于复杂任务
- Claude 3 Sonnet - 平衡了性能和速度的理想选择
- Claude 3 Haiku - 速度最快、成本最低的模型

**配置要求**：
- **API Key**：在 [Anthropic Console](https://console.anthropic.com/) 注册账户并创建API Key

### 5. Google Gemini

**主要模型**：
- Gemini 1.5 Pro Latest - 最新的旗舰模型，拥有超长上下文窗口
- Gemini 1.5 Flash Latest - 针对速度和效率优化的轻量级模型
- Gemini 1.0 Pro - 上一代的稳定模型，性价比高

**配置要求**：
- **API Key**：在 [Google AI Studio](https://aistudio.google.com/) 创建API Key

### 6. Groq

**托管模型**：
- Llama 3 70B - 托管的Llama 3大模型
- Llama 3 8B - 托管的Llama 3轻量模型
- Mixtral 8x7B - 托管的Mixtral模型
- Gemma 7B IT - 托管的Gemma指令调优模型

**配置要求**：
- **API Key**：在 [GroqCloud Console](https://console.groq.com/) 注册账户并创建API Key

### 7. DeepSeek

**主要模型**：
- DeepSeek Chat - 通用对话模型
- DeepSeek Coder - 专为代码生成和补全优化

**配置要求**：
- **API Key**：在 [DeepSeek Platform](https://platform.deepseek.com/) 注册账户并创建API Key

### 8. Cerebras

**主要模型**：
- Cerebras-GPT 13B - Cerebras训练的13B模型
- Cerebras-GPT 6.7B - Cerebras训练的6.7B模型

**配置要求**：
- **API Key**：需要联系Cerebras获取企业级访问权限
- **注意**：Cerebras主要面向企业客户，需要直接联系销售团队

### 9. Custom LLM

**适用场景**：
- 本地部署的模型（如Ollama）
- 第三方平台托管的模型
- 兼容OpenAI API格式的任何服务

**配置要求**：
- **API Key**：根据具体服务要求（本地服务可能不需要）
- **Base URL**：服务的API端点地址
  - Ollama本地：`http://localhost:11434/v1`
  - Together AI：`https://api.together.xyz/v1`
  - Anyscale：`https://api.endpoints.anyscale.com/v1`

### 10. 百度文心

**主要模型**：
- ERNIE-Bot 4.0 - 百度最新大模型
- ERNIE-Bot - 百度大语言模型
- ERNIE-Bot-Turbo - 快速版本

**配置要求**：
- **API Key**：在 [百度智能云千帆大模型平台](https://console.bce.baidu.com/qianfan/) 创建应用并获取API Key

### 11. 阿里通义

**主要模型**：
- Qwen-Max - 通义千问超大规模模型
- Qwen-Plus - 通义千问增强版
- Qwen-Turbo - 通义千问快速版

**配置要求**：
- **API Key**：在 [阿里云百炼平台](https://bailian.console.aliyun.com/) 创建应用并获取API Key

## 安全提示

1. **API Key安全**：
   - 不要在代码中硬编码API Key
   - 建议使用环境变量管理密钥
   - 定期轮换API Key
   - 不要将API Key提交到版本控制系统

2. **访问控制**：
   - 为不同环境使用不同的API Key
   - 设置适当的使用配额和限制
   - 监控API调用使用情况

3. **成本控制**：
   - 了解各厂商的定价模型
   - 设置使用预算和告警
   - 选择适合场景的模型（平衡性能和成本）

## 配置测试

配置完成后，建议进行以下测试：

1. **连接测试**：使用简单的"Hello"提示词测试连接
2. **模型验证**：确认选择的模型能够正常响应
3. **参数调优**：测试不同的温度和token限制设置
4. **批量测试**：验证批量请求的稳定性

## 故障排除

**常见问题**：

1. **API Key错误**：检查密钥格式和有效性
2. **模型不可用**：确认模型名称正确且已启用
3. **配额超限**：检查账户余额和使用限制
4. **网络连接**：确认能够访问厂商API端点
5. **Azure OpenAI**：确认部署名称和端点配置正确

**调试建议**：

- 查看浏览器开发者工具的网络请求
- 检查API响应的错误信息
- 参考各厂商的官方文档和错误代码说明 