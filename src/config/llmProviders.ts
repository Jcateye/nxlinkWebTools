// LLM厂商统一配置文件
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
  requestFormat: 'OpenAI' | 'Anthropic' | 'Google' | 'Baidu' | 'Alibaba' | 'Cohere' | 'AlephAlpha' | 'HuggingFace' | 'Custom';
  responseFormat: 'OpenAI' | 'Anthropic' | 'Google' | 'Baidu' | 'Alibaba' | 'Cohere' | 'AlephAlpha' | 'HuggingFace' | 'Custom';
  supportedFeatures: {
    chat: boolean;
    completion: boolean;
    streaming: boolean;
    multimodal: boolean;
  };
  specialConfig?: {
    requiresAzureConfig?: boolean;
    requiresAwsConfig?: boolean;
    requiresVertexConfig?: boolean;
    customEndpointRequired?: boolean;
    apiVersionRequired?: boolean;
  };
}

export const LLM_PROVIDERS_CONFIG: Record<string, LLMProviderConfig> = {
  // 北美厂商
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
  },

  'Google Gemini': {
    name: 'Google Gemini',
    displayName: 'Google Gemini (AI Studio)',
    region: 'North America',
    apiConfig: {
      baseUrl: 'https://generativelanguage.googleapis.com',
      endpoint: '/v1beta/models/{model}:generateContent',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'ApiKey',
    },
    requestFormat: 'Google',
    responseFormat: 'Google',
    supportedFeatures: {
      chat: true,
      completion: true,
      streaming: false,
      multimodal: true,
    },
  },

  'Google Vertex AI': {
    name: 'Google Vertex AI',
    displayName: 'Google Vertex AI',
    region: 'North America',
    apiConfig: {
      baseUrl: 'https://{region}-aiplatform.googleapis.com',
      endpoint: '/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Bearer', // OAuth 2.0 access token
    },
    requestFormat: 'Google',
    responseFormat: 'Google',
    supportedFeatures: {
      chat: true,
      completion: true,
      streaming: false,
      multimodal: true,
    },
    specialConfig: {
      requiresVertexConfig: true,
    },
  },

  'Anthropic': {
    name: 'Anthropic',
    displayName: 'Anthropic',
    region: 'North America',
    apiConfig: {
      baseUrl: 'https://api.anthropic.com',
      endpoint: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      authType: 'Custom',
      authHeader: 'x-api-key',
    },
    requestFormat: 'Anthropic',
    responseFormat: 'Anthropic',
    supportedFeatures: {
      chat: true,
      completion: false,
      streaming: true,
      multimodal: true,
    },
  },

  'Meta AI (Llama)': {
    name: 'Meta AI (Llama)',
    displayName: 'Meta AI (Llama)',
    region: 'North America',
    apiConfig: {
      baseUrl: 'https://api.together.xyz',
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
      multimodal: false,
    },
  },

  'Microsoft Azure': {
    name: 'Microsoft Azure',
    displayName: 'Microsoft Azure',
    region: 'North America',
    apiConfig: {
      baseUrl: '{azureEndpoint}',
      endpoint: '/openai/deployments/{deploymentName}/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Custom',
      authHeader: 'api-key',
    },
    requestFormat: 'OpenAI',
    responseFormat: 'OpenAI',
    supportedFeatures: {
      chat: true,
      completion: true,
      streaming: true,
      multimodal: true,
    },
    specialConfig: {
      requiresAzureConfig: true,
      apiVersionRequired: true,
    },
  },

  'Amazon Bedrock': {
    name: 'Amazon Bedrock',
    displayName: 'Amazon Bedrock',
    region: 'North America',
    apiConfig: {
      baseUrl: 'https://bedrock-runtime.{region}.amazonaws.com',
      endpoint: '/model/{model}/invoke',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Custom', // AWS Signature V4
    },
    requestFormat: 'Custom',
    responseFormat: 'Custom',
    supportedFeatures: {
      chat: true,
      completion: true,
      streaming: false,
      multimodal: true,
    },
    specialConfig: {
      requiresAwsConfig: true,
    },
  },

  'Cohere': {
    name: 'Cohere',
    displayName: 'Cohere',
    region: 'North America',
    apiConfig: {
      baseUrl: 'https://api.cohere.ai',
      endpoint: '/v1/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Bearer',
    },
    requestFormat: 'Cohere',
    responseFormat: 'Cohere',
    supportedFeatures: {
      chat: false,
      completion: true,
      streaming: false,
      multimodal: false,
    },
  },

  'xAI': {
    name: 'xAI',
    displayName: 'xAI',
    region: 'North America',
    apiConfig: {
      baseUrl: 'https://api.x.ai',
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
      multimodal: false,
    },
  },

  // 亚洲厂商
  '百度千帆': {
    name: '百度千帆',
    displayName: '百度千帆',
    region: 'Asia',
    apiConfig: {
      baseUrl: 'https://aip.baidubce.com',
      endpoint: '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Bearer',
    },
    requestFormat: 'Baidu',
    responseFormat: 'Baidu',
    supportedFeatures: {
      chat: true,
      completion: false,
      streaming: true,
      multimodal: true,
    },
  },

  '阿里云DashScope': {
    name: '阿里云DashScope',
    displayName: '阿里云DashScope',
    region: 'Asia',
    apiConfig: {
      baseUrl: 'https://dashscope.aliyuncs.com',
      endpoint: '/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Bearer',
    },
    requestFormat: 'Alibaba',
    responseFormat: 'Alibaba',
    supportedFeatures: {
      chat: true,
      completion: true,
      streaming: true,
      multimodal: true,
    },
  },

  '智谱AI': {
    name: '智谱AI',
    displayName: '智谱AI',
    region: 'Asia',
    apiConfig: {
      baseUrl: 'https://open.bigmodel.cn',
      endpoint: '/api/paas/v4/chat/completions',
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
  },

  '深言科技DeepSeek': {
    name: '深言科技DeepSeek',
    displayName: '深言科技DeepSeek',
    region: 'Asia',
    apiConfig: {
      baseUrl: 'https://api.deepseek.com',
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
      multimodal: false,
    },
  },

  '零一万物': {
    name: '零一万物',
    displayName: '零一万物',
    region: 'Asia',
    apiConfig: {
      baseUrl: 'https://api.lingyiwanwu.com',
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
  },

  'Naver': {
    name: 'Naver',
    displayName: 'Naver',
    region: 'Asia',
    apiConfig: {
      baseUrl: 'https://api-inference.huggingface.co',
      endpoint: '/models/{model}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Bearer',
    },
    requestFormat: 'HuggingFace',
    responseFormat: 'HuggingFace',
    supportedFeatures: {
      chat: false,
      completion: true,
      streaming: false,
      multimodal: true,
    },
  },

  'Sakana AI': {
    name: 'Sakana AI',
    displayName: 'Sakana AI',
    region: 'Asia',
    apiConfig: {
      baseUrl: 'https://api-inference.huggingface.co',
      endpoint: '/models/{model}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Bearer',
    },
    requestFormat: 'HuggingFace',
    responseFormat: 'HuggingFace',
    supportedFeatures: {
      chat: false,
      completion: true,
      streaming: false,
      multimodal: true,
    },
  },

  // 欧洲厂商
  'Mistral AI': {
    name: 'Mistral AI',
    displayName: 'Mistral AI',
    region: 'Europe',
    apiConfig: {
      baseUrl: 'https://api.mistral.ai',
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
      multimodal: false,
    },
  },

  'Aleph Alpha': {
    name: 'Aleph Alpha',
    displayName: 'Aleph Alpha',
    region: 'Europe',
    apiConfig: {
      baseUrl: 'https://api.aleph-alpha.com',
      endpoint: '/complete',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: 'Bearer',
    },
    requestFormat: 'AlephAlpha',
    responseFormat: 'AlephAlpha',
    supportedFeatures: {
      chat: false,
      completion: true,
      streaming: false,
      multimodal: true,
    },
  },

  // 基础设施厂商
  'Groq': {
    name: 'Groq',
    displayName: 'Groq',
    region: 'Infrastructure',
    apiConfig: {
      baseUrl: 'https://api.groq.com',
      endpoint: '/openai/v1/chat/completions',
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
      multimodal: false,
    },
  },

  'Cerebras': {
    name: 'Cerebras',
    displayName: 'Cerebras',
    region: 'Infrastructure',
    apiConfig: {
      baseUrl: 'https://api.cerebras.ai',
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
      multimodal: false,
    },
  },

  // 自定义LLM
  'Custom LLM': {
    name: 'Custom LLM',
    displayName: 'Custom LLM',
    region: 'Infrastructure',
    apiConfig: {
      baseUrl: '{customBaseUrl}',
      endpoint: '/chat/completions',
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
      streaming: false,
      multimodal: false,
    },
    specialConfig: {
      customEndpointRequired: true,
    },
  },
};

// 请求格式构建器
export class RequestFormatBuilder {
  static buildRequest(format: string, prompt: string | { systemPrompt?: string; userPrompt: string }, modelId: string, options: any = {}) {
    // 处理提示词格式 - 支持System Prompt和User Prompt
    let systemPrompt = '';
    let userPrompt = '';
    
    if (typeof prompt === 'string') {
      // 向后兼容：如果是字符串，作为用户提示词
      userPrompt = prompt;
    } else {
      // 新格式：分别处理系统提示词和用户提示词
      systemPrompt = prompt.systemPrompt || '';
      userPrompt = prompt.userPrompt || '';
    }

    switch (format) {
      case 'OpenAI':
        const messages: any[] = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: userPrompt });
        
        return {
          model: modelId,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048,
        };

      case 'Anthropic':
        const anthropicMessages: any[] = [];
        if (systemPrompt) {
          anthropicMessages.push({ role: 'system', content: systemPrompt });
        }
        anthropicMessages.push({ role: 'user', content: userPrompt });
        
        return {
          model: modelId,
          max_tokens: options.maxTokens || 1024,
          messages: anthropicMessages,
        };

      case 'Google':
        // Google Gemini使用systemInstruction来设置系统提示词
        const googleRequest: any = {
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 1024,
          },
        };
        
        if (systemPrompt) {
          googleRequest.systemInstruction = {
            parts: [{ text: systemPrompt }]
          };
        }
        
        return googleRequest;

      case 'Baidu':
        const baiduMessages: any[] = [];
        if (systemPrompt) {
          baiduMessages.push({ role: 'system', content: systemPrompt });
        }
        baiduMessages.push({ role: 'user', content: userPrompt });
        
        return {
          messages: baiduMessages,
        };

      case 'Alibaba':
        const alibabaMessages: any[] = [];
        if (systemPrompt) {
          alibabaMessages.push({ role: 'system', content: systemPrompt });
        }
        alibabaMessages.push({ role: 'user', content: userPrompt });
        
        return {
          model: modelId,
          input: { messages: alibabaMessages },
          parameters: {
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1024,
          },
        };

      case 'Cohere':
        // Cohere使用preamble作为系统提示词
        const cohereRequest: any = {
          model: modelId,
          message: userPrompt,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7,
        };
        
        if (systemPrompt) {
          cohereRequest.preamble = systemPrompt;
        }
        
        return cohereRequest;

      case 'AlephAlpha':
        // 对于不支持系统提示词的模型，将系统提示词合并到用户提示词前面
        const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
        
        return {
          model: modelId,
          prompt: combinedPrompt,
          maximum_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7,
        };

      case 'HuggingFace':
        // HuggingFace模型通常不支持系统提示词，合并处理
        const hfCombinedPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
        
        return {
          inputs: hfCombinedPrompt,
          parameters: {
            temperature: options.temperature || 0.7,
            max_new_tokens: options.maxTokens || 1024,
          },
        };

      default:
        // 默认使用OpenAI格式
        const defaultMessages: any[] = [];
        if (systemPrompt) {
          defaultMessages.push({ role: 'system', content: systemPrompt });
        }
        defaultMessages.push({ role: 'user', content: userPrompt });
        
        return {
          model: modelId,
          messages: defaultMessages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048,
        };
    }
  }
}

// 响应格式解析器
export class ResponseFormatParser {
  static parseResponse(format: string, data: any, provider: string) {
    let output = '';
    let tokens = { prompt: 0, completion: 0, total: 0 };

    switch (format) {
      case 'OpenAI':
        output = data.choices?.[0]?.message?.content || '无响应内容';
        tokens = {
          prompt: data.usage?.prompt_tokens || 0,
          completion: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0,
        };
        break;

      case 'Anthropic':
        output = data.content?.[0]?.text || '无响应内容';
        tokens = {
          prompt: data.usage?.input_tokens || 0,
          completion: data.usage?.output_tokens || 0,
          total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        };
        break;

      case 'Google':
        output = data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容';
        tokens = {
          prompt: data.usageMetadata?.promptTokenCount || 0,
          completion: data.usageMetadata?.candidatesTokenCount || 0,
          total: data.usageMetadata?.totalTokenCount || 0,
        };
        break;

      case 'Cohere':
        output = data.generations?.[0]?.text || '无响应内容';
        tokens = {
          prompt: data.meta?.billed_units?.input_tokens || 0,
          completion: data.meta?.billed_units?.output_tokens || 0,
          total: (data.meta?.billed_units?.input_tokens || 0) + (data.meta?.billed_units?.output_tokens || 0),
        };
        break;

      case 'Baidu':
        output = data.result || '无响应内容';
        tokens = {
          prompt: data.usage?.prompt_tokens || 0,
          completion: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0,
        };
        break;

      case 'Alibaba':
        output = data.output?.text || '无响应内容';
        tokens = {
          prompt: data.usage?.input_tokens || 0,
          completion: data.usage?.output_tokens || 0,
          total: data.usage?.total_tokens || 0,
        };
        break;

      case 'AlephAlpha':
        output = data.completions?.[0]?.completion || '无响应内容';
        tokens = {
          prompt: data.num_tokens_prompt_total || 0,
          completion: data.num_tokens_generated || 0,
          total: (data.num_tokens_prompt_total || 0) + (data.num_tokens_generated || 0),
        };
        break;

      case 'HuggingFace':
        output = data[0]?.generated_text || data.generated_text || '无响应内容';
        tokens = {
          prompt: Math.floor((output?.length || 0) * 0.2), // 估算
          completion: Math.floor((output?.length || 0) * 0.8),
          total: Math.floor((output?.length || 0) / 4),
        };
        break;

      default:
        output = '未知响应格式';
        tokens = { prompt: 0, completion: 0, total: 0 };
    }

    return { output, tokens };
  }
}

// URL构建器
export class URLBuilder {
  static buildURL(config: LLMProviderConfig, provider: any, modelId?: string): string {
    let url = config.apiConfig.baseUrl + config.apiConfig.endpoint;
    
    // 替换URL中的占位符
    if (config.specialConfig?.requiresAzureConfig && provider.azureEndpoint) {
      url = url.replace('{azureEndpoint}', provider.azureEndpoint);
      url = url.replace('{deploymentName}', provider.azureDeploymentName || 'gpt-4');
      if (provider.azureApiVersion) {
        url += `?api-version=${provider.azureApiVersion}`;
      }
    }
    
    if (config.specialConfig?.requiresVertexConfig && provider.region && provider.projectId) {
      url = url.replace('{region}', provider.region);
      url = url.replace('{projectId}', provider.projectId);
    }
    
    if (config.specialConfig?.customEndpointRequired && provider.baseUrl) {
      url = url.replace('{customBaseUrl}', provider.baseUrl);
    }
    
    if (modelId) {
      url = url.replace('{model}', modelId);
    }
    
    return url;
  }
}

// 请求头构建器
export class HeaderBuilder {
  static buildHeaders(config: LLMProviderConfig, provider: any): Record<string, string> {
    const headers = { ...config.apiConfig.headers };
    
    // 添加认证头
    switch (config.apiConfig.authType) {
      case 'Bearer':
        if (config.name === 'Google Vertex AI') {
          // Google Vertex AI 使用OAuth 2.0 access token
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        } else {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }
        break;
      case 'ApiKey':
        if (config.name === 'Google Gemini') {
          // Google Gemini 将 API Key 放在 URL 参数中
          return headers;
        }
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
        break;
      case 'Custom':
        if (config.apiConfig.authHeader) {
          headers[config.apiConfig.authHeader] = provider.apiKey;
        }
        break;
    }
    
    // 添加自定义头
    if (provider.customHeaders) {
      Object.assign(headers, provider.customHeaders);
    }
    
    return headers;
  }
} 