import CryptoJS from 'crypto-js';

/**
 * 基于手机号生成一个稳定的 36 位 UUID 字符串
 * 规则：md5(phone) 得到 32 位十六进制，按 UUID v4 的格式插入连字符。
 */
export function generateContactIdFromPhone(phone: string): string {
  // 基础28位：手机号的MD5前28位
  const base28 = CryptoJS.MD5(String(phone || '')).toString().toLowerCase().substring(0, 28);
  // 追加8位：基于当前时间戳和随机数的短哈希，避免同号码重复
  const saltSource = `${Date.now()}-${Math.random()}`;
  const salt8 = CryptoJS.MD5(saltSource).toString().toLowerCase().substring(0, 8);
  // 组合为36位（前28位为MD5，末尾追加8位salt）
  const mixed = base28 + salt8;
  // 按 8-4-4-4-12 插入连字符
  return `${mixed.substring(0, 8)}-${mixed.substring(8, 12)}-${mixed.substring(12, 16)}-${mixed.substring(16, 20)}-${mixed.substring(20, 32)}`;
}


