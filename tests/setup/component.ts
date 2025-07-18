import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Store original environment
const originalEnv = { ...process.env }

// Component test specific cleanup
afterEach(() => {
  // Cleanup React components
  cleanup()
  
  // Restore environment variables
  process.env = { ...originalEnv }
  
  // Clear timers and mocks
  vi.clearAllTimers()
  vi.clearAllMocks()
  
  // Reset DOM state
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

// Component test specific setup
beforeEach(() => {
  // Set test environment
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('VITEST_POOL_ID', '1')
  
  // Set up component test specific environment
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
  vi.stubEnv('NEXT_PUBLIC_WS_URL', 'ws://localhost:3000')
})

// Mock Next.js navigation with component-specific behavior
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn().mockImplementation((url) => {
      // Simulate route change
      window.dispatchEvent(new PopStateEvent('popstate'))
      return Promise.resolve()
    }),
    back: vi.fn().mockImplementation(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    }),
    forward: vi.fn(),
    refresh: vi.fn().mockImplementation(() => {
      window.location.reload()
    }),
    replace: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

// Mock Next.js Image with responsive behavior
vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, width, height, priority, ...props }) => {
    return (
      <img
        {...props}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...props.style,
        }}
      />
    )
  }),
}))

// Mock Next.js Link with proper behavior
vi.mock('next/link', () => ({
  default: vi.fn((href, children, ...props ) => 
    return (
      <a
        {...props}
        href={href}
        onClick={(e) => {
          if (props.onClick) props.onClick(e)
          // Simulate navigation
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      >children
      </a>
    )
  }),
}))

// Mock browser APIs with component-specific implementations
global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
  const observer = {
    observe: vi.fn((element) => {
      // Simulate intersection for components
      setTimeout(() => {
        callback([
          {
            target: element,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: element.getBoundingClientRect(),
            rootBounds: { top: 0, left: 0, bottom: 1000, right: 1000 },
            time: Date.now(),
          },
        ])
      }, 100)
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [],
    takeRecords: vi.fn().mockReturnValue([]),
  }
  return observer
})

global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((element) => {
    // Simulate resize for components
    setTimeout(() => {
      callback([
        {
          target: element,
          contentRect: { width: 1000, height: 600 },
          borderBoxSize: [{ inlineSize: 1000, blockSize: 600 }],
          contentBoxSize: [{ inlineSize: 1000, blockSize: 600 }],
          devicePixelContentBoxSize: [{ inlineSize: 1000, blockSize: 600 }],
        },
      ])
    }, 100)
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia with component-responsive behavior
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => {
    const matches = (() => {
      if (query.includes('max-width: 640px')) return false // sm
      if (query.includes('max-width: 768px')) return false // md
      if (query.includes('max-width: 1024px')) return false // lg
      if (query.includes('max-width: 1280px')) return true // xl
      if (query.includes('prefers-reduced-motion')) return false
      if (query.includes('prefers-color-scheme: dark')) return false
      return true
    })()
    
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  }),
})

// Mock localStorage with component state persistence
const localStorageData: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => {
    return localStorageData[key] || null
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value
    // Simulate storage event
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        oldValue: localStorageData[key],
        newValue: value,
        url: window.location.href,
      })
    )
  }),
  removeItem: vi.fn((key: string) => {
    const oldValue = localStorageData[key]
    delete localStorageData[key]
    // Simulate storage event
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        oldValue,
        newValue: null,
        url: window.location.href,
      })
    )
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach(key => delete localStorageData[key])
  }),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageData: Record<string, string> = {}
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageData[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageData[key]
  }),
  clear: vi.fn(() => {
    Object.keys(sessionStorageData).forEach(key => delete sessionStorageData[key])
  }),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock fetch with component-specific responses
global.fetch = vi.fn().mockImplementation(async (url, options) => {
  const response = {
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
    text: async () => 'OK',
    headers: new Headers(),
    url: url as string,
  }
  
  // Handle component-specific API endpoints
  if (url.toString().includes('/api/auth/status')) {
    return Promise.resolve({
      ...response,
      json: async () => ({ authenticated: true, user: { id: 'test-user', name: 'Test User' } }),
    })
  }
  
  if (url.toString().includes('/api/tasks/')) {
    return Promise.resolve({
      ...response,
      json: async () => ({ 
        id: 'test-task', 
        status: 'pending',
        messages: [],
        createdAt: new Date().toISOString(),
      }),
    })
  }
  
  if (url.toString().includes('/api/inngest/')) {
    return Promise.resolve({
      ...response,
      json: async () => ({ eventId: 'test-event' }),
    })
  }
  
  return Promise.resolve(response)
})

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => `test-uuid-${Date.now()}-${Math.random()}`),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
    subtle: {
      digest: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
      generateKey: vi.fn(),
      deriveKey: vi.fn(),
      deriveBits: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
    },
  },
})

// Mock WebSocket with message handling
global.WebSocket = vi.fn().mockImplementation((url) => {
  const ws = {
    url,
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn((data) => {
      // Echo messages back for component testing
      setTimeout(() => {
        if (ws.onmessage) {
          ws.onmessage({ data: JSON.stringify({ echo: data }) })
        }
      }, 100)
    }),
    close: vi.fn(() => {
      ws.readyState = 3
      if (ws.onclose) ws.onclose(new CloseEvent('close'))
    }),
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  }
  
  // Simulate connection
  setTimeout(() => {
    ws.readyState = 1
    if (ws.onopen) ws.onopen(new Event('open'))
  }, 100)
  
  return ws
})

// Mock performance
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  },
})

// Mock URL and URLSearchParams
global.URL = class URL {
  constructor(url: string, base?: string) {
    this.href = url
    this.origin = 'http://localhost:3000'
    this.pathname = '/'
    this.search = ''
    this.hash = ''
  }
  href: string
  origin: string
  pathname: string
  search: string
  hash: string
  toString() {
    return this.href
  }
}

global.URLSearchParams = class URLSearchParams {
  private params: Record<string, string> = {}
  
  constructor(init?: string | URLSearchParams | Record<string, string>) {
    if (typeof init === 'string') {
      // Parse query string
      init.split('&').forEach(param => {
        const [key, value] = param.split('=')
        if (key) this.params[key] = value || ''
      })
    } else if (init instanceof URLSearchParams) {
      this.params = { ...init.params }
    } else if (init && typeof init === 'object') {
      this.params = { ...init }
    }
  }
  
  get(key: string) {
    return this.params[key] || null
  }
  
  set(key: string, value: string) {
    this.params[key] = value
  }
  
  has(key: string) {
    return key in this.params
  }
  
  delete(key: string) {
    delete this.params[key]
  }
  
  toString() {
    return Object.entries(this.params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }
}

// Suppress specific console messages for component tests
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  console.error = vi.fn((message) => {
    // Suppress React component warnings in tests
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') || 
       message.includes('ReactDOM.render') ||
       message.includes('act(...)'))
    ) {
      return
    }
    originalError(message)
  })
  
  console.warn = vi.fn((message) => {
    // Suppress component warnings
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') ||
       message.includes('deprecated'))
    ) {
      return
    }
    originalWarn(message)
  })
})

afterEach(() => {
  console.error = originalError
  console.warn = originalWarn
})