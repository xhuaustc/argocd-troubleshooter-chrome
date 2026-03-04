import { parseArgoAppUrl } from '../lib/url-parser'

// Enable side panel to be opened via extension action
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

// Track current ArgoCD app info per tab and update side panel availability
async function checkTab(tabId: number, url: string | undefined) {
  if (!url) {
    await chrome.sidePanel.setOptions({ tabId, enabled: false })
    return
  }

  const appInfo = parseArgoAppUrl(url)
  if (appInfo) {
    await chrome.sidePanel.setOptions({ tabId, enabled: true })
  } else {
    await chrome.sidePanel.setOptions({ tabId, enabled: false })
  }
}

// Listen for tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    checkTab(tabId, changeInfo.url)
  }
})

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  checkTab(activeInfo.tabId, tab.url)
})
