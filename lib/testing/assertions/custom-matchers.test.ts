import { describe, it, expect, beforeAll } from 'vitest'
import './custom-matchers'
import { UserBuilder, ProjectBuilder } from '../builders/test-data-builder'

describe('Custom Matchers', () => {
  beforeAll(() => {
    // Custom matchers should be available after import
  })

  describe('toBeValidUser', () => {
    it('should pass for valid user object', () => {
      const user = new UserBuilder().build()

      expect(user).toBeValidUser()
    })

    it('should fail for invalid user object', () => {
      const invalidUser = { id: 123, name: 'Test' } // missing required fields

      expect(() => {
        expect(invalidUser).toBeValidUser()
      }).toThrow()
    })

    it('should validate user email format', () => {
      const userWithInvalidEmail = new UserBuilder().withEmail('invalid-email').build()

      expect(() => {
        expect(userWithInvalidEmail).toBeValidUser()
      }).toThrow()
    })
  })

  describe('toBeValidProject', () => {
    it('should pass for valid project object', () => {
      const project = new ProjectBuilder().build()

      expect(project).toBeValidProject()
    })

    it('should fail for project without owner', () => {
      const project = new ProjectBuilder().build()
      delete (project as any).owner

      expect(() => {
        expect(project).toBeValidProject()
      }).toThrow()
    })
  })

  describe('toHaveValidSchema', () => {
    it('should validate against Zod schema', () => {
      const validData = {
        name: 'Test',
        age: 25,
        email: 'test@example.com',
      }

      expect(validData).toHaveValidSchema({
        name: expect.any(String),
        age: expect.any(Number),
        email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      })
    })

    it('should fail for invalid schema', () => {
      const invalidData = {
        name: 123, // should be string
        age: 'old', // should be number
      }

      expect(() => {
        expect(invalidData).toHaveValidSchema({
          name: expect.any(String),
          age: expect.any(Number),
        })
      }).toThrow()
    })
  })

  describe('toBeWithinTimeRange', () => {
    it('should pass for date within range', () => {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

      expect(fiveMinutesAgo).toBeWithinTimeRange(now, 10 * 60 * 1000) // 10 minutes
    })

    it('should fail for date outside range', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      expect(() => {
        expect(oneHourAgo).toBeWithinTimeRange(now, 30 * 60 * 1000) // 30 minutes
      }).toThrow()
    })
  })

  describe('toHaveValidApiResponse', () => {
    it('should validate successful API response', () => {
      const response = {
        success: true,
        status: 200,
        data: { message: 'Hello' },
        error: null,
      }

      expect(response).toHaveValidApiResponse()
    })

    it('should validate error API response', () => {
      const response = {
        success: false,
        status: 400,
        data: null,
        error: 'Validation failed',
      }

      expect(response).toHaveValidApiResponse()
    })

    it('should fail for invalid API response structure', () => {
      const response = {
        status: 200,
        data: 'test',
        // missing success and error fields
      }

      expect(() => {
        expect(response).toHaveValidApiResponse()
      }).toThrow()
    })
  })

  describe('toMatchSnapshot', () => {
    it('should create and match snapshots', () => {
      const data = {
        id: '1',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00Z',
      }

      expect(data).toMatchSnapshot('user-snapshot')
    })

    it('should handle dynamic data with serializers', () => {
      const user = new UserBuilder().build()

      // Normalize dynamic fields for snapshot testing
      const normalizedUser = {
        ...user,
        id: '[ID]',
        createdAt: '[DATE]',
        updatedAt: '[DATE]',
      }

      expect(normalizedUser).toMatchSnapshot('normalized-user')
    })
  })

  describe('toBeAccessible', () => {
    it('should validate accessibility attributes', () => {
      const element = {
        tagName: 'BUTTON',
        attributes: {
          'aria-label': 'Close dialog',
          role: 'button',
          tabindex: '0',
        },
      }

      expect(element).toBeAccessible()
    })

    it('should fail for inaccessible elements', () => {
      const element = {
        tagName: 'BUTTON',
        attributes: {
          // Missing aria-label or text content
        },
      }

      expect(() => {
        expect(element).toBeAccessible()
      }).toThrow()
    })
  })

  describe('toHavePerformanceMetrics', () => {
    it('should validate performance within thresholds', () => {
      const metrics = {
        renderTime: 15, // ms
        memoryUsage: 50, // MB
        bundleSize: 200, // KB
      }

      expect(metrics).toHavePerformanceMetrics({
        renderTime: { max: 100 },
        memoryUsage: { max: 100 },
        bundleSize: { max: 500 },
      })
    })

    it('should fail when performance exceeds thresholds', () => {
      const metrics = {
        renderTime: 150, // ms - too slow
        memoryUsage: 200, // MB - too much memory
        bundleSize: 1000, // KB - too large
      }

      expect(() => {
        expect(metrics).toHavePerformanceMetrics({
          renderTime: { max: 100 },
          memoryUsage: { max: 100 },
          bundleSize: { max: 500 },
        })
      }).toThrow()
    })
  })

  describe('Async Matchers', () => {
    describe('toResolveWithin', () => {
      it('should pass for promise that resolves quickly', async () => {
        const quickPromise = Promise.resolve('quick')

        await expect(quickPromise).toResolveWithin(1000) // 1 second
      })

      it('should fail for slow promise', async () => {
        const slowPromise = new Promise((resolve) => setTimeout(() => resolve('slow'), 2000))

        try {
          await expect(slowPromise).toResolveWithin(500)
          throw new Error('Expected matcher to fail')
        } catch (error: any) {
          expect(error.message).toMatch(
            /Promise did not resolve within 500ms|Matcher.*returned a promise that rejected/
          )
        }
      })
    })

    describe('toEventuallyEqual', () => {
      it('should wait for async value to match', async () => {
        let value = 'initial'

        // Simulate async state change
        setTimeout(() => {
          value = 'final'
        }, 100)

        await expect(() => value).toEventuallyEqual('final')
      })

      it('should timeout if value never matches', async () => {
        const value = 'initial'

        try {
          await expect(() => value).toEventuallyEqual('final', { timeout: 100 })
          throw new Error('Expected matcher to fail')
        } catch (error: any) {
          expect(error.message).toMatch(
            /Expected value to eventually equal|Matcher.*returned a promise that rejected/
          )
        }
      })
    })
  })
})
