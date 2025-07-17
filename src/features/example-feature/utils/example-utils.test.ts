import { describe, it, expect } from 'vitest'
import { filterItems, sortItems, getPriorityColor, getStatusIcon } from './example-utils'
import type { ExampleItem } from '../types'

describe('example-utils', () => {
  const mockItems: ExampleItem[] = [
    {
      id: '1',
      title: 'High priority task',
      description: 'Important task',
      status: 'pending',
      priority: 'high',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      title: 'Low priority completed',
      status: 'completed',
      priority: 'low',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: '3',
      title: 'Medium priority in progress',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
  ]

  describe('filterItems', () => {
    it('should return all items when no filter is applied', () => {
      const result = filterItems(mockItems, {})
      expect(result).toHaveLength(3)
    })

    it('should filter by status', () => {
      const result = filterItems(mockItems, { status: 'pending' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by priority', () => {
      const result = filterItems(mockItems, { priority: 'high' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by search term in title', () => {
      const result = filterItems(mockItems, { searchTerm: 'completed' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('should filter by search term in description', () => {
      const result = filterItems(mockItems, { searchTerm: 'Important' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should apply multiple filters', () => {
      const result = filterItems(mockItems, { 
        status: 'pending', 
        priority: 'high',
        searchTerm: 'task'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })

  describe('sortItems', () => {
    it('should sort by priority (high to low)', () => {
      const result = sortItems([...mockItems], 'priority')
      expect(result[0].priority).toBe('high')
      expect(result[1].priority).toBe('medium')
      expect(result[2].priority).toBe('low')
    })

    it('should sort by date (newest first)', () => {
      const result = sortItems([...mockItems], 'date')
      expect(result[0].id).toBe('3')
      expect(result[1].id).toBe('2')
      expect(result[2].id).toBe('1')
    })

    it('should sort by status (pending, in_progress, completed)', () => {
      const result = sortItems([...mockItems], 'status')
      expect(result[0].status).toBe('pending')
      expect(result[1].status).toBe('in_progress')
      expect(result[2].status).toBe('completed')
    })
  })

  describe('getPriorityColor', () => {
    it('should return correct colors for priorities', () => {
      expect(getPriorityColor('high')).toBe('text-red-600')
      expect(getPriorityColor('medium')).toBe('text-yellow-600')
      expect(getPriorityColor('low')).toBe('text-green-600')
    })
  })

  describe('getStatusIcon', () => {
    it('should return correct icons for statuses', () => {
      expect(getStatusIcon('pending')).toBe('○')
      expect(getStatusIcon('in_progress')).toBe('◐')
      expect(getStatusIcon('completed')).toBe('●')
    })
  })
})