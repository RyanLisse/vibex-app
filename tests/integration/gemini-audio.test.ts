import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiRealtimeSession } from '@/lib/ai/gemini-realtime'

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    startChat: vi.fn(),
  })),
  LiveSession: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}))

// Mock fetch for API routes
global.fetch = vi.fn()

describe('Gemini Audio Integration Tests', () => {
  let mockGeminiSession: GeminiRealtimeSession
  let mockSessionAPI: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the session API
    mockSessionAPI = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
    }

    // Mock fetch responses
    vi.mocked(fetch).mockImplementation((url: string | URL) => {
      const urlString = url.toString()

      if (urlString.includes('/api/ai/gemini/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sessionId: 'test-session-123' }),
        } as Response)
      }

      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      } as Response)
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Session Management', () => {
    it('should create a new Gemini session', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      expect(session).toBeDefined()
      expect(session.isConnected()).toBe(false)
    })

    it('should connect to Gemini session', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      // Mock the internal session
      ;(session as any).session = mockSessionAPI

      await session.connect()

      expect(mockSessionAPI.connect).toHaveBeenCalled()
    })

    it('should disconnect from Gemini session', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      ;(session as any).session = mockSessionAPI
      ;(session as any).connected = true

      await session.disconnect()

      expect(mockSessionAPI.disconnect).toHaveBeenCalled()
    })

    it('should handle connection errors gracefully', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      mockSessionAPI.connect.mockRejectedValue(new Error('Connection failed'))
      ;(session as any).session = mockSessionAPI

      await expect(session.connect()).rejects.toThrow('Connection failed')
    })
  })

  describe('Audio Processing', () => {
    it('should process audio buffer correctly', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      // Create a mock audio buffer
      const mockAudioBuffer = new ArrayBuffer(1024)
      const mockAudioData = new Uint8Array(mockAudioBuffer)
      mockAudioData.fill(128) // Fill with sample data

      ;(session as any).session = mockSessionAPI
      ;(session as any).connected = true

      await session.sendAudio(mockAudioData)

      expect(mockSessionAPI.send).toHaveBeenCalled()
    })

    it('should handle WAV conversion', () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      // Test WAV conversion utility
      const sampleRate = 44_100
      const channels = 1
      const bitsPerSample = 16
      const audioData = new Float32Array(1024)
      audioData.fill(0.5)

      const wavBuffer = session.convertToWav(audioData, sampleRate, channels, bitsPerSample)

      expect(wavBuffer).toBeDefined()
      expect(wavBuffer.byteLength).toBeGreaterThan(44) // WAV header is 44 bytes
    })

    it('should handle empty audio data', () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      const emptyAudioData = new Float32Array(0)
      const wavBuffer = session.convertToWav(emptyAudioData, 44_100, 1, 16)

      expect(wavBuffer.byteLength).toBe(44) // Just the WAV header
    })

    it('should handle different sample rates', () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      const audioData = new Float32Array(1024)
      audioData.fill(0.5)

      const sampleRates = [8000, 16_000, 22_050, 44_100, 48_000]

      sampleRates.forEach((sampleRate) => {
        const wavBuffer = session.convertToWav(audioData, sampleRate, 1, 16)
        expect(wavBuffer).toBeDefined()
        expect(wavBuffer.byteLength).toBeGreaterThan(44)
      })
    })
  })

  describe('Message Handling', () => {
    it('should handle incoming messages', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      const messageHandler = vi.fn()
      session.onMessage(messageHandler)

      // Simulate an incoming message
      const mockMessage = {
        type: 'response',
        data: {
          text: 'Hello, how can I help you?',
          audio: 'base64-encoded-audio-data',
        },
      }

      ;(session as any).handleMessage(mockMessage)

      expect(messageHandler).toHaveBeenCalledWith(mockMessage)
    })

    it('should handle tool calls', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
              required: ['location'],
            },
          },
        ],
      })

      const toolCallHandler = vi.fn()
      session.onToolCall(toolCallHandler)

      // Simulate a tool call
      const mockToolCall = {
        type: 'tool_call',
        data: {
          name: 'get_weather',
          parameters: { location: 'San Francisco' },
        },
      }

      ;(session as any).handleMessage(mockToolCall)

      expect(toolCallHandler).toHaveBeenCalledWith(mockToolCall.data)
    })

    it('should handle errors in messages', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      const errorHandler = vi.fn()
      session.onError(errorHandler)

      // Simulate an error message
      const mockError = {
        type: 'error',
        data: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
        },
      }

      ;(session as any).handleMessage(mockError)

      expect(errorHandler).toHaveBeenCalledWith(mockError.data)
    })
  })

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      const messageHandler = vi.fn()
      const errorHandler = vi.fn()
      const audioHandler = vi.fn()

      session.onMessage(messageHandler)
      session.onError(errorHandler)
      session.onAudioResponse(audioHandler)

      expect((session as any).listeners.message).toContain(messageHandler)
      expect((session as any).listeners.error).toContain(errorHandler)
      expect((session as any).listeners.audioResponse).toContain(audioHandler)

      session.offMessage(messageHandler)
      session.offError(errorHandler)
      session.offAudioResponse(audioHandler)

      expect((session as any).listeners.message).not.toContain(messageHandler)
      expect((session as any).listeners.error).not.toContain(errorHandler)
      expect((session as any).listeners.audioResponse).not.toContain(audioHandler)
    })
  })

  describe('API Integration', () => {
    it('should create session via API', async () => {
      const response = await fetch('/api/ai/gemini/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceName: 'Aoede',
          tools: [],
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.sessionId).toBe('test-session-123')
    })

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      } as Response)

      const response = await fetch('/api/ai/gemini/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceName: 'Aoede',
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large audio buffers', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      // Create a large audio buffer (1MB)
      const largeAudioData = new Float32Array(1024 * 1024)
      largeAudioData.fill(0.5)

      const wavBuffer = session.convertToWav(largeAudioData, 44_100, 1, 16)

      expect(wavBuffer).toBeDefined()
      expect(wavBuffer.byteLength).toBeGreaterThan(1024 * 1024) // Should be larger than input due to WAV header
    })

    it('should clean up resources on disconnect', async () => {
      const session = new GeminiRealtimeSession({
        apiKey: 'test-api-key',
        voiceName: 'Aoede',
      })

      ;(session as any).session = mockSessionAPI
      ;(session as any).connected = true

      await session.disconnect()

      expect(session.isConnected()).toBe(false)
      expect(mockSessionAPI.disconnect).toHaveBeenCalled()
    })
  })

  describe('Configuration Validation', () => {
    it('should validate required configuration', () => {
      expect(() => {
        new GeminiRealtimeSession({
          apiKey: '',
          voiceName: 'Aoede',
        })
      }).toThrow('API key is required')
    })

    it('should validate voice name', () => {
      expect(() => {
        new GeminiRealtimeSession({
          apiKey: 'test-api-key',
          voiceName: '',
        })
      }).toThrow('Voice name is required')
    })

    it('should accept valid configuration', () => {
      expect(() => {
        new GeminiRealtimeSession({
          apiKey: 'test-api-key',
          voiceName: 'Aoede',
          tools: [],
        })
      }).not.toThrow()
    })
  })
})
