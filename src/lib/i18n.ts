export type Language = 'en' | 'zh'

const en = {
  // App
  appTitle: 'ArgoCD Troubleshooter',
  tabDiagnose: 'Diagnose',
  tabSettings: 'Settings',
  emptyState: 'Navigate to an ArgoCD Application Detail page to start diagnosing.',

  // ConfigPanel
  languageLabel: 'Language / 语言',
  presetLabel: 'Preset',
  presetCustom: 'Custom',
  presetOpenAI: 'OpenAI',
  presetAnthropic: 'Anthropic (requires adapter)',
  apiEndpointLabel: 'API Endpoint',
  apiKeyLabel: 'API Key',
  apiKeyHint: 'Stored in session only. Cleared when browser closes.',
  modelLabel: 'Model',
  advancedSettings: 'Advanced Settings',
  temperatureLabel: 'Temperature',
  maxTokensLabel: 'Max Tokens',
  btnTesting: 'Testing...',
  btnConnected: 'Connected!',
  btnFailed: 'Failed',
  btnTestConnection: 'Test Connection',
  btnSaved: 'Saved!',
  btnSave: 'Save',

  // DiagnosePanel
  applicationLabel: 'Application:',
  btnStartDiagnosis: 'Start Diagnosis',
  collectingData: 'Collecting data from ArgoCD...',
  previewDisclaimer: 'The above data will be sent to your configured LLM. Review it before proceeding.',
  btnCancel: 'Cancel',
  btnCopy: 'Copy',
  btnCopied: 'Copied!',
  btnSendToLLM: 'Send to LLM',
  btnReDiagnose: 'Re-diagnose',
  btnTryAgain: 'Try Again',
  errorNoToken: 'Could not find ArgoCD auth token. Please ensure you are logged into ArgoCD.',
  errorCollectFailed: 'Failed to collect data',
  errorNoApiKey: 'LLM API key not configured. Go to Settings tab.',
  errorLLMFailed: 'LLM request failed',

  healthyResult: 'The application is perfectly healthy. All resources are synced and running normally.',

  // ContentPreview
  viewDataSent: 'View data being sent to LLM',

  // DiagnosticResult
  analyzing: 'Analyzing...',
} as const

const zh: Record<keyof typeof en, string> = {
  // App
  appTitle: 'ArgoCD 故障排查助手',
  tabDiagnose: '诊断',
  tabSettings: '设置',
  emptyState: '请导航到 ArgoCD 应用详情页面以开始诊断。',

  // ConfigPanel
  languageLabel: 'Language / 语言',
  presetLabel: '预设',
  presetCustom: '自定义',
  presetOpenAI: 'OpenAI',
  presetAnthropic: 'Anthropic（需要适配器）',
  apiEndpointLabel: 'API 端点',
  apiKeyLabel: 'API 密钥',
  apiKeyHint: '仅存储在会话中，浏览器关闭后自动清除。',
  modelLabel: '模型',
  advancedSettings: '高级设置',
  temperatureLabel: '温度',
  maxTokensLabel: '最大令牌数',
  btnTesting: '测试中...',
  btnConnected: '已连接！',
  btnFailed: '连接失败',
  btnTestConnection: '测试连接',
  btnSaved: '已保存！',
  btnSave: '保存',

  // DiagnosePanel
  applicationLabel: '应用：',
  btnStartDiagnosis: '开始诊断',
  collectingData: '正在从 ArgoCD 收集数据...',
  previewDisclaimer: '以上数据将发送到您配置的 LLM，请在继续之前进行检查。',
  btnCancel: '取消',
  btnCopy: '复制',
  btnCopied: '已复制！',
  btnSendToLLM: '发送到 LLM',
  btnReDiagnose: '重新诊断',
  btnTryAgain: '重试',
  errorNoToken: '未找到 ArgoCD 认证令牌，请确认您已登录 ArgoCD。',
  errorCollectFailed: '数据收集失败',
  errorNoApiKey: 'LLM API 密钥未配置，请前往设置页面。',
  errorLLMFailed: 'LLM 请求失败',

  healthyResult: '应用非常健康，所有资源已同步且运行正常。',

  // ContentPreview
  viewDataSent: '查看发送到 LLM 的数据',

  // DiagnosticResult
  analyzing: '分析中...',
}

const dictionaries = { en, zh } as const

export type TranslationKey = keyof typeof en

export function createT(lang: Language): (key: TranslationKey) => string {
  const dict = dictionaries[lang]
  return (key) => dict[key]
}
