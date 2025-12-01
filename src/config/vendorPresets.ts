/**
 * AI Agent 成本模拟 - 供应商预设配置
 * 
 * 包含常见的 ASR/TTS/LLM 供应商定价和参数
 * 数据来源：实际供应商报价单
 */

import { VendorConfig, ScenarioPreset } from '../utils/costCalculator';

// 重新导出 ScenarioPreset 供其他模块使用
export type { ScenarioPreset };

// ============ 单独供应商定价参数 ============

/** ASR 供应商定价 - 基于实际报价 */
export interface ASRVendorConfig {
  name: string;
  pricePerMin: number;       // $/分钟
  pricePerCycle: number;     // $/成本周期
  billingCycle: string;      // 计费周期说明
  billingStep: number;       // 计费步长（秒）
  description?: string;      // 补充说明
  remark?: string;           // 备注
}

export const ASR_VENDORS: Record<string, ASRVendorConfig> = {
  'google-standard-nolog': {
    name: 'Google-Standard(NoLog)',
    pricePerMin: 0.016,
    pricePerCycle: 0.000267,
    billingCycle: '1+1',
    billingStep: 1,
    description: '语言支持广泛，速度快于微软，综合效果较好',
    remark: '速度快于微软，综合效果较好',
  },
  'azure-standard': {
    name: 'Azure-Standard',
    pricePerMin: 0.0167,
    pricePerCycle: 0.000278,
    billingCycle: '1+1',
    billingStep: 1,
    description: '支持的语种最为广泛，且支持各类小语种',
    remark: '支持的语种最为广泛，但速度过慢',
  },
  'deepgram-nova2': {
    name: 'Deepgram-NovaV2',
    pricePerMin: 0.0058,
    pricePerCycle: 0.0000967,
    billingCycle: '1+1',
    billingStep: 1,
    description: '支持约30种语言，性价比高',
    remark: '还有更高级版本0.0165刀',
  },
  'aliyun-asr': {
    name: '阿里云',
    pricePerMin: 0.018,
    pricePerCycle: 0.0003,
    billingCycle: '1+1',
    billingStep: 1,
    description: '有中英文多语言识别能力',
    remark: '价格待确认',
  },
  'self-indonesia': {
    name: '自研（印尼）',
    pricePerMin: 0,
    pricePerCycle: 0,
    billingCycle: '1+1',
    billingStep: 1,
    description: '自研印尼语ASR',
  },
  'fano': {
    name: 'fano(有光)',
    pricePerMin: 0.0146,
    pricePerCycle: 0.0002433,
    billingCycle: '1+1',
    billingStep: 1,
  },
  'myvocal-asr': {
    name: 'My Vocal',
    pricePerMin: 0.0133,
    pricePerCycle: 0.0002222,
    billingCycle: '1+1',
    billingStep: 1,
  },
  'cloudsway-gpt4o-transcribe': {
    name: 'Cloudsway-GPT-4o-transcribe',
    pricePerMin: 0.006,
    pricePerCycle: 0.0001,
    billingCycle: '1+1',
    billingStep: 1,
  },
  'cloudsway-gpt4o-mini-transcribe': {
    name: 'Cloudsway-GPT-4o-mini-transcribe',
    pricePerMin: 0.003,
    pricePerCycle: 0.00005,
    billingCycle: '1+1',
    billingStep: 1,
  },
  '11labs-asr-business': {
    name: '11Labs ASR-Business',
    pricePerMin: 0.00367,
    pricePerCycle: 0.0000611,
    billingCycle: '1+1',
    billingStep: 1,
  },
  '11labs-asr-business-1.2x': {
    name: '11Labs ASR-Business_1.2x',
    pricePerMin: 0.0044,
    pricePerCycle: 0.0000733,
    billingCycle: '1+1',
    billingStep: 1,
  },
};

/** TTS 供应商定价 - 基于实际报价 */
export interface TTSVendorConfig {
  name: string;
  pricePerSpeakMin: number;  // $/说话分钟
  pricePerCycle: number;     // $/成本周期
  billingCycleChars: number; // 成本周期(M characters)
  pricePer1kChar: number;    // 换算后的每1k字符价格
  vendorCharRatio: number;   // 字符映射系数
  charPerSec: number;        // 语速（字符/秒）- 基准12.8 token/s
  billingStep: number;       // 计费步长
  description?: string;
  remark?: string;
}

// 基准：每秒12.8 token，1M约1260分钟
const BASE_CHAR_PER_SEC = 12.8;

export const TTS_VENDORS: Record<string, TTSVendorConfig> = {
  'google-standard': {
    name: 'Google（iota）-标准',
    pricePerSpeakMin: 0.0032,
    pricePerCycle: 4,
    billingCycleChars: 1,
    pricePer1kChar: 0.004,  // $4/1M = $0.004/1K
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
    description: 'Google V2 标准版',
  },
  'google-wavenet': {
    name: 'Google（iota）-WaveNet',
    pricePerSpeakMin: 0.0127,
    pricePerCycle: 16,
    billingCycleChars: 1,
    pricePer1kChar: 0.016,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
    description: 'Google V2 WaveNet',
  },
  'google-neural2': {
    name: 'Google（iota）-Neural2',
    pricePerSpeakMin: 0.0127,
    pricePerCycle: 16,
    billingCycleChars: 1,
    pricePer1kChar: 0.016,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
    description: 'Google V2 Neural2',
  },
  'google-polyglot': {
    name: 'Google（iota）-Polyglot',
    pricePerSpeakMin: 0.0127,
    pricePerCycle: 16,
    billingCycleChars: 1,
    pricePer1kChar: 0.016,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
    description: 'Google V2 Polyglot 多语言',
  },
  'google-studio': {
    name: 'Google（iota）-Studio',
    pricePerSpeakMin: 0.127,
    pricePerCycle: 160,
    billingCycleChars: 1,
    pricePer1kChar: 0.16,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
    description: 'Google V2 Studio 高品质',
  },
  'azure-neural': {
    name: 'Azure(upsilon)-Neural',
    pricePerSpeakMin: 0.0119,
    pricePerCycle: 15,
    billingCycleChars: 1,
    pricePer1kChar: 0.015,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
    description: 'Azure Pay-as-you-go Neural',
  },
  'aliyun-tts': {
    name: '阿里云（eta）',
    pricePerSpeakMin: 0.0214,
    pricePerCycle: 27,
    billingCycleChars: 1,
    pricePer1kChar: 0.027,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'cartesia': {
    name: 'Cartesia（zeta）',
    pricePerSpeakMin: 0.0302,
    pricePerCycle: 304,
    billingCycleChars: 8,
    pricePer1kChar: 0.038,  // $304/8M = $38/1M = $0.038/1K
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
    description: '8M约173小时音频',
  },
  '11labs-flash-business': {
    name: '11Labs-Flash/Turbo-Business',
    pricePerSpeakMin: 0.1044,
    pricePerCycle: 1320,
    billingCycleChars: 11,
    pricePer1kChar: 0.12,  // $1320/11M = $120/1M = $0.12/1K
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
    description: '11M约22000min, 366小时',
  },
  '11labs-flash-tier0': {
    name: '11Labs-Flash/Turbo-Tier0',
    pricePerSpeakMin: 0.0435,
    pricePerCycle: 550,
    billingCycleChars: 11,
    pricePer1kChar: 0.05,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-multilingual-tier0': {
    name: '11Labs-Multilingual-Tier0',
    pricePerSpeakMin: 0.087,
    pricePerCycle: 1100,
    billingCycleChars: 11,
    pricePer1kChar: 0.1,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-flash-tier0-4x': {
    name: '11Labs-Flash/Turbo-Tier0-4xRate',
    pricePerSpeakMin: 0.174,
    pricePerCycle: 2200,
    billingCycleChars: 11,
    pricePer1kChar: 0.2,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-highest-tier0-4x': {
    name: '11Labs-Highest-Tier0-4xRate',
    pricePerSpeakMin: 0.348,
    pricePerCycle: 4400,
    billingCycleChars: 11,
    pricePer1kChar: 0.4,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-flash-tier0-2x': {
    name: '11Labs-Flash/Turbo-Tier0-2xRate',
    pricePerSpeakMin: 0.087,
    pricePerCycle: 1100,
    billingCycleChars: 11,
    pricePer1kChar: 0.1,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-highest-tier0-2x': {
    name: '11Labs-Highest-Tier0-2xRate',
    pricePerSpeakMin: 0.174,
    pricePerCycle: 2200,
    billingCycleChars: 11,
    pricePer1kChar: 0.2,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-flash-tierb': {
    name: '11Labs-Flash/Turbo-TierB',
    pricePerSpeakMin: 0.0253,
    pricePerCycle: 29.07,
    billingCycleChars: 1,
    pricePer1kChar: 0.029,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
    description: '订阅$1650',
  },
  '11labs-highest-tierb': {
    name: '11Labs-Highest-TierB',
    pricePerSpeakMin: 0.0506,
    pricePerCycle: 58.14,
    billingCycleChars: 1,
    pricePer1kChar: 0.058,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-flash-tierb-3x': {
    name: '11Labs-Flash/Turbo-TierB-3xRate',
    pricePerSpeakMin: 0.0759,
    pricePerCycle: 87.21,
    billingCycleChars: 1,
    pricePer1kChar: 0.087,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-highest-tierb-3x': {
    name: '11Labs-Highest-TierB-3xRate',
    pricePerSpeakMin: 0.1517,
    pricePerCycle: 174.42,
    billingCycleChars: 1,
    pricePer1kChar: 0.174,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-flash-tierb-2x': {
    name: '11Labs-Flash/Turbo-TierB-2xRate',
    pricePerSpeakMin: 0.0506,
    pricePerCycle: 58.14,
    billingCycleChars: 1,
    pricePer1kChar: 0.058,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  '11labs-highest-tierb-2x': {
    name: '11Labs-Highest-TierB-2xRate',
    pricePerSpeakMin: 0.1012,
    pricePerCycle: 116.28,
    billingCycleChars: 1,
    pricePer1kChar: 0.116,
    vendorCharRatio: 0.872,
    charPerSec: 14.5,
    billingStep: 1,
  },
  'myvocal-turbo-l1-0-100m': {
    name: 'My Vocal-Turbo-L1(0-100M)',
    pricePerSpeakMin: 0.0157,
    pricePerCycle: 18,
    billingCycleChars: 1,
    pricePer1kChar: 0.018,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-turbo-l1-100-300m': {
    name: 'My Vocal-Turbo-L1(100-300M)',
    pricePerSpeakMin: 0.0139,
    pricePerCycle: 16,
    billingCycleChars: 1,
    pricePer1kChar: 0.016,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-turbo-l1-300m+': {
    name: 'My Vocal-Turbo-L1(300M+)',
    pricePerSpeakMin: 0.0104,
    pricePerCycle: 12,
    billingCycleChars: 1,
    pricePer1kChar: 0.012,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-v2-l1-0-100m': {
    name: 'My Vocal-V2-L1(0-100M)',
    pricePerSpeakMin: 0.0348,
    pricePerCycle: 40,
    billingCycleChars: 1,
    pricePer1kChar: 0.04,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-v2-l1-100-300m': {
    name: 'My Vocal-V2-L1(100-300M)',
    pricePerSpeakMin: 0.0261,
    pricePerCycle: 30,
    billingCycleChars: 1,
    pricePer1kChar: 0.03,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-v2-l1-300m+': {
    name: 'My Vocal-V2-L1(300M+)',
    pricePerSpeakMin: 0.0218,
    pricePerCycle: 25,
    billingCycleChars: 1,
    pricePer1kChar: 0.025,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-v3-l1-0-100m': {
    name: 'My Vocal-V3-L1(0-100M)',
    pricePerSpeakMin: 0.0392,
    pricePerCycle: 45,
    billingCycleChars: 1,
    pricePer1kChar: 0.045,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-v3-l1-100-300m': {
    name: 'My Vocal-V3-L1(100-300M)',
    pricePerSpeakMin: 0.0348,
    pricePerCycle: 40,
    billingCycleChars: 1,
    pricePer1kChar: 0.04,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
  'myvocal-v3-l1-300m+': {
    name: 'My Vocal-V3-L1(300M+)',
    pricePerSpeakMin: 0.0305,
    pricePerCycle: 35,
    billingCycleChars: 1,
    pricePer1kChar: 0.035,
    vendorCharRatio: 1.0,
    charPerSec: BASE_CHAR_PER_SEC,
    billingStep: 1,
  },
};

/** LLM 模型定价 - 基于实际报价 */
export interface LLMModelConfig {
  name: string;
  inputPricePer1M: number;    // 输入价格 $/M tokens
  outputPricePer1M: number;   // 输出价格 $/M tokens
  combinedPricePer1K: number; // (8.5:1.5)综合成本 $/K tokens
  inputPricePer1k: number;    // 换算后的输入 $/1K
  outputPricePer1k: number;   // 换算后的输出 $/1K
  reasonPricePer1k: number;   // reasoning token价格
  sysPromptTokens: number;    // 系统提示词token数
  contextTokens: number;      // 上下文token数
  toolTokens: number;         // 工具调用token数
  charsPerToken: number;      // 每token字符数
  description?: string;
}

export const LLM_MODELS: Record<string, LLMModelConfig> = {
  'gpt4o-mini-0718': {
    name: 'GPT4o-MINI-0718',
    inputPricePer1M: 0.165,
    outputPricePer1M: 0.66,
    combinedPricePer1K: 0.00023925,
    inputPricePer1k: 0.000165,
    outputPricePer1k: 0.00066,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt4o-2024-1120': {
    name: 'GPT4o-2024-1120 全球',
    inputPricePer1M: 2.5,
    outputPricePer1M: 10,
    combinedPricePer1K: 0.003625,
    inputPricePer1k: 0.0025,
    outputPricePer1k: 0.01,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.4,
    combinedPricePer1K: 0.000145,
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    inputPricePer1M: 0.3,
    outputPricePer1M: 2.5,
    combinedPricePer1K: 0.00063,
    inputPricePer1k: 0.0003,
    outputPricePer1k: 0.0025,
    reasonPricePer1k: 0.00035,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'bytedance-seed-1.6': {
    name: 'ByteDance-Seed-1.6',
    inputPricePer1M: 0.3,
    outputPricePer1M: 1.2,
    combinedPricePer1K: 0.000435,
    inputPricePer1k: 0.0003,
    outputPricePer1k: 0.0012,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 2.0,
  },
  'bytedance-seed-1.6-flash': {
    name: 'ByteDance-Seed-1.6-flash',
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.3,
    combinedPricePer1K: 0.00010875,
    inputPricePer1k: 0.000075,
    outputPricePer1k: 0.0003,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 2.0,
  },
  'byteplus-skylark-pro': {
    name: 'BytePlus-Skylark-pro',
    inputPricePer1M: 0.3,
    outputPricePer1M: 2.5,
    combinedPricePer1K: 0.00063,
    inputPricePer1k: 0.0003,
    outputPricePer1k: 0.0025,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 2.0,
  },
  'byteplus-skylark-lite': {
    name: 'BytePlus-Skylark-lite',
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.4,
    combinedPricePer1K: 0.000145,
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 2.0,
  },
  'claude-opus-4.5': {
    name: 'anthropic/claude-opus-4.5',
    inputPricePer1M: 5,
    outputPricePer1M: 25,
    combinedPricePer1K: 0.008,
    inputPricePer1k: 0.005,
    outputPricePer1k: 0.025,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'grok-4.1-fast-free': {
    name: 'x-ai/grok-4.1-fast:free',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    combinedPricePer1K: 0,
    inputPricePer1k: 0,
    outputPricePer1k: 0,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gemini-3-pro-preview': {
    name: 'google/gemini-3-pro-preview',
    inputPricePer1M: 2,
    outputPricePer1M: 12,
    combinedPricePer1K: 0.0035,
    inputPricePer1k: 0.002,
    outputPricePer1k: 0.012,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-5.1': {
    name: 'openai/gpt-5.1',
    inputPricePer1M: 1.25,
    outputPricePer1M: 10,
    combinedPricePer1K: 0.0025625,
    inputPricePer1k: 0.00125,
    outputPricePer1k: 0.01,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-5-pro': {
    name: 'openai/gpt-5-pro',
    inputPricePer1M: 15,
    outputPricePer1M: 120,
    combinedPricePer1K: 0.03075,
    inputPricePer1k: 0.015,
    outputPricePer1k: 0.12,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'claude-sonnet-4.5': {
    name: 'anthropic/claude-sonnet-4.5',
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    combinedPricePer1K: 0.0048,
    inputPricePer1k: 0.003,
    outputPricePer1k: 0.015,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gemini-2.5-flash-preview-09-2025': {
    name: 'google/gemini-2.5-flash-preview-09-2025',
    inputPricePer1M: 0.3,
    outputPricePer1M: 2.5,
    combinedPricePer1K: 0.00063,
    inputPricePer1k: 0.0003,
    outputPricePer1k: 0.0025,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gemini-2.5-flash-lite-preview-09-2025': {
    name: 'google/gemini-2.5-flash-lite-preview-09-2025',
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.4,
    combinedPricePer1K: 0.000145,
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'grok-4-fast': {
    name: 'x-ai/grok-4-fast',
    inputPricePer1M: 0.2,
    outputPricePer1M: 0.5,
    combinedPricePer1K: 0.000245,
    inputPricePer1k: 0.0002,
    outputPricePer1k: 0.0005,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-5': {
    name: 'openai/gpt-5',
    inputPricePer1M: 1.25,
    outputPricePer1M: 10,
    combinedPricePer1K: 0.0025625,
    inputPricePer1k: 0.00125,
    outputPricePer1k: 0.01,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-5-mini': {
    name: 'openai/gpt-5-mini',
    inputPricePer1M: 0.25,
    outputPricePer1M: 2,
    combinedPricePer1K: 0.0005125,
    inputPricePer1k: 0.00025,
    outputPricePer1k: 0.002,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-5-nano': {
    name: 'openai/gpt-5-nano',
    inputPricePer1M: 0.05,
    outputPricePer1M: 0.4,
    combinedPricePer1K: 0.0001025,
    inputPricePer1k: 0.00005,
    outputPricePer1k: 0.0004,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-oss-120b': {
    name: 'openai/gpt-oss-120b',
    inputPricePer1M: 0.04,
    outputPricePer1M: 0.2,
    combinedPricePer1K: 0.000064,
    inputPricePer1k: 0.00004,
    outputPricePer1k: 0.0002,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-oss-20b': {
    name: 'openai/gpt-oss-20b',
    inputPricePer1M: 0.03,
    outputPricePer1M: 0.14,
    combinedPricePer1K: 0.0000465,
    inputPricePer1k: 0.00003,
    outputPricePer1k: 0.00014,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gemini-2.5-pro-preview-05-06': {
    name: 'google/gemini-2.5-pro-preview-05-06',
    inputPricePer1M: 1.25,
    outputPricePer1M: 10,
    combinedPricePer1K: 0.0025625,
    inputPricePer1k: 0.00125,
    outputPricePer1k: 0.01,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-4.1': {
    name: 'openai/gpt-4.1',
    inputPricePer1M: 2,
    outputPricePer1M: 8,
    combinedPricePer1K: 0.0029,
    inputPricePer1k: 0.002,
    outputPricePer1k: 0.008,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-4.1-mini': {
    name: 'openai/gpt-4.1-mini',
    inputPricePer1M: 0.4,
    outputPricePer1M: 1.6,
    combinedPricePer1K: 0.00058,
    inputPricePer1k: 0.0004,
    outputPricePer1k: 0.0016,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-4.1-nano': {
    name: 'openai/gpt-4.1-nano',
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.4,
    combinedPricePer1K: 0.000145,
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'claude-3.7-sonnet': {
    name: 'anthropic/claude-3.7-sonnet',
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    combinedPricePer1K: 0.0048,
    inputPricePer1k: 0.003,
    outputPricePer1k: 0.015,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'chatgpt-4o-latest': {
    name: 'openai/chatgpt-4o-latest',
    inputPricePer1M: 5,
    outputPricePer1M: 15,
    combinedPricePer1K: 0.0065,
    inputPricePer1k: 0.005,
    outputPricePer1k: 0.015,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
  'gpt-4o': {
    name: 'openai/gpt-4o',
    inputPricePer1M: 2.5,
    outputPricePer1M: 10,
    combinedPricePer1K: 0.003625,
    inputPricePer1k: 0.0025,
    outputPricePer1k: 0.01,
    reasonPricePer1k: 0,
    sysPromptTokens: 500,
    contextTokens: 200,
    toolTokens: 100,
    charsPerToken: 3.5,
  },
};

/** 线路定价（按目的地） */
export interface TelecomRateConfig {
  name: string;
  pricePerMin: number;
  billingStep: number;
  description?: string;
}

export const TELECOM_RATES: Record<string, TelecomRateConfig> = {
  'us-local': {
    name: '美国本地',
    pricePerMin: 0.01,
    billingStep: 60,
  },
  'us-toll-free': {
    name: '美国免费号',
    pricePerMin: 0.02,
    billingStep: 60,
  },
  'cn-local': {
    name: '中国大陆',
    pricePerMin: 0.02,
    billingStep: 60,
  },
  'hk-local': {
    name: '香港',
    pricePerMin: 0.015,
    billingStep: 60,
  },
  'eu-local': {
    name: '欧洲本地',
    pricePerMin: 0.02,
    billingStep: 60,
  },
  'sea-local': {
    name: '东南亚',
    pricePerMin: 0.025,
    billingStep: 60,
  },
  'custom': {
    name: '自定义',
    pricePerMin: 0.01,
    billingStep: 60,
  },
};

// ============ 预设供应商组合 ============

export const VENDOR_BUNDLES: VendorConfig[] = [
  // 极致经济型 - Deepgram + Google标准 + GPT-5-nano
  {
    id: 'ultra-budget',
    name: '极致经济型 (Deepgram + Google标准 + GPT-5-nano)',
    description: '最低成本组合，适合简单场景',
    telPricePerMin: 0.01,
    telBillingStep: 60,
    asrPricePerMin: ASR_VENDORS['deepgram-nova2'].pricePerMin,
    asrBillingStep: ASR_VENDORS['deepgram-nova2'].billingStep,
    asrVendor: ASR_VENDORS['deepgram-nova2'].name,
    ttsPricePer1kChar: TTS_VENDORS['google-standard'].pricePer1kChar,
    ttsVendorCharRatio: TTS_VENDORS['google-standard'].vendorCharRatio,
    ttsCharPerSec: TTS_VENDORS['google-standard'].charPerSec,
    ttsBillingStep: TTS_VENDORS['google-standard'].billingStep,
    ttsVendor: TTS_VENDORS['google-standard'].name,
    llmInputPricePer1k: LLM_MODELS['gpt-5-nano'].inputPricePer1k,
    llmOutputPricePer1k: LLM_MODELS['gpt-5-nano'].outputPricePer1k,
    llmReasonPricePer1k: LLM_MODELS['gpt-5-nano'].reasonPricePer1k,
    llmSysPromptTokens: LLM_MODELS['gpt-5-nano'].sysPromptTokens,
    llmContextTokens: LLM_MODELS['gpt-5-nano'].contextTokens,
    llmToolTokens: LLM_MODELS['gpt-5-nano'].toolTokens,
    llmCharsPerToken: LLM_MODELS['gpt-5-nano'].charsPerToken,
    llmModel: LLM_MODELS['gpt-5-nano'].name,
    fixedCostPerCall: 0,
  },
  // 经济型 - Deepgram + Cartesia + Gemini Flash Lite
  {
    id: 'budget-gemini',
    name: '经济型 (Deepgram + Cartesia + Gemini Flash Lite)',
    description: '性价比最优组合',
    telPricePerMin: 0.01,
    telBillingStep: 60,
    asrPricePerMin: ASR_VENDORS['deepgram-nova2'].pricePerMin,
    asrBillingStep: ASR_VENDORS['deepgram-nova2'].billingStep,
    asrVendor: ASR_VENDORS['deepgram-nova2'].name,
    ttsPricePer1kChar: TTS_VENDORS['cartesia'].pricePer1kChar,
    ttsVendorCharRatio: TTS_VENDORS['cartesia'].vendorCharRatio,
    ttsCharPerSec: TTS_VENDORS['cartesia'].charPerSec,
    ttsBillingStep: TTS_VENDORS['cartesia'].billingStep,
    ttsVendor: TTS_VENDORS['cartesia'].name,
    llmInputPricePer1k: LLM_MODELS['gemini-2.5-flash-lite'].inputPricePer1k,
    llmOutputPricePer1k: LLM_MODELS['gemini-2.5-flash-lite'].outputPricePer1k,
    llmReasonPricePer1k: LLM_MODELS['gemini-2.5-flash-lite'].reasonPricePer1k,
    llmSysPromptTokens: LLM_MODELS['gemini-2.5-flash-lite'].sysPromptTokens,
    llmContextTokens: LLM_MODELS['gemini-2.5-flash-lite'].contextTokens,
    llmToolTokens: LLM_MODELS['gemini-2.5-flash-lite'].toolTokens,
    llmCharsPerToken: LLM_MODELS['gemini-2.5-flash-lite'].charsPerToken,
    llmModel: LLM_MODELS['gemini-2.5-flash-lite'].name,
    fixedCostPerCall: 0,
  },
  // 均衡型 - Google ASR + Cartesia + GPT-4o-mini
  {
    id: 'balanced-gpt4mini',
    name: '均衡型 (Google ASR + Cartesia + GPT-4o-mini)',
    description: '性能与成本的平衡，适合大多数场景',
    telPricePerMin: 0.01,
    telBillingStep: 60,
    asrPricePerMin: ASR_VENDORS['google-standard-nolog'].pricePerMin,
    asrBillingStep: ASR_VENDORS['google-standard-nolog'].billingStep,
    asrVendor: ASR_VENDORS['google-standard-nolog'].name,
    ttsPricePer1kChar: TTS_VENDORS['cartesia'].pricePer1kChar,
    ttsVendorCharRatio: TTS_VENDORS['cartesia'].vendorCharRatio,
    ttsCharPerSec: TTS_VENDORS['cartesia'].charPerSec,
    ttsBillingStep: TTS_VENDORS['cartesia'].billingStep,
    ttsVendor: TTS_VENDORS['cartesia'].name,
    llmInputPricePer1k: LLM_MODELS['gpt4o-mini-0718'].inputPricePer1k,
    llmOutputPricePer1k: LLM_MODELS['gpt4o-mini-0718'].outputPricePer1k,
    llmReasonPricePer1k: LLM_MODELS['gpt4o-mini-0718'].reasonPricePer1k,
    llmSysPromptTokens: LLM_MODELS['gpt4o-mini-0718'].sysPromptTokens,
    llmContextTokens: LLM_MODELS['gpt4o-mini-0718'].contextTokens,
    llmToolTokens: LLM_MODELS['gpt4o-mini-0718'].toolTokens,
    llmCharsPerToken: LLM_MODELS['gpt4o-mini-0718'].charsPerToken,
    llmModel: LLM_MODELS['gpt4o-mini-0718'].name,
    fixedCostPerCall: 0,
  },
  // 高质量型 - Google ASR + 11Labs TierB + GPT-4o
  {
    id: 'premium-11labs',
    name: '高质量 (Google ASR + 11Labs-TierB + GPT-4o)',
    description: '高品质语音和智能，适合高端场景',
    telPricePerMin: 0.01,
    telBillingStep: 60,
    asrPricePerMin: ASR_VENDORS['google-standard-nolog'].pricePerMin,
    asrBillingStep: ASR_VENDORS['google-standard-nolog'].billingStep,
    asrVendor: ASR_VENDORS['google-standard-nolog'].name,
    ttsPricePer1kChar: TTS_VENDORS['11labs-flash-tierb'].pricePer1kChar,
    ttsVendorCharRatio: TTS_VENDORS['11labs-flash-tierb'].vendorCharRatio,
    ttsCharPerSec: TTS_VENDORS['11labs-flash-tierb'].charPerSec,
    ttsBillingStep: TTS_VENDORS['11labs-flash-tierb'].billingStep,
    ttsVendor: TTS_VENDORS['11labs-flash-tierb'].name,
    llmInputPricePer1k: LLM_MODELS['gpt4o-2024-1120'].inputPricePer1k,
    llmOutputPricePer1k: LLM_MODELS['gpt4o-2024-1120'].outputPricePer1k,
    llmReasonPricePer1k: LLM_MODELS['gpt4o-2024-1120'].reasonPricePer1k,
    llmSysPromptTokens: LLM_MODELS['gpt4o-2024-1120'].sysPromptTokens,
    llmContextTokens: LLM_MODELS['gpt4o-2024-1120'].contextTokens,
    llmToolTokens: LLM_MODELS['gpt4o-2024-1120'].toolTokens,
    llmCharsPerToken: LLM_MODELS['gpt4o-2024-1120'].charsPerToken,
    llmModel: LLM_MODELS['gpt4o-2024-1120'].name,
    fixedCostPerCall: 0,
  },
  // 字节跳动组合
  {
    id: 'bytedance-flash',
    name: '字节跳动组合 (Seed-1.6-flash)',
    description: '使用字节跳动模型，中文场景优化',
    telPricePerMin: 0.01,
    telBillingStep: 60,
    asrPricePerMin: ASR_VENDORS['deepgram-nova2'].pricePerMin,
    asrBillingStep: ASR_VENDORS['deepgram-nova2'].billingStep,
    asrVendor: ASR_VENDORS['deepgram-nova2'].name,
    ttsPricePer1kChar: TTS_VENDORS['cartesia'].pricePer1kChar,
    ttsVendorCharRatio: TTS_VENDORS['cartesia'].vendorCharRatio,
    ttsCharPerSec: TTS_VENDORS['cartesia'].charPerSec,
    ttsBillingStep: TTS_VENDORS['cartesia'].billingStep,
    ttsVendor: TTS_VENDORS['cartesia'].name,
    llmInputPricePer1k: LLM_MODELS['bytedance-seed-1.6-flash'].inputPricePer1k,
    llmOutputPricePer1k: LLM_MODELS['bytedance-seed-1.6-flash'].outputPricePer1k,
    llmReasonPricePer1k: LLM_MODELS['bytedance-seed-1.6-flash'].reasonPricePer1k,
    llmSysPromptTokens: LLM_MODELS['bytedance-seed-1.6-flash'].sysPromptTokens,
    llmContextTokens: LLM_MODELS['bytedance-seed-1.6-flash'].contextTokens,
    llmToolTokens: LLM_MODELS['bytedance-seed-1.6-flash'].toolTokens,
    llmCharsPerToken: LLM_MODELS['bytedance-seed-1.6-flash'].charsPerToken,
    llmModel: LLM_MODELS['bytedance-seed-1.6-flash'].name,
    fixedCostPerCall: 0,
  },
  // Claude组合
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 组合',
    description: '使用Claude 3.7 Sonnet，高质量对话',
    telPricePerMin: 0.01,
    telBillingStep: 60,
    asrPricePerMin: ASR_VENDORS['google-standard-nolog'].pricePerMin,
    asrBillingStep: ASR_VENDORS['google-standard-nolog'].billingStep,
    asrVendor: ASR_VENDORS['google-standard-nolog'].name,
    ttsPricePer1kChar: TTS_VENDORS['azure-neural'].pricePer1kChar,
    ttsVendorCharRatio: TTS_VENDORS['azure-neural'].vendorCharRatio,
    ttsCharPerSec: TTS_VENDORS['azure-neural'].charPerSec,
    ttsBillingStep: TTS_VENDORS['azure-neural'].billingStep,
    ttsVendor: TTS_VENDORS['azure-neural'].name,
    llmInputPricePer1k: LLM_MODELS['claude-3.7-sonnet'].inputPricePer1k,
    llmOutputPricePer1k: LLM_MODELS['claude-3.7-sonnet'].outputPricePer1k,
    llmReasonPricePer1k: LLM_MODELS['claude-3.7-sonnet'].reasonPricePer1k,
    llmSysPromptTokens: LLM_MODELS['claude-3.7-sonnet'].sysPromptTokens,
    llmContextTokens: LLM_MODELS['claude-3.7-sonnet'].contextTokens,
    llmToolTokens: LLM_MODELS['claude-3.7-sonnet'].toolTokens,
    llmCharsPerToken: LLM_MODELS['claude-3.7-sonnet'].charsPerToken,
    llmModel: LLM_MODELS['claude-3.7-sonnet'].name,
    fixedCostPerCall: 0,
  },
];

// ============ 场景预设 ============

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'voicemail',
    name: '留言信箱',
    description: '用户留言，机器人简短回复',
    T: 30,
    r_b: 0.2,
    r_u: 0.6,
    q: 0.2,
    ttsCacheHitRate: 0.5,   // 欢迎语等固定内容可缓存
    vadAccuracy: 0.95,      // 留言场景VAD略有漏检
    weight: 15,
  },
  {
    id: 'short-hangup',
    name: '短挂断',
    description: '用户快速挂断，几乎无对话',
    T: 10,
    r_b: 0.3,
    r_u: 0.1,
    q: 0.1,
    ttsCacheHitRate: 0.8,   // 开场白高度标准化
    vadAccuracy: 0.9,       // 短通话VAD可能不稳定
    weight: 20,
  },
  {
    id: 'one-way-broadcast',
    name: '单向播报',
    description: '机器人单向播报信息',
    T: 45,
    r_b: 0.7,
    r_u: 0.1,
    q: 0.2,
    ttsCacheHitRate: 0.6,   // 播报内容部分可缓存
    vadAccuracy: 1.0,       // 用户说话少，VAD影响小
    weight: 25,
  },
  {
    id: 'simple-qa',
    name: '简单问答',
    description: '简单的一问一答场景',
    T: 60,
    r_b: 0.4,
    r_u: 0.4,
    q: 0.3,
    ttsCacheHitRate: 0.3,   // 问答内容较动态
    vadAccuracy: 1.0,       // 正常VAD
    weight: 20,
  },
  {
    id: 'deep-conversation',
    name: '深度沟通',
    description: '复杂对话，多轮交互',
    T: 180,
    r_b: 0.35,
    r_u: 0.45,
    q: 0.7,
    ttsCacheHitRate: 0.1,   // 深度对话内容高度动态
    vadAccuracy: 1.05,      // 长对话可能有少量误触发
    weight: 15,
  },
  {
    id: 'customer-service',
    name: '客服咨询',
    description: '典型客服场景，中等复杂度',
    T: 120,
    r_b: 0.4,
    r_u: 0.35,
    q: 0.5,
    ttsCacheHitRate: 0.4,   // 常见问题回复可缓存
    vadAccuracy: 1.0,       // 正常VAD
    weight: 5,
  },
  {
    id: 'basic-marketing',
    name: '初级营销',
    description: '简单外呼营销，机器人主导播报，用户响应少',
    T: 30,
    r_b: 0.7,
    r_u: 0.06,
    q: 0,
    ttsCacheHitRate: 0.66,  // 营销话术高度标准化，缓存命中率高
    vadAccuracy: 0.9,       // 短通话VAD可能漏检部分用户响应
    weight: 10,
  },
];

// ============ 辅助函数 ============

/**
 * 根据选择的供应商ID构建VendorConfig
 */
export const buildVendorConfig = (
  asrId: string,
  ttsId: string,
  llmId: string,
  telecomId: string,
  fixedCost: number = 0
): VendorConfig => {
  const allVendors = getAllVendors();
  const asr = allVendors.asr[asrId] || ASR_VENDORS['google-standard-nolog'];
  const tts = allVendors.tts[ttsId] || TTS_VENDORS['cartesia'];
  const llm = allVendors.llm[llmId] || LLM_MODELS['gpt4o-mini-0718'];
  const telecom = allVendors.telecom[telecomId] || TELECOM_RATES['us-local'];
  
  return {
    id: `custom-${asrId}-${ttsId}-${llmId}`,
    name: `自定义 (${asr.name} + ${tts.name} + ${llm.name})`,
    description: '自定义供应商组合',
    telPricePerMin: telecom.pricePerMin,
    telBillingStep: telecom.billingStep,
    asrPricePerMin: asr.pricePerMin,
    asrBillingStep: asr.billingStep,
    asrVendor: asr.name,
    ttsPricePer1kChar: tts.pricePer1kChar,
    ttsVendorCharRatio: tts.vendorCharRatio,
    ttsCharPerSec: tts.charPerSec,
    ttsBillingStep: tts.billingStep,
    ttsVendor: tts.name,
    llmInputPricePer1k: llm.inputPricePer1k,
    llmOutputPricePer1k: llm.outputPricePer1k,
    llmReasonPricePer1k: llm.reasonPricePer1k,
    llmSysPromptTokens: llm.sysPromptTokens,
    llmContextTokens: llm.contextTokens,
    llmToolTokens: llm.toolTokens,
    llmCharsPerToken: llm.charsPerToken,
    llmModel: llm.name,
    fixedCostPerCall: fixedCost,
  };
};

/**
 * 获取所有供应商选项（用于下拉框）
 */
export const getVendorOptions = () => ({
  asr: Object.entries(ASR_VENDORS).map(([id, v]) => ({ 
    value: id, 
    label: v.name,
    price: v.pricePerMin,
    description: v.description,
  })),
  tts: Object.entries(TTS_VENDORS).map(([id, v]) => ({ 
    value: id, 
    label: v.name,
    price: v.pricePerSpeakMin,
    description: v.description,
  })),
  llm: Object.entries(LLM_MODELS).map(([id, v]) => ({ 
    value: id, 
    label: v.name,
    price: v.combinedPricePer1K,
    description: v.description,
  })),
  telecom: Object.entries(TELECOM_RATES).map(([id, v]) => ({ 
    value: id, 
    label: v.name,
    price: v.pricePerMin,
    description: v.description,
  })),
  bundles: VENDOR_BUNDLES.map(b => ({ value: b.id, label: b.name, description: b.description })),
});

// ============ 自定义供应商管理 ============

const CUSTOM_VENDORS_STORAGE_KEY = 'ai_cost_simulator_custom_vendors';

export interface CustomVendorStorage {
  asr: Record<string, ASRVendorConfig>;
  tts: Record<string, TTSVendorConfig>;
  llm: Record<string, LLMModelConfig>;
  telecom: Record<string, TelecomRateConfig>;
}

/**
 * 从 localStorage 加载自定义供应商配置
 */
export const loadCustomVendors = (): CustomVendorStorage => {
  try {
    const stored = localStorage.getItem(CUSTOM_VENDORS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('加载自定义供应商配置失败:', e);
  }
  return { asr: {}, tts: {}, llm: {}, telecom: {} };
};

/**
 * 保存自定义供应商配置到 localStorage
 */
export const saveCustomVendors = (vendors: CustomVendorStorage): void => {
  try {
    localStorage.setItem(CUSTOM_VENDORS_STORAGE_KEY, JSON.stringify(vendors));
  } catch (e) {
    console.error('保存自定义供应商配置失败:', e);
  }
};

/**
 * 添加自定义 ASR 供应商
 */
export const addCustomASRVendor = (id: string, config: ASRVendorConfig): void => {
  const customs = loadCustomVendors();
  customs.asr[id] = config;
  saveCustomVendors(customs);
};

/**
 * 添加自定义 TTS 供应商
 */
export const addCustomTTSVendor = (id: string, config: TTSVendorConfig): void => {
  const customs = loadCustomVendors();
  customs.tts[id] = config;
  saveCustomVendors(customs);
};

/**
 * 添加自定义 LLM 模型
 */
export const addCustomLLMModel = (id: string, config: LLMModelConfig): void => {
  const customs = loadCustomVendors();
  customs.llm[id] = config;
  saveCustomVendors(customs);
};

/**
 * 删除自定义供应商
 */
export const removeCustomVendor = (type: 'asr' | 'tts' | 'llm' | 'telecom', id: string): void => {
  const customs = loadCustomVendors();
  delete customs[type][id];
  saveCustomVendors(customs);
};

/**
 * 获取合并后的所有供应商（内置 + 自定义）
 */
export const getAllVendors = () => {
  const customs = loadCustomVendors();
  return {
    asr: { ...ASR_VENDORS, ...customs.asr },
    tts: { ...TTS_VENDORS, ...customs.tts },
    llm: { ...LLM_MODELS, ...customs.llm },
    telecom: { ...TELECOM_RATES, ...customs.telecom },
  };
};

/**
 * 获取合并后的所有供应商选项（用于下拉框）
 */
export const getAllVendorOptions = () => {
  const all = getAllVendors();
  const allBundles = getAllBundles();
  return {
    asr: Object.entries(all.asr).map(([id, v]) => ({ 
      value: id, 
      label: v.name,
      price: v.pricePerMin,
      description: v.description,
      isCustom: !ASR_VENDORS[id],
    })),
    tts: Object.entries(all.tts).map(([id, v]) => ({ 
      value: id, 
      label: v.name,
      price: v.pricePerSpeakMin,
      description: v.description,
      isCustom: !TTS_VENDORS[id],
    })),
    llm: Object.entries(all.llm).map(([id, v]) => ({ 
      value: id, 
      label: v.name,
      price: v.combinedPricePer1K,
      description: v.description,
      isCustom: !LLM_MODELS[id],
    })),
    telecom: Object.entries(all.telecom).map(([id, v]) => ({ 
      value: id, 
      label: v.name,
      price: v.pricePerMin,
      description: v.description,
      isCustom: !TELECOM_RATES[id],
    })),
    bundles: allBundles.map(b => ({ 
      value: b.id, 
      label: b.name, 
      description: b.description,
      isCustom: !VENDOR_BUNDLES.find(vb => vb.id === b.id),
    })),
  };
};

// ============ 自定义预设组合管理 ============

const CUSTOM_BUNDLES_STORAGE_KEY = 'ai_cost_simulator_custom_bundles';

export interface CustomBundleStorage {
  bundles: Record<string, VendorConfig>;
}

/**
 * 从 localStorage 加载自定义预设组合
 */
export const loadCustomBundles = (): CustomBundleStorage => {
  try {
    const stored = localStorage.getItem(CUSTOM_BUNDLES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('加载自定义预设组合失败:', e);
  }
  return { bundles: {} };
};

/**
 * 保存自定义预设组合到 localStorage
 */
export const saveCustomBundles = (storage: CustomBundleStorage): void => {
  try {
    localStorage.setItem(CUSTOM_BUNDLES_STORAGE_KEY, JSON.stringify(storage));
  } catch (e) {
    console.error('保存自定义预设组合失败:', e);
  }
};

/**
 * 添加自定义预设组合
 */
export const addCustomBundle = (id: string, config: VendorConfig): void => {
  const storage = loadCustomBundles();
  storage.bundles[id] = config;
  saveCustomBundles(storage);
};

/**
 * 删除自定义预设组合
 */
export const removeCustomBundle = (id: string): void => {
  const storage = loadCustomBundles();
  delete storage.bundles[id];
  saveCustomBundles(storage);
};

/**
 * 获取所有预设组合（内置 + 自定义）
 */
export const getAllBundles = (): VendorConfig[] => {
  const customs = loadCustomBundles();
  return [...VENDOR_BUNDLES, ...Object.values(customs.bundles)];
};

/**
 * 根据ID获取预设组合
 */
export const getBundleById = (id: string): VendorConfig | undefined => {
  const allBundles = getAllBundles();
  return allBundles.find(b => b.id === id);
};

/**
 * 检查是否为自定义预设组合
 */
export const isCustomBundle = (id: string): boolean => {
  return !VENDOR_BUNDLES.find(b => b.id === id);
};

// ============ 供应商组合覆盖存储 ============

const BUNDLE_OVERRIDES_STORAGE_KEY = 'ai_cost_simulator_bundle_overrides';

export interface BundleOverrides {
  // 存储对内置组合的修改（名称等）
  overrides: Record<string, Partial<VendorConfig>>;
  // 存储被删除的内置组合ID
  deleted: string[];
}

/**
 * 加载供应商组合覆盖配置
 */
export const loadBundleOverrides = (): BundleOverrides => {
  try {
    const stored = localStorage.getItem(BUNDLE_OVERRIDES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load bundle overrides:', e);
  }
  return { overrides: {}, deleted: [] };
};

/**
 * 保存供应商组合覆盖配置
 */
export const saveBundleOverrides = (data: BundleOverrides): void => {
  try {
    localStorage.setItem(BUNDLE_OVERRIDES_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save bundle overrides:', e);
  }
};

/**
 * 获取合并后的供应商组合列表（内置覆盖 + 自定义）
 */
export const getMergedBundles = (): VendorConfig[] => {
  const overrides = loadBundleOverrides();
  const customs = loadCustomBundles();
  
  // 过滤掉被删除的内置组合，并应用覆盖
  const builtInBundles = VENDOR_BUNDLES
    .filter(b => !overrides.deleted.includes(b.id))
    .map(b => ({
      ...b,
      ...overrides.overrides[b.id],
    }));
  
  // 合并自定义组合
  return [...builtInBundles, ...Object.values(customs.bundles)];
};

/**
 * 更新供应商组合（修改名称等）
 */
export const updateBundlePreset = (id: string, updates: Partial<VendorConfig>): void => {
  // 检查是否是自定义组合
  if (isCustomBundle(id)) {
    // 更新自定义组合
    const customs = loadCustomBundles();
    if (customs.bundles[id]) {
      customs.bundles[id] = { ...customs.bundles[id], ...updates };
      saveCustomBundles(customs);
    }
  } else {
    // 更新内置组合的覆盖
    const overrides = loadBundleOverrides();
    overrides.overrides[id] = { ...overrides.overrides[id], ...updates };
    saveBundleOverrides(overrides);
  }
};

/**
 * 删除供应商组合预设
 */
export const deleteBundlePreset = (id: string): void => {
  if (isCustomBundle(id)) {
    // 删除自定义组合
    removeCustomBundle(id);
  } else {
    // 标记内置组合为已删除
    const overrides = loadBundleOverrides();
    if (!overrides.deleted.includes(id)) {
      overrides.deleted.push(id);
    }
    // 同时删除覆盖
    delete overrides.overrides[id];
    saveBundleOverrides(overrides);
  }
};

/**
 * 重置所有供应商组合预设到默认状态
 */
export const resetBundlePresets = (): void => {
  localStorage.removeItem(BUNDLE_OVERRIDES_STORAGE_KEY);
  localStorage.removeItem(CUSTOM_BUNDLES_STORAGE_KEY);
};

/**
 * 检查组合是否有覆盖（被修改过）
 */
export const hasBundleOverride = (id: string): boolean => {
  const overrides = loadBundleOverrides();
  return !!overrides.overrides[id];
};

/**
 * 导出当前供应商组合配置为代码格式
 */
export const exportBundlesAsCode = (): string => {
  const bundles = getMergedBundles();
  const code = bundles.map(b => `  {
    id: '${b.id}',
    name: '${b.name}',
    description: '${b.description}',
    telPricePerMin: ${b.telPricePerMin},
    telBillingStep: ${b.telBillingStep},
    asrPricePerMin: ${b.asrPricePerMin},
    asrBillingStep: ${b.asrBillingStep},
    asrVendor: '${b.asrVendor}',
    ttsPricePer1kChar: ${b.ttsPricePer1kChar},
    ttsVendorCharRatio: ${b.ttsVendorCharRatio},
    ttsCharPerSec: ${b.ttsCharPerSec},
    ttsBillingStep: ${b.ttsBillingStep},
    ttsVendor: '${b.ttsVendor}',
    llmInputPricePer1k: ${b.llmInputPricePer1k},
    llmOutputPricePer1k: ${b.llmOutputPricePer1k},
    llmReasonPricePer1k: ${b.llmReasonPricePer1k},
    llmSysPromptTokens: ${b.llmSysPromptTokens},
    llmContextTokens: ${b.llmContextTokens},
    llmToolTokens: ${b.llmToolTokens},
    llmCharsPerToken: ${b.llmCharsPerToken},
    llmModel: '${b.llmModel}',
    fixedCostPerCall: ${b.fixedCostPerCall},
  }`).join(',\n');
  
  return `export const VENDOR_BUNDLES: VendorConfig[] = [\n${code},\n];`;
};

// ============ 场景预设自定义存储 ============

const CUSTOM_SCENARIOS_STORAGE_KEY = 'ai_cost_simulator_custom_scenarios';

export interface ScenarioOverrides {
  // 存储对内置场景的修改（权重、名称等）
  overrides: Record<string, Partial<ScenarioPreset>>;
  // 存储被删除的内置场景ID
  deleted: string[];
  // 存储新增的自定义场景
  custom: ScenarioPreset[];
}

/**
 * 加载场景预设自定义配置
 */
export const loadScenarioOverrides = (): ScenarioOverrides => {
  try {
    const stored = localStorage.getItem(CUSTOM_SCENARIOS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load scenario overrides:', e);
  }
  return { overrides: {}, deleted: [], custom: [] };
};

/**
 * 保存场景预设自定义配置
 */
export const saveScenarioOverrides = (data: ScenarioOverrides): void => {
  try {
    localStorage.setItem(CUSTOM_SCENARIOS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save scenario overrides:', e);
  }
};

/**
 * 获取合并后的场景预设列表（内置 + 覆盖 + 自定义）
 */
export const getMergedScenarioPresets = (): ScenarioPreset[] => {
  const overrides = loadScenarioOverrides();
  
  // 过滤掉被删除的内置场景，并应用覆盖
  const builtInScenarios = SCENARIO_PRESETS
    .filter(s => !overrides.deleted.includes(s.id))
    .map(s => ({
      ...s,
      ...overrides.overrides[s.id],
    }));
  
  // 合并自定义场景
  return [...builtInScenarios, ...overrides.custom];
};

/**
 * 更新场景预设（修改权重、名称等）
 */
export const updateScenarioPreset = (id: string, updates: Partial<ScenarioPreset>): void => {
  const overrides = loadScenarioOverrides();
  
  // 检查是否是自定义场景
  const customIndex = overrides.custom.findIndex(s => s.id === id);
  if (customIndex >= 0) {
    // 更新自定义场景
    overrides.custom[customIndex] = { ...overrides.custom[customIndex], ...updates };
  } else {
    // 更新内置场景的覆盖
    overrides.overrides[id] = { ...overrides.overrides[id], ...updates };
  }
  
  saveScenarioOverrides(overrides);
};

/**
 * 删除场景预设
 */
export const deleteScenarioPreset = (id: string): void => {
  const overrides = loadScenarioOverrides();
  
  // 检查是否是自定义场景
  const customIndex = overrides.custom.findIndex(s => s.id === id);
  if (customIndex >= 0) {
    // 删除自定义场景
    overrides.custom.splice(customIndex, 1);
  } else {
    // 标记内置场景为已删除
    if (!overrides.deleted.includes(id)) {
      overrides.deleted.push(id);
    }
    // 同时删除覆盖
    delete overrides.overrides[id];
  }
  
  saveScenarioOverrides(overrides);
};

/**
 * 添加自定义场景预设
 */
export const addCustomScenario = (scenario: ScenarioPreset): void => {
  const overrides = loadScenarioOverrides();
  overrides.custom.push(scenario);
  saveScenarioOverrides(overrides);
};

/**
 * 重置所有场景预设到默认状态
 */
export const resetScenarioPresets = (): void => {
  localStorage.removeItem(CUSTOM_SCENARIOS_STORAGE_KEY);
};

/**
 * 检查场景是否为自定义场景
 */
export const isCustomScenario = (id: string): boolean => {
  const overrides = loadScenarioOverrides();
  return overrides.custom.some(s => s.id === id);
};

/**
 * 检查场景是否有覆盖（被修改过）
 */
export const hasScenarioOverride = (id: string): boolean => {
  const overrides = loadScenarioOverrides();
  return !!overrides.overrides[id];
};

/**
 * 导出当前场景配置为代码格式（用于手动更新源码）
 */
export const exportScenariosAsCode = (): string => {
  const scenarios = getMergedScenarioPresets();
  const code = scenarios.map(s => `  {
    id: '${s.id}',
    name: '${s.name}',
    description: '${s.description}',
    T: ${s.T},
    r_b: ${s.r_b},
    r_u: ${s.r_u},
    q: ${s.q},
    ttsCacheHitRate: ${s.ttsCacheHitRate},
    vadAccuracy: ${s.vadAccuracy},
    weight: ${s.weight},
  }`).join(',\n');
  
  return `export const SCENARIO_PRESETS: ScenarioPreset[] = [\n${code},\n];`;
};
