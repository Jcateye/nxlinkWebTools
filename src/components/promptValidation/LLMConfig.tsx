import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Table, Space, Modal, message, Card, Row, Col, Divider, Typography, Alert, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import type { LLMProvider, LLMModel } from '../../types/promptValidation';
import { LLM_PROVIDERS_CONFIG } from '../../config/llmProviders';
import PromptValidationApiService from '../../services/promptValidationApi';

const { Option } = Select;
const { Text, Link } = Typography;

const LLMConfig: React.FC = () => {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const apiService = PromptValidationApiService.getInstance();

  // 预定义的模型列表
  const predefinedModels: Record<string, LLMModel[]> = {
    // 北美厂商
    'OpenAI': [
      { id: 'gpt-4o', providerId: '', name: 'GPT-4o', description: '最新、最强大的多模态模型', maxTokens: 128000 },
      { id: 'gpt-4.5-preview', providerId: '', name: 'GPT-4.5 Preview', description: '下一代GPT-4预览版', maxTokens: 128000 },
      { id: 'o1', providerId: '', name: 'O1', description: '推理能力优化的模型', maxTokens: 200000 },
      { id: 'o3', providerId: '', name: 'O3', description: '最新的推理模型', maxTokens: 200000 },
      { id: 'gpt-4o-mini', providerId: '', name: 'GPT-4o Mini', description: '轻量级的多模态模型', maxTokens: 128000 },
    ],
    'Google Gemini': [
      { id: 'gemini-2.5-pro', providerId: '', name: 'Gemini 2.5 Pro', description: '最新的旗舰模型', maxTokens: 2000000 },
      { id: 'gemini-2.5-flash', providerId: '', name: 'Gemini 2.5 Flash', description: '高速版本', maxTokens: 1000000 },
      { id: 'gemini-2.0-flash', providerId: '', name: 'Gemini 2.0 Flash', description: '实时交互优化', maxTokens: 1000000 },
      { id: 'gemma-2-27b-it', providerId: '', name: 'Gemma 2 27B IT', description: '指令调优版本', maxTokens: 32768 },
      { id: 'paligemma-2-28b', providerId: '', name: 'PaliGemma 2 28B', description: '视觉语言模型', maxTokens: 32768 },
    ],
    'Google Vertex AI': [
      { id: 'gemini-2.5-pro', providerId: '', name: 'Gemini 2.5 Pro (Vertex)', description: 'Vertex AI部署的Gemini 2.5 Pro', maxTokens: 2000000 },
      { id: 'gemini-2.5-flash', providerId: '', name: 'Gemini 2.5 Flash (Vertex)', description: 'Vertex AI部署的高速版本', maxTokens: 1000000 },
      { id: 'gemini-2.0-flash', providerId: '', name: 'Gemini 2.0 Flash (Vertex)', description: 'Vertex AI部署的实时交互优化', maxTokens: 1000000 },
      { id: 'gemini-1.5-pro', providerId: '', name: 'Gemini 1.5 Pro (Vertex)', description: 'Vertex AI部署的Gemini 1.5 Pro', maxTokens: 2000000 },
      { id: 'gemini-1.5-flash', providerId: '', name: 'Gemini 1.5 Flash (Vertex)', description: 'Vertex AI部署的Gemini 1.5 Flash', maxTokens: 1000000 },
    ],
    'Anthropic': [
      { id: 'claude-opus-4-20250514', providerId: '', name: 'Claude Opus 4', description: '最新的Opus模型', maxTokens: 200000 },
      { id: 'claude-sonnet-4-20250514', providerId: '', name: 'Claude Sonnet 4', description: '最新的Sonnet模型', maxTokens: 200000 },
      { id: 'claude-3.5-sonnet-20240620', providerId: '', name: 'Claude 3.5 Sonnet', description: '增强版Sonnet', maxTokens: 200000 },
      { id: 'claude-3.5-haiku-20241008', providerId: '', name: 'Claude 3.5 Haiku', description: '最新的Haiku模型', maxTokens: 200000 },
    ],
    'Meta AI (Llama)': [
      { id: 'meta-llama/Llama-4-400B-Maverick-Instruct', providerId: '', name: 'Llama 4 400B Maverick', description: '最大的Llama 4模型', maxTokens: 131072 },
      { id: 'meta-llama/Llama-4-109B-Scout-Instruct', providerId: '', name: 'Llama 4 109B Scout', description: 'Llama 4 中等规模模型', maxTokens: 131072 },
      { id: 'meta-llama/Llama-3.1-405B-Instruct', providerId: '', name: 'Llama 3.1 405B', description: '最大的Llama 3.1模型', maxTokens: 131072 },
      { id: 'meta-llama/Llama-3.1-70B-Instruct', providerId: '', name: 'Llama 3.1 70B', description: '高性能Llama 3.1模型', maxTokens: 131072 },
      { id: 'meta-llama/CodeLlama-70b-Instruct-hf', providerId: '', name: 'CodeLlama 70B', description: '代码专用Llama模型', maxTokens: 100000 },
    ],
    'Microsoft Azure': [
      { id: 'o3-pro-2025-06-10', providerId: '', name: 'O3 Pro (Azure)', description: 'Azure部署的O3 Pro', maxTokens: 200000 },
      { id: 'gpt-4.1-2025-04-14', providerId: '', name: 'GPT-4.1 (Azure)', description: 'Azure部署的GPT-4.1', maxTokens: 128000 },
      { id: 'gpt-4.5-preview-2025-02-27', providerId: '', name: 'GPT-4.5 Preview (Azure)', description: 'Azure部署的GPT-4.5预览版', maxTokens: 128000 },
      { id: 'gpt-4o-2024-11-20', providerId: '', name: 'GPT-4o (Azure)', description: 'Azure部署的GPT-4o', maxTokens: 128000 },
      { id: 'codex-mini-2025-05-16', providerId: '', name: 'Codex Mini (Azure)', description: 'Azure部署的Codex Mini', maxTokens: 8192 },
    ],
    'Amazon Bedrock': [
      { id: 'amazon.titan-text-express-v1', providerId: '', name: 'Titan Text Express', description: '高速文本生成模型', maxTokens: 8192 },
      { id: 'amazon.titan-text-lite-v1', providerId: '', name: 'Titan Text Lite', description: '轻量级文本模型', maxTokens: 4096 },
      { id: 'amazon.titan-embed-text-v2:0', providerId: '', name: 'Titan Embed Text V2', description: '文本嵌入模型', maxTokens: 8192 },
      { id: 'amazon.titan-image-generator-v1', providerId: '', name: 'Titan Image Generator', description: '图像生成模型', maxTokens: 512 },
    ],
    'Cohere': [
      { id: 'command-r-plus', providerId: '', name: 'Command R+', description: '增强版命令模型', maxTokens: 128000 },
      { id: 'command-a', providerId: '', name: 'Command A', description: '通用命令模型', maxTokens: 128000 },
      { id: 'rerank-english-v3.0', providerId: '', name: 'Rerank English V3', description: '英文重排序模型', maxTokens: 4096 },
      { id: 'embed-english-v3.0', providerId: '', name: 'Embed English V3', description: '英文嵌入模型', maxTokens: 4096 },
      { id: 'aya-23-35b', providerId: '', name: 'Aya 23 35B', description: '多语言对话模型', maxTokens: 32768 },
    ],
    'xAI': [
      { id: 'grok-3', providerId: '', name: 'Grok 3', description: '最新的Grok模型', maxTokens: 131072 },
      { id: 'grok-2', providerId: '', name: 'Grok 2', description: 'Grok第二代模型', maxTokens: 131072 },
      { id: 'grok-1.5', providerId: '', name: 'Grok 1.5', description: 'Grok增强版', maxTokens: 131072 },
      { id: 'grok-1', providerId: '', name: 'Grok 1', description: '原始Grok模型', maxTokens: 131072 },
    ],

    // 亚洲厂商
    '百度千帆': [
      { id: 'ERNIE-4.5-8K', providerId: '', name: 'ERNIE-4.5-8K', description: '百度最新大模型', maxTokens: 8192 },
      { id: 'ERNIE-X1-8K', providerId: '', name: 'ERNIE-X1-8K', description: '百度多模态模型', maxTokens: 8192 },
      { id: 'ERNIE-4.0-8K', providerId: '', name: 'ERNIE-4.0-8K', description: '百度主力模型', maxTokens: 8192 },
      { id: 'ERNIE-3.5-8K', providerId: '', name: 'ERNIE-3.5-8K', description: '百度高性价比模型', maxTokens: 8192 },
      { id: 'ERNIE-Speed-8K', providerId: '', name: 'ERNIE-Speed-8K', description: '百度高速模型', maxTokens: 8192 },
    ],
    '阿里云DashScope': [
      { id: 'qwen-max-latest', providerId: '', name: 'Qwen Max Latest', description: '通义千问最新旗舰模型', maxTokens: 32768 },
      { id: 'qwen-plus-latest', providerId: '', name: 'Qwen Plus Latest', description: '通义千问增强版', maxTokens: 32768 },
      { id: 'qwen-turbo-latest', providerId: '', name: 'Qwen Turbo Latest', description: '通义千问快速版', maxTokens: 32768 },
      { id: 'qwen-vl-max', providerId: '', name: 'Qwen VL Max', description: '通义千问视觉语言模型', maxTokens: 32768 },
      { id: 'qwen2.5-72b-instruct', providerId: '', name: 'Qwen2.5 72B Instruct', description: '通义千问2.5 72B指令模型', maxTokens: 32768 },
    ],
    '智谱AI': [
      { id: 'glm-4-plus', providerId: '', name: 'GLM-4 Plus', description: '智谱AI最强模型', maxTokens: 128000 },
      { id: 'glm-4-airx', providerId: '', name: 'GLM-4 AirX', description: '智谱AI轻量化模型', maxTokens: 128000 },
      { id: 'glm-4-long', providerId: '', name: 'GLM-4 Long', description: '智谱AI长文本模型', maxTokens: 1000000 },
      { id: 'glm-z1-air', providerId: '', name: 'GLM-Z1 Air', description: '智谱AI推理模型', maxTokens: 128000 },
      { id: 'glm-4v-plus-0111', providerId: '', name: 'GLM-4V Plus', description: '智谱AI多模态模型', maxTokens: 128000 },
    ],
    '深言科技DeepSeek': [
      { id: 'deepseek-ai/DeepSeek-R1', providerId: '', name: 'DeepSeek R1', description: 'DeepSeek推理模型', maxTokens: 64000 },
      { id: 'deepseek-ai/DeepSeek-V3', providerId: '', name: 'DeepSeek V3', description: 'DeepSeek第三代模型', maxTokens: 64000 },
      { id: 'deepseek-ai/DeepSeek-Coder-V2', providerId: '', name: 'DeepSeek Coder V2', description: 'DeepSeek代码模型V2', maxTokens: 64000 },
      { id: 'deepseek-ai/Janus-Pro', providerId: '', name: 'Janus Pro', description: 'DeepSeek多模态模型', maxTokens: 64000 },
      { id: 'deepseek-ai/DeepSeek-VL2', providerId: '', name: 'DeepSeek VL2', description: 'DeepSeek视觉语言模型', maxTokens: 64000 },
    ],
    '零一万物': [
      { id: '01-ai/yi-large-turbo', providerId: '', name: 'Yi Large Turbo', description: '零一万物大模型', maxTokens: 32768 },
      { id: '01-ai/yi-large-fc', providerId: '', name: 'Yi Large FC', description: '零一万物函数调用模型', maxTokens: 32768 },
      { id: '01-ai/yi-vision', providerId: '', name: 'Yi Vision', description: '零一万物视觉模型', maxTokens: 32768 },
      { id: '01-ai/yi-1.5-34b-chat', providerId: '', name: 'Yi 1.5 34B Chat', description: '零一万物对话模型', maxTokens: 32768 },
      { id: '01-ai/yi-coder-34b', providerId: '', name: 'Yi Coder 34B', description: '零一万物代码模型', maxTokens: 32768 },
    ],
    'Naver': [
      { id: 'naver-hyperclovax/HyperCLOVAX-SEED-Vision-Instruct-3B', providerId: '', name: 'HyperCLOVAX Vision 3B', description: 'Naver视觉指令模型', maxTokens: 32768 },
      { id: 'naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-1.5B', providerId: '', name: 'HyperCLOVAX Text 1.5B', description: 'Naver文本指令模型', maxTokens: 32768 },
      { id: 'naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-0.5B', providerId: '', name: 'HyperCLOVAX Text 0.5B', description: 'Naver轻量文本模型', maxTokens: 32768 },
    ],
    'Sakana AI': [
      { id: 'SakanaAI/TinySwallow-1.5B-Instruct', providerId: '', name: 'TinySwallow 1.5B', description: 'Sakana AI轻量指令模型', maxTokens: 32768 },
      { id: 'SakanaAI/TAID-LLM-1.5B', providerId: '', name: 'TAID LLM 1.5B', description: 'Sakana AI语言模型', maxTokens: 32768 },
      { id: 'SakanaAI/TAID-VLM-2B', providerId: '', name: 'TAID VLM 2B', description: 'Sakana AI视觉语言模型', maxTokens: 32768 },
    ],

    // 欧洲厂商
    'Mistral AI': [
      { id: 'mistral-large-latest', providerId: '', name: 'Mistral Large Latest', description: '最新的旗舰模型', maxTokens: 128000 },
      { id: 'mistral-small-latest', providerId: '', name: 'Mistral Small Latest', description: '高效的中等规模模型', maxTokens: 128000 },
      { id: 'open-mixtral-8x22b', providerId: '', name: 'Open Mixtral 8x22B', description: '超大规模MoE模型', maxTokens: 65536 },
      { id: 'open-mixtral-8x7b', providerId: '', name: 'Open Mixtral 8x7B', description: '开源MoE模型', maxTokens: 32768 },
      { id: 'open-mistral-7b', providerId: '', name: 'Open Mistral 7B', description: '开源基础模型', maxTokens: 32768 },
    ],
    'Aleph Alpha': [
      { id: 'luminous-supreme', providerId: '', name: 'Luminous Supreme', description: '最强的Luminous模型', maxTokens: 8192 },
      { id: 'luminous-supreme-control', providerId: '', name: 'Luminous Supreme Control', description: '可控生成版本', maxTokens: 8192 },
      { id: 'luminous-extended', providerId: '', name: 'Luminous Extended', description: '扩展版本', maxTokens: 8192 },
      { id: 'luminous-base', providerId: '', name: 'Luminous Base', description: '基础版本', maxTokens: 8192 },
      { id: 'luminous-explore', providerId: '', name: 'Luminous Explore', description: '探索版本', maxTokens: 8192 },
    ],

    // 基础设施与硬件
    'Groq': [
      { id: 'llama3-70b-8192', providerId: '', name: 'Llama 3 70B', description: '托管的Llama 3大模型', maxTokens: 8192 },
      { id: 'mixtral-8x7b-32768', providerId: '', name: 'Mixtral 8x7B', description: '托管的Mixtral模型', maxTokens: 32768 },
      { id: 'gemma-7b-it', providerId: '', name: 'Gemma 7B IT', description: '托管的Gemma指令模型', maxTokens: 8192 },
      { id: 'deepseek-coder-v2-lite-instruct', providerId: '', name: 'DeepSeek Coder V2 Lite', description: '托管的DeepSeek代码模型', maxTokens: 32768 },
      { id: 'qwen2-72b-instruct', providerId: '', name: 'Qwen2 72B Instruct', description: '托管的Qwen2模型', maxTokens: 32768 },
    ],
    'Cerebras': [
      { id: 'cerebras/Cerebras-GPT-13B', providerId: '', name: 'Cerebras-GPT 13B', description: 'Cerebras训练的13B模型', maxTokens: 8192 },
      { id: 'cerebras/Llama3-DocChat-1.0-8B', providerId: '', name: 'Llama3 DocChat 8B', description: '文档对话优化模型', maxTokens: 8192 },
      { id: 'cerebras/Cerebras-LLaVA-13B', providerId: '', name: 'Cerebras LLaVA 13B', description: '视觉语言模型', maxTokens: 8192 },
      { id: 'cerebras/Llama-3-CBHybridL-8B', providerId: '', name: 'Llama-3 CBHybridL 8B', description: '混合优化模型', maxTokens: 8192 },
      { id: 'cerebras/Dragon-DocChat-Context-Encoder', providerId: '', name: 'Dragon DocChat Encoder', description: '文档上下文编码器', maxTokens: 8192 },
    ],

    // 自定义LLM
    'Custom LLM': [
      { id: 'custom-model-1', providerId: '', name: '自定义模型 1', description: '自己托管或第三方平台的模型', maxTokens: 32768 },
      { id: 'custom-model-2', providerId: '', name: '自定义模型 2', description: '本地部署或兼容OpenAI格式的模型', maxTokens: 16384 },
    ],
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const response = await apiService.getProviders();
      if (response.success && response.data) {
        setProviders(response.data);
      } else {
        message.error(response.error || '加载厂商配置失败');
        // 降级到localStorage
        const savedProviders = localStorage.getItem('llm_providers');
        if (savedProviders) {
          setProviders(JSON.parse(savedProviders));
        }
      }
    } catch (error) {
      console.error('加载厂商配置失败:', error);
      message.error('加载厂商配置失败，请检查网络连接');
      // 降级到localStorage
      const savedProviders = localStorage.getItem('llm_providers');
      if (savedProviders) {
        setProviders(JSON.parse(savedProviders));
      }
    } finally {
      setLoading(false);
    }
  };

  const getApiUrl = (providerName: string, provider?: LLMProvider) => {
    const config = LLM_PROVIDERS_CONFIG[providerName];
    if (!config) return '未知';

    let baseUrl = config.apiConfig.baseUrl;
    let endpoint = config.apiConfig.endpoint;

    // 处理特殊配置
    if (providerName === 'Microsoft Azure' && provider?.azureEndpoint) {
      baseUrl = provider.azureEndpoint;
      endpoint = endpoint.replace('{deploymentName}', provider.azureDeploymentName || 'your-deployment');
    } else if (providerName === 'Google Vertex AI' && provider?.region && provider?.projectId) {
      baseUrl = baseUrl.replace('{region}', provider.region);
      endpoint = endpoint.replace('{projectId}', provider.projectId).replace('{region}', provider.region);
    } else if (providerName === 'Custom LLM' && provider?.baseUrl) {
      baseUrl = provider.baseUrl;
    }

    return baseUrl + endpoint;
  };

  // 移除saveProviders函数，直接使用API调用

  const showModal = (provider?: LLMProvider) => {
    if (provider) {
      setEditingProvider(provider);
      form.setFieldsValue({
        name: provider.name,
        apiKey: provider.apiKey,
        azureEndpoint: provider.azureEndpoint,
        azureApiVersion: provider.azureApiVersion,
        azureDeploymentName: provider.azureDeploymentName,
        projectId: provider.projectId,
        region: provider.region,
        baseUrl: provider.baseUrl,
        selectedModels: provider.models.map(m => m.id),
      });
    } else {
      setEditingProvider(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 获取选中的模型
      const selectedModels = predefinedModels[values.name]?.filter(
        model => values.selectedModels?.includes(model.id)
      ) || [];

      const providerData = {
        name: values.name,
        apiKey: values.apiKey,
        azureEndpoint: values.azureEndpoint,
        azureApiVersion: values.azureApiVersion,
        azureDeploymentName: values.azureDeploymentName,
        projectId: values.projectId,
        region: values.region,
        baseUrl: values.baseUrl,
        models: selectedModels,
      };

      setLoading(true);
      try {
        let response;
        if (editingProvider) {
          response = await apiService.updateProvider(editingProvider.id, providerData);
          if (response.success) {
            message.success('更新成功');
          } else {
            message.error(response.error || '更新失败');
          }
        } else {
          response = await apiService.createProvider(providerData);
          if (response.success) {
            message.success('添加成功');
          } else {
            message.error(response.error || '添加失败');
          }
        }

        if (response.success) {
          await loadProviders(); // 重新加载数据
          setIsModalVisible(false);
          form.resetFields();
        }
      } catch (error) {
        console.error('API调用失败:', error);
        message.error('操作失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个LLM配置吗？',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await apiService.deleteProvider(id);
          if (response.success) {
            message.success('删除成功');
            await loadProviders(); // 重新加载数据
          } else {
            message.error(response.error || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请检查网络连接');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: '厂商名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'API URL',
      key: 'apiUrl',
      width: 350,
      render: (_: any, record: LLMProvider) => {
        const apiUrl = getApiUrl(record.name, record);
        return (
          <div>
            <Text copyable={{ text: apiUrl }} style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              <LinkOutlined style={{ marginRight: 4 }} />
              {apiUrl.length > 50 ? `${apiUrl.substring(0, 50)}...` : apiUrl}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      width: 120,
      render: (text: string) => {
        const masked = text.substring(0, 8) + '****' + text.substring(text.length - 4);
        return <Text copyable={{ text: text }} style={{ fontFamily: 'monospace' }}>{masked}</Text>;
      },
    },
    {
      title: '配置的模型',
      dataIndex: 'models',
      key: 'models',
      render: (models: LLMModel[]) => (
        <Text style={{ fontSize: '12px' }}>
          {models.length > 0 ? `${models.length}个模型` : '未配置模型'}
        </Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: LLMProvider) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h3>LLM厂商配置</h3>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadProviders}
              loading={loading}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              添加LLM配置
            </Button>
          </Space>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={providers}
          rowKey="id"
          pagination={false}
        />
      </Spin>

      <Modal
        title={editingProvider ? '编辑LLM配置' : '添加LLM配置'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="厂商名称"
            rules={[{ required: true, message: '请选择厂商名称' }]}
          >
            <Select placeholder="选择厂商" disabled={!!editingProvider}>
              {Object.keys(predefinedModels).map(provider => (
                <Option key={provider} value={provider}>
                  {provider}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, message: '请输入API Key' }]}
          >
            <Input.Password placeholder="输入API Key" />
          </Form.Item>

          {/* Azure OpenAI 特定配置 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.name !== currentValues.name}
          >
            {({ getFieldValue }) => {
              const providerName = getFieldValue('name');
              
              return providerName === 'Azure OpenAI' ? (
                <>
                  <Form.Item
                    name="azureEndpoint"
                    label="Azure Endpoint"
                    rules={[{ required: true, message: '请输入Azure Endpoint' }]}
                  >
                    <Input placeholder="https://your-resource.openai.azure.com/" />
                  </Form.Item>
                  
                  <Form.Item
                    name="azureApiVersion"
                    label="API Version"
                    rules={[{ required: true, message: '请输入API Version' }]}
                  >
                    <Input placeholder="2024-02-01" />
                  </Form.Item>
                  
                  <Form.Item
                    name="azureDeploymentName"
                    label="Deployment Name"
                    rules={[{ required: true, message: '请输入Deployment Name' }]}
                  >
                    <Input placeholder="your-deployment-name" />
                  </Form.Item>
                </>
              ) : null;
            }}
          </Form.Item>

          {/* Google Vertex AI 特定配置 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.name !== currentValues.name}
          >
            {({ getFieldValue }) => {
              const providerName = getFieldValue('name');
              
              return providerName === 'Google Vertex AI' ? (
                <>
                  <Form.Item
                    name="projectId"
                    label="Project ID"
                    rules={[{ required: true, message: '请输入Google Cloud Project ID' }]}
                  >
                    <Input placeholder="your-project-id" />
                  </Form.Item>
                  
                  <Form.Item
                    name="region"
                    label="Region"
                    rules={[{ required: true, message: '请选择Region' }]}
                  >
                    <Select placeholder="选择Region">
                      <Option value="us-central1">us-central1</Option>
                      <Option value="us-east1">us-east1</Option>
                      <Option value="us-west1">us-west1</Option>
                      <Option value="europe-west1">europe-west1</Option>
                      <Option value="europe-west2">europe-west2</Option>
                      <Option value="asia-east1">asia-east1</Option>
                      <Option value="asia-northeast1">asia-northeast1</Option>
                      <Option value="asia-southeast1">asia-southeast1</Option>
                    </Select>
                  </Form.Item>
                </>
              ) : null;
            }}
          </Form.Item>

          {/* Custom LLM 特定配置 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.name !== currentValues.name}
          >
            {({ getFieldValue }) => {
              const providerName = getFieldValue('name');
              
              return providerName === 'Custom LLM' ? (
                <Form.Item
                  name="baseUrl"
                  label="Base URL"
                  rules={[{ required: true, message: '请输入Base URL' }]}
                >
                  <Input placeholder="http://localhost:11434/v1" />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          {/* API URL 预览 */}
          <Form.Item
            noStyle
            shouldUpdate
          >
            {({ getFieldValue }) => {
              const providerName = getFieldValue('name');
              if (!providerName) return null;

              const mockProvider: LLMProvider = {
                id: '',
                name: providerName,
                apiKey: '',
                azureEndpoint: getFieldValue('azureEndpoint'),
                azureApiVersion: getFieldValue('azureApiVersion'),
                azureDeploymentName: getFieldValue('azureDeploymentName'),
                projectId: getFieldValue('projectId'),
                region: getFieldValue('region'),
                baseUrl: getFieldValue('baseUrl'),
                models: [],
                createdAt: '',
                updatedAt: '',
              };

              const apiUrl = getApiUrl(providerName, mockProvider);
              
              return (
                <Alert
                  message="API URL 预览"
                  description={
                    <div>
                      <Text copyable={{ text: apiUrl }} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        <LinkOutlined style={{ marginRight: 4 }} />
                        {apiUrl}
                      </Text>
                      <div style={{ marginTop: 8, fontSize: '11px', color: '#666' }}>
                        点击复制完整URL地址
                      </div>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              );
            }}
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.name !== currentValues.name}
          >
            {({ getFieldValue }) => {
              const providerName = getFieldValue('name');
              const models = predefinedModels[providerName] || [];
              
              return models.length > 0 ? (
                <Form.Item
                  name="selectedModels"
                  label="选择模型"
                  rules={[{ required: true, message: '请至少选择一个模型' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择要启用的模型"
                    style={{ width: '100%' }}
                  >
                    {models.map(model => (
                      <Option key={model.id} value={model.id}>
                        {model.name}
                        {model.description && (
                          <span style={{ color: '#999', marginLeft: 8 }}>
                            - {model.description}
                          </span>
                        )}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LLMConfig; 