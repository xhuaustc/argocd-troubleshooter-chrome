import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArgoCDClient } from '@/lib/argocd-api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ArgoCDClient', () => {
  let client: ArgoCDClient

  beforeEach(() => {
    mockFetch.mockReset()
    client = new ArgoCDClient('https://argocd.example.com', 'test-token')
  })

  describe('getApplication', () => {
    it('fetches application with namespace', async () => {
      const mockApp = { metadata: { name: 'my-app', namespace: 'argocd' } }
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockApp) })

      const result = await client.getApplication('my-app', 'argocd')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://argocd.example.com/api/v1/applications/my-app?appNamespace=argocd',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      )
      expect(result).toEqual(mockApp)
    })

    it('fetches application without namespace (legacy)', async () => {
      const mockApp = { metadata: { name: 'my-app' } }
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockApp) })

      await client.getApplication('my-app')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://argocd.example.com/api/v1/applications/my-app',
        expect.any(Object),
      )
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('access denied'),
      })

      await expect(client.getApplication('my-app')).rejects.toThrow('ArgoCD API error: 403')
    })
  })

  describe('getResourceTree', () => {
    it('fetches resource tree', async () => {
      const mockTree = { nodes: [{ kind: 'Deployment', name: 'web' }] }
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockTree) })

      const result = await client.getResourceTree('my-app', 'argocd')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://argocd.example.com/api/v1/applications/my-app/resource-tree?appNamespace=argocd',
        expect.any(Object),
      )
      expect(result).toEqual(mockTree)
    })
  })

  describe('getEvents', () => {
    it('fetches application events', async () => {
      const mockEvents = { items: [{ reason: 'SyncFailed', message: 'error' }] }
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockEvents) })

      const result = await client.getEvents('my-app', 'argocd')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://argocd.example.com/api/v1/applications/my-app/events?appNamespace=argocd',
        expect.any(Object),
      )
      expect(result).toEqual(mockEvents)
    })
  })
})
