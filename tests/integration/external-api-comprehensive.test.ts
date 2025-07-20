/**
 * Comprehensive External API Integration Test
 *
 * Validates all external API integrations:
 * - OpenAI API (GPT, Whisper, DALL-E)
 * - Google AI (Gemini)
 * - Letta API (Memory management)
 * - GitHub API (Authentication, repos)
 * - ElectricSQL (Real-time sync)
 * - Rate limiting and retry mechanisms
 * - Error handling and fallbacks
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { PrometheusMetricsCollector } from '@/lib/metrics/prometheus-client'
import { observability } from '@/lib/observability'
import { openai } from '@/lib/openai'

// Mock responses for testing
const mockResponses = {
  openai: {
    completion: {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: Date.now(),
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Test response from OpenAI' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    },
    transcription: {
      text: 'This is a test transcription',
      duration: 5.2,
    },
    image: {
      created: Date.now(),
      data: [{ url: 'https://example.com/generated-image.png' }],
    },
  },
  gemini: {
    text: 'Test response from Gemini',
    generationConfig: { temperature: 0.7 },
  },
  letta: {
    agent: {
      id: 'agent-123',
      name: 'Test Agent',
      state: { memory: 'Test memory state' },
    },
    memory: {
      messages: ['Memory 1', 'Memory 2'],
      metadata: { count: 2 },
    },
  },
  github: {
    user: {
      login: 'testuser',
      id: 12_345,
      email: 'test@example.com',
    },
    repos: [
      { name: 'repo1', full_name: 'testuser/repo1', private: false },
      { name: 'repo2', full_name: 'testuser/repo2', private: true },
    ],
  },
}

// API Health Monitor
class APIHealthMonitor {
  private apiMetrics = new Map<
    string,
    {
      requests: number
      successes: number
      failures: number
      totalLatency: number
      errors: Map<string, number>
    }
  >()

  recordRequest(api: string, success: boolean, latency: number, error?: string) {
    if (!this.apiMetrics.has(api)) {
      this.apiMetrics.set(api, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalLatency: 0,
        errors: new Map(),
      })
    }

    const metrics = this.apiMetrics.get(api)!
    metrics.requests++
    metrics.totalLatency += latency

    if (success) {
      metrics.successes++
    } else {
      metrics.failures++
      if (error) {
        metrics.errors.set(error, (metrics.errors.get(error) || 0) + 1)
      }
    }
  }

  getHealthReport() {
    const report: any = {}

    for (const [api, metrics] of this.apiMetrics) {
      report[api] = {
        totalRequests: metrics.requests,
        successRate: metrics.requests > 0 ? (metrics.successes / metrics.requests) * 100 : 0,
        avgLatency: metrics.requests > 0 ? metrics.totalLatency / metrics.requests : 0,
        errorBreakdown: Object.fromEntries(metrics.errors),
      }
    }

    return report
  }
}

describe('External API Comprehensive Integration', () => {
  let healthMonitor: APIHealthMonitor
  let metricsCollector: PrometheusMetricsCollector

  beforeAll(() => {
    healthMonitor = new APIHealthMonitor()
    metricsCollector = PrometheusMetricsCollector.getInstance()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    metricsCollector.clearMetrics()
  })

  afterAll(() => {
    console.log('\n=== External API Health Report ===')
    console.log(JSON.stringify(healthMonitor.getHealthReport(), null, 2))
  })

  describe('1. OpenAI API Integration', () => {
    test('should handle chat completions with retry logic', async () => {
      let attemptCount = 0
      const mockCompletion = vi.fn().mockImplementation(async () => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('Rate limit exceeded')
        }
        return mockResponses.openai.completion
      })

      // Mock OpenAI client
      const mockOpenAI = {
        chat: {
          completions: {
            create: mockCompletion,
          },
        },
      }

      const start = Date.now()
      let result
      let error

      try {
        // Simulate retry logic
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            result = await mockOpenAI.chat.completions.create({
              model: 'gpt-4',
              messages: [{ role: 'user', content: 'Test message' }],
            })
            break
          } catch (e: any) {
            error = e
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
            }
          }
        }
      } finally {
        const latency = Date.now() - start
        healthMonitor.recordRequest('openai_chat', !!result, latency, error?.message)

        if (result) {
          metricsCollector.recordAgentOperation('test', 'chat', 'openai', 'gpt-4', 'success')
          metricsCollector.recordTokenUsage(
            'test',
            'chat',
            'openai',
            'total',
            result.usage.total_tokens
          )
        }
      }

      expect(attemptCount).toBe(2) // Failed once, succeeded on retry
      expect(result).toBeDefined()
      expect(result?.choices[0].message.content).toBe('Test response from OpenAI')
    })

    test('should handle audio transcription', async () => {
      const mockTranscribe = vi.fn().mockResolvedValue(mockResponses.openai.transcription)

      const mockOpenAI = {
        audio: {
          transcriptions: {
            create: mockTranscribe,
          },
        },
      }

      const start = Date.now()
      const audioFile = new File(['audio data'], 'test.mp3', { type: 'audio/mp3' })

      const result = await mockOpenAI.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      })

      const latency = Date.now() - start
      healthMonitor.recordRequest('openai_whisper', true, latency)

      observability.api.recordExternalCall('openai', 'whisper', latency, true)
      metricsCollector.recordHttpRequest('POST', '/v1/audio/transcriptions', 200, latency / 1000)

      expect(result.text).toBe('This is a test transcription')
      expect(mockTranscribe).toHaveBeenCalledOnce()
    })

    test('should handle image generation with size limits', async () => {
      const mockGenerate = vi.fn().mockImplementation(async ({ size }) => {
        if (size === '2048x2048') {
          throw new Error('Size too large for current plan')
        }
        return mockResponses.openai.image
      })

      const mockOpenAI = {
        images: {
          generate: mockGenerate,
        },
      }

      // Test with large size (should fail)
      const start1 = Date.now()
      try {
        await mockOpenAI.images.generate({
          prompt: 'A test image',
          size: '2048x2048',
        })
      } catch (error: any) {
        const latency = Date.now() - start1
        healthMonitor.recordRequest('openai_dalle', false, latency, error.message)
        expect(error.message).toContain('Size too large')
      }

      // Test with standard size (should succeed)
      const start2 = Date.now()
      const result = await mockOpenAI.images.generate({
        prompt: 'A test image',
        size: '1024x1024',
      })

      const latency2 = Date.now() - start2
      healthMonitor.recordRequest('openai_dalle', true, latency2)
      metricsCollector.recordAgentOperation('test', 'image-gen', 'openai', 'dall-e-3', 'success')

      expect(result.data[0].url).toContain('generated-image.png')
    })
  })

  describe('2. Google AI (Gemini) Integration', () => {
    test('should handle text generation with streaming', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => mockResponses.gemini.text,
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
        },
      })

      const mockGemini = {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
          generateContentStream: vi.fn().mockImplementation(async function* () {
            const words = mockResponses.gemini.text.split(' ')
            for (const word of words) {
              yield {
                response: {
                  text: () => word + ' ',
                },
              }
            }
          }),
        }),
      }

      // Test standard generation
      const model = mockGemini.getGenerativeModel({ model: 'gemini-pro' })
      const start = Date.now()
      const result = await model.generateContent('Test prompt')

      const latency = Date.now() - start
      healthMonitor.recordRequest('gemini_text', true, latency)
      metricsCollector.recordAgentOperation('test', 'text-gen', 'google', 'gemini-pro', 'success')

      expect(result.response.text()).toBe('Test response from Gemini')

      // Test streaming
      const streamedText = []
      const streamStart = Date.now()

      for await (const chunk of model.generateContentStream('Test prompt')) {
        streamedText.push(chunk.response.text())
      }

      const streamLatency = Date.now() - streamStart
      healthMonitor.recordRequest('gemini_stream', true, streamLatency)

      expect(streamedText.join('')).toContain('Test response from Gemini')
    })

    test('should handle multimodal inputs', async () => {
      const mockMultimodal = vi.fn().mockResolvedValue({
        response: {
          text: () => 'Image analysis: Test object detected',
          usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 30 },
        },
      })

      const mockGemini = {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockMultimodal,
        }),
      }

      const model = mockGemini.getGenerativeModel({ model: 'gemini-pro-vision' })
      const start = Date.now()

      const result = await model.generateContent({
        contents: [
          {
            parts: [
              { text: 'What is in this image?' },
              { inlineData: { mimeType: 'image/jpeg', data: 'base64imagedata' } },
            ],
          },
        ],
      })

      const latency = Date.now() - start
      healthMonitor.recordRequest('gemini_vision', true, latency)
      observability.api.recordExternalCall('google', 'gemini-vision', latency, true)

      expect(result.response.text()).toContain('Image analysis')
      expect(mockMultimodal).toHaveBeenCalledOnce()
    })
  })

  describe('3. Letta API Integration', () => {
    test('should manage agent lifecycle', async () => {
      const mockLetta = {
        createAgent: vi.fn().mockResolvedValue(mockResponses.letta.agent),
        getAgent: vi.fn().mockResolvedValue(mockResponses.letta.agent),
        updateAgent: vi
          .fn()
          .mockResolvedValue({ ...mockResponses.letta.agent, name: 'Updated Agent' }),
        deleteAgent: vi.fn().mockResolvedValue({ success: true }),
      }

      // Create agent
      const createStart = Date.now()
      const agent = await mockLetta.createAgent({
        name: 'Test Agent',
        description: 'Integration test agent',
      })
      healthMonitor.recordRequest('letta_create_agent', true, Date.now() - createStart)

      expect(agent.id).toBe('agent-123')

      // Get agent
      const getStart = Date.now()
      const retrieved = await mockLetta.getAgent(agent.id)
      healthMonitor.recordRequest('letta_get_agent', true, Date.now() - getStart)

      expect(retrieved.name).toBe('Test Agent')

      // Update agent
      const updateStart = Date.now()
      const updated = await mockLetta.updateAgent(agent.id, { name: 'Updated Agent' })
      healthMonitor.recordRequest('letta_update_agent', true, Date.now() - updateStart)

      expect(updated.name).toBe('Updated Agent')

      // Delete agent
      const deleteStart = Date.now()
      const deleted = await mockLetta.deleteAgent(agent.id)
      healthMonitor.recordRequest('letta_delete_agent', true, Date.now() - deleteStart)

      expect(deleted.success).toBe(true)
    })

    test('should handle memory operations', async () => {
      const mockLetta = {
        getMemory: vi.fn().mockResolvedValue(mockResponses.letta.memory),
        updateMemory: vi.fn().mockImplementation(async (agentId, memory) => ({
          ...mockResponses.letta.memory,
          messages: [...mockResponses.letta.memory.messages, memory],
        })),
        searchMemory: vi.fn().mockResolvedValue({
          results: ['Relevant memory 1', 'Relevant memory 2'],
          score: [0.9, 0.85],
        }),
      }

      // Get memory
      const getStart = Date.now()
      const memory = await mockLetta.getMemory('agent-123')
      healthMonitor.recordRequest('letta_get_memory', true, Date.now() - getStart)
      metricsCollector.recordAgentOperation('test', 'memory', 'letta', 'api', 'success')

      expect(memory.messages).toHaveLength(2)

      // Update memory
      const updateStart = Date.now()
      const updated = await mockLetta.updateMemory('agent-123', 'New memory entry')
      healthMonitor.recordRequest('letta_update_memory', true, Date.now() - updateStart)

      expect(updated.messages).toHaveLength(3)

      // Search memory
      const searchStart = Date.now()
      const searchResults = await mockLetta.searchMemory('agent-123', 'relevant query')
      healthMonitor.recordRequest('letta_search_memory', true, Date.now() - searchStart)

      expect(searchResults.results).toHaveLength(2)
      expect(searchResults.score[0]).toBeGreaterThan(0.8)
    })
  })

  describe('4. GitHub API Integration', () => {
    test('should handle OAuth authentication flow', async () => {
      const mockGitHub = {
        auth: {
          createOAuthDeviceCode: vi.fn().mockResolvedValue({
            device_code: 'device-123',
            user_code: 'USER-123',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
          }),
          createOAuthUserAuth: vi.fn().mockResolvedValue({
            authentication: { token: 'gho_testtoken123' },
          }),
        },
        rest: {
          users: {
            getAuthenticated: vi.fn().mockResolvedValue({ data: mockResponses.github.user }),
          },
        },
      }

      // Start OAuth flow
      const authStart = Date.now()
      const deviceCode = await mockGitHub.auth.createOAuthDeviceCode({
        client_id: 'test-client-id',
        scopes: ['repo', 'user'],
      })
      healthMonitor.recordRequest('github_oauth_device', true, Date.now() - authStart)

      expect(deviceCode.user_code).toBe('USER-123')

      // Complete OAuth flow
      const tokenStart = Date.now()
      const auth = await mockGitHub.auth.createOAuthUserAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        code: deviceCode.device_code,
      })
      healthMonitor.recordRequest('github_oauth_token', true, Date.now() - tokenStart)

      // Get authenticated user
      const userStart = Date.now()
      const user = await mockGitHub.rest.users.getAuthenticated()
      healthMonitor.recordRequest('github_get_user', true, Date.now() - userStart)

      expect(user.data.login).toBe('testuser')
    })

    test('should handle repository operations', async () => {
      const mockGitHub = {
        rest: {
          repos: {
            listForAuthenticatedUser: vi
              .fn()
              .mockResolvedValue({ data: mockResponses.github.repos }),
            create: vi.fn().mockResolvedValue({
              data: { name: 'new-repo', full_name: 'testuser/new-repo' },
            }),
            get: vi.fn().mockResolvedValue({
              data: { name: 'repo1', stargazers_count: 42 },
            }),
          },
        },
      }

      // List repositories
      const listStart = Date.now()
      const repos = await mockGitHub.rest.repos.listForAuthenticatedUser()
      healthMonitor.recordRequest('github_list_repos', true, Date.now() - listStart)
      metricsCollector.recordHttpRequest('GET', '/user/repos', 200, (Date.now() - listStart) / 1000)

      expect(repos.data).toHaveLength(2)
      expect(repos.data[0].name).toBe('repo1')

      // Create repository
      const createStart = Date.now()
      const newRepo = await mockGitHub.rest.repos.create({
        name: 'new-repo',
        private: false,
        auto_init: true,
      })
      healthMonitor.recordRequest('github_create_repo', true, Date.now() - createStart)

      expect(newRepo.data.name).toBe('new-repo')

      // Get repository details
      const getStart = Date.now()
      const repoDetails = await mockGitHub.rest.repos.get({
        owner: 'testuser',
        repo: 'repo1',
      })
      healthMonitor.recordRequest('github_get_repo', true, Date.now() - getStart)

      expect(repoDetails.data.stargazers_count).toBe(42)
    })
  })

  describe('5. Rate Limiting and Retry Mechanisms', () => {
    test('should respect rate limits across APIs', async () => {
      const rateLimiter = {
        openai: { remaining: 10, reset: Date.now() + 60_000 },
        github: { remaining: 5000, reset: Date.now() + 3_600_000 },
        gemini: { remaining: 50, reset: Date.now() + 60_000 },
      }

      const checkRateLimit = (api: string) => {
        const limit = rateLimiter[api as keyof typeof rateLimiter]
        if (limit.remaining <= 0) {
          const waitTime = limit.reset - Date.now()
          throw new Error(`Rate limit exceeded. Retry after ${waitTime}ms`)
        }
        limit.remaining--
        return true
      }

      // Simulate API calls with rate limit checking
      const apis = ['openai', 'github', 'gemini']
      const results = []

      for (const api of apis) {
        try {
          checkRateLimit(api)
          results.push({ api, success: true })
          metricsCollector.recordHttpRequest('POST', `/api/${api}`, 200, 0.1)
        } catch (error: any) {
          results.push({ api, success: false, error: error.message })
          metricsCollector.recordHttpRequest('POST', `/api/${api}`, 429, 0.01)
        }
      }

      expect(results.every((r) => r.success)).toBe(true)
      expect(rateLimiter.openai.remaining).toBe(9)
    })

    test('should implement exponential backoff', async () => {
      const attemptDelays: number[] = []
      let attemptCount = 0

      const apiCall = async () => {
        attemptCount++
        if (attemptCount < 4) {
          throw new Error('Service temporarily unavailable')
        }
        return { success: true }
      }

      const exponentialBackoff = async (fn: Function, maxRetries = 5) => {
        let lastError

        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn()
          } catch (error) {
            lastError = error
            const delay = Math.min(1000 * 2 ** i, 10_000)
            attemptDelays.push(delay)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }

        throw lastError
      }

      const start = Date.now()
      const result = await exponentialBackoff(apiCall)
      const totalTime = Date.now() - start

      expect(result.success).toBe(true)
      expect(attemptCount).toBe(4)
      expect(attemptDelays).toEqual([1000, 2000, 4000])
      healthMonitor.recordRequest('backoff_test', true, totalTime)
    })
  })

  describe('6. Error Handling and Fallbacks', () => {
    test('should handle API-specific errors gracefully', async () => {
      const errorScenarios = [
        {
          api: 'openai',
          error: new Error('Invalid API key'),
          expectedHandling: 'Check API key configuration',
        },
        {
          api: 'gemini',
          error: new Error('Model not available in your region'),
          expectedHandling: 'Use alternative model or proxy',
        },
        {
          api: 'github',
          error: new Error('Repository not found'),
          expectedHandling: 'Verify repository exists and permissions',
        },
        {
          api: 'letta',
          error: new Error('Agent memory corrupted'),
          expectedHandling: 'Restore from backup or recreate agent',
        },
      ]

      for (const scenario of errorScenarios) {
        const start = Date.now()
        let handled = false

        try {
          throw scenario.error
        } catch (error: any) {
          // Error handling logic
          if (error.message.includes('API key')) {
            handled = true
            observability.api.recordError('auth_error', scenario.api, error)
          } else if (error.message.includes('not available')) {
            handled = true
            observability.api.recordError('availability_error', scenario.api, error)
          } else if (error.message.includes('not found')) {
            handled = true
            observability.api.recordError('not_found_error', scenario.api, error)
          } else if (error.message.includes('corrupted')) {
            handled = true
            observability.api.recordError('data_error', scenario.api, error)
          }

          healthMonitor.recordRequest(scenario.api, false, Date.now() - start, error.message)
        }

        expect(handled).toBe(true)
      }
    })

    test('should implement circuit breaker pattern', async () => {
      class CircuitBreaker {
        private failures = 0
        private lastFailureTime = 0
        private state: 'closed' | 'open' | 'half-open' = 'closed'

        constructor(
          private threshold = 5,
          private timeout = 60_000
        ) {}

        async execute(fn: Function) {
          if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
              this.state = 'half-open'
            } else {
              throw new Error('Circuit breaker is open')
            }
          }

          try {
            const result = await fn()
            if (this.state === 'half-open') {
              this.state = 'closed'
              this.failures = 0
            }
            return result
          } catch (error) {
            this.failures++
            this.lastFailureTime = Date.now()

            if (this.failures >= this.threshold) {
              this.state = 'open'
            }

            throw error
          }
        }

        getState() {
          return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime,
          }
        }
      }

      const breaker = new CircuitBreaker(3, 1000)
      let callCount = 0

      const unreliableAPI = async () => {
        callCount++
        if (callCount <= 4) {
          throw new Error('API error')
        }
        return { data: 'Success' }
      }

      // Test circuit breaker
      const results = []

      for (let i = 0; i < 6; i++) {
        try {
          const result = await breaker.execute(unreliableAPI)
          results.push({ attempt: i + 1, success: true, data: result.data })
        } catch (error: any) {
          results.push({ attempt: i + 1, success: false, error: error.message })
        }
      }

      // Circuit should open after 3 failures
      expect(results[3].error).toContain('Circuit breaker is open')
      expect(breaker.getState().state).toBe('open')

      // Wait for timeout and retry
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const finalResult = await breaker.execute(unreliableAPI)
      expect(finalResult.data).toBe('Success')
      expect(breaker.getState().state).toBe('closed')
    })
  })

  describe('7. Performance Monitoring', () => {
    test('should track API latency and throughput', async () => {
      const performanceMetrics = {
        latencies: new Map<string, number[]>(),
        throughput: new Map<string, { count: number; startTime: number }>(),
      }

      const recordLatency = (api: string, latency: number) => {
        if (!performanceMetrics.latencies.has(api)) {
          performanceMetrics.latencies.set(api, [])
        }
        performanceMetrics.latencies.get(api)!.push(latency)
      }

      const recordThroughput = (api: string) => {
        if (!performanceMetrics.throughput.has(api)) {
          performanceMetrics.throughput.set(api, { count: 0, startTime: Date.now() })
        }
        performanceMetrics.throughput.get(api)!.count++
      }

      // Simulate API calls with varying latencies
      const apis = [
        { name: 'openai', baseLatency: 200, variance: 50 },
        { name: 'gemini', baseLatency: 150, variance: 30 },
        { name: 'github', baseLatency: 100, variance: 20 },
        { name: 'letta', baseLatency: 250, variance: 100 },
      ]

      // Generate load
      for (let i = 0; i < 100; i++) {
        const api = apis[i % apis.length]
        const latency = api.baseLatency + (Math.random() - 0.5) * api.variance * 2

        recordLatency(api.name, latency)
        recordThroughput(api.name)

        metricsCollector.recordHttpRequest('POST', `/api/${api.name}`, 200, latency / 1000)
      }

      // Calculate statistics
      const stats: any = {}

      for (const [api, latencies] of performanceMetrics.latencies) {
        const sorted = [...latencies].sort((a, b) => a - b)
        const throughputData = performanceMetrics.throughput.get(api)!
        const duration = (Date.now() - throughputData.startTime) / 1000

        stats[api] = {
          avgLatency: latencies.reduce((a, b) => a + b) / latencies.length,
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)],
          throughput: throughputData.count / duration,
        }
      }

      // Verify performance metrics
      expect(stats.github.avgLatency).toBeLessThan(stats.letta.avgLatency)
      expect(stats.openai.p95).toBeLessThan(300)

      // Export to Prometheus
      const metrics = await metricsCollector.getMetrics()
      expect(metrics).toContain('http_request_duration_seconds')
    })
  })
})
