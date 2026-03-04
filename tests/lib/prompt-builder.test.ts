import { describe, it, expect } from 'vitest'
import { buildDiagnosticPrompt, SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { DiagnosticContext } from '@/lib/types'

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

describe('SYSTEM_PROMPT', () => {
  it('contains troubleshooting structure', () => {
    expect(SYSTEM_PROMPT).toContain('Root Cause Analysis')
    expect(SYSTEM_PROMPT).toContain('Fix Steps')
    expect(SYSTEM_PROMPT).toContain('GitOps')
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

  it('includes operation state when present', () => {
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

  it('includes resource tree nodes', () => {
    const ctx = makeContext({
      resourceTree: {
        nodes: [{
          group: 'apps', version: 'v1', kind: 'Deployment',
          namespace: 'production', name: 'web', uid: '123',
          health: { status: 'Degraded', message: 'Deployment has minimum availability' },
        }],
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('Deployment')
    expect(prompt).toContain('web')
    expect(prompt).toContain('Degraded')
  })

  it('includes events', () => {
    const ctx = makeContext({
      events: {
        items: [{
          type: 'Warning', reason: 'BackOff', message: 'Back-off restarting failed container',
          count: 5, firstTimestamp: '', lastTimestamp: '',
          involvedObject: { kind: 'Pod', name: 'web-abc123', namespace: 'production' },
        }],
      },
    })
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('Warning')
    expect(prompt).toContain('BackOff')
    expect(prompt).toContain('Back-off restarting failed container')
  })

  it('produces empty sections gracefully when no data', () => {
    const prompt = buildDiagnosticPrompt(makeContext())
    // Should not throw, and should have the basic structure
    expect(prompt).toContain('Application Info')
  })

  it('handles null arrays from Go nil slices', () => {
    const ctx = makeContext({
      resourceTree: { nodes: null as unknown as [] },
      events: { items: null as unknown as [] },
    })
    // Should not throw
    const prompt = buildDiagnosticPrompt(ctx)
    expect(prompt).toContain('Application Info')
    expect(prompt).not.toContain('## Resource Tree')
    expect(prompt).not.toContain('## Events')
  })
})
