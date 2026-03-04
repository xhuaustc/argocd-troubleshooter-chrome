const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /auth/i,
  /connection[_-]?string/i,
]

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

export function redactSensitiveValues(obj: unknown): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveValues(item))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key) && typeof value === 'string') {
      result[key] = '[REDACTED]'
    } else {
      result[key] = redactSensitiveValues(value)
    }
  }
  return result
}

export function redactResourceList(resources: any[]): any[] {
  return resources.map((resource) => {
    if (resource.kind === 'Secret') {
      return {
        ...resource,
        data: '[REDACTED - Secret data removed]',
        stringData: undefined,
      }
    }
    return redactSensitiveValues(resource)
  })
}
