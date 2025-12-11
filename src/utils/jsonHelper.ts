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
 * 尝试修复常见的 JSON 格式错误
 * @param jsonString 可能有错误的 JSON 字符串
 * @returns 修复后的 JSON 字符串
 */
export function repairJsonString(jsonString: string): string {
  if (!jsonString || jsonString.trim() === '') {
    return jsonString;
  }

  let repaired = jsonString;

  // 1. 修复数组中缺少闭合双引号的字符串值
  // 例如: ["value] -> ["value"]
  // 匹配: [ 或 , 后面跟着 "xxx 但没有闭合引号（后面直接是 ] 或 ,）
  repaired = repaired.replace(/(\[|,)\s*"([^"]*?)(\]|,)/g, (match, prefix, value, suffix) => {
    // 检查是否是未闭合的字符串
    return `${prefix}"${value}"${suffix}`;
  });

  // 2. 修复数组中缺少开始双引号的字符串值
  // 例如: [value"] -> ["value"]
  repaired = repaired.replace(/(\[|,)\s*([^"\[\]{},\s][^"\[\]{},]*?)"\s*(\]|,)/g, (match, prefix, value, suffix) => {
    return `${prefix}"${value}"${suffix}`;
  });

  // 3. 修复对象值中缺少闭合双引号
  // 例如: "key": "value} -> "key": "value"}
  repaired = repaired.replace(/:\s*"([^"]*?)(}|,)/g, (match, value, suffix) => {
    // 如果值后面没有闭合引号
    if (!match.includes('""')) {
      return `:"${value}"${suffix}`;
    }
    return match;
  });

  // 4. 修复数组元素之间缺少逗号的情况
  // 例如: ["a" "b"] -> ["a", "b"]
  repaired = repaired.replace(/"\s+"/g, '", "');

  // 5. 修复多余的逗号（数组或对象末尾）
  // 例如: [1, 2, ] -> [1, 2]
  repaired = repaired.replace(/,\s*([\]}])/g, '$1');

  // 6. 修复中文引号
  repaired = repaired.replace(/[""]/g, '"');
  repaired = repaired.replace(/['']/g, "'");

  return repaired;
}

/**
 * 解析JSON字符串，如果失败尝试修复后再解析，最后返回默认值
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
    // 解析失败，尝试修复后再解析
    console.warn('JSON解析失败，尝试修复:', error);
    try {
      const repaired = repairJsonString(jsonString);
      return JSON.parse(repaired);
    } catch (repairError) {
      console.warn('JSON修复后仍然解析失败:', repairError);
      return defaultValue;
    }
  }
}

/**
 * 将对象转换为格式化的JSON字符串（用于显示，带换行和缩进）
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
 * 将对象转换为紧凑的JSON字符串（用于存储，无换行和缩进）
 * @param obj 要转换的对象
 * @returns 紧凑的JSON字符串
 */
export function compactJsonString(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON序列化失败:', error);
    return '';
  }
}

/**
 * 将JSON字符串压缩为单行（移除换行和多余空格），并尝试修复常见错误
 * @param jsonString JSON字符串
 * @returns 压缩后的JSON字符串
 */
export function compactifyJsonString(jsonString: string): string {
  try {
    if (!jsonString || jsonString.trim() === '') {
      return jsonString;
    }
    // 先尝试直接解析
    const obj = JSON.parse(jsonString);
    return JSON.stringify(obj);
  } catch (error) {
    // 解析失败，尝试修复后再解析
    console.warn('JSON解析失败，尝试修复:', error);
    try {
      const repaired = repairJsonString(jsonString);
      const obj = JSON.parse(repaired);
      console.log('JSON修复成功');
      return JSON.stringify(obj);
    } catch (repairError) {
      // 修复也失败，返回原始字符串
      console.error('JSON修复失败，返回原始字符串:', repairError);
      return jsonString;
    }
  }
}

/**
 * 更新JSON对象的特定路径
 * @param originalJson 原始JSON字符串
 * @param updates 要更新的key-value对
 * @returns 更新后的JSON字符串（紧凑格式，无换行）
 */
export function updateJsonByKeys(originalJson: string, updates: Record<string, any>): string {
  try {
    const originalObj = safeJsonParse(originalJson, {});
    const updatedObj = deepMerge(originalObj, updates);
    return compactJsonString(updatedObj);
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
