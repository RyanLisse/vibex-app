// Comprehensive coverage tests for GitHub API uncovered lines
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubAPI } from './github-api'

describe('GitHubAPI Coverage Tests', () => {
  let api: GitHubAPI

  beforeEach(() => {
    api = new GitHubAPI('test-token')
    global.fetch = vi.fn()
  })

  describe('error handling edge cases', () => {
    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout')
      timeoutError.name = 'TimeoutError'

      global.fetch = vi.fn().mockRejectedValue(timeoutError)

      await expect(api.getUser()).rejects.toThrow('Network timeout')
    })

    it('should handle fetch abortion', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'

      global.fetch = vi.fn().mockRejectedValue(abortError)

      await expect(api.getUser()).rejects.toThrow('The operation was aborted')
    })

    it('should handle connection refused', async () => {
      const connectionError = new Error('Connection refused')
      connectionError.name = 'ConnectionError'

      global.fetch = vi.fn().mockRejectedValue(connectionError)

      await expect(api.getUser()).rejects.toThrow('Connection refused')
    })
  })

  describe('HTTP status code edge cases', () => {
    it('should handle 401 unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('{"message": "Bad credentials"}'),
      })

      await expect(api.getUser()).rejects.toThrow('GitHub API error: Bad credentials')
    })

    it('should handle 403 forbidden with rate limit', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Map([
          ['x-ratelimit-remaining', '0'],
          ['x-ratelimit-reset', String(Math.floor(Date.now() / 1000) + 3600)],
        ]),
        text: () => Promise.resolve('{"message": "API rate limit exceeded"}'),
      })

      await expect(api.getUser()).rejects.toThrow('GitHub API error: API rate limit exceeded')
    })

    it('should handle 422 validation failed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: () =>
          Promise.resolve(
            '{"message": "Validation Failed", "errors": [{"field": "name", "code": "missing"}]}'
          ),
      })

      await expect(api.createRepository({ name: '' })).rejects.toThrow(
        'GitHub API error: Validation Failed'
      )
    })

    it('should handle 500 internal server error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('{"message": "Server Error"}'),
      })

      await expect(api.getUser()).rejects.toThrow('GitHub API error: Server Error')
    })
  })

  describe('response parsing edge cases', () => {
    it('should handle malformed JSON response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('invalid json response'),
      })

      await expect(api.getUser()).rejects.toThrow('HTTP error: 400 Bad Request')
    })

    it('should handle empty error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(''),
      })

      await expect(api.getUser()).rejects.toThrow('HTTP error: 404 Not Found')
    })

    it('should handle response without message field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"error": "Something went wrong"}'),
      })

      await expect(api.getUser()).rejects.toThrow('HTTP error: 400 Bad Request')
    })
  })

  describe('repository operations with edge cases', () => {
    it('should handle createRepository with all options', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 123,
            name: 'test-repo',
            full_name: 'user/test-repo',
            private: true,
            description: 'Test repository',
          }),
      })

      const result = await api.createRepository({
        name: 'test-repo',
        description: 'Test repository',
        private: true,
        auto_init: true,
        gitignore_template: 'Node',
        license_template: 'mit',
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('test-repo')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'token test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            name: 'test-repo',
            description: 'Test repository',
            private: true,
            auto_init: true,
            gitignore_template: 'Node',
            license_template: 'mit',
          }),
        })
      )
    })

    it('should handle getRepositories with all query parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            { id: 1, name: 'repo1', full_name: 'user/repo1' },
            { id: 2, name: 'repo2', full_name: 'user/repo2' },
          ]),
      })

      const result = await api.getRepositories({
        type: 'owner',
        sort: 'updated',
        direction: 'desc',
        per_page: 50,
        page: 2,
      })

      expect(result).toHaveLength(2)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?type=owner&sort=updated&direction=desc&per_page=50&page=2',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token test-token',
          }),
        })
      )
    })

    it('should handle getBranches with protection details', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              name: 'main',
              commit: { sha: 'abc123' },
              protected: true,
              protection: {
                enabled: true,
                required_status_checks: {
                  enforcement_level: 'everyone',
                  contexts: ['ci/build'],
                },
              },
            },
            {
              name: 'develop',
              commit: { sha: 'def456' },
              protected: false,
            },
          ]),
      })

      const result = await api.getBranches('user', 'repo')

      expect(result).toHaveLength(2)
      expect(result[0].protected).toBe(true)
      expect(result[1].protected).toBe(false)
    })
  })

  describe('pagination and limits', () => {
    it('should handle large repository lists', async () => {
      const largeRepoList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `user/repo-${i + 1}`,
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(largeRepoList),
      })

      const result = await api.getRepositories({ per_page: 100 })
      expect(result).toHaveLength(100)
    })

    it('should handle empty repository list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })

      const result = await api.getRepositories()
      expect(result).toEqual([])
    })

    it('should handle empty branch list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })

      const result = await api.getBranches('user', 'repo')
      expect(result).toEqual([])
    })
  })

  describe('authentication edge cases', () => {
    it('should handle token with special characters', () => {
      const specialToken = 'ghp_1234567890abcdef!@#$%^&*()_+'
      const apiWithSpecialToken = new GitHubAPI(specialToken)
      expect(apiWithSpecialToken).toBeDefined()
    })

    it('should handle very long tokens', () => {
      const longToken = 'ghp_' + 'a'.repeat(1000)
      const apiWithLongToken = new GitHubAPI(longToken)
      expect(apiWithLongToken).toBeDefined()
    })

    it('should handle empty token', () => {
      expect(() => new GitHubAPI('')).not.toThrow()
    })
  })
})
