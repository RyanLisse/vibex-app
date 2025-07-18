// Browser APIs Mocking Utilities
// Comprehensive mocking for browser-specific APIs

import { vi } from 'vitest'

// Mock notification data
export interface MockNotification {
  title: string
  body?: string
  icon?: string
  tag?: string
  timestamp: Date
}

// Mock media query data
export interface MockMediaQuery {
  media: string
  matches: boolean
  listeners: Set<(mq: MediaQueryList) => void>
}

// Mock geolocation data
export interface MockGeolocation {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
}

// Storage for mock data
let mockNotifications: MockNotification[] = []
const mockMediaQueries: Map<string, MockMediaQuery> = new Map()
let mockGeolocation: MockGeolocation | null = null

// Mock Notification API
export const mockNotificationAPI = {
  Notification: vi.fn().mockImplementation((title: string, options?: NotificationOptions) => {
    const notification: MockNotification = {
      title,
      body: options?.body,
      icon: options?.icon,
      tag: options?.tag,
      timestamp: new Date(),
    }
    mockNotifications.push(notification)

    return {
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      tag: notification.tag,
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onclick: null,
      onclose: null,
      onerror: null,
      onshow: null,
    }
  }),

  requestPermission: vi.fn().mockResolvedValue('granted'),
  permission: 'granted',
}

// Mock Media Query API
export const mockMediaQueryAPI = {
  matchMedia: vi.fn().mockImplementation((query: string) => {
    if (!mockMediaQueries.has(query)) {
      mockMediaQueries.set(query, {
        media: query,
        matches: false,
        listeners: new Set(),
      })
    }

    const mq = mockMediaQueries.get(query)!

    return {
      media: mq.media,
      matches: mq.matches,
      addListener: vi.fn().mockImplementation((listener: (mq: MediaQueryList) => void) => {
        mq.listeners.add(listener)
      }),
      removeListener: vi.fn().mockImplementation((listener: (mq: MediaQueryList) => void) => {
        mq.listeners.delete(listener)
      }),
      addEventListener: vi
        .fn()
        .mockImplementation((type: string, listener: (mq: MediaQueryList) => void) => {
          if (type === 'change') {
            mq.listeners.add(listener)
          }
        }),
      removeEventListener: vi
        .fn()
        .mockImplementation((type: string, listener: (mq: MediaQueryList) => void) => {
          if (type === 'change') {
            mq.listeners.delete(listener)
          }
        }),
      dispatchEvent: vi.fn(),
    }
  }),
}

// Mock Geolocation API
export const mockGeolocationAPI = {
  getCurrentPosition: vi.fn().mockImplementation((success: Function, error?: Function) => {
    if (mockGeolocation) {
      success({
        coords: mockGeolocation,
        timestamp: Date.now(),
      })
    } else if (error) {
      error({
        code: 1,
        message: 'User denied the request for Geolocation.',
      })
    }
  }),

  watchPosition: vi.fn().mockImplementation((success: Function, error?: Function) => {
    const watchId = Math.random()

    if (mockGeolocation) {
      success({
        coords: mockGeolocation,
        timestamp: Date.now(),
      })
    } else if (error) {
      error({
        code: 1,
        message: 'User denied the request for Geolocation.',
      })
    }

    return watchId
  }),

  clearWatch: vi.fn(),
}

// Mock Clipboard API
export const mockClipboardAPI = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue('mocked clipboard text'),
  write: vi.fn().mockResolvedValue(undefined),
  read: vi.fn().mockResolvedValue([]),
}

// Mock File API
export const mockFileAPI = {
  showOpenFilePicker: vi.fn().mockResolvedValue([
    {
      name: 'test.txt',
      kind: 'file',
      getFile: vi
        .fn()
        .mockResolvedValue(new File(['test content'], 'test.txt', { type: 'text/plain' })),
    },
  ]),

  showSaveFilePicker: vi.fn().mockResolvedValue({
    name: 'test.txt',
    kind: 'file',
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn(),
      close: vi.fn(),
    }),
  }),

  showDirectoryPicker: vi.fn().mockResolvedValue({
    name: 'test-dir',
    kind: 'directory',
    entries: vi.fn().mockResolvedValue([]),
  }),
}

// Mock Web Share API
export const mockWebShareAPI = {
  share: vi.fn().mockResolvedValue(undefined),
  canShare: vi.fn().mockReturnValue(true),
}

// Mock Payment Request API
export const mockPaymentRequestAPI = {
  PaymentRequest: vi.fn().mockImplementation((methodData, details) => ({
    show: vi.fn().mockResolvedValue({
      complete: vi.fn().mockResolvedValue(undefined),
      methodName: 'basic-card',
      details: {},
    }),
    abort: vi.fn().mockResolvedValue(undefined),
    canMakePayment: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
}

// Mock Web Workers
export const mockWebWorkerAPI = {
  Worker: vi.fn().mockImplementation((scriptURL: string) => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onerror: null,
    onmessage: null,
    onmessageerror: null,
  })),
}

// Mock Service Worker
export const mockServiceWorkerAPI = {
  register: vi.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: {
      scriptURL: '/sw.js',
      state: 'activated',
    },
    scope: '/',
    update: vi.fn(),
    unregister: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),

  getRegistration: vi.fn().mockResolvedValue(null),
  getRegistrations: vi.fn().mockResolvedValue([]),
}

// Mock Battery API
export const mockBatteryAPI = {
  getBattery: vi.fn().mockResolvedValue({
    charging: true,
    chargingTime: 5400, // 1.5 hours
    dischargingTime: Number.POSITIVE_INFINITY,
    level: 0.8,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
}

// Mock Network Information API
export const mockNetworkAPI = {
  connection: {
    effectiveType: '4g',
    rtt: 100,
    downlink: 10,
    saveData: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}

// Utility functions for managing mock state
export const browserAPIUtils = {
  // Reset all mock data
  reset: () => {
    mockNotifications = []
    mockMediaQueries.clear()
    mockGeolocation = null
    vi.clearAllMocks()
  },

  // Notification utilities
  notifications: {
    getAll: () => [...mockNotifications],
    clear: () => {
      mockNotifications = []
    },
    count: () => mockNotifications.length,
    findByTitle: (title: string) => mockNotifications.find((n) => n.title === title),
    setPermission: (permission: 'granted' | 'denied' | 'default') => {
      mockNotificationAPI.permission = permission
    },
  },

  // Media query utilities
  mediaQueries: {
    setMatch: (query: string, matches: boolean) => {
      const mq = mockMediaQueries.get(query)
      if (mq) {
        mq.matches = matches
        // Trigger listeners
        mq.listeners.forEach((listener) => {
          listener({ ...mq } as MediaQueryList)
        })
      }
    },
    getQuery: (query: string) => mockMediaQueries.get(query),
    getAllQueries: () => Array.from(mockMediaQueries.entries()),
  },

  // Geolocation utilities
  geolocation: {
    set: (location: MockGeolocation) => {
      mockGeolocation = location
    },
    clear: () => {
      mockGeolocation = null
    },
    get: () => mockGeolocation,
    simulateError: (code: number, message: string) => {
      mockGeolocationAPI.getCurrentPosition.mockImplementation((success, error) => {
        if (error) {
          error({ code, message })
        }
      })
    },
  },

  // Clipboard utilities
  clipboard: {
    setText: (text: string) => {
      mockClipboardAPI.readText.mockResolvedValue(text)
    },
    simulateError: (error: Error) => {
      mockClipboardAPI.writeText.mockRejectedValue(error)
      mockClipboardAPI.readText.mockRejectedValue(error)
    },
  },

  // Network utilities
  network: {
    setEffectiveType: (type: '2g' | '3g' | '4g' | 'slow-2g') => {
      mockNetworkAPI.connection.effectiveType = type
    },
    setRTT: (rtt: number) => {
      mockNetworkAPI.connection.rtt = rtt
    },
    setDownlink: (downlink: number) => {
      mockNetworkAPI.connection.downlink = downlink
    },
    setSaveData: (saveData: boolean) => {
      mockNetworkAPI.connection.saveData = saveData
    },
  },
}

// Setup function to apply all browser API mocks
export const setupBrowserAPIMocks = () => {
  // Notification API
  Object.assign(global, {
    Notification: mockNotificationAPI.Notification,
  })

  // Media Query API
  Object.assign(global, {
    matchMedia: mockMediaQueryAPI.matchMedia,
  })

  // Geolocation API
  Object.assign(global, {
    navigator: {
      ...global.navigator,
      geolocation: mockGeolocationAPI,
    },
  })

  // Clipboard API
  Object.assign(global, {
    navigator: {
      ...global.navigator,
      clipboard: mockClipboardAPI,
    },
  })

  // File System Access API
  Object.assign(global, {
    showOpenFilePicker: mockFileAPI.showOpenFilePicker,
    showSaveFilePicker: mockFileAPI.showSaveFilePicker,
    showDirectoryPicker: mockFileAPI.showDirectoryPicker,
  })

  // Web Share API
  Object.assign(global, {
    navigator: {
      ...global.navigator,
      share: mockWebShareAPI.share,
      canShare: mockWebShareAPI.canShare,
    },
  })

  // Payment Request API
  Object.assign(global, {
    PaymentRequest: mockPaymentRequestAPI.PaymentRequest,
  })

  // Web Workers
  Object.assign(global, {
    Worker: mockWebWorkerAPI.Worker,
  })

  // Service Worker
  Object.assign(global, {
    navigator: {
      ...global.navigator,
      serviceWorker: mockServiceWorkerAPI,
    },
  })

  // Battery API
  Object.assign(global, {
    navigator: {
      ...global.navigator,
      getBattery: mockBatteryAPI.getBattery,
    },
  })

  // Network Information API
  Object.assign(global, {
    navigator: {
      ...global.navigator,
      connection: mockNetworkAPI.connection,
    },
  })
}

// Test helpers
export const browserAPITestHelpers = {
  // Assert notification was shown
  expectNotificationShown: (title: string, options?: Partial<NotificationOptions>) => {
    expect(mockNotificationAPI.Notification).toHaveBeenCalledWith(title, options)
  },

  // Assert media query was registered
  expectMediaQueryRegistered: (query: string) => {
    expect(mockMediaQueryAPI.matchMedia).toHaveBeenCalledWith(query)
  },

  // Assert geolocation was accessed
  expectGeolocationAccessed: () => {
    expect(mockGeolocationAPI.getCurrentPosition).toHaveBeenCalled()
  },

  // Assert clipboard was used
  expectClipboardUsed: (method: 'writeText' | 'readText') => {
    expect(mockClipboardAPI[method]).toHaveBeenCalled()
  },

  // Wait for async operations
  waitForAsync: async (timeout = 100) => {
    return new Promise((resolve) => setTimeout(resolve, timeout))
  },
}

// Export setup function for easy integration
export const setupBrowserAPIs = () => {
  setupBrowserAPIMocks()
  browserAPIUtils.reset()
}

// Cleanup function
export const cleanupBrowserAPIs = () => {
  browserAPIUtils.reset()
  vi.clearAllMocks()
}
