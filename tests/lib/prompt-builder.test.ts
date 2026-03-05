import { describe, it, expect } from 'vitest'
import { buildDiagnosticPrompt, SYSTEM_PROMPT, getSystemPrompt, isUnhealthy, collectUnhealthySubtreeKeys, collectUnhealthySubtreeNodes } from '@/lib/prompt-builder'
import type { DiagnosticContext, ResourceNode } from '@/lib/types'

const makeContext = (overrides?: Partial<DiagnosticContext>): DiagnosticContext => ({
  application: {
    metadata: { name: 'web-app', namespace: 'argocd' },
    spec: {
      project: 'default',
      source: { repoURL: 'https://github.com/org/repo', targetRevision: 'main', path: 'k8s' },
      destination: { server: 'https://kubernetes.default.svc', namespace: 'production' },
    },
    status: {
      sync: { status: 'OutOfSync' },
      health: { status: 'Degraded', message: 'one or more resources are degraded' },
      operationState: undefined,
      conditions: [],
      resources: [],
    },
  },
  resourceTree: { nodes: [] },
  events: { items: [] },
  ...overrides,
})

const makeNode = (overrides?: Partial<ResourceNode>): ResourceNode => ({
  group: 'apps', version: 'v1', kind: 'Deployment',
  namespace: 'production', name: 'web', uid: '123',
  ...overrides,
})

describe('SYSTEM_PROMPT', () => {
  it('contains troubleshooting structure', () => {
    expect(SYSTEM_PROMPT).toContain('Root Cause Analysis')
    expect(SYSTEM_PROMPT).toContain('Fix Steps')
    expect(SYSTEM_PROMPT).toContain('GitOps')
  })

  it('includes concise response guideline', () => {
    expect(SYSTEM_PROMPT).toContain('Be concise')
    expect(SYSTEM_PROMPT).toContain('no repeating diagnostic data')
  })

  it('does not include Severity or Affected Resources sections', () => {
    expect(SYSTEM_PROMPT).not.toContain('## Severity')
    expect(SYSTEM_PROMPT).not.toContain('## Affected Resources')
  })
})

describe('getSystemPrompt', () => {
  it('returns base prompt for English', () => {
    const prompt = getSystemPrompt('en')
    expect(prompt).toBe(SYSTEM_PROMPT)
    expect(prompt).not.toContain('zh-CN')
  })

  it('appends Chinese instruction for zh', () => {
    const prompt = getSystemPrompt('zh')
    expect(prompt).toContain('Root Cause Analysis')
    expect(prompt).toContain('zh-CN')
    expect(prompt).toContain('Chinese')
  })
})

describe('isUnhealthy', () => {
  it('returns true for Degraded', () => {
    expect(isUnhealthy(makeNode({ health: { status: 'Degraded' } }))).toBe(true)
  })

  it('returns true for Missing', () => {
    expect(isUnhealthy(makeNode({ health: { status: 'Missing' } }))).toBe(true)
  })

  it('returns true for Unknown', () => {
    expect(isUnhealthy(makeNode({ health: { status: 'Unknown' } }))).toBe(true)
  })

  it('returns false for Healthy', () => {
    expect(isUnhealthy(makeNode({ health: { status: 'Healthy' } }))).toBe(false)
  })

  it('returns false for Progressing', () => {
    expect(isUnhealthy(makeNode({ health: { status: 'Progressing' } }))).toBe(false)
  })

  it('returns false for Suspended', () => {
    expect(isUnhealthy(makeNode({ health: { status: 'Suspended' } }))).toBe(false)
  })

  it('returns false for nodes with no health', () => {
    expect(isUnhealthy(makeNode({ health: undefined }))).toBe(false)
  })
})

describe('collectUnhealthySubtreeNodes', () => {
  it('returns full ResourceNode objects for the subtree', () => {
    const tree = {
      nodes: [
        makeNode({ kind: 'Deployment', name: 'web', uid: 'dep-1', health: { status: 'Degraded' } }),
        makeNode({
          kind: 'Pod', name: 'web-pod', uid: 'pod-1',
          health: { status: 'Healthy' },
          parentRefs: [{ group: 'apps', kind: 'Deployment', namespace: 'production', name: 'web', uid: 'dep-1' }],
        }),
        makeNode({ kind: 'Deployment', name: 'api', uid: 'dep-2', health: { status: 'Healthy' } }),
      ],
    }
    const nodes = collectUnhealthySubtreeNodes(tree)
    expect(nodes.map(n => n.name)).toEqual(['web', 'web-pod'])
    expect(nodes[0].uid).toBe('dep-1')
    expect(nodes[1].uid).toBe('pod-1')
  })
})

describe('collectUnhealthySubtreeKeys', () => {
  it('includes directly unhealthy nodes', () => {
    const keys = collectUnhealthySubtreeKeys({
      nodes: [
        makeNode({ kind: 'Deployment', name: 'web', uid: 'dep-1', health: { status: 'Degraded' } }),
        makeNode({ kind: 'Service', name: 'web-svc', uid: 'svc-1', health: { status: 'Healthy' } }),
      ],
    })
    expect(keys.has('Deployment/web')).toBe(true)
    expect(keys.has('Service/web-svc')).toBe(false)
  })

  it('includes child pods of unhealthy deployments via parentRefs', () => {
    const keys = collectUnhealthySubtreeKeys({
      nodes: [
        makeNode({ kind: 'Deployment', name: 'web', uid: 'dep-1', health: { status: 'Degraded' } }),
        makeNode({
          kind: 'ReplicaSet', name: 'web-abc', uid: 'rs-1',
          health: { status: 'Healthy' },
          parentRefs: [{ group: 'apps', kind: 'Deployment', namespace: 'production', name: 'web', uid: 'dep-1' }],
        }),
        makeNode({
          kind: 'Pod', name: 'web-abc-xyz', uid: 'pod-1',
          health: { status: 'Healthy' },
          parentRefs: [{ group: 'apps', kind: 'ReplicaSet', namespace: 'production', name: 'web-abc', uid: 'rs-1' }],
        }),
      ],
    })
    expect(keys.has('Deployment/web')).toBe(true)
    expect(keys.has('ReplicaSet/web-abc')).toBe(true)
    expect(keys.has('Pod/web-abc-xyz')).toBe(true)
  })

  it('does not include children of healthy nodes', () => {
    const keys = collectUnhealthySubtreeKeys({
      nodes: [
        makeNode({ kind: 'Deployment', name: 'api', uid: 'dep-2', health: { status: 'Healthy' } }),
        makeNode({
          kind: 'Pod', name: 'api-pod', uid: 'pod-2',
          health: { status: 'Healthy' },
          parentRefs: [{ group: 'apps', kind: 'Deployment', namespace: 'production', name: 'api', uid: 'dep-2' }],
        }),
      ],
    })
    expect(keys.size).toBe(0)
  })
})

describe('buildDiagnosticPrompt', () => {
  it('includes application basic info', () => {
    const prompt = buildDiagnosticPrompt(makeContext())
    expect(prompt).toContain('web-app')
    expect(prompt).toContain('argocd')
    expect(prompt).toContain('OutOfSync')
    expect(prompt).toContain('Degraded')
    expect(prompt).toContain('https://github.com/org/repo')
  })

  it('includes operation state when phase is not Succeeded', () => {
    const ctx = makeContext({
      application: {
        ...makeContext().application,
        status: {
          ...makeContext().application.status,
          operationState: {
            phase: 'Failed',
            message: 'sync failed',
            syncResult: {
              resources: [{
                group: 'apps', version: 'v1', kind: 'Deployment',
                namespace: 'production', name: 'web', status: 'SyncFailed',
                message: 'the server could not find the requested resource',
              }],
            },
          },
        },
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('Failed')
    expect(prompt).toContain('sync failed')
    expect(prompt).toContain('SyncFailed')
  })

  it('excludes successful operation state with all-Synced resources', () => {
    const ctx = makeContext({
      application: {
        ...makeContext().application,
        status: {
          ...makeContext().application.status,
          operationState: {
            phase: 'Succeeded',
            message: 'successfully synced',
            syncResult: {
              resources: [
                { group: '', version: 'v1', kind: 'Namespace', namespace: '', name: 'ns', status: 'Synced', message: 'created' },
                { group: '', version: 'v1', kind: 'Service', namespace: 'ns', name: 'svc', status: 'Synced', message: 'created' },
              ],
            },
          },
        },
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).not.toContain('## Last Operation')
    expect(prompt).not.toContain('Sync Result')
  })

  it('includes only failed sync resources from a Succeeded operation', () => {
    const ctx = makeContext({
      application: {
        ...makeContext().application,
        status: {
          ...makeContext().application.status,
          operationState: {
            phase: 'Succeeded',
            message: 'partially synced',
            syncResult: {
              resources: [
                { group: '', version: 'v1', kind: 'Service', namespace: 'ns', name: 'svc', status: 'Synced', message: 'created' },
                { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'ns', name: 'web', status: 'SyncFailed', message: 'error' },
              ],
            },
          },
        },
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('## Last Operation')
    expect(prompt).toContain('SyncFailed')
    expect(prompt).not.toContain('| Service |')
  })

  it('includes conditions when present', () => {
    const ctx = makeContext({
      application: {
        ...makeContext().application,
        status: {
          ...makeContext().application.status,
          conditions: [{ type: 'SyncError', message: 'failed to sync', lastTransitionTime: '' }],
        },
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('SyncError')
    expect(prompt).toContain('failed to sync')
  })

  it('excludes healthy resources from resource tree', () => {
    const ctx = makeContext({
      resourceTree: {
        nodes: [
          makeNode({ kind: 'Deployment', name: 'web', health: { status: 'Degraded', message: 'min availability' } }),
          makeNode({ kind: 'Deployment', name: 'api', uid: '456', health: { status: 'Healthy' } }),
          makeNode({ kind: 'Service', name: 'web-svc', uid: '789', health: { status: 'Healthy' } }),
        ],
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('Unhealthy Resources')
    expect(prompt).toContain('web')
    expect(prompt).toContain('Degraded')
    expect(prompt).not.toContain('| Deployment | api')
    expect(prompt).not.toContain('web-svc')
  })

  it('excludes resources without health status (ConfigMap, Secret, etc.)', () => {
    const ctx = makeContext({
      resourceTree: {
        nodes: [
          makeNode({ kind: 'ConfigMap', name: 'config', uid: 'cm-1', health: undefined }),
          makeNode({ kind: 'Secret', name: 'creds', uid: 'sec-1', health: undefined }),
          makeNode({ kind: 'Pod', name: 'crash-pod', uid: 'pod-1', health: { status: 'Degraded', message: 'CrashLoopBackOff' } }),
        ],
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('crash-pod')
    expect(prompt).not.toContain('config')
    expect(prompt).not.toContain('creds')
  })

  it('includes events for child pods of unhealthy deployments', () => {
    const ctx = makeContext({
      resourceTree: {
        nodes: [
          makeNode({ kind: 'Deployment', name: 'web', uid: 'dep-1', health: { status: 'Degraded' } }),
          makeNode({
            kind: 'ReplicaSet', name: 'web-rs', uid: 'rs-1',
            health: { status: 'Healthy' },
            parentRefs: [{ group: 'apps', kind: 'Deployment', namespace: 'production', name: 'web', uid: 'dep-1' }],
          }),
          makeNode({
            kind: 'Pod', name: 'web-rs-pod1', uid: 'pod-1',
            health: { status: 'Healthy' },
            parentRefs: [{ group: 'apps', kind: 'ReplicaSet', namespace: 'production', name: 'web-rs', uid: 'rs-1' }],
          }),
        ],
      },
      events: {
        items: [
          {
            type: 'Normal', reason: 'BackOff', message: 'Back-off restarting',
            count: 5, firstTimestamp: '', lastTimestamp: '',
            involvedObject: { kind: 'Pod', name: 'web-rs-pod1', namespace: 'production' },
          },
        ],
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('## Events')
    expect(prompt).toContain('web-rs-pod1')
    expect(prompt).toContain('Back-off restarting')
  })

  it('includes Warning events even if not matching unhealthy resource', () => {
    const ctx = makeContext({
      resourceTree: { nodes: [] },
      events: {
        items: [{
          type: 'Warning', reason: 'FailedScheduling', message: 'insufficient cpu',
          count: 1, firstTimestamp: '', lastTimestamp: '',
          involvedObject: { kind: 'Pod', name: 'unknown-pod', namespace: 'production' },
        }],
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('Warning')
    expect(prompt).toContain('FailedScheduling')
  })

  it('excludes Normal events for healthy unrelated resources', () => {
    const ctx = makeContext({
      resourceTree: {
        nodes: [
          makeNode({ kind: 'Pod', name: 'crash-pod', uid: 'pod-1', health: { status: 'Degraded' } }),
        ],
      },
      events: {
        items: [
          {
            type: 'Normal', reason: 'Pulled', message: 'pulled image',
            count: 1, firstTimestamp: '', lastTimestamp: '',
            involvedObject: { kind: 'Pod', name: 'crash-pod', namespace: 'production' },
          },
          {
            type: 'Normal', reason: 'Pulled', message: 'pulled image for healthy',
            count: 1, firstTimestamp: '', lastTimestamp: '',
            involvedObject: { kind: 'Pod', name: 'healthy-pod', namespace: 'production' },
          },
        ],
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('crash-pod')
    expect(prompt).toContain('pulled image')
    expect(prompt).not.toContain('healthy-pod')
  })

  it('renders pod logs section', () => {
    const ctx = makeContext({
      podLogs: {
        'production/crash-pod': 'Error: connection refused\nFatal: exiting',
        'production/oom-pod': 'Killed',
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('## Pod Logs: production/crash-pod')
    expect(prompt).toContain('Error: connection refused')
    expect(prompt).toContain('## Pod Logs: production/oom-pod')
    expect(prompt).toContain('Killed')
  })

  it('skips empty pod logs', () => {
    const ctx = makeContext({
      podLogs: {
        'production/no-logs-pod': '',
        'production/has-logs-pod': 'some output',
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).not.toContain('no-logs-pod')
    expect(prompt).toContain('has-logs-pod')
  })

  it('produces empty sections gracefully when no data', () => {
    const prompt = buildDiagnosticPrompt(makeContext())
    expect(prompt).toContain('Application Info')
  })

  it('handles null arrays from Go nil slices', () => {
    const ctx = makeContext({
      resourceTree: { nodes: null as unknown as [] },
      events: { items: null as unknown as [] },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('Application Info')
    expect(prompt).not.toContain('## Unhealthy Resources')
    expect(prompt).not.toContain('## Events')
  })
})
