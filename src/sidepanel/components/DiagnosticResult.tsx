import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface DiagnosticResultProps {
  content: string
  isStreaming: boolean
}

export function DiagnosticResult({ content, isStreaming }: DiagnosticResultProps) {
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
          <span>Analyzing...</span>
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
