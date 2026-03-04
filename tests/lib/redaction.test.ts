import { describe, it, expect } from 'vitest'
import { redactSensitiveValues, redactResourceList } from '@/lib/redaction'

describe('redactSensitiveValues', () => {
  it('redacts values for keys matching sensitive patterns', () => {
    const input = {
      username: 'admin',
      password: 'secret123',
      database: 'mydb',
    }
    const result = redactSensitiveValues(input)
    expect(result).toEqual({
      username: 'admin',
      password: '[REDACTED]',
      database: 'mydb',
    })
  })

  it('handles various sensitive key patterns', () => {
    const input = {
      password: 'v1',
      secret_key: 'v2',
      api_token: 'v3',
      apiKey: 'v4',
      credential: 'v5',
      private_key: 'v6',
      access_key: 'v7',
      auth_header: 'v8',
      connection_string: 'v9',
      normalField: 'visible',
    }
    const result = redactSensitiveValues(input)
    expect(result.normalField).toBe('visible')
    expect(result.password).toBe('[REDACTED]')
    expect(result.secret_key).toBe('[REDACTED]')
    expect(result.api_token).toBe('[REDACTED]')
    expect(result.apiKey).toBe('[REDACTED]')
    expect(result.credential).toBe('[REDACTED]')
    expect(result.private_key).toBe('[REDACTED]')
    expect(result.access_key).toBe('[REDACTED]')
    expect(result.auth_header).toBe('[REDACTED]')
    expect(result.connection_string).toBe('[REDACTED]')
  })

  it('redacts nested sensitive keys', () => {
    const input = {
      spec: {
        template: {
          metadata: { labels: { app: 'web' } },
          spec: {
            containers: [{
              env: [
                { name: 'DB_HOST', value: 'localhost' },
              ],
              secretRef: 'some-secret-value',
            }],
          },
        },
      },
    }
    const result = redactSensitiveValues(input)
    expect(result.spec.template.metadata.labels.app).toBe('web')
    expect(result.spec.template.spec.containers[0].env[0].value).toBe('localhost')
    expect(result.spec.template.spec.containers[0].secretRef).toBe('[REDACTED]')
  })

  it('handles null and undefined', () => {
    expect(redactSensitiveValues(null)).toBeNull()
    expect(redactSensitiveValues(undefined)).toBeUndefined()
  })

  it('handles arrays', () => {
    const input = [{ password: '123' }, { name: 'ok' }]
    const result = redactSensitiveValues(input)
    expect(result).toEqual([{ password: '[REDACTED]' }, { name: 'ok' }])
  })

  it('does not mutate input', () => {
    const input = { password: 'secret' }
    redactSensitiveValues(input)
    expect(input.password).toBe('secret')
  })
})

describe('redactResourceList', () => {
  it('removes Secret data fields entirely', () => {
    const resources = [
      { kind: 'Secret', metadata: { name: 'my-secret' }, data: { key: 'dmFsdWU=' }, type: 'Opaque' },
      { kind: 'ConfigMap', metadata: { name: 'my-cm' }, data: { key: 'value' } },
    ]
    const result = redactResourceList(resources)
    expect(result[0].data).toBe('[REDACTED - Secret data removed]')
    expect(result[0].metadata.name).toBe('my-secret')
    expect(result[1].data.key).toBe('value')
  })

  it('redacts sensitive keys in non-Secret resources', () => {
    const resources = [
      { kind: 'ConfigMap', data: { db_host: 'localhost', db_password: 'secret' } },
    ]
    const result = redactResourceList(resources)
    expect(result[0].data.db_host).toBe('localhost')
    expect(result[0].data.db_password).toBe('[REDACTED]')
  })

  it('preserves Secret valueFrom references', () => {
    const resources = [{
      kind: 'Deployment',
      spec: {
        template: {
          spec: {
            containers: [{
              env: [
                { name: 'DB_HOST', value: 'localhost' },
                { name: 'DB_PASS', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'password' } } },
              ],
            }],
          },
        },
      },
    }]
    const result = redactResourceList(resources)
    expect(result[0].spec.template.spec.containers[0].env[1].valueFrom.secretKeyRef.name).toBe('db-secret')
  })
})
