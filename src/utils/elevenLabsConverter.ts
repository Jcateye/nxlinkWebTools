// 11Labs原始voice对象类型
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: {
    accent?: string;
    descriptive?: string;
    age?: string;
    gender?: string;
    language?: string;
    use_case?: string;
    [key: string]: any;
  };
  description?: string;
  verified_languages?: Array<{
    language: string;
    [key: string]: any;
  }>;
  high_quality_base_model_ids?: string[];
  [key: string]: any;
}

// 转换后的参数格式
export interface VendorEleven11LabsParams {
  id: string;
  labels: {
    accent?: string;
    age?: string;
    category?: string;
    descriptive?: string;
    description?: string;
    gender?: string;
    languages: string[];
    use_case?: string;
  };
  name: string;
  similarityBoost: number;
  stability: number;
  speed: number;
  model_list: string[];
}

/**
 * 将单个11Labs voice对象转换为vendor参数格式
 */
export const convertSingleVoice = (voice: ElevenLabsVoice): VendorEleven11LabsParams => {
  const labels = voice.labels || {};
  
  // 提取语言列表
  let languages: string[] = [];
  if (voice.verified_languages && voice.verified_languages.length > 0) {
    languages = voice.verified_languages.map(lang => lang.language);
  } else if (labels.language) {
    languages = [labels.language];
  }

  return {
    id: voice.voice_id || '',
    labels: {
      accent: labels.accent || '',
      age: labels.age || '',
      category: voice.category || '',
      descriptive: labels.descriptive || '',
      description: voice.description || '',
      gender: labels.gender || '',
      languages: languages,
      use_case: labels.use_case || '',
    },
    name: voice.name || '',
    similarityBoost: 0.35,
    stability: 0.5,
    speed: 1,
    model_list: voice.high_quality_base_model_ids || [],
  };
};

/**
 * 将11Labs voice列表转换为vendor参数格式
 * 并按模型类型分组：multilingual 模型单独分为一条数据，并在名称后加上 " - multilingual" 后缀
 */
export const convertVoiceList = (voices: ElevenLabsVoice[]): VendorEleven11LabsParams[] => {
  const converted = voices.map(voice => convertSingleVoice(voice));
  const result: VendorEleven11LabsParams[] = [];
  
  for (const item of converted) {
    // 分离 multilingual 和非 multilingual 模型
    const multilingualModels = item.model_list.filter(m => m.includes('multilingual'));
    const otherModels = item.model_list.filter(m => !m.includes('multilingual'));
    
    // 如果有非 multilingual 模型，添加一条数据（只包含非 multilingual 模型）
    if (otherModels.length > 0) {
      result.push({
        ...item,
        model_list: otherModels
      });
    }
    
    // 如果有 multilingual 模型，添加一条数据（名称加后缀，只包含 multilingual 模型）
    if (multilingualModels.length > 0) {
      result.push({
        ...item,
        name: `${item.name} - multilingual`,
        model_list: multilingualModels
      });
    }
    
    // 如果模型列表为空，仍然添加原始数据（空模型列表）
    if (item.model_list.length === 0) {
      result.push(item);
    }
  }
  
  return result;
};

/**
 * 解析JSON文本（支持单个对象或数组）
 */
export const parseJsonInput = (jsonText: string): ElevenLabsVoice[] => {
  try {
    const parsed = JSON.parse(jsonText);
    
    // 如果是包含voices数组的对象
    if (parsed.voices && Array.isArray(parsed.voices)) {
      return parsed.voices;
    }
    
    // 如果是数组
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // 如果是单个对象
    if (typeof parsed === 'object' && parsed.voice_id) {
      return [parsed];
    }
    
    throw new Error('不支持的JSON格式');
  } catch (error) {
    throw new Error(`JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

/**
 * 将转换后的参数导出为JSON文件内容
 */
export const generateJsonOutput = (params: VendorEleven11LabsParams[]): string => {
  return JSON.stringify(params, null, 2);
};

/**
 * 下载JSON文件
 */
export const downloadJsonFile = (content: string, filename: string = 'vendor-11labs-params.json'): void => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
