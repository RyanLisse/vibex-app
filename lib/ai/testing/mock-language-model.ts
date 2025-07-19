/**
 * AI SDK Testing Patterns
 * Mock Language Models for deterministic testing
 */

import { simulateReadableStream } from 'ai'
import { MockLanguageModelV1 } from 'ai/test'

/**
 * Response chunks mapped by prompt content
 */
export interface PromptResponse {
  chunks: Array<
    | { type: 'text-delta'; textDelta: string }
    | { type: 'finish'; finishReason: 'stop' | 'length' | 'error' }
  >
  delay?: number
}

/**
 * Default response patterns for common prompts
 */
const DEFAULT_RESPONSES: Record<string, PromptResponse> = {
  explain: {
    chunks: [
      { type: 'text-delta', textDelta: 'Here is an explanation of the concept:\n\n' },
      {
        type: 'text-delta',
        textDelta: 'This is a detailed explanation that covers the key points.',
      },
      { type: 'text-delta', textDelta: ' The explanation includes relevant context and examples.' },
      { type: 'finish', finishReason: 'stop' },
    ],
    delay: 50,
  },

  code: {
    chunks: [
      { type: 'text-delta', textDelta: '```typescript\n' },
      { type: 'text-delta', textDelta: 'function example() {\n' },
      { type: 'text-delta', textDelta: '  return "Hello, World!";\n' },
      { type: 'text-delta', textDelta: '}\n```' },
      { type: 'finish', finishReason: 'stop' },
    ],
    delay: 30,
  },

  hello: {
    chunks: [
      { type: 'text-delta', textDelta: 'Hello! How can I help you today?' },
      { type: 'finish', finishReason: 'stop' },
    ],
    delay: 20,
  },

  error: {
    chunks: [
      { type: 'text-delta', textDelta: 'I encountered an error while processing your request.' },
      { type: 'finish', finishReason: 'error' },
    ],
    delay: 10,
  },

  default: {
    chunks: [
      { type: 'text-delta', textDelta: 'This is a default response for testing purposes.' },
      { type: 'finish', finishReason: 'stop' },
    ],
    delay: 25,
  },
}

/**
 * Get response chunks based on prompt content
 */
function getResponseChunksByPrompt(prompt: any): PromptResponse {
  const recentMessage = prompt[prompt.length - 1]?.content

  if (typeof recentMessage !== 'string') {
    return DEFAULT_RESPONSES.default
  }

  const content = recentMessage.toLowerCase()

  // Match prompt patterns
  if (content.includes('explain') || content.includes('what is')) {
    return DEFAULT_RESPONSES.explain
  }

  if (content.includes('code') || content.includes('function') || content.includes('typescript')) {
    return DEFAULT_RESPONSES.code
  }

  if (content.includes('hello') || content.includes('hi ') || content.includes('hey')) {
    return DEFAULT_RESPONSES.hello
  }

  if (content.includes('error') || content.includes('fail') || content.includes('throw')) {
    return DEFAULT_RESPONSES.error
  }

  return DEFAULT_RESPONSES.default
}

/**
 * Create a mock chat model for testing
 */
export function createTestChatModel(customResponses?: Record<string, PromptResponse>) {
  const responses = { ...DEFAULT_RESPONSES, ...customResponses }

  return new MockLanguageModelV1({
    doStream: async ({ prompt }) => {
      const response = getResponseChunksByPrompt(prompt)

      return {
        stream: simulateReadableStream({
          chunkDelayInMs: response.delay || 50,
          initialDelayInMs: 100,
          chunks: response.chunks,
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      }
    },

    doGenerate: async ({ prompt }) => {
      const response = getResponseChunksByPrompt(prompt)

      // Extract text from chunks
      const text = response.chunks
        .filter((chunk) => chunk.type === 'text-delta')
        .map((chunk) => (chunk.type === 'text-delta' ? chunk.textDelta : ''))
        .join('')

      const finishChunk = response.chunks.find((chunk) => chunk.type === 'finish')
      const finishReason = finishChunk?.type === 'finish' ? finishChunk.finishReason : 'stop'

      return {
        text,
        finishReason,
        rawCall: { rawPrompt: null, rawSettings: {} },
      }
    },
  })
}

/**
 * Create a mock chat model that always returns a specific response
 */
export function createStaticTestChatModel(
  response: string,
  finishReason: 'stop' | 'length' | 'error' = 'stop'
) {
  return new MockLanguageModelV1({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 25,
        initialDelayInMs: 50,
        chunks: [
          { type: 'text-delta', textDelta: response },
          { type: 'finish', finishReason },
        ],
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),

    doGenerate: async () => ({
      text: response,
      finishReason,
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  })
}

/**
 * Create a mock chat model that simulates streaming delays
 */
export function createSlowTestChatModel(response: string, delayMs: number = 1000) {
  const words = response.split(' ')
  const chunks = words.map((word) => ({ type: 'text-delta' as const, textDelta: `${word} ` }))
  chunks.push({ type: 'finish' as const, finishReason: 'stop' as const })

  return new MockLanguageModelV1({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: delayMs / words.length,
        initialDelayInMs: 100,
        chunks,
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),

    doGenerate: async () => {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, delayMs))

      return {
        text: response,
        finishReason: 'stop',
        rawCall: { rawPrompt: null, rawSettings: {} },
      }
    },
  })
}

/**
 * Create a mock chat model that simulates errors
 */
export function createErrorTestChatModel(errorMessage: string = 'Test error') {
  return new MockLanguageModelV1({
    doStream: async () => {
      throw new Error(errorMessage)
    },

    doGenerate: async () => {
      throw new Error(errorMessage)
    },
  })
}

/**
 * Test utilities for AI chat functionality
 */
export const AITestUtils = {
  /**
   * Create a test prompt array
   */
  createTestPrompt: (content: string, role: 'user' | 'assistant' = 'user') => [{ role, content }],

  /**
   * Wait for streaming to complete
   */
  waitForStream: async (stream: ReadableStream) => {
    const reader = stream.getReader()
    const chunks: string[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
          chunks.push(value.toString())
        }
      }
    } finally {
      reader.releaseLock()
    }

    return chunks.join('')
  },

  /**
   * Assert that a response contains expected content
   */
  assertResponseContains: (response: string, expectedContent: string) => {
    if (!response.includes(expectedContent)) {
      throw new Error(`Expected response to contain "${expectedContent}", but got: "${response}"`)
    }
  },

  /**
   * Assert that streaming delay is within expected range
   */
  assertStreamingDelay: async (streamPromise: Promise<any>, minMs: number, maxMs: number) => {
    const start = Date.now()
    await streamPromise
    const elapsed = Date.now() - start

    if (elapsed < minMs || elapsed > maxMs) {
      throw new Error(
        `Expected streaming delay between ${minMs}ms and ${maxMs}ms, but got ${elapsed}ms`
      )
    }
  },

  /**
   * Create multiple test messages for conversation testing
   */
  createConversation: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    messages,
}
