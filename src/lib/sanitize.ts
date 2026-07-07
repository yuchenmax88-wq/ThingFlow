// EXPORTS: sanitizeSensitiveFields, SENSITIVE_FIELD_PATTERNS
// 敏感字段自动脱敏工具

const SENSITIVE_FIELD_PATTERNS: RegExp[] = [
  /password/i,
  /wifiPassword/i,
  /wifi_password/i,
  /apiKey/i,
  /api_key/i,
  /^token$/i,
  /^secret$/i,
  /secretKey/i,
  /secret_key/i,
  /privateKey/i,
  /private_key/i,
  /authToken/i,
  /auth_token/i,
  /accessKey/i,
  /access_key/i,
];

/**
 * 递归遍历对象，将敏感字段的值替换为 [HIDDEN]
 * 不修改原对象，返回深拷贝后的脱敏对象
 */
export function sanitizeSensitiveFields<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeSensitiveFields(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive && typeof value === 'string') {
      result[key] = '[HIDDEN]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
