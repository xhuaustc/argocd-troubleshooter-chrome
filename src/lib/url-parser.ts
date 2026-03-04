export interface ArgoAppInfo {
  baseUrl: string
  namespace: string | null
  appName: string
}

export function parseArgoAppUrl(url: string): ArgoAppInfo | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.replace(/\/$/, '') // strip trailing slash

    // Match /applications/{namespace}/{name}
    const namespacedMatch = pathname.match(/^(.*?)\/applications\/([^/]+)\/([^/]+)$/)
    if (namespacedMatch) {
      const prefix = namespacedMatch[1]
      return {
        baseUrl: `${urlObj.origin}${prefix}`,
        namespace: namespacedMatch[2],
        appName: namespacedMatch[3],
      }
    }

    // Match /applications/{name} (legacy, no namespace)
    const legacyMatch = pathname.match(/^(.*?)\/applications\/([^/]+)$/)
    if (legacyMatch) {
      const prefix = legacyMatch[1]
      return {
        baseUrl: `${urlObj.origin}${prefix}`,
        namespace: null,
        appName: legacyMatch[2],
      }
    }

    return null
  } catch {
    return null
  }
}
