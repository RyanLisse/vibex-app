import { describe, expect, it } from 'vitest'
import { OrchestratorConfigSchema } from './orchestrator'

describe('OrchestratorAgent Schemas', () => {
  describe('OrchestratorConfigSchema', () => {
    it('should parse valid config', () => {
      const config = {
        name: 'Custom Orchestrator',
        geminiModel: 'gemini-1.5-flash',
        voiceEnabled: false,
        lowLatency: false,
        tools: ['web_search', 'code_execution'],
      }
      const parsed = OrchestratorConfigSchema.parse(config)
      expect(parsed).toEqual(config)
    })

    it('should use defaults for missing fields', () => {
      const parsed = OrchestratorConfigSchema.parse({})
      expect(parsed.name).toBe('Main Orchestrator')
      expect(parsed.geminiModel).toBe('gemini-1.5-pro')
      expect(parsed.voiceEnabled).toBe(true)
      expect(parsed.lowLatency).toBe(true)
      expect(parsed.tools).toEqual([
        'web_search',
        'code_execution',
        'file_management',
        'agent_communication',
      ])
    })

    it('should allow custom tools array', () => {
      const customTools = ['custom_tool_1', 'custom_tool_2']
      const parsed = OrchestratorConfigSchema.parse({ tools: customTools })
      expect(parsed.tools).toEqual(customTools)
    })

    it('should allow empty tools array', () => {
      const parsed = OrchestratorConfigSchema.parse({ tools: [] })
      expect(parsed.tools).toEqual([])
    })

    it('should validate boolean fields', () => {
      const config1 = { voiceEnabled: true, lowLatency: false }
      const config2 = { voiceEnabled: false, lowLatency: true }

      expect(() => OrchestratorConfigSchema.parse(config1)).not.toThrow()
      expect(() => OrchestratorConfigSchema.parse(config2)).not.toThrow()
    })

    it('should require string values for name and model', () => {
      expect(() => OrchestratorConfigSchema.parse({ name: 123 })).toThrow()
      expect(() => OrchestratorConfigSchema.parse({ geminiModel: 456 })).toThrow()
    })

    it('should handle partial configs', () => {
      const partialConfigs = [
        { name: 'Custom Name' },
        { geminiModel: 'custom-model' },
        { voiceEnabled: false },
        { lowLatency: false },
        { tools: ['single_tool'] },
      ]

      partialConfigs.forEach((config) => {
        expect(() => OrchestratorConfigSchema.parse(config)).not.toThrow()
      })
    })
  })
})
