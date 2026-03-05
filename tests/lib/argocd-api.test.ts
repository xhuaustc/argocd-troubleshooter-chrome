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

  describe('getResourceEvents', () => {
    it('fetches events with resource query params', async () => {
      const mockEvents = { items: [{ reason: 'BackOff', message: 'restarting' }] }
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockEvents) })

      const result = await client.getResourceEvents(
        'my-app', 'uid-123', 'production', 'web-pod', 'argocd',
      )

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/api/v1/applications/my-app/events?')
      expect(url).toContain('resourceUID=uid-123')
      expect(url).toContain('resourceNamespace=production')
      expect(url).toContain('resourceName=web-pod')
      expect(url).toContain('appNamespace=argocd')
      expect(result).toEqual(mockEvents)
    })

    it('returns empty items on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false, status: 404,
        text: () => Promise.resolve('not found'),
      })

      const result = await client.getResourceEvents(
        'my-app', 'uid-123', 'production', 'web-pod',
      )
      expect(result).toEqual({ items: [] })
    })
  })

  describe('getPodLogs', () => {
    it('parses NDJSON log lines', async () => {
      const ndjson = [
        '{"result":{"content":"line 1\\n"}}',
        '{"result":{"content":"line 2\\n"}}',
      ].join('\n')
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(ndjson) })

      const result = await client.getPodLogs('my-app', 'web-pod', 'production', 'argocd')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/applications/my-app/logs?'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      )
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('podName=web-pod')
      expect(url).toContain('namespace=production')
      expect(url).toContain('tailLines=15')
      expect(url).toContain('follow=false')
      expect(url).toContain('appNamespace=argocd')
      expect(result).toBe('line 1\nline 2\n')
    })

    it('returns empty string on HTTP error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 })

      const result = await client.getPodLogs('my-app', 'web-pod', 'production')
      expect(result).toBe('')
    })

    it('returns empty string on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('network error'))

      const result = await client.getPodLogs('my-app', 'web-pod', 'production')
      expect(result).toBe('')
    })

    it('skips malformed JSON lines', async () => {
      const ndjson = [
        '{"result":{"content":"good\\n"}}',
        'not json',
        '{"result":{"content":"also good\\n"}}',
      ].join('\n')
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(ndjson) })

      const result = await client.getPodLogs('my-app', 'web-pod', 'production')
      expect(result).toBe('good\nalso good\n')
    })
  })
})
