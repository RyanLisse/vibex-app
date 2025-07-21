import { afterEach, beforeEach, describe, expect, it, test } from 'vitest'
import type { ExampleFilter, ExampleItem } from '../types'
import { filterItems, getPriorityColor, getStatusIcon, sortItems } from './example-utils'

describe('filterItems', () => {
  const mockItems: ExampleItem[] = [
    {
      id: '1',
      title: 'High Priority Task',
      description: 'Important task to complete',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: '2',
      title: 'Medium Priority Task',
      description: 'Regular task',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
    },
    {
      id: '3',
      title: 'Low Priority Task',
      description: undefined,
      status: 'completed',
      priority: 'low',
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-03'),
    },
    {
      id: '4',
      title: 'Another High Priority',
      description: 'Another important task',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2023-01-04'),
      updatedAt: new Date('2023-01-04'),
    },
  ]

  it('should return all items when no filter is applied', () => {
    const filter: ExampleFilter = {}
    const result = filterItems(mockItems, filter)
    expect(result).toEqual(mockItems)
  })

  it('should filter by status', () => {
    const filter: ExampleFilter = { status: 'pending' }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(2)
    expect(result.every((item) => item.status === 'pending')).toBe(true)
  })

  it('should filter by priority', () => {
    const filter: ExampleFilter = { priority: 'high' }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(2)
    expect(result.every((item) => item.priority === 'high')).toBe(true)
  })

  it('should filter by search term in title', () => {
    const filter: ExampleFilter = { searchTerm: 'Medium' }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Medium Priority Task')
  })

  it('should filter by search term in description', () => {
    const filter: ExampleFilter = { searchTerm: 'important' }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(2)
    expect(result.every((item) => item.description?.toLowerCase().includes('important'))).toBe(true)
  })

  it('should handle case-insensitive search', () => {
    const filter: ExampleFilter = { searchTerm: 'TASK' }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(4)
  })

  it('should combine multiple filters', () => {
    const filter: ExampleFilter = {
      status: 'pending',
      priority: 'high',
      searchTerm: 'High',
    }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(2)
    expect(result.every((item) => item.status === 'pending' && item.priority === 'high')).toBe(true)
  })

  it('should return empty array when no items match', () => {
    const filter: ExampleFilter = { status: 'pending', priority: 'low' }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(0)
  })

  it('should handle items without description when searching', () => {
    const filter: ExampleFilter = { searchTerm: 'nonexistent' }
    const result = filterItems(mockItems, filter)
    expect(result).toHaveLength(0)
  })

  it('should handle empty search term', () => {
    const filter: ExampleFilter = { searchTerm: '' }
    const result = filterItems(mockItems, filter)
    expect(result).toEqual(mockItems)
  })
})

describe('sortItems', () => {
  const mockItems: ExampleItem[] = [
    {
      id: '1',
      title: 'Item 1',
      status: 'completed',
      priority: 'low',
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-03'),
    },
    {
      id: '2',
      title: 'Item 2',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: '3',
      title: 'Item 3',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
    },
  ]

  it('should sort by priority (high to low)', () => {
    const result = sortItems(mockItems, 'priority')
    expect(result[0].priority).toBe('high')
    expect(result[1].priority).toBe('medium')
    expect(result[2].priority).toBe('low')
  })

  it('should sort by date (newest first)', () => {
    const result = sortItems(mockItems, 'date')
    expect(result[0].createdAt.getTime()).toBe(new Date('2023-01-03').getTime())
    expect(result[1].createdAt.getTime()).toBe(new Date('2023-01-02').getTime())
    expect(result[2].createdAt.getTime()).toBe(new Date('2023-01-01').getTime())
  })

  it('should sort by status (pending, in_progress, completed)', () => {
    const result = sortItems(mockItems, 'status')
    expect(result[0].status).toBe('pending')
    expect(result[1].status).toBe('in_progress')
    expect(result[2].status).toBe('completed')
  })

  it('should not mutate original array', () => {
    const originalItems = [...mockItems]
    const result = sortItems(mockItems, 'priority')
    expect(mockItems).toEqual(originalItems)
    expect(result).not.toBe(mockItems)
  })

  it('should handle empty array', () => {
    const result = sortItems([], 'priority')
    expect(result).toEqual([])
  })

  it('should handle single item array', () => {
    const singleItem = [mockItems[0]]
    const result = sortItems(singleItem, 'priority')
    expect(result).toEqual(singleItem)
  })

  it('should handle invalid sort type gracefully', () => {
    const result = sortItems(mockItems, 'invalid' as any)
    expect(result).toEqual(mockItems)
  })

  it('should maintain original array immutability', () => {
    const originalItems = [...mockItems]
    const result = sortItems(mockItems, 'priority')

    // Verify original array is unchanged
    expect(mockItems).toEqual(originalItems)
    // Verify result is a new array
    expect(result).not.toBe(mockItems)
  })

  it('should handle same priority items consistently', () => {
    const samePriorityItems: ExampleItem[] = [
      {
        id: '1',
        title: 'Item 1',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
      {
        id: '2',
        title: 'Item 2',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
      },
    ]

    const result = sortItems(samePriorityItems, 'priority')
    expect(result).toHaveLength(2)
    expect(result.every((item) => item.priority === 'high')).toBe(true)
    // Should maintain original order for same priority
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })
})

describe('getPriorityColor', () => {
  it('should return correct color for high priority', () => {
    const result = getPriorityColor('high')
    expect(result).toBe('text-red-600')
  })

  it('should return correct color for medium priority', () => {
    const result = getPriorityColor('medium')
    expect(result).toBe('text-yellow-600')
  })

  it('should return correct color for low priority', () => {
    const result = getPriorityColor('low')
    expect(result).toBe('text-green-600')
  })

  it('should return default color for invalid priority', () => {
    const result = getPriorityColor('invalid' as any)
    expect(result).toBe('text-gray-600')
  })
})

describe('getStatusIcon', () => {
  it('should return correct icon for pending status', () => {
    const result = getStatusIcon('pending')
    expect(result).toBe('○')
  })

  it('should return correct icon for in_progress status', () => {
    const result = getStatusIcon('in_progress')
    expect(result).toBe('◐')
  })

  it('should return correct icon for completed status', () => {
    const result = getStatusIcon('completed')
    expect(result).toBe('●')
  })

  it('should return default icon for invalid status', () => {
    const result = getStatusIcon('invalid' as any)
    expect(result).toBe('○')
  })
})

describe('Advanced filterItems tests', () => {
  const complexMockItems: ExampleItem[] = [
    {
      id: '1',
      title: 'Frontend Development Task',
      description: 'Implement user authentication system',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z'),
    },
    {
      id: '2',
      title: 'Backend API Integration',
      description: 'Connect to external payment gateway',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date('2023-01-02T14:30:00Z'),
      updatedAt: new Date('2023-01-02T14:30:00Z'),
    },
    {
      id: '3',
      title: 'Database Optimization',
      description: undefined,
      status: 'completed',
      priority: 'low',
      createdAt: new Date('2023-01-03T09:15:00Z'),
      updatedAt: new Date('2023-01-03T09:15:00Z'),
    },
    {
      id: '4',
      title: 'UI/UX Design Review',
      description: 'Review and update the design system',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2023-01-04T16:45:00Z'),
      updatedAt: new Date('2023-01-04T16:45:00Z'),
    },
    {
      id: '5',
      title: 'Testing Implementation',
      description: 'Write unit tests for authentication module',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date('2023-01-05T11:20:00Z'),
      updatedAt: new Date('2023-01-05T11:20:00Z'),
    },
  ]

  it('should handle complex search terms with multiple words', () => {
    const filter: ExampleFilter = { searchTerm: 'user authentication' }
    const result = filterItems(complexMockItems, filter)
    // The filter looks for the entire phrase "user authentication" in title or description
    // Only one item has this exact phrase in the description
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Frontend Development Task')
    expect(result[0].description?.includes('user authentication')).toBe(true)
  })

  it('should handle partial word matching', () => {
    const filter: ExampleFilter = { searchTerm: 'auth' }
    const result = filterItems(complexMockItems, filter)
    expect(result).toHaveLength(2)
    expect(
      result.every(
        (item) =>
          item.title.toLowerCase().includes('auth') ||
          item.description?.toLowerCase().includes('auth')
      )
    ).toBe(true)
  })

  it('should handle special characters in search terms', () => {
    const specialCharItems: ExampleItem[] = [
      {
        id: '1',
        title: 'Test @#$%^&*() Special',
        description: 'Description with !@#$%^&*()',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const filter: ExampleFilter = { searchTerm: '@#$%' }
    const result = filterItems(specialCharItems, filter)
    expect(result).toHaveLength(1)
  })

  it('should handle unicode characters in search terms', () => {
    const unicodeItems: ExampleItem[] = [
      {
        id: '1',
        title: 'Unicode Test 你好世界',
        description: 'Description with émojis 🚀',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const filter: ExampleFilter = { searchTerm: '你好' }
    const result = filterItems(unicodeItems, filter)
    expect(result).toHaveLength(1)
  })

  it('should handle very long search terms', () => {
    const longSearchTerm = 'a'.repeat(1000)
    const filter: ExampleFilter = { searchTerm: longSearchTerm }
    const result = filterItems(complexMockItems, filter)
    expect(result).toHaveLength(0)
  })

  it('should handle null and undefined values gracefully', () => {
    const itemsWithNulls: ExampleItem[] = [
      {
        id: '1',
        title: 'Test Item',
        description: undefined,
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const filter: ExampleFilter = { searchTerm: 'nonexistent' }
    const result = filterItems(itemsWithNulls, filter)
    expect(result).toHaveLength(0)
  })

  it('should handle empty arrays', () => {
    const filter: ExampleFilter = { searchTerm: 'test' }
    const result = filterItems([], filter)
    expect(result).toEqual([])
  })

  it('should handle filters with all properties set to undefined', () => {
    const filter: ExampleFilter = {
      status: undefined,
      priority: undefined,
      searchTerm: undefined,
    }
    const result = filterItems(complexMockItems, filter)
    expect(result).toEqual(complexMockItems)
  })

  it('should handle very restrictive filters', () => {
    const filter: ExampleFilter = {
      status: 'pending',
      priority: 'low',
      searchTerm: 'nonexistent',
    }
    const result = filterItems(complexMockItems, filter)
    expect(result).toHaveLength(0)
  })

  it('should preserve original array order for matching items', () => {
    const filter: ExampleFilter = { priority: 'high' }
    const result = filterItems(complexMockItems, filter)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('4')
  })
})

describe('Advanced sortItems tests', () => {
  const complexSortItems: ExampleItem[] = [
    {
      id: '1',
      title: 'Item A',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z'),
    },
    {
      id: '2',
      title: 'Item B',
      status: 'in_progress',
      priority: 'high',
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z'),
    },
    {
      id: '3',
      title: 'Item C',
      status: 'completed',
      priority: 'medium',
      createdAt: new Date('2023-01-02T10:00:00Z'),
      updatedAt: new Date('2023-01-02T10:00:00Z'),
    },
    {
      id: '4',
      title: 'Item D',
      status: 'pending',
      priority: 'low',
      createdAt: new Date('2023-01-03T10:00:00Z'),
      updatedAt: new Date('2023-01-03T10:00:00Z'),
    },
  ]

  it('should maintain stable sort for equal priority items', () => {
    const result = sortItems(complexSortItems, 'priority')
    const highPriorityItems = result.filter((item) => item.priority === 'high')
    expect(highPriorityItems).toHaveLength(2)
    expect(highPriorityItems[0].id).toBe('1')
    expect(highPriorityItems[1].id).toBe('2')
  })

  it('should maintain stable sort for equal date items', () => {
    const result = sortItems(complexSortItems, 'date')
    const sameDateItems = result.filter(
      (item) => item.createdAt.getTime() === new Date('2023-01-01T10:00:00Z').getTime()
    )
    expect(sameDateItems).toHaveLength(2)
    expect(sameDateItems[0].id).toBe('1')
    expect(sameDateItems[1].id).toBe('2')
  })

  it('should handle items with identical timestamps', () => {
    const identicalTimestampItems: ExampleItem[] = [
      {
        id: '1',
        title: 'Item 1',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2023-01-01T10:00:00.000Z'),
        updatedAt: new Date('2023-01-01T10:00:00.000Z'),
      },
      {
        id: '2',
        title: 'Item 2',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2023-01-01T10:00:00.000Z'),
        updatedAt: new Date('2023-01-01T10:00:00.000Z'),
      },
    ]

    const result = sortItems(identicalTimestampItems, 'date')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('should handle very large arrays efficiently', () => {
    const largeArray: ExampleItem[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      status: 'pending' as const,
      priority: (i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low') as const,
      createdAt: new Date(2023, 0, 1 + (i % 31)),
      updatedAt: new Date(2023, 0, 1 + (i % 31)),
    }))

    const startTime = Date.now()
    const result = sortItems(largeArray, 'priority')
    const endTime = Date.now()

    expect(result).toHaveLength(1000)
    expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
  })

  it('should handle extreme date values', () => {
    const extremeDateItems: ExampleItem[] = [
      {
        id: '1',
        title: 'Very old item',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('1970-01-01T00:00:00Z'),
        updatedAt: new Date('1970-01-01T00:00:00Z'),
      },
      {
        id: '2',
        title: 'Very new item',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2099-12-31T23:59:59Z'),
        updatedAt: new Date('2099-12-31T23:59:59Z'),
      },
    ]

    const result = sortItems(extremeDateItems, 'date')
    expect(result[0].id).toBe('2') // Newer first
    expect(result[1].id).toBe('1')
  })

  it('should handle all sort types with the same array', () => {
    const sortTypes = ['priority', 'date', 'status'] as const

    for (const sortType of sortTypes) {
      const result = sortItems(complexSortItems, sortType)
      expect(result).toHaveLength(complexSortItems.length)
      expect(result).not.toBe(complexSortItems) // Ensure new array
    }
  })
})

describe('Advanced getPriorityColor tests', () => {
  it('should handle all priority values consistently', () => {
    const priorities: ExampleItem['priority'][] = ['low', 'medium', 'high']
    const expectedColors = ['text-green-600', 'text-yellow-600', 'text-red-600']

    for (const [index, priority] of priorities.entries()) {
      const result = getPriorityColor(priority)
      expect(result).toBe(expectedColors[index])
    }
  })

  it('should handle case variations gracefully', () => {
    // Note: TypeScript will prevent this at compile time, but testing runtime behavior
    const result = getPriorityColor('HIGH' as any)
    expect(result).toBe('text-gray-600') // Should fall back to default
  })

  it('should handle null and undefined values', () => {
    const nullResult = getPriorityColor(null as any)
    const undefinedResult = getPriorityColor(undefined as any)

    expect(nullResult).toBe('text-gray-600')
    expect(undefinedResult).toBe('text-gray-600')
  })

  it('should be a pure function with no side effects', () => {
    const priority = 'high'
    const result1 = getPriorityColor(priority)
    const result2 = getPriorityColor(priority)

    expect(result1).toBe(result2)
    expect(result1).toBe('text-red-600')
  })

  it('should handle numeric values gracefully', () => {
    const result = getPriorityColor(1 as any)
    expect(result).toBe('text-gray-600')
  })

  it('should handle object values gracefully', () => {
    const result = getPriorityColor({ priority: 'high' } as any)
    expect(result).toBe('text-gray-600')
  })

  it('should handle empty string', () => {
    const result = getPriorityColor('' as any)
    expect(result).toBe('text-gray-600')
  })

  it('should return string values consistently', () => {
    const priorities: ExampleItem['priority'][] = ['low', 'medium', 'high']

    for (const priority of priorities) {
      const result = getPriorityColor(priority)
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^text-\w+-\d+$/)
    }
  })
})

describe('Advanced getStatusIcon tests', () => {
  it('should handle all status values consistently', () => {
    const statuses: ExampleItem['status'][] = ['pending', 'in_progress', 'completed']
    const expectedIcons = ['○', '◐', '●']

    for (const [index, status] of statuses.entries()) {
      const result = getStatusIcon(status)
      expect(result).toBe(expectedIcons[index])
    }
  })

  it('should handle case variations gracefully', () => {
    const result = getStatusIcon('PENDING' as any)
    expect(result).toBe('○') // Should fall back to default
  })

  it('should handle null and undefined values', () => {
    const nullResult = getStatusIcon(null as any)
    const undefinedResult = getStatusIcon(undefined as any)

    expect(nullResult).toBe('○')
    expect(undefinedResult).toBe('○')
  })

  it('should handle empty string', () => {
    const result = getStatusIcon('' as any)
    expect(result).toBe('○')
  })

  it('should return single character icons', () => {
    const statuses: ExampleItem['status'][] = ['pending', 'in_progress', 'completed']

    for (const status of statuses) {
      const result = getStatusIcon(status)
      expect(typeof result).toBe('string')
      expect(result).toHaveLength(1)
    }
  })

  it('should use unicode circle characters', () => {
    const pending = getStatusIcon('pending')
    const inProgress = getStatusIcon('in_progress')
    const completed = getStatusIcon('completed')

    expect(pending).toBe('○') // U+25CB
    expect(inProgress).toBe('◐') // U+25D0
    expect(completed).toBe('●') // U+25CF
  })

  it('should be a pure function with no side effects', () => {
    const status = 'completed'
    const result1 = getStatusIcon(status)
    const result2 = getStatusIcon(status)

    expect(result1).toBe(result2)
    expect(result1).toBe('●')
  })

  it('should handle numeric values gracefully', () => {
    const result = getStatusIcon(1 as any)
    expect(result).toBe('○')
  })

  it('should handle object values gracefully', () => {
    const result = getStatusIcon({ status: 'pending' } as any)
    expect(result).toBe('○')
  })
})

describe('Function integration tests', () => {
  const integrationTestItems: ExampleItem[] = [
    {
      id: '1',
      title: 'High Priority Task',
      description: 'Critical system update',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: '2',
      title: 'Medium Priority Task',
      description: 'Feature enhancement',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
    },
    {
      id: '3',
      title: 'Low Priority Task',
      description: 'Documentation update',
      status: 'completed',
      priority: 'low',
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-03'),
    },
  ]

  it('should work together: filter then sort', () => {
    // Filter for high priority items
    const filtered = filterItems(integrationTestItems, { priority: 'high' })
    expect(filtered).toHaveLength(1)

    // Sort the filtered results
    const sorted = sortItems(filtered, 'date')
    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe('1')
  })

  it('should work together: sort then filter', () => {
    // Sort by priority first
    const sorted = sortItems(integrationTestItems, 'priority')
    expect(sorted[0].priority).toBe('high')

    // Filter for non-completed items
    const filtered = filterItems(sorted, { status: 'pending' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })

  it('should generate consistent UI data', () => {
    for (const item of integrationTestItems) {
      const color = getPriorityColor(item.priority)
      const icon = getStatusIcon(item.status)

      expect(typeof color).toBe('string')
      expect(typeof icon).toBe('string')
      expect(color).toMatch(/^text-\w+-\d+$/)
      expect(icon).toHaveLength(1)
    }
  })

  it('should handle complete workflow', () => {
    // 1. Filter items
    const filtered = filterItems(integrationTestItems, { searchTerm: 'Task' })
    expect(filtered).toHaveLength(3)

    // 2. Sort filtered items
    const sorted = sortItems(filtered, 'priority')
    expect(sorted[0].priority).toBe('high')

    // 3. Generate UI data for each item
    const withUIData = sorted.map((item) => ({
      ...item,
      priorityColor: getPriorityColor(item.priority),
      statusIcon: getStatusIcon(item.status),
    }))

    expect(withUIData).toHaveLength(3)
    expect(withUIData[0].priorityColor).toBe('text-red-600')
    expect(withUIData[0].statusIcon).toBe('○')
  })

  it('should handle real-world data processing pipeline', () => {
    // Simulate a complex data processing pipeline
    const rawData: ExampleItem[] = [
      {
        id: 'task-1',
        title: 'Critical Bug Fix',
        description: 'Fix security vulnerability in authentication',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
      {
        id: 'task-2',
        title: 'Feature Enhancement',
        description: 'Add dark mode support',
        status: 'in_progress',
        priority: 'medium',
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
      },
      {
        id: 'task-3',
        title: 'Documentation Update',
        description: 'Update API documentation',
        status: 'completed',
        priority: 'low',
        createdAt: new Date('2023-01-03'),
        updatedAt: new Date('2023-01-03'),
      },
      {
        id: 'task-4',
        title: 'Performance Optimization',
        description: 'Optimize database queries',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2023-01-04'),
        updatedAt: new Date('2023-01-04'),
      },
    ]

    // Step 1: Filter high priority items
    const highPriorityItems = filterItems(rawData, { priority: 'high' })
    expect(highPriorityItems).toHaveLength(2)

    // Step 2: Sort by creation date (newest first)
    const sortedByDate = sortItems(highPriorityItems, 'date')
    expect(sortedByDate[0].createdAt.getTime()).toBeGreaterThan(sortedByDate[1].createdAt.getTime())

    // Step 3: Add UI metadata
    const enrichedItems = sortedByDate.map((item) => ({
      ...item,
      priorityColor: getPriorityColor(item.priority),
      statusIcon: getStatusIcon(item.status),
      isUrgent: item.priority === 'high' && item.status === 'pending',
    }))

    expect(enrichedItems).toHaveLength(2)
    expect(enrichedItems.every((item) => item.priorityColor === 'text-red-600')).toBe(true)
    expect(enrichedItems.filter((item) => item.isUrgent)).toHaveLength(2)
    expect(enrichedItems[0].id).toBe('task-4') // Newest first
    expect(enrichedItems[1].id).toBe('task-1')
  })
})
