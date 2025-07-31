/**
 * DJB Hash 算法工具类
 * 将 Java 版本的 DJBHashUtil 转换为 TypeScript 实现
 */

/**
 * 计算字符串的 DJB Hash 值
 * @param hash 初始哈希值
 * @param str 输入的字符串
 * @param length 字符串的长度
 * @returns 计算出的 Hash 值
 */
export function djbHash(hash: number, str: string, length: number): string {
  for (let i = 0; i < length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) + hash) + c; // hash * 33 + c
  }

  // 将 hash 转为绝对值，避免负数
  let hashString = String(Math.abs(hash));

  // 如果长度不足 11 位，补充格式
  if (hashString.length < 11) {
    let sb = '';
    sb += '1'; // 补充首位
    for (let i = 1; i < 11 - hashString.length; i++) {
      sb += '0'; // 补充中间的 0
    }
    sb += hashString; // 拼接原始 hash 值
    hashString = sb;
  }

  return hashString;
}

/**
 * 计算字符串的 DJB Hash 值（使用默认参数）
 * @param str 输入的字符串
 * @returns 计算出的 Hash 值
 */
export function getDefaultDjbHash(str: string | null | undefined): string {
  // 处理空值情况
  if (!str) {
    return '10000000000'; // 返回默认值
  }
  return djbHash(8564, str, str.length);
} 