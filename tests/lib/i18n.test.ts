import { describe, it, expect } from 'vitest'
import { createT, type Language } from '@/lib/i18n'

describe('createT', () => {
  it('returns English strings for "en"', () => {
    const t = createT('en')
    expect(t('appTitle')).toBe('ArgoCD Troubleshooter')
    expect(t('tabDiagnose')).toBe('Diagnose')
    expect(t('tabSettings')).toBe('Settings')
  })

  it('returns Chinese strings for "zh"', () => {
    const t = createT('zh')
    expect(t('appTitle')).toBe('ArgoCD 故障排查助手')
    expect(t('tabDiagnose')).toBe('诊断')
    expect(t('tabSettings')).toBe('设置')
  })

  it('all keys return non-empty strings for en', () => {
    const t = createT('en')
    const keys: (keyof ReturnType<typeof getEnKeys>)[] = [
      'appTitle', 'tabDiagnose', 'tabSettings', 'emptyState',
      'btnStartDiagnosis', 'btnSave', 'btnCancel', 'analyzing',
    ]
    for (const key of keys) {
      expect(t(key)).toBeTruthy()
    }
  })

  it('all keys return non-empty strings for zh', () => {
    const t = createT('zh')
    const keys: (keyof ReturnType<typeof getEnKeys>)[] = [
      'appTitle', 'tabDiagnose', 'tabSettings', 'emptyState',
      'btnStartDiagnosis', 'btnSave', 'btnCancel', 'analyzing',
    ]
    for (const key of keys) {
      expect(t(key)).toBeTruthy()
    }
  })

  it('zh and en return different values for translated keys', () => {
    const en = createT('en')
    const zh = createT('zh')
    expect(en('appTitle')).not.toBe(zh('appTitle'))
    expect(en('btnSave')).not.toBe(zh('btnSave'))
  })
})

// Helper to satisfy TypeScript — not actually called
function getEnKeys() {
  return createT('en')
}
