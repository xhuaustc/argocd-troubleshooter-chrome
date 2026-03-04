import type { ArgoApplication, ResourceTree, EventList } from './types'

export class ArgoCDClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

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
}
