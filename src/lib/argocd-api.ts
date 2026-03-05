import type { ArgoApplication, ResourceTree, EventList } from './types'

export class ArgoCDClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) { }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`ArgoCD API error: ${res.status} - ${body}`)
    }
    return res.json()
  }

  private appPath(name: string, namespace?: string, suffix?: string): string {
    const base = `/api/v1/applications/${encodeURIComponent(name)}${suffix ?? ''}`
    if (namespace) {
      return `${base}${base.includes('?') ? '&' : '?'}appNamespace=${encodeURIComponent(namespace)}`
    }
    return base
  }

  async getApplication(name: string, namespace?: string): Promise<ArgoApplication> {
    return this.request(this.appPath(name, namespace))
  }

  async getResourceTree(name: string, namespace?: string): Promise<ResourceTree> {
    return this.request(this.appPath(name, namespace, '/resource-tree'))
  }

  async getEvents(name: string, namespace?: string): Promise<EventList> {
    return this.request(this.appPath(name, namespace, '/events'))
  }

  async getResourceEvents(
    appName: string,
    resourceUID: string,
    resourceNamespace: string,
    resourceName: string,
    appNamespace?: string,
  ): Promise<EventList> {
    try {
      const params = new URLSearchParams({
        resourceUID,
        resourceNamespace,
        resourceName,
      })
      return await this.request<EventList>(
        this.appPath(appName, appNamespace, `/events?${params.toString()}`),
      )
    } catch {
      return { items: [] }
    }
  }

  async getPodLogs(
    appName: string,
    podName: string,
    podNamespace: string,
    appNamespace?: string,
    tailLines = 15,
  ): Promise<string> {
    try {
      const params = new URLSearchParams({
        podName,
        namespace: podNamespace,
        tailLines: String(tailLines),
        follow: 'false',
      })
      const path = this.appPath(appName, appNamespace, `/logs?${params.toString()}`)
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })
      if (!res.ok) return ''
      const text = await res.text()
      const lines: string[] = []
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.result?.content) {
            lines.push(parsed.result.content)
          }
        } catch {
          // skip malformed lines
        }
      }
      return lines.join('')
    } catch {
      return ''
    }
  }
}
