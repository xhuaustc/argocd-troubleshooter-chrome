import { useState, useCallback, useEffect } from 'react'
import type { ArgoAppInfo } from '@/lib/url-parser'
import type { DiagnosticContext } from '@/lib/types'
import { getArgoCDToken } from '@/lib/auth'
import { ArgoCDClient } from '@/lib/argocd-api'
import { redactSensitiveValues } from '@/lib/redaction'
import { buildDiagnosticPrompt, getSystemPrompt, collectUnhealthySubtreeNodes } from '@/lib/prompt-builder'
import { LLMClient } from '@/lib/llm-client'
import { loadLLMConfig, loadApiKey } from '@/lib/storage'
import { ContentPreview } from './ContentPreview'
import { DiagnosticResult } from './DiagnosticResult'
import { useI18n } from '../I18nProvider'

interface DiagnosePanelProps {
  appInfo: ArgoAppInfo
}

type Phase = 'idle' | 'collecting' | 'preview' | 'diagnosing' | 'done' | 'error'

export function DiagnosePanel({ appInfo }: DiagnosePanelProps) {
  const { t, language } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const [promptContent, setPromptContent] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  // Reset to idle when the user switches to a different application
  useEffect(() => {
    setPhase('idle')
    setPromptContent('')
    setResult('')
    setError('')
  }, [appInfo.baseUrl, appInfo.appName, appInfo.namespace])

  const collectData = useCallback(async (): Promise<DiagnosticContext> => {
    const token = await getArgoCDToken(appInfo.baseUrl)
    if (!token) {
      throw new Error(t('errorNoToken'))
    }

    const client = new ArgoCDClient(appInfo.baseUrl, token)
    const [application, resourceTree, events] = await Promise.all([
      client.getApplication(appInfo.appName, appInfo.namespace ?? undefined),
      client.getResourceTree(appInfo.appName, appInfo.namespace ?? undefined),
      client.getEvents(appInfo.appName, appInfo.namespace ?? undefined),
    ])

    // Identify unhealthy subtree (unhealthy nodes + their descendants)
    const subtreeNodes = collectUnhealthySubtreeNodes(resourceTree)

    // Fetch resource-specific events for each node in the unhealthy subtree
    const resourceEventResults = await Promise.all(
      subtreeNodes.map(node =>
        client.getResourceEvents(
          appInfo.appName, node.uid, node.namespace, node.name,
          appInfo.namespace ?? undefined,
        ),
      ),
    )
    // Merge resource events into the app-level events
    const allEventItems = [...(events.items ?? [])]
    const seen = new Set(allEventItems.map(e =>
      `${e.involvedObject.kind}/${e.involvedObject.name}/${e.reason}/${e.message}`,
    ))
    for (const evtList of resourceEventResults) {
      for (const e of evtList.items ?? []) {
        const key = `${e.involvedObject.kind}/${e.involvedObject.name}/${e.reason}/${e.message}`
        if (!seen.has(key)) {
          seen.add(key)
          allEventItems.push(e)
        }
      }
    }

    // Fetch logs for unhealthy pods
    const unhealthyPods = subtreeNodes.filter(n => n.kind === 'Pod')
    const podLogs: Record<string, string> = {}
    if (unhealthyPods.length) {
      const logResults = await Promise.all(
        unhealthyPods.map(pod =>
          client.getPodLogs(
            appInfo.appName, pod.name, pod.namespace,
            appInfo.namespace ?? undefined,
          ).then(logs => ({ key: `${pod.namespace}/${pod.name}`, logs })),
        ),
      )
      for (const { key, logs } of logResults) {
        if (logs) podLogs[key] = logs
      }
    }

    return { application, resourceTree, events: { items: allEventItems }, podLogs }
  }, [appInfo, t])

  const handleDiagnose = useCallback(async () => {
    setError('')
    setResult('')
    setPhase('collecting')

    try {
      // Step 1: Collect data from ArgoCD API
      const context = await collectData()

      // Step 2: Redact sensitive data
      const redactedContext = redactSensitiveValues(context)

      // Step 3: Build prompt and show preview
      const prompt = buildDiagnosticPrompt(redactedContext)
      setPromptContent(prompt)
      setPhase('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorCollectFailed'))
      setPhase('error')
    }
  }, [collectData, t])

  const handleSendToLLM = useCallback(async () => {
    setPhase('diagnosing')
    setResult('')

    try {
      const config = await loadLLMConfig()
      const apiKey = await loadApiKey()
      if (!apiKey) {
        throw new Error(t('errorNoApiKey'))
      }

      const client = new LLMClient(config, apiKey)
      const messages = [
        { role: 'system' as const, content: getSystemPrompt(language) },
        { role: 'user' as const, content: promptContent },
      ]

      let accumulated = ''
      for await (const chunk of client.streamChat(messages)) {
        accumulated += chunk
        setResult(accumulated)
      }

      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorLLMFailed'))
      setPhase('error')
    }
  }, [promptContent, language, t])

  return (
    <div className="diagnose-panel">
      <div className="app-info">
        <strong>{t('applicationLabel')}</strong> {appInfo.appName}
        {appInfo.namespace && <span> ({appInfo.namespace})</span>}
      </div>

      {phase === 'idle' && (
        <button className="diagnose-btn primary" onClick={handleDiagnose}>
          {t('btnStartDiagnosis')}
        </button>
      )}

      {phase === 'collecting' && (
        <div className="loading">
          <div className="spinner" />
          <span>{t('collectingData')}</span>
        </div>
      )}

      {phase === 'preview' && (
        <>
          <ContentPreview content={promptContent} />
          <p style={{ fontSize: '12px', color: '#666' }}>
            {t('previewDisclaimer')}
          </p>
          <div className="button-group">
            <button onClick={() => setPhase('idle')}>{t('btnCancel')}</button>
            <button className="primary" onClick={handleSendToLLM}>
              {t('btnSendToLLM')}
            </button>
          </div>
        </>
      )}

      {(phase === 'diagnosing' || phase === 'done') && (
        <>
          <DiagnosticResult content={result} isStreaming={phase === 'diagnosing'} />
          {phase === 'done' && (
            <div className="button-group" style={{ marginTop: '12px' }}>
              <button onClick={handleDiagnose}>{t('btnReDiagnose')}</button>
            </div>
          )}
          <ContentPreview content={promptContent} />
        </>
      )}

      {phase === 'error' && (
        <>
          <div className="error-message">{error}</div>
          <div className="button-group" style={{ marginTop: '8px' }}>
            <button onClick={() => setPhase('idle')}>{t('btnTryAgain')}</button>
          </div>
        </>
      )}
    </div>
  )
}
