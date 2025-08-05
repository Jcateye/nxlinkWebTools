/**
 * 计费规则计算工具
 */

// 计费规则类型
export interface BillingRule {
  firstPeriod: number;  // 第一个计费周期（秒）
  followingPeriod: number;  // 后续计费周期（秒）
}

/**
 * 根据计费规则计算计费量
 * @param callDurationSec 通话时长（秒）
 * @param rule 计费规则
 * @returns 计费量
 */
export const calculateBillingQuantity = (callDurationSec: number, rule: BillingRule): number => {
  if (callDurationSec <= 0) {
    return 0;
  }
  
  if (callDurationSec <= rule.firstPeriod) {
    return 1;
  }
  
  // 第一个周期计费1次，剩余时长按后续周期计费
  const remainingDuration = callDurationSec - rule.firstPeriod;
  const additionalQuantity = Math.ceil(remainingDuration / rule.followingPeriod);
  
  return 1 + additionalQuantity;
};

/**
 * 解析计费规则字符串（如 "60+60"）
 * @param ruleString 计费规则字符串
 * @returns 计费规则对象
 */
export const parseBillingRule = (ruleString: string): BillingRule => {
  const parts = ruleString.split('+');
  if (parts.length !== 2) {
    // 默认规则
    return { firstPeriod: 60, followingPeriod: 60 };
  }
  
  const firstPeriod = parseInt(parts[0], 10);
  const followingPeriod = parseInt(parts[1], 10);
  
  if (isNaN(firstPeriod) || isNaN(followingPeriod)) {
    // 默认规则
    return { firstPeriod: 60, followingPeriod: 60 };
  }
  
  return { firstPeriod, followingPeriod };
};

/**
 * 计算原线路单价
 * @param originalConsumption 原线路消费
 * @param originalBillingQuantity 原线路计费量
 * @returns 原线路单价
 */
export const calculateOriginalLineUnitPrice = (
  originalConsumption: number, 
  originalBillingQuantity: number
): number => {
  if (originalBillingQuantity <= 0) {
    return 0;
  }
  return originalConsumption / originalBillingQuantity;
};

/**
 * 计算新线路相关数据
 * @param callDurationSec 通话时长（秒）
 * @param originalConsumption 原线路消费
 * @param originalBillingQuantity 原线路计费量
 * @param customLineUnitPrice 自定义线路单价（可选）
 * @returns 新线路相关计算结果
 */
export const calculateNewLineBilling = (
  callDurationSec: number,
  originalConsumption: number,
  originalBillingQuantity: number,
  customLineUnitPrice?: number | null
) => {
  // 新线路计费周期固定为 20+20
  const newLineBillingCycle = "20+20";
  const newLineRule = { firstPeriod: 20, followingPeriod: 20 };
  
  // 计算原线路单价
  const originalLineUnitPrice = calculateOriginalLineUnitPrice(originalConsumption, originalBillingQuantity);
  
  // 计算新线路单价（原线路单价的1/3）
  const newLineUnitPrice = originalLineUnitPrice / 3;
  
  // 计算新线路计费量
  const newLineBillingQuantity = calculateBillingQuantity(callDurationSec, newLineRule);
  
  // 计算新线路消费
  // 如果有自定义线路单价，使用自定义单价，否则使用计算出的新线路单价
  const actualUnitPrice = customLineUnitPrice !== null && customLineUnitPrice !== undefined 
    ? customLineUnitPrice 
    : newLineUnitPrice;
  const newLineConsumption = actualUnitPrice * newLineBillingQuantity;
  
  return {
    originalLineUnitPrice,
    newLineBillingCycle,
    newLineUnitPrice,
    newLineBillingQuantity,
    newLineConsumption,
    isUsingCustomPrice: customLineUnitPrice !== null && customLineUnitPrice !== undefined,
    actualUnitPrice
  };
};