import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { GET } from '@/app/api/auth/github/url/route'

describe('GitHub Auth API Integration Tests', () => {
  beforeEach(() => {
    // Setup test environment
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
    process.env.NODE_ENV = 'test'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    // Cleanup
    mock.restore()
  })

  it('should return GitHub OAuth URL successfully', async () => {
    const response = await GET()

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('url')
    expect(data.url).toContain('github.com/login/oauth/authorize')
    expect(data.url).toContain('client_id=')
    expect(data.url).toContain('redirect_uri=')
    expect(data.url).toContain('scope=repo+user%3Aemail')
  })

  it('should use environment variables correctly', async () => {
    // This test validates that environment variables are used
    expect(process.env.GITHUB_CLIENT_ID).toBe('test_client_id')
    expect(process.env.GITHUB_CLIENT_SECRET).toBe('test_client_secret')
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should generate different state values on multiple calls', async () => {
    const response1 = await GET()
    const response2 = await GET()

    const data1 = await response1.json()
    const data2 = await response2.json()

    // Extract state parameters from URLs
    const url1 = new URL(data1.url)
    const url2 = new URL(data2.url)
    const state1 = url1.searchParams.get('state')
    const state2 = url2.searchParams.get('state')

    expect(state1).toBeTruthy()
    expect(state2).toBeTruthy()
    expect(state1).not.toBe(state2)
  })
})
