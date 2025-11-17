/**
 * JSON处理工具函数
 */

/**
 * 深度合并两个对象
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * 检查值是否为对象
 * @param value 要检查的值
 * @returns 是否为对象
 */
function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 解析JSON字符串，如果失败返回默认值
 * @param jsonString JSON字符串
 * @param defaultValue 默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    if (!jsonString || jsonString.trim() === '') {
      return defaultValue;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
}

/**
 * 将对象转换为格式化的JSON字符串
 * @param obj 要转换的对象
 * @returns 格式化的JSON字符串
 */
export function formatJsonString(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    console.warn('JSON序列化失败:', error);
    return '';
  }
}

/**
 * 更新JSON对象的特定路径
 * @param originalJson 原始JSON字符串
 * @param updates 要更新的key-value对
 * @returns 更新后的JSON字符串
 */
export function updateJsonByKeys(originalJson: string, updates: Record<string, any>): string {
  try {
    const originalObj = safeJsonParse(originalJson, {});
    const updatedObj = deepMerge(originalObj, updates);
    return formatJsonString(updatedObj);
  } catch (error) {
    console.error('更新JSON失败:', error);
    return originalJson; // 返回原始值
  }
}

/**
 * 验证JSON字符串格式
 * @param jsonString 要验证的JSON字符串
 * @returns 是否为有效的JSON
 */
export function isValidJson(jsonString: string): boolean {
  try {
    if (!jsonString || jsonString.trim() === '') {
      return false;
    }
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * 从JSON字符串中提取所有顶层key
 * @param jsonString JSON字符串
 * @returns key数组
 */
export function extractJsonKeys(jsonString: string): string[] {
  try {
    const obj = safeJsonParse(jsonString, {});
    return Object.keys(obj);
  } catch {
    return [];
  }
}
