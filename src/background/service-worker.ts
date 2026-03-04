// Enable side panel to be opened via extension action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

// Inline URL matching to avoid import/chunk issues in service worker
function isArgoAppPage(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '')
    return /\/applications\/[^/]+(\/[^/]+)?$/.test(pathname)
  } catch {
    return false
  }
}

// Set badge to indicate when on an ArgoCD page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    updateBadge(tabId, changeInfo.url)
  }
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) updateBadge(activeInfo.tabId, tab.url)
  } catch {
    // Tab may have been closed during activation event
  }
})

function updateBadge(tabId: number, url: string) {
  if (isArgoAppPage(url)) {
    chrome.action.setBadgeText({ tabId, text: '!' })
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#0d47a1' })
  } else {
    chrome.action.setBadgeText({ tabId, text: '' })
  }
}
