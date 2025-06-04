import axios from 'axios';
import { TTSProvider } from '../types/scriptTest';

// TTS服务配置接口
interface TTSConfig {
  volcanoApiKey?: string;
  volcanoApiSecret?: string;
  volcanoSpeakerId?: string;
  elevenLabsApiKey?: string;
}

// 全局配置
let config: TTSConfig = {
  // 预填火山引擎信息
  volcanoApiKey: '6N_dp6vXe6-bZmUGvbcGhH8duvWud62v',
  volcanoApiSecret: 'sPO3USCYmUr5-no7eihSCv_WDxPYd_6_',
  volcanoSpeakerId: 'S_7RQrrs3n1'
};

/**
 * 设置TTS服务配置
 * @param newConfig 新的配置
 */
export function setTTSConfig(newConfig: TTSConfig) {
  config = { ...config, ...newConfig };
}

/**
 * 获取TTS服务配置
 * @returns 当前配置
 */
export function getTTSConfig(): TTSConfig {
  return { ...config };
}

/**
 * 使用火山引擎生成TTS
 * @param text 文本内容
 * @returns 音频URL
 */
export async function generateVolcanoTTS(text: string): Promise<string> {
  try {
    // 调用火山引擎TTS API
    const response = await axios.post('/api/tts/volcano', {
      text,
      apiKey: config.volcanoApiKey,
      apiSecret: config.volcanoApiSecret,
      speakerId: config.volcanoSpeakerId
    });
    
    return response.data.audioUrl;
  } catch (error) {
    console.error('火山引擎TTS生成失败:', error);
    throw new Error('火山引擎TTS生成失败');
  }
}

/**
 * 使用11labs生成TTS
 * @param text 文本内容
 * @returns 音频URL
 */
export async function generateElevenLabsTTS(text: string): Promise<string> {
  try {
    // 调用11labs API
    const response = await axios.post('/api/tts/elevenlabs', {
      text,
      apiKey: config.elevenLabsApiKey
    });
    
    return response.data.audioUrl;
  } catch (error) {
    console.error('11labs TTS生成失败:', error);
    throw new Error('11labs TTS生成失败');
  }
}

/**
 * 根据提供商生成TTS
 * @param text 文本内容
 * @param provider TTS提供商
 * @returns 音频URL
 */
export async function generateTTS(text: string, provider: TTSProvider): Promise<string> {
  switch (provider) {
    case TTSProvider.VOLCANO:
      return generateVolcanoTTS(text);
    case TTSProvider.ELEVENLABS:
      return generateElevenLabsTTS(text);
    default:
      throw new Error('不支持的TTS提供商');
  }
} 