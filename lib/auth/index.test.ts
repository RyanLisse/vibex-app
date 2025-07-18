import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Auth } from './index'

// Mock fs/promises
const mockFs = {
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  chmod: vi.fn(),
}

vi.mock('fs/promises', () => mockFs)

// Mock path
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
  },
}))

// Mock process.cwd
vi.mock('process', () => ({
  cwd: vi.fn(() => '/test/project'),
}))

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('get', () => {
    it('should return OAuth auth info when valid', async () => {
      const mockAuthData = {
        'test-provider': {
          type: 'oauth',
          refresh: 'refresh_token',
          access: 'access_token',
          expires: 1234567890,
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.get('test-provider')

      expect(result).toEqual({
        type: 'oauth',
        refresh: 'refresh_token',
        access: 'access_token',
        expires: 1234567890,
      })
      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/project/.auth', { recursive: true })
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/project/.auth/auth.json', 'utf-8')
    })

    it('should return API auth info when valid', async () => {
      const mockAuthData = {
        'api-provider': {
          type: 'api',
          key: 'api_key_123',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.get('api-provider')

      expect(result).toEqual({
        type: 'api',
        key: 'api_key_123',
      })
    })

    it('should return undefined when provider not found', async () => {
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({}))

      const result = await Auth.get('nonexistent-provider')

      expect(result).toBeUndefined()
    })

    it('should return undefined when auth data is invalid', async () => {
      const mockAuthData = {
        'invalid-provider': {
          type: 'invalid',
          someField: 'value',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.get('invalid-provider')

      expect(result).toBeUndefined()
    })

    it('should return undefined when file does not exist', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'))

      const result = await Auth.get('test-provider')

      expect(result).toBeUndefined()
    })

    it('should return undefined when file contains invalid JSON', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json')

      const result = await Auth.get('test-provider')

      expect(result).toBeUndefined()
    })

    it('should handle mkdir error gracefully', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'))
      mockFs.readFile.mockResolvedValueOnce('{}')

      const result = await Auth.get('test-provider')

      expect(result).toBeUndefined()
    })
  })

  describe('all', () => {
    it('should return all auth data', async () => {
      const mockAuthData = {
        'provider1': {
          type: 'oauth',
          refresh: 'refresh1',
          access: 'access1',
          expires: 123,
        },
        'provider2': {
          type: 'api',
          key: 'key2',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.all()

      expect(result).toEqual(mockAuthData)
    })

    it('should return empty object when file does not exist', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'))

      const result = await Auth.all()

      expect(result).toEqual({})
    })

    it('should return empty object when file contains invalid JSON', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json')

      const result = await Auth.all()

      expect(result).toEqual({})
    })
  })

  describe('set', () => {
    it('should set OAuth auth info', async () => {
      const existingData = {
        'existing-provider': {
          type: 'api',
          key: 'existing_key',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingData))

      const newAuthInfo = {
        type: 'oauth' as const,
        refresh: 'new_refresh',
        access: 'new_access',
        expires: 1234567890,
      }

      await Auth.set('new-provider', newAuthInfo)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/project/.auth/auth.json',
        JSON.stringify({
          'existing-provider': {
            type: 'api',
            key: 'existing_key',
          },
          'new-provider': newAuthInfo,
        }, null, 2)
      )
      expect(mockFs.chmod).toHaveBeenCalledWith('/test/project/.auth/auth.json', 0o600)
    })

    it('should set API auth info', async () => {
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({}))

      const newAuthInfo = {
        type: 'api' as const,
        key: 'new_api_key',
      }

      await Auth.set('api-provider', newAuthInfo)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/project/.auth/auth.json',
        JSON.stringify({
          'api-provider': newAuthInfo,
        }, null, 2)
      )
      expect(mockFs.chmod).toHaveBeenCalledWith('/test/project/.auth/auth.json', 0o600)
    })

    it('should overwrite existing provider', async () => {
      const existingData = {
        'provider': {
          type: 'api',
          key: 'old_key',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingData))

      const newAuthInfo = {
        type: 'oauth' as const,
        refresh: 'new_refresh',
        access: 'new_access',
        expires: 1234567890,
      }

      await Auth.set('provider', newAuthInfo)

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/project/.auth/auth.json',
        JSON.stringify({
          'provider': newAuthInfo,
        }, null, 2)
      )
    })

    it('should handle write error', async () => {
      mockFs.readFile.mockResolvedValueOnce('{}')
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write error'))

      const newAuthInfo = {
        type: 'api' as const,
        key: 'test_key',
      }

      await expect(Auth.set('provider', newAuthInfo)).rejects.toThrow('Write error')
    })
  })

  describe('remove', () => {
    it('should remove existing provider', async () => {
      const existingData = {
        'provider1': {
          type: 'oauth',
          refresh: 'refresh1',
          access: 'access1',
          expires: 123,
        },
        'provider2': {
          type: 'api',
          key: 'key2',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingData))

      await Auth.remove('provider1')

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/project/.auth/auth.json',
        JSON.stringify({
          'provider2': {
            type: 'api',
            key: 'key2',
          },
        }, null, 2)
      )
      expect(mockFs.chmod).toHaveBeenCalledWith('/test/project/.auth/auth.json', 0o600)
    })

    it('should handle removing non-existent provider', async () => {
      const existingData = {
        'provider1': {
          type: 'api',
          key: 'key1',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingData))

      await Auth.remove('nonexistent')

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/project/.auth/auth.json',
        JSON.stringify(existingData, null, 2)
      )
    })

    it('should handle removing from empty file', async () => {
      mockFs.readFile.mockResolvedValueOnce('{}')

      await Auth.remove('provider')

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/project/.auth/auth.json',
        JSON.stringify({}, null, 2)
      )
    })

    it('should handle write error during removal', async () => {
      mockFs.readFile.mockResolvedValueOnce('{}')
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write error'))

      await expect(Auth.remove('provider')).rejects.toThrow('Write error')
    })
  })

  describe('ensureDataDir', () => {
    it('should create directory if it does not exist', async () => {
      mockFs.readFile.mockResolvedValueOnce('{}')

      await Auth.get('test')

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/project/.auth', { recursive: true })
    })

    it('should handle mkdir errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Directory exists'))
      mockFs.readFile.mockResolvedValueOnce('{}')

      // Should not throw error
      await Auth.get('test')

      expect(mockFs.mkdir).toHaveBeenCalled()
    })
  })

  describe('OAuth schema validation', () => {
    it('should validate OAuth schema with all required fields', async () => {
      const mockAuthData = {
        'oauth-provider': {
          type: 'oauth',
          refresh: 'refresh_token',
          access: 'access_token',
          expires: 1234567890,
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.get('oauth-provider')

      expect(result).toEqual({
        type: 'oauth',
        refresh: 'refresh_token',
        access: 'access_token',
        expires: 1234567890,
      })
    })

    it('should reject OAuth schema with missing fields', async () => {
      const mockAuthData = {
        'oauth-provider': {
          type: 'oauth',
          access: 'access_token',
          // Missing refresh and expires
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.get('oauth-provider')

      expect(result).toBeUndefined()
    })
  })

  describe('API schema validation', () => {
    it('should validate API schema with all required fields', async () => {
      const mockAuthData = {
        'api-provider': {
          type: 'api',
          key: 'api_key_123',
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.get('api-provider')

      expect(result).toEqual({
        type: 'api',
        key: 'api_key_123',
      })
    })

    it('should reject API schema with missing key', async () => {
      const mockAuthData = {
        'api-provider': {
          type: 'api',
          // Missing key
        },
      }

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockAuthData))

      const result = await Auth.get('api-provider')

      expect(result).toBeUndefined()
    })
  })
})