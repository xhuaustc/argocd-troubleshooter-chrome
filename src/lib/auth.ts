/**
 * Extract ArgoCD auth token from browser cookies.
 * ArgoCD stores the JWT in a cookie named `argocd.token`.
 */
export async function getArgoCDToken(argoBaseUrl: string): Promise<string | null> {
  try {
    const url = new URL(argoBaseUrl)
    const cookie = await chrome.cookies.get({
      url: argoBaseUrl,
      name: 'argocd.token',
    })
    if (cookie?.value) return cookie.value

    // Fallback: try to get token from a tab's localStorage
    // This requires a content script, so for MVP we only use cookies
    return null
  } catch {
    return null
  }
}
