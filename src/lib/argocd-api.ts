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

  private appPath(name: string, namespace?: string): string {
    return namespace ? `/api/v1/applications/${namespace}/${name}` : `/api/v1/applications/${name}`
  }

  async getApplication(name: string, namespace?: string): Promise<ArgoApplication> {
    return this.request(this.appPath(name, namespace))
  }

  async getResourceTree(name: string, namespace?: string): Promise<ResourceTree> {
    return this.request(`${this.appPath(name, namespace)}/resource-tree`)
  }

  async getEvents(name: string, namespace?: string): Promise<EventList> {
    return this.request(`${this.appPath(name, namespace)}/events`)
  }
}
