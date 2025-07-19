/**
 * AI Chat Integration Tests
 * Testing AI SDK patterns with mock language models
 */

import { generateText, streamText } from 'ai'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  AITestUtils,
  createErrorTestChatModel,
  createSlowTestChatModel,
  createStaticTestChatModel,
  createTestChatModel,
} from '@/lib/ai/testing/mock-language-model'

describe('AI Chat Testing Patterns', () => {
  describe('Mock Language Model', () => {
    it('should return deterministic responses for explain prompts', async () => {
      const model = createTestChatModel()
      const prompt = AITestUtils.createTestPrompt('Explain quantum computing')

      const result = await generateText({
        model,
        prompt,
      })

      expect(result.text).toContain('Here is an explanation of the concept')
      expect(result.finishReason).toBe('stop')
      AITestUtils.assertResponseContains(result.text, 'explanation')
    })

    it('should return code responses for code prompts', async () => {
      const model = createTestChatModel()
      const prompt = AITestUtils.createTestPrompt('Write a TypeScript function')

      const result = await generateText({
        model,
        prompt,
      })

      expect(result.text).toContain('```typescript')
      expect(result.text).toContain('function example()')
      expect(result.finishReason).toBe('stop')
    })

    it('should return greeting responses for hello prompts', async () => {
      const model = createTestChatModel()
      const prompt = AITestUtils.createTestPrompt('Hello there')

      const result = await generateText({
        model,
        prompt,
      })

      expect(result.text).toContain('Hello!')
      expect(result.text).toContain('How can I help you')
      expect(result.finishReason).toBe('stop')
    })

    it('should handle error responses', async () => {
      const model = createTestChatModel()
      const prompt = AITestUtils.createTestPrompt('This should trigger an error')

      const result = await generateText({
        model,
        prompt,
      })

      expect(result.text).toContain('I encountered an error')
      expect(result.finishReason).toBe('error')
    })
  })

  describe('Static Test Chat Model', () => {
    it('should return static response', async () => {
      const staticResponse = 'This is a static test response'
      const model = createStaticTestChatModel(staticResponse)
      const prompt = AITestUtils.createTestPrompt('Any prompt')

      const result = await generateText({
        model,
        prompt,
      })

      expect(result.text).toBe(staticResponse)
      expect(result.finishReason).toBe('stop')
    })

    it('should handle custom finish reasons', async () => {
      const model = createStaticTestChatModel('Response cut short', 'length')
      const prompt = AITestUtils.createTestPrompt('Test prompt')

      const result = await generateText({
        model,
        prompt,
      })

      expect(result.text).toBe('Response cut short')
      expect(result.finishReason).toBe('length')
    })
  })

  describe('Streaming Responses', () => {
    it('should stream responses with proper chunks', async () => {
      const model = createTestChatModel()
      const prompt = AITestUtils.createTestPrompt('Hello')

      const result = await streamText({
        model,
        prompt,
      })

      const chunks: string[] = []
      for await (const chunk of result.textStream) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
      const fullText = chunks.join('')
      expect(fullText).toContain('Hello!')
    })

    it('should handle slow streaming responses', async () => {
      const response = 'This is a slow response with multiple words'
      const model = createSlowTestChatModel(response, 500) // 500ms total delay
      const prompt = AITestUtils.createTestPrompt('Test slow response')

      const start = Date.now()
      const result = await streamText({
        model,
        prompt,
      })

      let fullText = ''
      for await (const chunk of result.textStream) {
        fullText += chunk
      }

      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(400) // Account for some timing variance
      expect(fullText.trim()).toBe(response)
    })

    it('should handle streaming with custom responses', async () => {
      const customResponses = {
        test: {
          chunks: [
            { type: 'text-delta' as const, textDelta: 'Custom ' },
            { type: 'text-delta' as const, textDelta: 'test ' },
            { type: 'text-delta' as const, textDelta: 'response' },
            { type: 'finish' as const, finishReason: 'stop' as const },
          ],
          delay: 10,
        },
      }

      const model = createTestChatModel(customResponses)
      const prompt = AITestUtils.createTestPrompt('This is a test message')

      const result = await streamText({
        model,
        prompt,
      })

      let fullText = ''
      for await (const chunk of result.textStream) {
        fullText += chunk
      }

      expect(fullText).toBe('Custom test response')
    })
  })

  describe('Error Handling', () => {
    it('should handle model errors gracefully', async () => {
      const model = createErrorTestChatModel('Test AI error')
      const prompt = AITestUtils.createTestPrompt('This should fail')

      await expect(
        generateText({
          model,
          prompt,
        })
      ).rejects.toThrow('Test AI error')
    })

    it('should handle streaming errors', async () => {
      const model = createErrorTestChatModel('Streaming error')
      const prompt = AITestUtils.createTestPrompt('This should fail in streaming')

      await expect(
        streamText({
          model,
          prompt,
        })
      ).rejects.toThrow('Streaming error')
    })
  })

  describe('Conversation Testing', () => {
    it('should handle multi-turn conversations', async () => {
      const model = createTestChatModel()
      const conversation = AITestUtils.createConversation([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello! How can I help you?' },
        { role: 'user', content: 'Explain machine learning' },
      ])

      const result = await generateText({
        model,
        prompt: conversation,
      })

      expect(result.text).toContain('Here is an explanation')
      expect(result.text).toContain('detailed explanation')
    })

    it('should maintain context across conversation turns', async () => {
      const model = createStaticTestChatModel(
        'I understand your question about the previous topic.'
      )
      const conversation = AITestUtils.createConversation([
        { role: 'user', content: 'What is TypeScript?' },
        { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript.' },
        { role: 'user', content: 'How do I use it in my project?' },
      ])

      const result = await generateText({
        model,
        prompt: conversation,
      })

      expect(result.text).toContain('I understand your question')
      expect(result.finishReason).toBe('stop')
    })
  })

  describe('AI Test Utils', () => {
    it('should create test prompts correctly', () => {
      const userPrompt = AITestUtils.createTestPrompt('Test message')
      expect(userPrompt).toEqual([{ role: 'user', content: 'Test message' }])

      const assistantPrompt = AITestUtils.createTestPrompt('Assistant message', 'assistant')
      expect(assistantPrompt).toEqual([{ role: 'assistant', content: 'Assistant message' }])
    })

    it('should create conversations correctly', () => {
      const conversation = AITestUtils.createConversation([
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
      ])

      expect(conversation).toHaveLength(3)
      expect(conversation[0]).toEqual({ role: 'user', content: 'First message' })
      expect(conversation[1]).toEqual({ role: 'assistant', content: 'First response' })
      expect(conversation[2]).toEqual({ role: 'user', content: 'Second message' })
    })

    it('should assert response content correctly', () => {
      const response = 'This is a test response with specific content'

      // Should not throw for content that exists
      expect(() => {
        AITestUtils.assertResponseContains(response, 'test response')
      }).not.toThrow()

      // Should throw for content that doesn't exist
      expect(() => {
        AITestUtils.assertResponseContains(response, 'missing content')
      }).toThrow('Expected response to contain "missing content"')
    })
  })
})
