import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LLMClient } from '@/lib/llm-client'
import type { LLMConfig } from '@/lib/types'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const config: LLMConfig = {
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 4096,
}

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

describe('LLMClient', () => {
  let client: LLMClient

  beforeEach(() => {
    mockFetch.mockReset()
    client = new LLMClient(config, 'sk-test-key')
  })

  describe('streamChat', () => {
    it('streams content from SSE response', async () => {
      const stream = createSSEStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ])
      mockFetch.mockResolvedValue({ ok: true, body: stream })

      const chunks: string[] = []
      for await (const chunk of client.streamChat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', ' world'])
    })

    it('sends correct request format', async () => {
      const stream = createSSEStream(['data: [DONE]\n\n'])
      mockFetch.mockResolvedValue({ ok: true, body: stream })

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'diagnose this' },
      ]

      // Consume the generator
      for await (const _ of client.streamChat(messages)) { /* noop */ }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key',
          }),
          body: expect.stringContaining('"stream":true'),
        }),
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.model).toBe('gpt-4o')
      expect(body.messages).toEqual(messages)
      expect(body.temperature).toBe(0.3)
      expect(body.max_tokens).toBe(4096)
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('invalid api key'),
      })

      const gen = client.streamChat([{ role: 'user', content: 'hi' }])
      await expect(gen.next()).rejects.toThrow('LLM API error: 401')
    })

    it('handles chunked SSE data', async () => {
      // Data split across multiple chunks
      const stream = createSSEStream([
        'data: {"choices":[{"delta":{"conte',
        'nt":"split"}}]}\n\ndata: [DONE]\n\n',
      ])
      mockFetch.mockResolvedValue({ ok: true, body: stream })

      const chunks: string[] = []
      for await (const chunk of client.streamChat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['split'])
    })

    it('skips empty lines and malformed JSON', async () => {
      const stream = createSSEStream([
        '\n',
        'data: not-json\n\n',
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
        'data: [DONE]\n\n',
      ])
      mockFetch.mockResolvedValue({ ok: true, body: stream })

      const chunks: string[] = []
      for await (const chunk of client.streamChat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['ok'])
    })
  })

  describe('testConnection', () => {
    it('returns true on successful models endpoint call', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      const result = await client.testConnection()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
        }),
      )
    })

    it('returns false on error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      const result = await client.testConnection()
      expect(result).toBe(false)
    })

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('network error'))
      const result = await client.testConnection()
      expect(result).toBe(false)
    })
  })
})
