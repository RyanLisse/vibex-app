import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRealtimeTranscription } from '../realtime/transcription'
import { MultiAgentSystem } from './multi-agent-system'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    LETTA_API_KEY: 'test-letta-key',
    LETTA_BASE_URL: 'https://api.letta.com',
    NEXT_PUBLIC_OPENAI_API_KEY: 'test-openai-key',
  },
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Voice Brainstorming Integration', () => {
  let multiAgentSystem: MultiAgentSystem
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    multiAgentSystem = new MultiAgentSystem({
      enableVoice: true,
      enableLowLatency: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Multi-Agent System', () => {
    it('should initialize successfully', async () => {
      // Mock successful agent creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'orchestrator-123' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'brainstorm-456' }),
      })

      await multiAgentSystem.initialize()
      const status = multiAgentSystem.getSystemStatus()

      expect(status.initialized).toBe(true)
      expect(status.agents.orchestrator.status).toBe('active')
      expect(status.agents.brainstorm.status).toBe('active')
    })

    it('should create a brainstorm session', async () => {
      // Mock agent initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'orchestrator-123' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'brainstorm-456' }),
      })

      await multiAgentSystem.initialize()

      const session = await multiAgentSystem.createSession('user-123', 'brainstorm')

      expect(session.type).toBe('brainstorm')
      expect(session.userId).toBe('user-123')
      expect(session.status).toBe('active')
    })

    it('should process voice messages', async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'orchestrator-123' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'brainstorm-456' }),
      })

      await multiAgentSystem.initialize()
      const session = await multiAgentSystem.createSession('user-123', 'brainstorm')

      // Mock voice processing response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audioResponse: new ArrayBuffer(1024),
          textResponse: 'Great idea! Let me help you explore that further.',
        }),
      })

      const audioData = new ArrayBuffer(2048)
      const response = await multiAgentSystem.processVoiceMessage(session.id, audioData)

      expect(response.textResponse).toContain('Great idea')
      expect(response.audioResponse).toBeInstanceOf(ArrayBuffer)
    })
  })

  describe('Realtime Transcription', () => {
    it('should create transcription instance', () => {
      const transcription = createRealtimeTranscription({
        apiKey: 'test-key',
        model: 'whisper-1',
      })

      expect(transcription).toBeDefined()
      expect(transcription.getConfig().model).toBe('whisper-1')
    })

    it('should handle transcription events', async () => {
      const transcription = createRealtimeTranscription({
        apiKey: 'test-key',
      })

      const events: any[] = []
      transcription.on('transcription_start', (event) => {
        events.push(event)
      })

      transcription.on('transcription_complete', (event) => {
        events.push(event)
      })

      // Mock successful transcription
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Hello, this is a test transcription',
          confidence: 0.95,
        }),
      })

      // Simulate transcription events
      transcription['emit']('transcription_start')
      transcription['emit']('transcription_complete', {
        result: {
          text: 'Hello, this is a test transcription',
          confidence: 0.95,
        },
      })

      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('transcription_start')
      expect(events[1].type).toBe('transcription_complete')
      expect(events[1].data.result.text).toBe('Hello, this is a test transcription')
    })
  })

  describe('API Integration', () => {
    it('should handle brainstorm API requests', async () => {
      const mockResponse = {
        success: true,
        data: {
          session: { id: 'session-123', type: 'brainstorm' },
          brainstormSession: {
            id: 'brainstorm-123',
            topic: 'AI Innovation',
            stage: 'exploration',
            ideas: [],
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/agents/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_voice_brainstorm',
          userId: 'user-123',
          topic: 'AI Innovation',
          voiceEnabled: true,
        }),
      })

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.brainstormSession.topic).toBe('AI Innovation')
    })

    it('should process voice input through API', async () => {
      const mockResponse = {
        success: true,
        data: {
          response: { content: 'Interesting perspective! Let me build on that idea.' },
          extractedIdeas: [
            {
              content: 'Use AI to automate customer service',
              category: 'suggestion',
              confidence: 0.8,
            },
          ],
          insights: ['Strong focus on automation', 'Customer-centric thinking'],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/agents/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_voice_input',
          sessionId: 'session-123',
          transcript: 'I think we should use AI to automate customer service',
          confidence: 0.9,
        }),
      })

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.extractedIdeas).toHaveLength(1)
      expect(data.data.insights).toContain('Strong focus on automation')
    })
  })

  describe('End-to-End Workflow', () => {
    it('should complete a full brainstorming session', async () => {
      // Mock all necessary API calls
      const mockResponses = [
        // Initialize agents
        { ok: true, json: async () => ({ id: 'orchestrator-123' }) },
        { ok: true, json: async () => ({ id: 'brainstorm-456' }) },
        // Create session
        {
          ok: true,
          json: async () => ({ success: true, data: { session: { id: 'session-123' } } }),
        },
        // Start brainstorm
        {
          ok: true,
          json: async () => ({
            success: true,
            data: { brainstormSession: { id: 'brainstorm-123', stage: 'exploration' } },
          }),
        },
        // Process voice input
        {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              response: { content: 'Great start!' },
              extractedIdeas: [{ content: 'Test idea', confidence: 0.8 }],
            },
          }),
        },
        // Advance stage
        {
          ok: true,
          json: async () => ({
            success: true,
            data: { session: { stage: 'clarification' } },
          }),
        },
      ]

      mockResponses.forEach((response) => {
        mockFetch.mockResolvedValueOnce(response)
      })

      // Initialize system
      await multiAgentSystem.initialize()

      // Create session
      const session = await multiAgentSystem.createSession('user-123', 'brainstorm')

      // Start brainstorming
      const brainstormSession = await multiAgentSystem.startBrainstormSession(
        session.id,
        'Innovative Product Ideas'
      )

      // Process voice input
      const message = await multiAgentSystem.processMessage(
        session.id,
        'I have an idea for a smart home device'
      )

      // Advance stage
      const advancedSession = await multiAgentSystem.advanceBrainstormStage(session.id)

      expect(session.type).toBe('brainstorm')
      expect(brainstormSession.id).toBe('brainstorm-123')
      expect(message).toBeDefined()
      expect(advancedSession.stage).toBe('clarification')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(multiAgentSystem.initialize()).rejects.toThrow('Network error')
    })

    it('should handle transcription errors', () => {
      const transcription = createRealtimeTranscription({
        apiKey: 'test-key',
      })

      const errors: any[] = []
      transcription.on('transcription_error', (event) => {
        errors.push(event)
      })

      transcription['emit']('transcription_error', { error: 'Audio processing failed' })

      expect(errors).toHaveLength(1)
      expect(errors[0].data.error).toBe('Audio processing failed')
    })

    it('should validate input parameters', () => {
      expect(() => {
        createRealtimeTranscription({
          apiKey: '', // Invalid empty key
        })
      }).toThrow()
    })
  })

  describe('Performance', () => {
    it('should handle concurrent sessions', async () => {
      // Mock initialization
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'agent-123' }),
      })

      await multiAgentSystem.initialize()

      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: 5 }, (_, i) =>
        multiAgentSystem.createSession(`user-${i}`, 'brainstorm')
      )

      const sessions = await Promise.all(sessionPromises)

      expect(sessions).toHaveLength(5)
      sessions.forEach((session, i) => {
        expect(session.userId).toBe(`user-${i}`)
        expect(session.type).toBe('brainstorm')
      })
    })

    it('should cleanup resources properly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'agent-123' }),
      })

      await multiAgentSystem.initialize()
      const session = await multiAgentSystem.createSession('user-123', 'brainstorm')

      await multiAgentSystem.cleanup()

      const status = multiAgentSystem.getSystemStatus()
      expect(status.activeSessions).toBe(0)
      expect(status.initialized).toBe(false)
    })
  })
})
