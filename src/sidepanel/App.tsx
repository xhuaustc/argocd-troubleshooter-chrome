import { useState, useEffect } from 'react'
import { ConfigPanel } from './components/ConfigPanel'
import { DiagnosePanel } from './components/DiagnosePanel'
import { parseArgoAppUrl, type ArgoAppInfo } from '@/lib/url-parser'

type Tab = 'diagnose' | 'config'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('diagnose')
  const [appInfo, setAppInfo] = useState<ArgoAppInfo | null>(null)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url
      if (url) {
        setAppInfo(parseArgoAppUrl(url))
      }
    })
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>ArgoCD Troubleshooter</h1>
        <nav className="tab-nav">
          <button
            className={activeTab === 'diagnose' ? 'active' : ''}
            onClick={() => setActiveTab('diagnose')}
          >
            Diagnose
          </button>
          <button
            className={activeTab === 'config' ? 'active' : ''}
            onClick={() => setActiveTab('config')}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'config' && <ConfigPanel />}
        {activeTab === 'diagnose' && (
          appInfo ? (
            <DiagnosePanel appInfo={appInfo} />
          ) : (
            <p className="empty-state">
              Navigate to an ArgoCD Application Detail page to start diagnosing.
            </p>
          )
        )}
      </main>
    </div>
  )
}
