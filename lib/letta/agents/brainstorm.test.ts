import { describe, expect, it } from 'vitest'
import { BrainstormConfigSchema, BrainstormSessionSchema } from './brainstorm'

describe('BrainstormAgent Schemas', () => {
  describe('BrainstormConfigSchema', () => {
    it('should parse valid config', () => {
      const config = {
        name: 'Test Agent',
        model: 'gpt-4',
        creativityLevel: 'creative' as const,
        focusAreas: ['innovation'],
      }
      const parsed = BrainstormConfigSchema.parse(config)
      expect(parsed).toEqual(config)
    })

    it('should use defaults for missing fields', () => {
      const parsed = BrainstormConfigSchema.parse({})
      expect(parsed.name).toBe('Brainstorm Guide')
      expect(parsed.model).toBe('gemini-1.5-pro')
      expect(parsed.creativityLevel).toBe('balanced')
      expect(parsed.focusAreas).toEqual([
        'problem_solving',
        'innovation',
        'strategic_thinking',
        'creative_exploration',
      ])
    })

    it('should validate creativity levels', () => {
      const validLevels = ['conservative', 'balanced', 'creative', 'wild']
      validLevels.forEach((level) => {
        expect(() => BrainstormConfigSchema.parse({ creativityLevel: level })).not.toThrow()
      })
    })

    it('should reject invalid creativity levels', () => {
      expect(() => BrainstormConfigSchema.parse({ creativityLevel: 'invalid' })).toThrow()
    })
  })

  describe('BrainstormSessionSchema', () => {
    it('should parse valid session', () => {
      const session = {
        id: 'test-123',
        userId: 'user-456',
        topic: 'New Product Ideas',
        stage: 'exploration' as const,
        ideas: [
          {
            id: 'idea-1',
            content: 'Smart home assistant',
            category: 'technology',
            score: 8,
            pros: ['Innovative', 'Useful'],
            cons: ['Complex'],
          },
        ],
        insights: ['Market gap identified'],
        nextSteps: ['Research competitors'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const parsed = BrainstormSessionSchema.parse(session)
      expect(parsed).toEqual(session)
    })

    it('should validate session stages', () => {
      const validStages = [
        'exploration',
        'clarification',
        'expansion',
        'evaluation',
        'refinement',
        'action_planning',
      ]
      validStages.forEach((stage) => {
        expect(() =>
          BrainstormSessionSchema.parse({
            id: 'test',
            userId: 'user',
            topic: 'Topic',
            stage,
            ideas: [],
            insights: [],
            nextSteps: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ).not.toThrow()
      })
    })

    it('should validate idea structure', () => {
      const validIdea = {
        id: 'idea-1',
        content: 'Test idea',
        category: 'general',
        score: 5,
        pros: ['Pro 1'],
        cons: ['Con 1'],
      }

      expect(() =>
        BrainstormSessionSchema.parse({
          id: 'test',
          userId: 'user',
          topic: 'Topic',
          stage: 'exploration',
          ideas: [validIdea],
          insights: [],
          nextSteps: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ).not.toThrow()
    })

    it('should validate idea score bounds', () => {
      const sessionBase = {
        id: 'test',
        userId: 'user',
        topic: 'Topic',
        stage: 'exploration' as const,
        insights: [],
        nextSteps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Test valid scores
      const validScores = [0, 5, 10]
      validScores.forEach((score) => {
        expect(() =>
          BrainstormSessionSchema.parse({
            ...sessionBase,
            ideas: [
              {
                id: 'idea-1',
                content: 'Test',
                category: 'test',
                score,
                pros: [],
                cons: [],
              },
            ],
          })
        ).not.toThrow()
      })

      // Test invalid scores
      const invalidScores = [-1, 11, 15]
      invalidScores.forEach((score) => {
        expect(() =>
          BrainstormSessionSchema.parse({
            ...sessionBase,
            ideas: [
              {
                id: 'idea-1',
                content: 'Test',
                category: 'test',
                score,
                pros: [],
                cons: [],
              },
            ],
          })
        ).toThrow()
      })
    })
  })
})
