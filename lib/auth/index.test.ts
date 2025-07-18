import fs from 'fs/promises'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Auth, type AuthInfo } from './index'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    chmod: vi.fn(),
  },
}))

describe('Auth', () => {
  const mockDataDir = path.join(process.cwd(), '.auth')
  const mockFilepath = path.join(mockDataDir, 'auth.json')

  const oauthAuth: AuthInfo = {
    type: 'oauth',
    refresh: 'test-refresh-token',
    access: 'test-access-token',
    expires: Date.now() + 3_600_000, // 1 hour from now
  }

  const apiAuth: AuthInfo = {
    type: 'api',
    key: 'test-api-key',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Set default mock behaviors
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.chmod).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('get', () => {
    it('should return OAuth auth info when provider exists', async () => {
      const mockData = {
        provider1: oauthAuth,
        provider2: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData))

      const result = await Auth.get('provider1')

      expect(result).toEqual(oauthAuth)
      expect(fs.mkdir).toHaveBeenCalledWith(mockDataDir, { recursive: true })
      expect(fs.readFile).toHaveBeenCalledWith(mockFilepath, 'utf-8')
    })

    it('should return API auth info when provider exists', async () => {
      const mockData = {
        provider1: oauthAuth,
        provider2: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData))

      const result = await Auth.get('provider2')

      expect(result).toEqual(apiAuth)
    })

    it('should return undefined when provider does not exist', async () => {
      const mockData = {
        provider1: oauthAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData))

      const result = await Auth.get('nonexistent')

      expect(result).toBeUndefined()
    })

    it('should return undefined when auth data is invalid', async () => {
      const mockData = {
        provider1: { type: 'invalid', data: 'test' },
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData))

      const result = await Auth.get('provider1')

      expect(result).toBeUndefined()
    })

    it('should return undefined when file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))

      const result = await Auth.get('provider1')

      expect(result).toBeUndefined()
    })

    it('should return undefined when file contains invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce('invalid json')

      const result = await Auth.get('provider1')

      expect(result).toBeUndefined()
    })

    it('should handle mkdir failure gracefully', async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('Permission denied'))
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ provider1: oauthAuth }))

      const result = await Auth.get('provider1')

      expect(result).toEqual(oauthAuth)
    })
  })

  describe('all', () => {
    it('should return all auth info', async () => {
      const mockData = {
        provider1: oauthAuth,
        provider2: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData))

      const result = await Auth.all()

      expect(result).toEqual(mockData)
      expect(fs.mkdir).toHaveBeenCalledWith(mockDataDir, { recursive: true })
      expect(fs.readFile).toHaveBeenCalledWith(mockFilepath, 'utf-8')
    })

    it('should return empty object when file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))

      const result = await Auth.all()

      expect(result).toEqual({})
    })

    it('should return empty object when file contains invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce('invalid json')

      const result = await Auth.all()

      expect(result).toEqual({})
    })
  })

  describe('set', () => {
    it('should save OAuth auth info', async () => {
      const existingData = {
        provider1: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(existingData))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.set('provider2', oauthAuth)

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilepath,
        JSON.stringify(
          {
            provider1: apiAuth,
            provider2: oauthAuth,
          },
          null,
          2
        )
      )
      expect(fs.chmod).toHaveBeenCalledWith(mockFilepath, 0o600)
    })

    it('should save API auth info', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT')) // No existing file
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.set('provider1', apiAuth)

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilepath,
        JSON.stringify(
          {
            provider1: apiAuth,
          },
          null,
          2
        )
      )
      expect(fs.chmod).toHaveBeenCalledWith(mockFilepath, 0o600)
    })

    it('should overwrite existing auth info for same provider', async () => {
      const existingData = {
        provider1: oauthAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(existingData))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      const newAuth: AuthInfo = {
        type: 'api',
        key: 'new-api-key',
      }

      await Auth.set('provider1', newAuth)

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilepath,
        JSON.stringify(
          {
            provider1: newAuth,
          },
          null,
          2
        )
      )
    })

    it('should handle write errors', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({}))
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Permission denied'))

      await expect(Auth.set('provider1', apiAuth)).rejects.toThrow('Permission denied')
    })

    it('should handle chmod errors', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({}))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)
      vi.mocked(fs.chmod).mockRejectedValueOnce(new Error('Permission denied'))

      await expect(Auth.set('provider1', apiAuth)).rejects.toThrow('Permission denied')
    })
  })

  describe('remove', () => {
    it('should remove auth info for provider', async () => {
      const existingData = {
        provider1: oauthAuth,
        provider2: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(existingData))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.remove('provider1')

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilepath,
        JSON.stringify(
          {
            provider2: apiAuth,
          },
          null,
          2
        )
      )
      expect(fs.chmod).toHaveBeenCalledWith(mockFilepath, 0o600)
    })

    it('should handle removing non-existent provider', async () => {
      const existingData = {
        provider1: oauthAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(existingData))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.remove('nonexistent')

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilepath,
        JSON.stringify(
          {
            provider1: oauthAuth,
          },
          null,
          2
        )
      )
    })

    it('should handle removing from empty file', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.remove('provider1')

      expect(fs.writeFile).toHaveBeenCalledWith(mockFilepath, JSON.stringify({}, null, 2))
    })

    it('should handle write errors during removal', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ provider1: oauthAuth }))
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Disk full'))

      await expect(Auth.remove('provider1')).rejects.toThrow('Disk full')
    })
  })

  describe('data validation', () => {
    it('should validate OAuth auth structure', async () => {
      const invalidOauth = {
        provider1: {
          type: 'oauth',
          refresh: 'token',
          // missing access and expires
        },
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(invalidOauth))

      const result = await Auth.get('provider1')

      expect(result).toBeUndefined()
    })

    it('should validate API auth structure', async () => {
      const invalidApi = {
        provider1: {
          type: 'api',
          // missing key
        },
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(invalidApi))

      const result = await Auth.get('provider1')

      expect(result).toBeUndefined()
    })

    it('should handle mixed valid and invalid auth entries', async () => {
      const mixedData = {
        valid: oauthAuth,
        invalid: { type: 'unknown' },
        valid2: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mixedData))

      const allData = await Auth.all()

      // All data is returned, validation happens on get()
      expect(allData).toEqual(mixedData)

      // Reset mocks for individual get calls
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mixedData))

      const validResult = await Auth.get('valid')
      expect(validResult).toEqual(oauthAuth)

      const invalidResult = await Auth.get('invalid')
      expect(invalidResult).toBeUndefined()
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent reads', async () => {
      const mockData = {
        provider1: oauthAuth,
        provider2: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData))

      const results = await Promise.all([Auth.get('provider1'), Auth.get('provider2'), Auth.all()])

      expect(results[0]).toEqual(oauthAuth)
      expect(results[1]).toEqual(apiAuth)
      expect(results[2]).toEqual(mockData)
    })

    it('should handle concurrent writes', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({}))
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const newAuth1: AuthInfo = { type: 'api', key: 'key1' }
      const newAuth2: AuthInfo = { type: 'api', key: 'key2' }

      // Note: In real scenarios, this could cause race conditions
      // The test demonstrates the API usage, but the implementation
      // might need locking for production use
      await Promise.all([Auth.set('provider1', newAuth1), Auth.set('provider2', newAuth2)])

      expect(fs.writeFile).toHaveBeenCalled()
    })
  })

  describe('file permissions', () => {
    it('should set correct permissions on new file', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.set('provider1', apiAuth)

      expect(fs.chmod).toHaveBeenCalledWith(mockFilepath, 0o600)
    })

    it('should maintain permissions on update', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ existing: oauthAuth }))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.set('new', apiAuth)

      expect(fs.chmod).toHaveBeenCalledWith(mockFilepath, 0o600)
    })
  })

  describe('edge cases', () => {
    it('should handle very long auth tokens', async () => {
      const longTokenAuth: AuthInfo = {
        type: 'oauth',
        refresh: 'x'.repeat(1000),
        access: 'y'.repeat(1000),
        expires: Date.now() + 3_600_000,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({}))
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)

      await Auth.set('provider1', longTokenAuth)

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilepath,
        expect.stringContaining('x'.repeat(1000))
      )
    })

    it('should handle special characters in provider names', async () => {
      const specialProviders = {
        'provider/with/slashes': oauthAuth,
        'provider:with:colons': apiAuth,
        'provider@with@at': oauthAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(specialProviders))

      const result = await Auth.get('provider/with/slashes')

      expect(result).toEqual(oauthAuth)
    })

    it('should handle empty provider name', async () => {
      const data = {
        '': oauthAuth,
        normal: apiAuth,
      }

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(data))

      const result = await Auth.get('')

      expect(result).toEqual(oauthAuth)
    })
  })
})
