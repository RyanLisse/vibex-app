import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import * as cryptoModule from 'node:crypto'
import { vi } from 'vitest'
import { generateCodeChallenge, generateCodeVerifier } from '@/src/lib/auth/pkce'

// Mock crypto module
vi.mock('crypto')

describe('PKCE utilities', () => {
  const mockRandomBytes = cryptoModule.randomBytes as MockedFunction<
    typeof cryptoModule.randomBytes
  >
  const mockCreateHash = cryptoModule.createHash as MockedFunction<typeof cryptoModule.createHash>

  beforeEach(() => {
    mock.restore()
  })

  describe('generateCodeVerifier', () => {
    it('should generate a code verifier with default length', () => {
      const mockBuffer = Buffer.from('a'.repeat(32))
      mockRandomBytes.mockReturnValue(mockBuffer)

      const verifier = generateCodeVerifier()

      expect(mockRandomBytes).toHaveBeenCalledWith(32)
      expect(verifier).toBe('YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFh')
    })

    it('should generate a code verifier with custom length', () => {
      const mockBuffer = Buffer.from('b'.repeat(64))
      mockRandomBytes.mockReturnValue(mockBuffer)

      const verifier = generateCodeVerifier(64)

      expect(mockRandomBytes).toHaveBeenCalledWith(64)
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should properly encode to Base64URL format', () => {
      // Test buffer that would produce +, /, and = in standard base64
      const testData = Buffer.from([251, 255, 254])
      mockRandomBytes.mockReturnValue(testData)

      const verifier = generateCodeVerifier(3)

      // Should not contain +, /, or =
      expect(verifier).not.toContain('+')
      expect(verifier).not.toContain('/')
      expect(verifier).not.toContain('=')
      // Should contain - and _ instead
      expect(verifier).toBe('-__-')
    })

    it('should generate different verifiers on each call', () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('a'.repeat(32)))
        .mockReturnValueOnce(Buffer.from('b'.repeat(32)))

      const verifier1 = generateCodeVerifier()
      const verifier2 = generateCodeVerifier()

      expect(verifier1).not.toBe(verifier2)
    })

    it('should handle crypto errors', () => {
      mockRandomBytes.mockImplementation(() => {
        throw new Error('Crypto error')
      })

      expect(() => generateCodeVerifier()).toThrow('Crypto error')
    })
  })

  describe('generateCodeChallenge', () => {
    it('should generate a valid code challenge from verifier', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(Buffer.from('hashedvalue')),
      }
      mockCreateHash.mockReturnValue(mockHash as any)

      const verifier = 'test-verifier'
      const challenge = generateCodeChallenge(verifier)

      expect(mockCreateHash).toHaveBeenCalledWith('sha256')
      expect(mockHash.update).toHaveBeenCalledWith(verifier)
      expect(mockHash.digest).toHaveBeenCalled()
      expect(challenge).toBe('aGFzaGVkdmFsdWU')
    })

    it('should properly encode challenge to Base64URL format', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(Buffer.from([251, 255, 254])),
      }
      mockCreateHash.mockReturnValue(mockHash as any)

      const challenge = generateCodeChallenge('test')

      // Should not contain standard base64 characters
      expect(challenge).not.toContain('+')
      expect(challenge).not.toContain('/')
      expect(challenge).not.toContain('=')
      expect(challenge).toBe('-__-')
    })

    it('should produce consistent challenges for same verifier', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(Buffer.from('consistent')),
      }
      mockCreateHash.mockReturnValue(mockHash as any)

      const verifier = 'same-verifier'
      const challenge1 = generateCodeChallenge(verifier)
      const challenge2 = generateCodeChallenge(verifier)

      expect(challenge1).toBe(challenge2)
    })

    it('should produce different challenges for different verifiers', () => {
      const mockHash1 = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(Buffer.from('hash1')),
      }
      const mockHash2 = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(Buffer.from('hash2')),
      }

      mockCreateHash.mockReturnValueOnce(mockHash1 as any).mockReturnValueOnce(mockHash2 as any)

      const challenge1 = generateCodeChallenge('verifier1')
      const challenge2 = generateCodeChallenge('verifier2')

      expect(challenge1).not.toBe(challenge2)
    })

    it('should handle empty verifier', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(Buffer.from('emptyhash')),
      }
      mockCreateHash.mockReturnValue(mockHash as any)

      const challenge = generateCodeChallenge('')

      expect(mockHash.update).toHaveBeenCalledWith('')
      expect(challenge).toBeDefined()
    })

    it('should handle crypto hash errors', () => {
      mockCreateHash.mockImplementation(() => {
        throw new Error('Hash error')
      })

      expect(() => generateCodeChallenge('test')).toThrow('Hash error')
    })

    it('should handle update errors', () => {
      const mockHash = {
        update: vi.fn().mockImplementation(() => {
          throw new Error('Update error')
        }),
      }
      mockCreateHash.mockReturnValue(mockHash as any)

      expect(() => generateCodeChallenge('test')).toThrow('Update error')
    })

    it('should strip padding from Base64URL encoding', () => {
      // Create buffers of different lengths to test padding removal
      const testCases = [
        { length: 1, expectedPadding: 2 }, // Would have ==
        { length: 2, expectedPadding: 1 }, // Would have =
        { length: 3, expectedPadding: 0 }, // No padding
      ]

      testCases.forEach(({ length }) => {
        const mockHash = {
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue(Buffer.alloc(length, 'a')),
        }
        mockCreateHash.mockReturnValue(mockHash as any)

        const challenge = generateCodeChallenge(`test${length}`)

        // Should not end with = padding
        expect(challenge).not.toMatch(/=+$/)
      })
    })
  })

  describe('PKCE flow integration', () => {
    it('should work correctly in a complete PKCE flow', () => {
      // Mock for verifier generation
      const verifierBuffer = Buffer.from('secure-random-verifier-data')
      mockRandomBytes.mockReturnValue(verifierBuffer)

      // Mock for challenge generation
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(Buffer.from('challenge-hash')),
      }
      mockCreateHash.mockReturnValue(mockHash as any)

      // Generate verifier
      const verifier = generateCodeVerifier()
      expect(verifier).toBeDefined()
      expect(verifier.length).toBeGreaterThan(0)

      // Generate challenge from verifier
      const challenge = generateCodeChallenge(verifier)
      expect(challenge).toBeDefined()
      expect(challenge.length).toBeGreaterThan(0)

      // Verify the hash was created with the verifier
      expect(mockHash.update).toHaveBeenCalledWith(verifier)
    })

    it('should generate URL-safe strings', () => {
      // Test with various byte patterns that could produce problematic characters
      const testPatterns = [
        Buffer.from([0xff, 0xff, 0xff]), // All 1s
        Buffer.from([0x00, 0x00, 0x00]), // All 0s
        Buffer.from([0xaa, 0x55, 0xaa]), // Alternating bits
        Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]), // Mixed
      ]

      testPatterns.forEach((pattern) => {
        mockRandomBytes.mockReturnValue(pattern)

        const verifier = generateCodeVerifier(pattern.length)

        // Check URL-safe characters only
        expect(verifier).toMatch(/^[A-Za-z0-9_-]*$/)
      })
    })
  })
})
