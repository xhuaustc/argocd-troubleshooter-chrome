import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useI18n } from '../I18nProvider'

interface DiagnosticResultProps {
  content: string
  isStreaming: boolean
}

export function DiagnosticResult({ content, isStreaming }: DiagnosticResultProps) {
  const { t } = useI18n()
  const html = useMemo(() => {
    if (!content) return ''
    const raw = marked.parse(content, { async: false }) as string
    return DOMPurify.sanitize(raw)
  }, [content])

  return (
    <div className="diagnostic-result-wrapper">
      {isStreaming && (
        <div className="loading">
          <div className="spinner" />
          <span>{t('analyzing')}</span>
        </div>
      )}
      {content && (
        <div
          className="diagnostic-result"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}
