import { useState, useEffect } from 'react'
import { loadLLMConfig, saveLLMConfig, loadApiKey, saveApiKey } from '@/lib/storage'
import { LLMClient } from '@/lib/llm-client'
import type { LLMConfig } from '@/lib/types'

export function ConfigPanel() {
  const [config, setConfig] = useState<LLMConfig>({
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
  })
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadLLMConfig().then(setConfig)
    loadApiKey().then(setApiKey)
  }, [])

  const handleSave = async () => {
    await saveLLMConfig(config)
    await saveApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setStatus('testing')
    const client = new LLMClient(config, apiKey)
    const ok = await client.testConnection()
    setStatus(ok ? 'success' : 'error')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="config-panel">
      <div className="form-group">
        <label>Preset</label>
        <select
          value="custom"
          onChange={(e) => {
            const presets: Record<string, Partial<LLMConfig>> = {
              openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
              anthropic: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
            }
            const preset = presets[e.target.value]
            if (preset) setConfig((c) => ({ ...c, ...preset }))
          }}
        >
          <option value="custom">Custom</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic (requires adapter)</option>
        </select>
      </div>

      <div className="form-group">
        <label>API Endpoint</label>
        <input
          type="url"
          value={config.endpoint}
          onChange={(e) => setConfig((c) => ({ ...c, endpoint: e.target.value }))}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div className="form-group">
        <label>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <small>Stored in session only. Cleared when browser closes.</small>
      </div>

      <div className="form-group">
        <label>Model</label>
        <input
          type="text"
          value={config.model}
          onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
          placeholder="gpt-4o"
        />
      </div>

      <details className="advanced-settings">
        <summary>Advanced Settings</summary>
        <div className="form-group">
          <label>Temperature: {config.temperature}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature}
            onChange={(e) => setConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
          />
        </div>
        <div className="form-group">
          <label>Max Tokens</label>
          <input
            type="number"
            value={config.maxTokens}
            onChange={(e) => setConfig((c) => ({ ...c, maxTokens: parseInt(e.target.value) || 4096 }))}
          />
        </div>
      </details>

      <div className="button-group">
        <button onClick={handleTest} disabled={!apiKey || status === 'testing'}>
          {status === 'testing' ? 'Testing...' : status === 'success' ? 'Connected!' : status === 'error' ? 'Failed' : 'Test Connection'}
        </button>
        <button className="primary" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  )
}
