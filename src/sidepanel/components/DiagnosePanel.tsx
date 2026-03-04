import { useState, useCallback } from 'react'
import type { ArgoAppInfo } from '@/lib/url-parser'
import type { DiagnosticContext } from '@/lib/types'
import { getArgoCDToken } from '@/lib/auth'
import { ArgoCDClient } from '@/lib/argocd-api'
import { redactSensitiveValues } from '@/lib/redaction'
import { buildDiagnosticPrompt, SYSTEM_PROMPT } from '@/lib/prompt-builder'
import { LLMClient } from '@/lib/llm-client'
import { loadLLMConfig, loadApiKey } from '@/lib/storage'
import { ContentPreview } from './ContentPreview'
import { DiagnosticResult } from './DiagnosticResult'

interface DiagnosePanelProps {
  appInfo: ArgoAppInfo
}

type Phase = 'idle' | 'collecting' | 'preview' | 'diagnosing' | 'done' | 'error'

export function DiagnosePanel({ appInfo }: DiagnosePanelProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [promptContent, setPromptContent] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const collectData = useCallback(async (): Promise<DiagnosticContext> => {
    const token = await getArgoCDToken(appInfo.baseUrl)
    if (!token) {
      throw new Error('Could not find ArgoCD auth token. Please ensure you are logged into ArgoCD.')
    }

    const client = new ArgoCDClient(appInfo.baseUrl, token)
    const [application, resourceTree, events] = await Promise.all([
      client.getApplication(appInfo.appName, appInfo.namespace ?? undefined),
      client.getResourceTree(appInfo.appName, appInfo.namespace ?? undefined),
      client.getEvents(appInfo.appName, appInfo.namespace ?? undefined),
    ])

    return { application, resourceTree, events }
  }, [appInfo])

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
      setError(e instanceof Error ? e.message : 'Failed to collect data')
      setPhase('error')
    }
  }, [collectData])

  const handleSendToLLM = useCallback(async () => {
    setPhase('diagnosing')
    setResult('')

    try {
      const config = await loadLLMConfig()
      const apiKey = await loadApiKey()
      if (!apiKey) {
        throw new Error('LLM API key not configured. Go to Settings tab.')
      }

      const client = new LLMClient(config, apiKey)
      const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        { role: 'user' as const, content: promptContent },
      ]

      let accumulated = ''
      for await (const chunk of client.streamChat(messages)) {
        accumulated += chunk
        setResult(accumulated)
      }

      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'LLM request failed')
      setPhase('error')
    }
  }, [promptContent])

  return (
    <div className="diagnose-panel">
      <div className="app-info">
        <strong>Application:</strong> {appInfo.appName}
        {appInfo.namespace && <span> ({appInfo.namespace})</span>}
      </div>

      {phase === 'idle' && (
        <button className="diagnose-btn primary" onClick={handleDiagnose}>
          Start Diagnosis
        </button>
      )}

      {phase === 'collecting' && (
        <div className="loading">
          <div className="spinner" />
          <span>Collecting data from ArgoCD...</span>
        </div>
      )}

      {phase === 'preview' && (
        <>
          <ContentPreview content={promptContent} />
          <p style={{ fontSize: '12px', color: '#666' }}>
            The above data will be sent to your configured LLM. Review it before proceeding.
          </p>
          <div className="button-group">
            <button onClick={() => setPhase('idle')}>Cancel</button>
            <button className="primary" onClick={handleSendToLLM}>
              Send to LLM
            </button>
          </div>
        </>
      )}

      {(phase === 'diagnosing' || phase === 'done') && (
        <>
          <DiagnosticResult content={result} isStreaming={phase === 'diagnosing'} />
          {phase === 'done' && (
            <div className="button-group" style={{ marginTop: '12px' }}>
              <button onClick={handleDiagnose}>Re-diagnose</button>
            </div>
          )}
          <ContentPreview content={promptContent} />
        </>
      )}

      {phase === 'error' && (
        <>
          <div className="error-message">{error}</div>
          <div className="button-group" style={{ marginTop: '8px' }}>
            <button onClick={() => setPhase('idle')}>Try Again</button>
          </div>
        </>
      )}
    </div>
  )
}
