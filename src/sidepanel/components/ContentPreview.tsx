interface ContentPreviewProps {
  content: string
}

export function ContentPreview({ content }: ContentPreviewProps) {
  return (
    <details className="content-preview">
      <summary>View data being sent to LLM ({content.length} chars)</summary>
      <pre>{content}</pre>
    </details>
  )
}
