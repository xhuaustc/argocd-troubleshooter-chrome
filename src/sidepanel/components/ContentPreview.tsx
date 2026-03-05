import { useI18n } from '../I18nProvider'

interface ContentPreviewProps {
  content: string
}

export function ContentPreview({ content }: ContentPreviewProps) {
  const { t } = useI18n()
  return (
    <details className="content-preview">
      <summary>{t('viewDataSent')} ({content.length} chars)</summary>
      <pre>{content}</pre>
    </details>
  )
}
