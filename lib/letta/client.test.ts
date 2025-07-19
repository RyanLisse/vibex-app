import { beforeEach, describe, expect, it } from 'vitest'
import type { AgentConfig, LettaConfig, Message } from './client'
import {
  AgentConfigSchema,
  AgentTypeSchema,
  createLettaClient,
  LettaClient,
  LettaConfigSchema,
  MessageSchema,
} from './client'

// Mock fetch globally
const mockFetch = (globalThis.fetch =
  globalThis.fetch ||
  (() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      body: new ReadableStream(),
    })))

describe('LettaClient', () => {
  let client: LettaClient
  let config: LettaConfig

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      projectId: 'test-project',
    }
    client = new LettaClient(config)
  })

  describe('Schemas', () => {
    describe('LettaConfigSchema', () => {
      it('should parse valid config', () => {
        const validConfig = {
          apiKey: 'test-key',
          baseUrl: 'https://custom.api.com',
          projectId: 'project-123',
        }
        const parsed = LettaConfigSchema.parse(validConfig)
        expect(parsed).toEqual(validConfig)
      })

      it('should use default baseUrl', () => {
        const config = { apiKey: 'test-key' }
        const parsed = LettaConfigSchema.parse(config)
        expect(parsed.baseUrl).toBe('https://api.letta.com')
      })

      it('should make projectId optional', () => {
        const config = { apiKey: 'test-key' }
        const parsed = LettaConfigSchema.parse(config)
        expect(parsed.projectId).toBeUndefined()
      })
    })

    describe('AgentTypeSchema', () => {
      it('should validate agent types', () => {
        const validTypes = ['orchestrator', 'brainstorm', 'low-latency', 'memgpt', 'react']
        validTypes.forEach((type) => {
          expect(() => AgentTypeSchema.parse(type)).not.toThrow()
        })
      })

      it('should reject invalid agent types', () => {
        expect(() => AgentTypeSchema.parse('invalid-type')).toThrow()
      })
    })

    describe('MessageSchema', () => {
      it('should parse valid message', () => {
        const message = {
          id: 'msg-123',
          role: 'user' as const,
          content: 'Hello world',
          timestamp: new Date(),
          agentId: 'agent-123',
          metadata: { key: 'value' },
        }
        const parsed = MessageSchema.parse(message)
        expect(parsed).toEqual(message)
      })

      it('should make metadata optional', () => {
        const message = {
          id: 'msg-123',
          role: 'assistant' as const,
          content: 'Response',
          timestamp: new Date(),
          agentId: 'agent-123',
        }
        const parsed = MessageSchema.parse(message)
        expect(parsed.metadata).toBeUndefined()
      })
    })

    describe('AgentConfigSchema', () => {
      it('should parse valid agent config', () => {
        const agentConfig = {
          id: 'agent-123',
          name: 'Test Agent',
          type: 'orchestrator' as const,
          model: 'gemini-1.5-pro',
          systemPrompt: 'You are a helpful assistant',
          tools: ['web_search'],
          memoryBlocks: ['context'],
          voiceEnabled: true,
          lowLatency: false,
        }
        const parsed = AgentConfigSchema.parse(agentConfig)
        expect(parsed).toEqual(agentConfig)
      })

      it('should use defaults for optional fields', () => {
        const minimalConfig = {
          id: 'agent-123',
          name: 'Test Agent',
          type: 'orchestrator' as const,
          systemPrompt: 'You are helpful',
        }
        const parsed = AgentConfigSchema.parse(minimalConfig)
        expect(parsed.model).toBe('gemini-1.5-pro')
        expect(parsed.tools).toEqual([])
        expect(parsed.memoryBlocks).toEqual([])
        expect(parsed.voiceEnabled).toBe(false)
        expect(parsed.lowLatency).toBe(false)
      })
    })
  })

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeDefined()
    })

    it('should validate config on creation', () => {
      expect(() => new LettaClient({ apiKey: '' } as any)).toThrow()
    })

    it('should set up base headers', () => {
      // Access private property for testing
      const headers = (client as any).baseHeaders
      expect(headers.Authorization).toBe('Bearer test-api-key')
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('request method', () => {
    it('should make successful API request', async () => {
      const mockResponse = { id: 'test-123' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await (client as any).request('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect((client as any).request('/invalid-endpoint')).rejects.toThrow(
        'Letta API error: 404 Not Found'
      )
    })

    it('should merge custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await (client as any).request('/test', {
        headers: { 'Custom-Header': 'value' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
            'Custom-Header': 'value',
          }),
        })
      )
    })
  })

  describe('createAgent', () => {
    it('should create agent with valid config', async () => {
      const mockResponse = { id: 'agent-123' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const agentConfig: AgentConfig = {
        id: '',
        name: 'Test Agent',
        type: 'orchestrator',
        model: 'gemini-1.5-pro',
        systemPrompt: 'You are helpful',
        tools: ['web_search'],
        memoryBlocks: ['context'],
        voiceEnabled: true,
        lowLatency: false,
      }

      const result = await client.createAgent(agentConfig)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Agent',
            agent_type: 'orchestrator',
            llm_config: {
              model: 'gemini-1.5-pro',
              model_endpoint_type: 'google',
            },
            system: 'You are helpful',
            tools: ['web_search'],
            memory_blocks: ['context'],
            metadata: {
              voice_enabled: true,
              low_latency: false,
            },
          }),
        })
      )
    })
  })

  describe('getAgent', () => {
    it('should get agent by ID', async () => {
      const mockAgent: AgentConfig = {
        id: 'agent-123',
        name: 'Test Agent',
        type: 'orchestrator',
        model: 'gemini-1.5-pro',
        systemPrompt: 'You are helpful',
        tools: [],
        memoryBlocks: [],
        voiceEnabled: false,
        lowLatency: false,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      })

      const result = await client.getAgent('agent-123')

      expect(result).toEqual(mockAgent)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      )
    })
  })

  describe('listAgents', () => {
    it('should list all agents', async () => {
      const mockAgents: AgentConfig[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'orchestrator',
          model: 'gemini-1.5-pro',
          systemPrompt: 'System 1',
          tools: [],
          memoryBlocks: [],
          voiceEnabled: false,
          lowLatency: false,
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'brainstorm',
          model: 'gemini-1.5-pro',
          systemPrompt: 'System 2',
          tools: [],
          memoryBlocks: [],
          voiceEnabled: true,
          lowLatency: true,
        },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: mockAgents }),
      })

      const result = await client.listAgents()

      expect(result).toEqual(mockAgents)
      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/agents', expect.any(Object))
    })
  })

  describe('deleteAgent', () => {
    it('should delete agent by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await client.deleteAgent('agent-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('sendMessage', () => {
    it('should send regular message', async () => {
      const mockMessage: Message = {
        id: 'msg-123',
        role: 'assistant',
        content: 'Hello back!',
        timestamp: new Date(),
        agentId: 'agent-123',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessage),
      })

      const result = await client.sendMessage('agent-123', 'Hello!')

      expect(result).toEqual(mockMessage)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/messages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Hello!' }),
        })
      )
    })

    it('should send streaming message', async () => {
      const mockStream = new ReadableStream()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      })

      const result = await client.sendMessage('agent-123', 'Hello!', true)

      expect(result).toBe(mockStream)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/messages/stream',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Hello!', stream: true }),
        })
      )
    })

    it('should throw error on streaming failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(client.sendMessage('agent-123', 'Hello!', true)).rejects.toThrow(
        'Letta API error: 500'
      )
    })
  })

  describe('getMessages', () => {
    it('should get messages with default limit', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
          agentId: 'agent-123',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
          agentId: 'agent-123',
        },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      })

      const result = await client.getMessages('agent-123')

      expect(result).toEqual(mockMessages)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/messages?limit=50',
        expect.any(Object)
      )
    })

    it('should get messages with custom limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      })

      await client.getMessages('agent-123', 10)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/messages?limit=10',
        expect.any(Object)
      )
    })
  })

  describe('createVoiceSession', () => {
    it('should create voice session', async () => {
      const mockSession = { sessionId: 'voice-session-123' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      })

      const result = await client.createVoiceSession('agent-123')

      expect(result).toEqual(mockSession)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/voice/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            voice_config: {
              provider: 'google',
              voice_id: 'en-US-Neural2-F',
            },
          }),
        })
      )
    })
  })

  describe('sendVoiceMessage', () => {
    it('should send voice message', async () => {
      const mockResponse = {
        audio_response: [1, 2, 3, 4],
        text_response: 'Voice response text',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const audioData = new ArrayBuffer(10)
      const result = await client.sendVoiceMessage('agent-123', 'session-123', audioData)

      expect(result.textResponse).toBe('Voice response text')
      expect(result.audioResponse).toBeInstanceOf(ArrayBuffer)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/voice/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
          },
          body: expect.any(FormData),
        })
      )
    })

    it('should throw error on voice API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      })

      const audioData = new ArrayBuffer(10)
      await expect(client.sendVoiceMessage('agent-123', 'session-123', audioData)).rejects.toThrow(
        'Voice API error: 400'
      )
    })
  })

  describe('sendAgentMessage', () => {
    it('should send message between agents', async () => {
      const mockMessage: Message = {
        id: 'msg-123',
        role: 'assistant',
        content: 'Agent communication',
        timestamp: new Date(),
        agentId: 'agent-to-123',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessage),
      })

      const result = await client.sendAgentMessage('agent-from-123', 'agent-to-123', 'Hello agent!')

      expect(result).toEqual(mockMessage)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-from-123/send-to/agent-to-123',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Hello agent!' }),
        })
      )
    })
  })

  describe('updateMemory', () => {
    it('should update agent memory block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await client.updateMemory('agent-123', 'context', 'Updated context content')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/memory/context',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: 'Updated context content' }),
        })
      )
    })
  })

  describe('getMemory', () => {
    it('should get agent memory', async () => {
      const mockMemory = {
        context: 'Current context',
        preferences: 'User preferences',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMemory),
      })

      const result = await client.getMemory('agent-123')

      expect(result).toEqual(mockMemory)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/agents/agent-123/memory',
        expect.any(Object)
      )
    })
  })

  describe('createLettaClient', () => {
    it('should use createLettaClient function', () => {
      // Set environment variables for this test
      const originalApiKey = process.env.LETTA_API_KEY
      const originalBaseUrl = process.env.LETTA_BASE_URL

      process.env.LETTA_API_KEY = 'env-api-key'
      process.env.LETTA_BASE_URL = 'https://env.api.com'

      try {
        const client = createLettaClient()
        expect(client).toBeInstanceOf(LettaClient)
      } finally {
        // Restore original values
        if (originalApiKey !== undefined) {
          process.env.LETTA_API_KEY = originalApiKey
        } else {
          delete process.env.LETTA_API_KEY
        }
        if (originalBaseUrl !== undefined) {
          process.env.LETTA_BASE_URL = originalBaseUrl
        } else {
          delete process.env.LETTA_BASE_URL
        }
      }
    })
  })
})
