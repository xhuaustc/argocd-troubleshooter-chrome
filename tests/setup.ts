import { vi } from 'vitest'

const mockChrome = {
  tabs: {
    onActivated: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    query: vi.fn(),
  },
  sidePanel: {
    setOptions: vi.fn(),
    setPanelBehavior: vi.fn(),
  },
  cookies: {
    get: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
}

vi.stubGlobal('chrome', mockChrome)
