import type { DiagnosticContext } from './types'

export const SYSTEM_PROMPT = `You are an expert Kubernetes and ArgoCD troubleshooting assistant. You help users diagnose and resolve ArgoCD application deployment issues.

When analyzing issues, follow this structure:

## Problem Summary
[One sentence summarizing the core issue]

## Severity
[Critical / Warning / Info]

## Root Cause Analysis
[Detailed analysis with causal chain. Reference specific resources by Kind/Name.]

## Affected Resources
- [Kind/Name] -> [Status] -> [Issue description]

## Fix Steps
1. [Step description]
   - Target resource: [Kind/Name]
   - Current value: [if applicable]
   - Suggested change: [if applicable]

2. [Continue for each step]

## Verification
[How to verify the fix worked after syncing]

Important guidelines:
- Always recommend GitOps workflow (modify Git repo, then sync via ArgoCD) - never suggest direct kubectl apply/edit
- Never suggest bypassing security controls or weakening RBAC/SecurityContext
- Mark high-risk suggestions with a WARNING label
- If information is insufficient for a confident diagnosis, clearly state what additional info would help
- Reference resources by Kind/Name format so they can be linked in the UI`

export function buildDiagnosticPrompt(context: DiagnosticContext): string {
  const { application, resourceTree, events } = context
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

  // Operation state
  if (app.status.operationState) {
    const op = app.status.operationState
    lines.push('')
    lines.push('## Last Operation')
    lines.push(`- Phase: ${op.phase}`)
    lines.push(`- Message: ${op.message}`)

    if (op.syncResult?.resources?.length) {
      lines.push('')
      lines.push('### Sync Result Resources')
      lines.push('| Kind | Name | Namespace | Status | Message |')
      lines.push('|------|------|-----------|--------|---------|')
      for (const r of op.syncResult.resources) {
        lines.push(`| ${r.kind} | ${r.name} | ${r.namespace} | ${r.status} | ${r.message} |`)
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

  // Resource tree
  if (resourceTree.nodes.length > 0) {
    lines.push('')
    lines.push('## Resource Tree')
    lines.push('| Kind | Name | Namespace | Health | Message |')
    lines.push('|------|------|-----------|--------|---------|')
    for (const node of resourceTree.nodes) {
      const health = node.health?.status ?? 'N/A'
      const msg = node.health?.message ?? ''
      lines.push(`| ${node.kind} | ${node.name} | ${node.namespace} | ${health} | ${msg} |`)
    }
  }

  // Events
  if (events.items.length > 0) {
    lines.push('')
    lines.push('## Events')
    for (const event of events.items) {
      const obj = event.involvedObject
      lines.push(`- [${event.type}] ${obj.kind}/${obj.name}: ${event.reason} - ${event.message}`)
    }
  }

  lines.push('')
  lines.push('Please analyze the above information and provide a diagnosis with fix steps.')

  return lines.join('\n')
}
