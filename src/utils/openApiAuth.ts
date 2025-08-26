import CryptoJS from 'crypto-js';

export type HashAlgorithm = 'md5' | 'sha256';

export interface OpenApiAuthHeadersBase {
  accessKey: string;
  ts: string; // 毫秒时间戳字符串
  bizType: string; // 业务类型
  action: string; // 接口方法名
}

export interface SignOptions {
  algorithm?: HashAlgorithm; // 默认 md5
}

/**
 * 生成开放平台签名
 * 规则：hex(md5(headersStr + bodyStr + accessSecretStr))
 * headersStr: 按 ASCII 升序 key=val 用 & 连接（需包含 accessKey、action、bizType、ts，不含 sign）
 * bodyStr: 可选，若 body JSON 串非空，则追加 &body=...（需与实际请求体完全一致）
 * accessSecretStr: &accessSecret=YOUR_ACCESS_SECRET
 */
export function generateOpenApiSign(
  headers: OpenApiAuthHeadersBase,
  bodyJsonString: string,
  accessSecret: string,
  options: SignOptions = {}
): string {
  const { algorithm = 'md5' } = options;
  const base = `accessKey=${headers.accessKey}&action=${headers.action}&bizType=${headers.bizType}&ts=${headers.ts}`;
  const withBody = bodyJsonString && bodyJsonString.length > 0 ? `${base}&body=${bodyJsonString}` : base;
  const raw = `${withBody}&accessSecret=${accessSecret}`;

  if (algorithm === 'sha256') {
    return CryptoJS.SHA256(raw).toString(CryptoJS.enc.Hex);
  }
  return CryptoJS.MD5(raw).toString(CryptoJS.enc.Hex);
}

export interface BuildHeadersParams extends OpenApiAuthHeadersBase {
  accessSecret: string;
  algorithm?: HashAlgorithm;
}

/**
 * 构建开放平台标准请求头，自动生成 sign
 */
export function buildOpenApiHeaders(
  params: BuildHeadersParams,
  body: any
): Record<string, string> {
  const bodyString = body ? JSON.stringify(body) : '';
  const sign = generateOpenApiSign(
    {
      accessKey: params.accessKey,
      action: params.action,
      bizType: params.bizType,
      ts: params.ts,
    },
    bodyString,
    params.accessSecret,
    { algorithm: params.algorithm || 'md5' }
  );
  return {
    accessKey: params.accessKey,
    bizType: params.bizType,
    action: params.action,
    ts: params.ts,
    sign,
    'Content-Type': 'application/json',
  };
}

/**
 * 获取当前毫秒时间戳字符串
 */
export function nowTs(): string {
  return Date.now().toString();
}


