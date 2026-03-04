// --- ArgoCD API response types ---

export interface ArgoApplication {
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    project: string
    source: {
      repoURL: string
      targetRevision: string
      path?: string
    }
    destination: {
      server: string
      namespace: string
    }
  }
  status: {
    sync: {
      status: 'Synced' | 'OutOfSync' | 'Unknown'
      revision?: string
    }
    health: {
      status: 'Healthy' | 'Degraded' | 'Progressing' | 'Suspended' | 'Missing' | 'Unknown'
      message?: string
    }
    operationState?: {
      phase: string
      message: string
      syncResult?: {
        resources: SyncResultResource[]
      }
    }
    conditions?: AppCondition[]
    resources?: ResourceStatus[]
  }
}

export interface SyncResultResource {
  group: string
  version: string
  kind: string
  namespace: string
  name: string
  status: string
  message: string
}

export interface AppCondition {
  type: string
  message: string
  lastTransitionTime: string
}

export interface ResourceStatus {
  group: string
  version: string
  kind: string
  namespace: string
  name: string
  status: string
  health?: {
    status: string
    message?: string
  }
}

export interface ResourceTree {
  nodes: ResourceNode[]
}

export interface ResourceNode {
  group: string
  version: string
  kind: string
  namespace: string
  name: string
  uid: string
  parentRefs?: ParentRef[]
  health?: {
    status: string
    message?: string
  }
  info?: Array<{ name: string; value: string }>
}

export interface ParentRef {
  group: string
  kind: string
  namespace: string
  name: string
  uid: string
}

export interface ResourceEvent {
  type: string
  reason: string
  message: string
  count: number
  firstTimestamp: string
  lastTimestamp: string
  involvedObject: {
    kind: string
    name: string
    namespace: string
  }
}

export interface EventList {
  items: ResourceEvent[]
}

// --- LLM config types ---

export interface LLMConfig {
  endpoint: string
  model: string
  temperature: number
  maxTokens: number
}

// --- Diagnostic context ---

export interface DiagnosticContext {
  application: ArgoApplication
  resourceTree: ResourceTree
  events: EventList
}
