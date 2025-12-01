/**
 * AI Agent 成本计算器
 * 
 * 核心公式：
 * C_total = C_tel + C_ASR + C_TTS + C_LLM + C_fixed
 * 
 * 变量说明：
 * - T: 通话总时长（秒）
 * - r_b: 机器人说话占比（0-1），TTS播报占整个通话的比例
 * - r_u: 用户说话占比（0-1），ASR听用户占整个通话的比例
 * - q: 对话复杂度系数（0-1），越复杂LLM token越多
 * - ttsCacheHitRate: TTS缓存命中率（0-1），命中的内容直接播放缓存，不调用TTS接口
 * - vadAccuracy: VAD准确率（0.8-1.2），<1表示漏识别，>1表示多识别误触发
 */

// ============ 类型定义 ============

/** 供应商配置参数 */
export interface VendorConfig {
  id: string;
  name: string;
  description?: string;
  
  // 线路/通信参数
  telPricePerMin: number;      // p_tel_min: 线路费用，每分钟单价 (USD)
  telBillingStep: number;       // b_tel: 线路计费步长（秒），如60秒
  
  // ASR参数
  asrPricePerMin: number;       // p_asr_min: ASR每分钟单价 (USD)
  asrBillingStep: number;       // b_asr: ASR计费步长（秒），如15秒
  asrVendor: string;            // ASR供应商名称
  
  // TTS参数
  ttsPricePer1kChar: number;    // p_tts_char: TTS每1000字符单价 (USD)
  ttsVendorCharRatio: number;   // k_vendor: 系统字符到厂商计费字符的映射系数
  ttsCharPerSec: number;        // v_char/s: 平均语速（字符/秒）
  ttsBillingStep: number;       // b_tts_char: TTS计费字符步长
  ttsVendor: string;            // TTS供应商名称
  
  // LLM参数
  llmInputPricePer1k: number;   // p_in: 输入token单价 ($/1k token)
  llmOutputPricePer1k: number;  // p_out: 输出token单价
  llmReasonPricePer1k: number;  // p_reason: reasoning token单价
  llmSysPromptTokens: number;   // τ_sys: 每次调用的system prompt大小
  llmContextTokens: number;     // τ_ctx: 平均每次上下文/记忆token
  llmToolTokens: number;        // τ_tool: 平均每次工具调用token
  llmCharsPerToken: number;     // κ_tok: 每token对应字符数（中文1.5-2，英文3.5-4）
  llmModel: string;             // LLM模型名称
  
  // 固定开销
  fixedCostPerCall: number;     // C_0: 每通话固定成本 (USD)
}

/** 通话行为参数 */
export interface CallBehavior {
  T: number;              // 通话总时长（秒）
  r_b: number;            // 机器人说话占比（0-1）
  r_u: number;            // 用户说话占比（0-1）
  q: number;              // 复杂度系数（0-1）
  n_llm?: number;         // LLM调用次数（可选，默认根据时长估算）
  ttsCacheHitRate: number; // TTS缓存命中率（0-1），命中部分不调用TTS接口
  vadAccuracy: number;     // VAD准确率（0.8-1.2），影响实际送入ASR的时长
}

/** 成本计算结果 */
export interface CostBreakdown {
  total: number;      // 总成本
  tel: number;        // 线路成本
  asr: number;        // ASR成本
  tts: number;        // TTS成本
  llm: number;        // LLM成本
  fixed: number;      // 固定成本
  
  // 中间计算值（用于调试和展示）
  details: {
    T_b: number;              // 机器人说话秒数
    T_u: number;              // 用户说话秒数
    T_tel_eff: number;        // 有效计费时长（线路）
    T_u_eff: number;          // 有效计费时长（ASR）
    T_u_actual: number;       // 实际送入ASR的时长（考虑VAD准确率）
    charSelf: number;         // 系统字符数
    charVendor: number;       // 厂商计费字符数
    charVendorActual: number; // 实际调用TTS的字符数（考虑缓存命中）
    ttsCacheHitRate: number;  // TTS缓存命中率
    vadAccuracy: number;      // VAD准确率
    N_in: number;             // 输入token数
    N_out: number;            // 输出token数
    N_reason: number;         // reasoning token数
    n_llm: number;            // LLM调用次数
  };
}

/** 场景预设 */
export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  T: number;
  r_b: number;
  r_u: number;
  q: number;
  ttsCacheHitRate?: number;  // TTS缓存命中率（可选，默认0.3）
  vadAccuracy?: number;       // VAD准确率（可选，默认1.0）
  weight?: number;            // 加权占比（用于加权平均计算）
}

// ============ 辅助函数 ============

/**
 * 向上取整到计费步长
 * CEILING(value, step)
 */
const ceilToStep = (value: number, step: number): number => {
  if (step <= 0) return value;
  return Math.ceil(value / step) * step;
};

/**
 * 复杂度系数函数 - α(q): 机器人说话回流到输入的占比
 * 简单线性模型：0.3 + 0.5 * q
 */
const alphaQ = (q: number): number => 0.3 + 0.5 * q;

/**
 * 复杂度系数函数 - β(q): 输出内容膨胀系数
 * 简单线性模型：1.0 + 0.5 * q
 */
const betaQ = (q: number): number => 1.0 + 0.5 * q;

/**
 * 复杂度系数函数 - γ(q): reasoning token占比
 * 简单线性模型：0 + 0.3 * q（低复杂度不用reasoning）
 */
const gammaQ = (q: number): number => 0.3 * q;

/**
 * 估算LLM调用次数
 * 短通话3-5次，长通话10-15次
 */
const estimateLLMCalls = (T: number, q: number): number => {
  // 基础：每20秒一次调用
  const baseCalls = Math.max(3, Math.ceil(T / 20));
  // 复杂度加成
  const complexityBonus = Math.floor(q * 5);
  return Math.min(baseCalls + complexityBonus, 20);
};

// ============ 核心计算函数 ============

/**
 * 计算线路/通信成本 C_tel
 * 
 * 公式：
 * T_tel_eff = CEILING(T, b_tel)
 * C_tel = (T_tel_eff / 60) * p_tel_min
 */
export const computeTelCost = (
  T: number,
  config: Pick<VendorConfig, 'telPricePerMin' | 'telBillingStep'>
): { cost: number; T_tel_eff: number } => {
  const T_tel_eff = ceilToStep(T, config.telBillingStep);
  const cost = (T_tel_eff / 60) * config.telPricePerMin;
  return { cost, T_tel_eff };
};

/**
 * 计算ASR成本 C_ASR
 * 
 * 公式：
 * T_u = r_u * T                      // 理论用户说话时长
 * T_u_actual = T_u * vadAccuracy     // 实际送入ASR的时长（VAD影响）
 * T_u_eff = CEILING(T_u_actual, b_asr)
 * C_ASR = (T_u_eff / 60) * p_asr_min
 * 
 * VAD准确率说明：
 * - vadAccuracy < 1: VAD漏识别，部分用户语音没有送入ASR
 * - vadAccuracy = 1: VAD完美识别
 * - vadAccuracy > 1: VAD误触发，把环境噪音等也送入了ASR
 */
export const computeASRCost = (
  T: number,
  r_u: number,
  vadAccuracy: number,
  config: Pick<VendorConfig, 'asrPricePerMin' | 'asrBillingStep'>
): { cost: number; T_u: number; T_u_actual: number; T_u_eff: number } => {
  const T_u = r_u * T;
  const T_u_actual = T_u * vadAccuracy;  // 考虑VAD准确率
  const T_u_eff = ceilToStep(T_u_actual, config.asrBillingStep);
  const cost = (T_u_eff / 60) * config.asrPricePerMin;
  return { cost, T_u, T_u_actual, T_u_eff };
};

/**
 * 计算TTS成本 C_TTS
 * 
 * 公式：
 * T_b = r_b * T
 * char_self = T_b * v_char/s
 * char_vendor = k_vendor * char_self
 * char_vendor_actual = char_vendor * (1 - ttsCacheHitRate)  // 实际需调用TTS的字符
 * char_eff = CEILING(char_vendor_actual, b_tts_char)
 * C_TTS = (char_eff / 1000) * p_tts_char
 * 
 * TTS缓存命中率说明：
 * - 相同的TTS文本可以缓存音频，命中缓存时直接播放，不需要调用TTS接口
 * - ttsCacheHitRate = 0: 完全没有缓存，每次都调用TTS
 * - ttsCacheHitRate = 0.3: 30%的内容命中缓存（如固定话术）
 * - ttsCacheHitRate = 0.8: 80%命中缓存（高度标准化的场景）
 */
export const computeTTSCost = (
  T: number,
  r_b: number,
  ttsCacheHitRate: number,
  config: Pick<VendorConfig, 'ttsPricePer1kChar' | 'ttsVendorCharRatio' | 'ttsCharPerSec' | 'ttsBillingStep'>
): { cost: number; T_b: number; charSelf: number; charVendor: number; charVendorActual: number } => {
  const T_b = r_b * T;
  const charSelf = T_b * config.ttsCharPerSec;
  const charVendor = config.ttsVendorCharRatio * charSelf;
  const charVendorActual = charVendor * (1 - ttsCacheHitRate);  // 考虑缓存命中
  const charEff = ceilToStep(charVendorActual, config.ttsBillingStep);
  const cost = (charEff / 1000) * config.ttsPricePer1kChar;
  return { cost, T_b, charSelf, charVendor, charVendorActual };
};

/**
 * 计算LLM成本 C_LLM
 * 
 * 公式：
 * N_fix_in = n_llm * (τ_sys + τ_ctx + τ_tool)
 * char_u = T * r_u * v_char/s
 * char_b = T * r_b * v_char/s
 * N_content_in = (char_u + α(q) * char_b) / κ_tok
 * N_in = N_fix_in + N_content_in
 * N_out = β(q) * char_b / κ_tok
 * N_reason = γ(q) * N_in
 * C_LLM = (p_in/1000)*N_in + (p_out/1000)*N_out + (p_reason/1000)*N_reason
 */
export const computeLLMCost = (
  T: number,
  r_b: number,
  r_u: number,
  q: number,
  n_llm: number,
  config: Pick<VendorConfig, 
    'llmInputPricePer1k' | 'llmOutputPricePer1k' | 'llmReasonPricePer1k' |
    'llmSysPromptTokens' | 'llmContextTokens' | 'llmToolTokens' |
    'llmCharsPerToken' | 'ttsCharPerSec'
  >
): { cost: number; N_in: number; N_out: number; N_reason: number } => {
  // 固定输入token
  const N_fix_in = n_llm * (config.llmSysPromptTokens + config.llmContextTokens + config.llmToolTokens);
  
  // 内容相关字符
  const char_u = T * r_u * config.ttsCharPerSec;
  const char_b = T * r_b * config.ttsCharPerSec;
  
  // 内容部分输入token
  const N_content_in = (char_u + alphaQ(q) * char_b) / config.llmCharsPerToken;
  
  // 总输入token
  const N_in = N_fix_in + N_content_in;
  
  // 输出token
  const N_out = (betaQ(q) * char_b) / config.llmCharsPerToken;
  
  // reasoning token
  const N_reason = gammaQ(q) * N_in;
  
  // 计算成本
  const cost = 
    (config.llmInputPricePer1k / 1000) * N_in +
    (config.llmOutputPricePer1k / 1000) * N_out +
    (config.llmReasonPricePer1k / 1000) * N_reason;
  
  return { cost, N_in, N_out, N_reason };
};

/**
 * 计算单次通话的总成本
 * 
 * 总公式：
 * C_total = C_tel + C_ASR + C_TTS + C_LLM + C_fixed
 */
export const computeCost = (
  behavior: CallBehavior,
  config: VendorConfig
): CostBreakdown => {
  const { T, r_b, r_u, q, n_llm: customNLLM, ttsCacheHitRate, vadAccuracy } = behavior;
  
  // 估算LLM调用次数
  const n_llm = customNLLM ?? estimateLLMCalls(T, q);
  
  // 计算各组件成本（传入新参数）
  const telResult = computeTelCost(T, config);
  const asrResult = computeASRCost(T, r_u, vadAccuracy, config);
  const ttsResult = computeTTSCost(T, r_b, ttsCacheHitRate, config);
  const llmResult = computeLLMCost(T, r_b, r_u, q, n_llm, config);
  
  // 汇总
  const total = telResult.cost + asrResult.cost + ttsResult.cost + llmResult.cost + config.fixedCostPerCall;
  
  return {
    total,
    tel: telResult.cost,
    asr: asrResult.cost,
    tts: ttsResult.cost,
    llm: llmResult.cost,
    fixed: config.fixedCostPerCall,
    details: {
      T_b: ttsResult.T_b,
      T_u: asrResult.T_u,
      T_tel_eff: telResult.T_tel_eff,
      T_u_eff: asrResult.T_u_eff,
      T_u_actual: asrResult.T_u_actual,
      charSelf: ttsResult.charSelf,
      charVendor: ttsResult.charVendor,
      charVendorActual: ttsResult.charVendorActual,
      ttsCacheHitRate,
      vadAccuracy,
      N_in: llmResult.N_in,
      N_out: llmResult.N_out,
      N_reason: llmResult.N_reason,
      n_llm,
    },
  };
};

/**
 * 批量计算多个场景的加权平均成本
 */
export const computeWeightedAverageCost = (
  scenarios: ScenarioPreset[],
  config: VendorConfig
): { avgCost: CostBreakdown; scenarioCosts: Array<{ scenario: ScenarioPreset; cost: CostBreakdown }> } => {
  const scenarioCosts = scenarios.map(scenario => ({
    scenario,
    cost: computeCost(scenario, config),
  }));
  
  // 计算加权平均
  const totalWeight = scenarios.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  
  const avgCost: CostBreakdown = {
    total: 0,
    tel: 0,
    asr: 0,
    tts: 0,
    llm: 0,
    fixed: 0,
    details: {
      T_b: 0,
      T_u: 0,
      T_tel_eff: 0,
      T_u_eff: 0,
      charSelf: 0,
      charVendor: 0,
      N_in: 0,
      N_out: 0,
      N_reason: 0,
      n_llm: 0,
    },
  };
  
  scenarioCosts.forEach(({ scenario, cost }) => {
    const weight = (scenario.weight ?? 1) / totalWeight;
    avgCost.total += cost.total * weight;
    avgCost.tel += cost.tel * weight;
    avgCost.asr += cost.asr * weight;
    avgCost.tts += cost.tts * weight;
    avgCost.llm += cost.llm * weight;
    avgCost.fixed += cost.fixed * weight;
    avgCost.details.T_b += cost.details.T_b * weight;
    avgCost.details.T_u += cost.details.T_u * weight;
    avgCost.details.T_tel_eff += cost.details.T_tel_eff * weight;
    avgCost.details.T_u_eff += cost.details.T_u_eff * weight;
    avgCost.details.charSelf += cost.details.charSelf * weight;
    avgCost.details.charVendor += cost.details.charVendor * weight;
    avgCost.details.N_in += cost.details.N_in * weight;
    avgCost.details.N_out += cost.details.N_out * weight;
    avgCost.details.N_reason += cost.details.N_reason * weight;
    avgCost.details.n_llm += cost.details.n_llm * weight;
  });
  
  return { avgCost, scenarioCosts };
};

/**
 * 格式化货币显示
 */
export const formatCurrency = (value: number, decimals: number = 4): string => {
  return `$${value.toFixed(decimals)}`;
};

/**
 * 格式化百分比
 */
export const formatPercent = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

