import type { LLMConfig } from './types'
import type { Language } from './i18n'

const DEFAULT_CONFIG: LLMConfig = {
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 4096,
}

export async function loadLLMConfig(): Promise<LLMConfig> {
  const data = await chrome.storage.local.get('llmConfig')
  const stored = data.llmConfig as Partial<LLMConfig> | undefined
  return { ...DEFAULT_CONFIG, ...stored }
}

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  await chrome.storage.local.set({ llmConfig: config })
}

export async function loadApiKey(): Promise<string> {
  const data = await chrome.storage.session.get('llmApiKey')
  return (data.llmApiKey as string) ?? ''
}

export async function saveApiKey(key: string): Promise<void> {
  await chrome.storage.session.set({ llmApiKey: key })
}

export async function loadLanguage(): Promise<Language> {
  const data = await chrome.storage.local.get('language')
  return (data.language as Language) ?? 'en'
}

export async function saveLanguage(lang: Language): Promise<void> {
  await chrome.storage.local.set({ language: lang })
}
