import { describe, it, expect } from 'vitest'
import { parseArgoAppUrl } from '@/lib/url-parser'

describe('parseArgoAppUrl', () => {
  it('parses namespaced URL: /applications/{namespace}/{name}', () => {
    const result = parseArgoAppUrl('https://argocd.example.com/applications/argocd/my-app')
    expect(result).toEqual({
      baseUrl: 'https://argocd.example.com',
      namespace: 'argocd',
      appName: 'my-app',
    })
  })

  it('parses legacy URL: /applications/{name}', () => {
    const result = parseArgoAppUrl('https://argocd.example.com/applications/my-app')
    expect(result).toEqual({
      baseUrl: 'https://argocd.example.com',
      namespace: null,
      appName: 'my-app',
    })
  })

  it('returns null for non-ArgoCD URLs', () => {
    expect(parseArgoAppUrl('https://google.com')).toBeNull()
    expect(parseArgoAppUrl('https://argocd.example.com/settings')).toBeNull()
    expect(parseArgoAppUrl('https://argocd.example.com/applications')).toBeNull()
  })

  it('handles trailing slashes', () => {
    const result = parseArgoAppUrl('https://argocd.example.com/applications/argocd/my-app/')
    expect(result).toEqual({
      baseUrl: 'https://argocd.example.com',
      namespace: 'argocd',
      appName: 'my-app',
    })
  })

  it('handles URL with query parameters', () => {
    const result = parseArgoAppUrl('https://argocd.example.com/applications/argocd/my-app?resource=apps/Deployment/default/nginx')
    expect(result).toEqual({
      baseUrl: 'https://argocd.example.com',
      namespace: 'argocd',
      appName: 'my-app',
    })
  })

  it('handles URL with subpath prefix', () => {
    const result = parseArgoAppUrl('https://example.com/argocd/applications/ns/my-app')
    expect(result).toEqual({
      baseUrl: 'https://example.com/argocd',
      namespace: 'ns',
      appName: 'my-app',
    })
  })

  it('returns null for invalid URLs', () => {
    expect(parseArgoAppUrl('not-a-url')).toBeNull()
    expect(parseArgoAppUrl('')).toBeNull()
  })
})
