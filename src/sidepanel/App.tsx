import { useState, useEffect } from 'react'
import { ConfigPanel } from './components/ConfigPanel'
import { DiagnosePanel } from './components/DiagnosePanel'
import { parseArgoAppUrl, type ArgoAppInfo } from '@/lib/url-parser'
import { useI18n } from './I18nProvider'

type Tab = 'diagnose' | 'config'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('diagnose')
  const [appInfo, setAppInfo] = useState<ArgoAppInfo | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    const updateIfAppPage = (url: string) => {
      const parsed = parseArgoAppUrl(url)
      if (parsed) setAppInfo(parsed)
    }

    // Read initial URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url
      if (url) updateIfAppPage(url)
    })

    // Update when the active tab navigates (URL change within the same tab)
    const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id === tabId) {
            updateIfAppPage(changeInfo.url!)
          }
        })
      }
    }

    // Update when the user switches to a different tab
    const onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab?.url) updateIfAppPage(tab.url)
      })
    }

    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onActivated.addListener(onActivated)
    return () => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onActivated.removeListener(onActivated)
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('appTitle')}</h1>
        <nav className="tab-nav">
          <button
            className={activeTab === 'diagnose' ? 'active' : ''}
            onClick={() => setActiveTab('diagnose')}
          >
            {t('tabDiagnose')}
          </button>
          <button
            className={activeTab === 'config' ? 'active' : ''}
            onClick={() => setActiveTab('config')}
          >
            {t('tabSettings')}
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div style={{ display: activeTab === 'config' ? undefined : 'none' }}>
          <ConfigPanel />
        </div>
        <div style={{ display: activeTab === 'diagnose' ? undefined : 'none' }}>
          {appInfo ? (
            <DiagnosePanel appInfo={appInfo} />
          ) : (
            <p className="empty-state">
              {t('emptyState')}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
