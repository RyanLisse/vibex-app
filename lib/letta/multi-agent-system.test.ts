import { describe, expect, it } from 'vitest'
import { AgentEventSchema, MultiAgentConfigSchema, SessionSchema } from './multi-agent-system'

describe('MultiAgentSystem Schemas', () => {
  describe('MultiAgentConfigSchema', () => {
    it('should parse valid config', () => {
      const config = {
        orchestrator: {},
        brainstorm: {},
        enableVoice: true,
        enableLowLatency: false,
        maxConcurrentSessions: 20,
      }
      const parsed = MultiAgentConfigSchema.parse(config)
      expect(parsed).toEqual(config)
    })

    it('should use defaults for missing fields', () => {
      const parsed = MultiAgentConfigSchema.parse({})
      expect(parsed.enableVoice).toBe(true)
      expect(parsed.enableLowLatency).toBe(true)
      expect(parsed.maxConcurrentSessions).toBe(10)
    })

    it('should make orchestrator and brainstorm configs optional', () => {
      const configs = [
        { orchestrator: { name: 'Custom' } },
        { brainstorm: { creativityLevel: 'wild' } },
        {},
      ]

      configs.forEach((config) => {
        expect(() => MultiAgentConfigSchema.parse(config)).not.toThrow()
      })
    })

    it('should validate numeric limits', () => {
      expect(() => MultiAgentConfigSchema.parse({ maxConcurrentSessions: 0 })).not.toThrow()
      expect(() => MultiAgentConfigSchema.parse({ maxConcurrentSessions: 100 })).not.toThrow()
    })
  })

  describe('SessionSchema', () => {
    it('should parse valid session', () => {
      const session = {
        id: 'session-123',
        userId: 'user-456',
        type: 'chat' as const,
        status: 'active' as const,
        activeAgents: ['orchestrator'],
        context: { key: 'value' },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
      }
      const parsed = SessionSchema.parse(session)
      expect(parsed).toEqual(session)
    })

    it('should validate session types', () => {
      const validTypes = ['chat', 'voice', 'brainstorm', 'multi-agent']
      validTypes.forEach((type) => {
        expect(() =>
          SessionSchema.parse({
            id: 'test',
            userId: 'user',
            type,
            status: 'active',
            activeAgents: [],
            context: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivity: new Date(),
          })
        ).not.toThrow()
      })
    })

    it('should validate session statuses', () => {
      const validStatuses = ['active', 'paused', 'completed', 'error']
      validStatuses.forEach((status) => {
        expect(() =>
          SessionSchema.parse({
            id: 'test',
            userId: 'user',
            type: 'chat',
            status,
            activeAgents: [],
            context: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivity: new Date(),
          })
        ).not.toThrow()
      })
    })

    it('should reject invalid session types', () => {
      expect(() =>
        SessionSchema.parse({
          id: 'test',
          userId: 'user',
          type: 'invalid',
          status: 'active',
          activeAgents: [],
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
        })
      ).toThrow()
    })

    it('should reject invalid session statuses', () => {
      expect(() =>
        SessionSchema.parse({
          id: 'test',
          userId: 'user',
          type: 'chat',
          status: 'invalid',
          activeAgents: [],
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
        })
      ).toThrow()
    })

    it('should handle empty arrays and objects', () => {
      expect(() =>
        SessionSchema.parse({
          id: 'test',
          userId: 'user',
          type: 'chat',
          status: 'active',
          activeAgents: [],
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
        })
      ).not.toThrow()
    })
  })

  describe('AgentEventSchema', () => {
    it('should parse valid agent event', () => {
      const event = {
        id: 'event-123',
        type: 'message' as const,
        fromAgent: 'orchestrator',
        toAgent: 'brainstorm',
        payload: { message: 'test' },
        timestamp: new Date(),
        sessionId: 'session-123',
      }
      const parsed = AgentEventSchema.parse(event)
      expect(parsed).toEqual(event)
    })

    it('should validate event types', () => {
      const validTypes = [
        'message',
        'task_delegation',
        'status_update',
        'collaboration_request',
        'session_handoff',
      ]
      validTypes.forEach((type) => {
        expect(() =>
          AgentEventSchema.parse({
            id: 'test',
            type,
            fromAgent: 'orchestrator',
            payload: {},
            timestamp: new Date(),
            sessionId: 'session-123',
          })
        ).not.toThrow()
      })
    })

    it('should make toAgent optional', () => {
      expect(() =>
        AgentEventSchema.parse({
          id: 'test',
          type: 'status_update',
          fromAgent: 'orchestrator',
          payload: {},
          timestamp: new Date(),
          sessionId: 'session-123',
        })
      ).not.toThrow()
    })

    it('should reject invalid event types', () => {
      expect(() =>
        AgentEventSchema.parse({
          id: 'test',
          type: 'invalid',
          fromAgent: 'orchestrator',
          payload: {},
          timestamp: new Date(),
          sessionId: 'session-123',
        })
      ).toThrow()
    })

    it('should handle complex payloads', () => {
      const complexPayload = {
        message: 'Hello',
        data: {
          nested: 'object',
          array: [1, 2, 3],
          boolean: true,
        },
        timestamp: new Date().toISOString(),
      }

      expect(() =>
        AgentEventSchema.parse({
          id: 'test',
          type: 'message',
          fromAgent: 'orchestrator',
          toAgent: 'brainstorm',
          payload: complexPayload,
          timestamp: new Date(),
          sessionId: 'session-123',
        })
      ).not.toThrow()
    })
  })
})
