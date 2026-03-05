import type { DiagnosticContext, ResourceNode, ResourceTree } from './types'
import type { Language } from './i18n'

const HEALTHY_STATUSES = new Set(['Healthy', 'Progressing', 'Suspended'])
const SYNC_SUCCESS_STATUSES = new Set(['Synced', 'SyncedAndPruned', 'Pruned'])

export const SYSTEM_PROMPT = `You are an expert Kubernetes and ArgoCD troubleshooting assistant.

When analyzing issues, respond with this structure:

## Problem Summary
[One sentence summarizing the core issue]

## Root Cause Analysis
[Causal chain referencing specific resources by Kind/Name]

## Fix Steps
1. [Actionable step with target resource and suggested change]

## Verification
[How to verify the fix after syncing]

Be concise. Focus on the root cause and actionable fix steps. Do not repeat the diagnostic data back.

Important guidelines:
- Always recommend GitOps workflow (modify Git repo, then sync via ArgoCD) - never suggest direct kubectl apply/edit
- Never suggest bypassing security controls or weakening RBAC/SecurityContext
- Mark high-risk suggestions with a WARNING label
- If information is insufficient for a confident diagnosis, clearly state what additional info would help
- Reference resources by Kind/Name format so they can be linked in the UI`

export function getSystemPrompt(lang: Language): string {
  if (lang === 'zh') {
    return SYSTEM_PROMPT + '\n\nIMPORTANT: Please respond entirely in Chinese (Simplified, zh-CN).'
  }
  return SYSTEM_PROMPT
}

export function isUnhealthy(node: ResourceNode): boolean {
  if (!node.health?.status) return false
  return !HEALTHY_STATUSES.has(node.health.status)
}

/**
 * Collect all unhealthy nodes and their descendants via parentRefs.
 * This lets us fetch events/logs for child Pods/ReplicaSets of an unhealthy Deployment.
 */
export function collectUnhealthySubtreeNodes(tree: ResourceTree): ResourceNode[] {
  const nodes = tree.nodes ?? []
  const unhealthyUids = new Set(nodes.filter(isUnhealthy).map(n => n.uid))

  // Walk all nodes: if a node's parent is in the unhealthy set, add it too.
  // Repeat until stable (handles multi-level: Deployment -> ReplicaSet -> Pod).
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (unhealthyUids.has(node.uid)) continue
      if (node.parentRefs?.some(p => unhealthyUids.has(p.uid))) {
        unhealthyUids.add(node.uid)
        changed = true
      }
    }
  }

  return nodes.filter(n => unhealthyUids.has(n.uid))
}

export function collectUnhealthySubtreeKeys(tree: ResourceTree): Set<string> {
  return new Set(
    collectUnhealthySubtreeNodes(tree).map(n => `${n.kind}/${n.name}`),
  )
}

export function buildDiagnosticPrompt(context: DiagnosticContext): string {
  const { application, resourceTree, events, podLogs } = context
  const app = application
  const lines: string[] = []

  // Application info
  lines.push('# ArgoCD Application Diagnostic Request')
  lines.push('')
  lines.push('## Application Info')
  lines.push(`- Name: ${app.metadata.name}`)
  lines.push(`- Namespace: ${app.metadata.namespace}`)
  lines.push(`- Project: ${app.spec.project}`)
  lines.push(`- Sync Status: ${app.status.sync.status}`)
  lines.push(`- Health Status: ${app.status.health.status}`)
  if (app.status.health.message) {
    lines.push(`- Health Message: ${app.status.health.message}`)
  }
  lines.push(`- Repo: ${app.spec.source.repoURL}`)
  lines.push(`- Target Revision: ${app.spec.source.targetRevision}`)
  if (app.spec.source.path) {
    lines.push(`- Path: ${app.spec.source.path}`)
  }

  // Operation state — only include if failed, or if there are failed sync resources
  if (app.status.operationState) {
    const op = app.status.operationState
    const failedResources = (op.syncResult?.resources ?? []).filter(
      r => !SYNC_SUCCESS_STATUSES.has(r.status),
    )
    const opFailed = op.phase !== 'Succeeded'

    if (opFailed || failedResources.length) {
      lines.push('')
      lines.push('## Last Operation')
      lines.push(`- Phase: ${op.phase}`)
      lines.push(`- Message: ${op.message}`)

      if (failedResources.length) {
        lines.push('')
        lines.push('### Failed Sync Resources')
        lines.push('| Kind | Name | Namespace | Status | Message |')
        lines.push('|------|------|-----------|--------|---------|')
        for (const r of failedResources) {
          lines.push(`| ${r.kind} | ${r.name} | ${r.namespace} | ${r.status} | ${r.message} |`)
        }
      }
    }
  }

  // Conditions
  if (app.status.conditions?.length) {
    lines.push('')
    lines.push('## Conditions')
    for (const c of app.status.conditions) {
      lines.push(`- **${c.type}**: ${c.message}`)
    }
  }

  // Resource tree — unhealthy resources only
  const unhealthyNodes = (resourceTree.nodes ?? []).filter(isUnhealthy)
  if (unhealthyNodes.length) {
    lines.push('')
    lines.push('## Unhealthy Resources')
    lines.push('| Kind | Name | Namespace | Health | Message |')
    lines.push('|------|------|-----------|--------|---------|')
    for (const node of unhealthyNodes) {
      const health = node.health?.status ?? 'N/A'
      const msg = node.health?.message ?? ''
      lines.push(`| ${node.kind} | ${node.name} | ${node.namespace} | ${health} | ${msg} |`)
    }
  }

  // Events — only Warning events or events involving unhealthy resources (including descendants)
  if (events.items?.length) {
    const unhealthyKeys = collectUnhealthySubtreeKeys(resourceTree)
    const filteredEvents = events.items.filter(e => {
      if (e.type === 'Warning') return true
      const key = `${e.involvedObject.kind}/${e.involvedObject.name}`
      return unhealthyKeys.has(key)
    })
    if (filteredEvents.length) {
      lines.push('')
      lines.push('## Events')
      for (const event of filteredEvents) {
        const obj = event.involvedObject
        lines.push(`- [${event.type}] ${obj.kind}/${obj.name}: ${event.reason} - ${event.message}`)
      }
    }
  }

  // Pod logs
  if (podLogs) {
    for (const [podName, logText] of Object.entries(podLogs)) {
      if (!logText) continue
      lines.push('')
      lines.push(`## Pod Logs: ${podName}`)
      lines.push('```')
      lines.push(logText)
      lines.push('```')
    }
  }

  lines.push('')
  lines.push('Please analyze the above information and provide a diagnosis with fix steps.')

  return lines.join('\n')
}
