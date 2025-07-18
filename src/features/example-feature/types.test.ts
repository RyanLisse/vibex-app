import { afterEach, beforeEach, describe, expect, it, mock, test } from "bun:test"
import { vi } from 'vitest'
import type {
  ExampleFilter,
  ExampleFormData,
  ExampleItem,
  ExampleStore,
} from '@/src/features/example-feature/types'

describe('ExampleItem type', () => {
  it('should create valid ExampleItem with all required properties', () => {
    const item: ExampleItem = {
      id: 'test-id',
      title: 'Test Item',
      description: 'Test description',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(item.id).toBe('test-id')
    expect(item.title).toBe('Test Item')
    expect(item.description).toBe('Test description')
    expect(item.status).toBe('pending')
    expect(item.priority).toBe('medium')
    expect(item.createdAt).toBeInstanceOf(Date)
    expect(item.updatedAt).toBeInstanceOf(Date)
  })

  it('should create valid ExampleItem with optional description as undefined', () => {
    const item: ExampleItem = {
      id: 'test-id',
      title: 'Test Item',
      description: undefined,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(item.description).toBeUndefined()
  })

  it('should create valid ExampleItem without description property', () => {
    const item: ExampleItem = {
      id: 'test-id',
      title: 'Test Item',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(item.description).toBeUndefined()
  })

  it('should accept all valid status values', () => {
    const statuses: ExampleItem['status'][] = ['pending', 'in_progress', 'completed']

    for (const status of statuses) {
      const item: ExampleItem = {
        id: 'test-id',
        title: 'Test Item',
        status,
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(item.status).toBe(status)
    })
  })

  it('should accept all valid priority values', () => {
    const priorities: ExampleItem['priority'][] = ['low', 'medium', 'high']

    for (const priority of priorities) {
      const item: ExampleItem = {
        id: 'test-id',
        title: 'Test Item',
        status: 'pending',
        priority,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(item.priority).toBe(priority)
    })
  })
})

describe('ExampleFormData type', () => {
  it('should create valid ExampleFormData with all required properties', () => {
    const formData: ExampleFormData = {
      title: 'Test Form Item',
      description: 'Test form description',
      priority: 'high',
    }

    expect(formData.title).toBe('Test Form Item')
    expect(formData.description).toBe('Test form description')
    expect(formData.priority).toBe('high')
  })

  it('should create valid ExampleFormData with optional description as undefined', () => {
    const formData: ExampleFormData = {
      title: 'Test Form Item',
      description: undefined,
      priority: 'high',
    }

    expect(formData.description).toBeUndefined()
  })

  it('should create valid ExampleFormData without description property', () => {
    const formData: ExampleFormData = {
      title: 'Test Form Item',
      priority: 'high',
    }

    expect(formData.description).toBeUndefined()
  })

  it('should accept all valid priority values', () => {
    const priorities: ExampleFormData['priority'][] = ['low', 'medium', 'high']

    for (const priority of priorities) {
      const formData: ExampleFormData = {
        title: 'Test Form Item',
        priority,
      }

      expect(formData.priority).toBe(priority)
    })
  })
})

describe('ExampleFilter type', () => {
  it('should create valid ExampleFilter with all properties', () => {
    const filter: ExampleFilter = {
      status: 'pending',
      priority: 'high',
      searchTerm: 'test search',
    }

    expect(filter.status).toBe('pending')
    expect(filter.priority).toBe('high')
    expect(filter.searchTerm).toBe('test search')
  })

  it('should create valid ExampleFilter with empty object', () => {
    const filter: ExampleFilter = {}

    expect(filter.status).toBeUndefined()
    expect(filter.priority).toBeUndefined()
    expect(filter.searchTerm).toBeUndefined()
  })

  it('should create valid ExampleFilter with only status', () => {
    const filter: ExampleFilter = {
      status: 'completed',
    }

    expect(filter.status).toBe('completed')
    expect(filter.priority).toBeUndefined()
    expect(filter.searchTerm).toBeUndefined()
  })

  it('should create valid ExampleFilter with only priority', () => {
    const filter: ExampleFilter = {
      priority: 'medium',
    }

    expect(filter.status).toBeUndefined()
    expect(filter.priority).toBe('medium')
    expect(filter.searchTerm).toBeUndefined()
  })

  it('should create valid ExampleFilter with only searchTerm', () => {
    const filter: ExampleFilter = {
      searchTerm: 'search text',
    }

    expect(filter.status).toBeUndefined()
    expect(filter.priority).toBeUndefined()
    expect(filter.searchTerm).toBe('search text')
  })

  it('should accept all valid status values', () => {
    const statuses: ExampleFilter['status'][] = ['pending', 'in_progress', 'completed']

    for (const status of statuses) {
      const filter: ExampleFilter = { status }
      expect(filter.status).toBe(status)
    })
  })

  it('should accept all valid priority values', () => {
    const priorities: ExampleFilter['priority'][] = ['low', 'medium', 'high']

    for (const priority of priorities) {
      const filter: ExampleFilter = { priority }
      expect(filter.priority).toBe(priority)
    })
  })

  it('should accept empty string as searchTerm', () => {
    const filter: ExampleFilter = {
      searchTerm: '',
    }

    expect(filter.searchTerm).toBe('')
  })
})

describe('ExampleStore type', () => {
  it('should create valid ExampleStore with all properties', () => {
    const mockAddItem = vi.fn()
    const mockUpdateItem = vi.fn()
    const mockDeleteItem = vi.fn()
    const mockSetFilter = vi.fn()
    const mockFetchItems = vi.fn()

    const store: ExampleStore = {
      items: [],
      filter: {},
      isLoading: false,
      error: null,
      addItem: mockAddItem,
      updateItem: mockUpdateItem,
      deleteItem: mockDeleteItem,
      setFilter: mockSetFilter,
      fetchItems: mockFetchItems,
    }

    expect(store.items).toEqual([])
    expect(store.filter).toEqual({})
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.addItem).toBe(mockAddItem)
    expect(store.updateItem).toBe(mockUpdateItem)
    expect(store.deleteItem).toBe(mockDeleteItem)
    expect(store.setFilter).toBe(mockSetFilter)
    expect(store.fetchItems).toBe(mockFetchItems)
  })

  it('should create valid ExampleStore with items', () => {
    const mockItems: ExampleItem[] = [
      {
        id: '1',
        title: 'Test Item 1',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Test Item 2',
        status: 'completed',
        priority: 'low',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const store: ExampleStore = {
      items: mockItems,
      filter: {},
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.items).toEqual(mockItems)
    expect(store.items).toHaveLength(2)
  })

  it('should create valid ExampleStore with filter', () => {
    const mockFilter: ExampleFilter = {
      status: 'pending',
      priority: 'high',
      searchTerm: 'test',
    }

    const store: ExampleStore = {
      items: [],
      filter: mockFilter,
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.filter).toEqual(mockFilter)
  })

  it('should create valid ExampleStore with loading state', () => {
    const store: ExampleStore = {
      items: [],
      filter: {},
      isLoading: true,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.isLoading).toBe(true)
  })

  it('should create valid ExampleStore with error state', () => {
    const errorMessage = 'Failed to fetch items'

    const store: ExampleStore = {
      items: [],
      filter: {},
      isLoading: false,
      error: errorMessage,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.error).toBe(errorMessage)
  })

  it('should have properly typed action functions', () => {
    const mockAddItem = vi.fn().mockResolvedValue(undefined)
    const mockUpdateItem = vi.fn().mockResolvedValue(undefined)
    const mockDeleteItem = vi.fn().mockResolvedValue(undefined)
    const mockSetFilter = vi.fn()
    const mockFetchItems = vi.fn().mockResolvedValue(undefined)

    const store: ExampleStore = {
      items: [],
      filter: {},
      isLoading: false,
      error: null,
      addItem: mockAddItem,
      updateItem: mockUpdateItem,
      deleteItem: mockDeleteItem,
      setFilter: mockSetFilter,
      fetchItems: mockFetchItems,
    }

    // Test addItem function signature
    const formData: ExampleFormData = {
      title: 'New Item',
      priority: 'medium',
    }
    store.addItem(formData)
    expect(mockAddItem).toHaveBeenCalledWith(formData)

    // Test updateItem function signature
    const updateData: Partial<ExampleItem> = {
      title: 'Updated Title',
      status: 'completed',
    }
    store.updateItem('item-id', updateData)
    expect(mockUpdateItem).toHaveBeenCalledWith('item-id', updateData)

    // Test deleteItem function signature
    store.deleteItem('item-id')
    expect(mockDeleteItem).toHaveBeenCalledWith('item-id')

    // Test setFilter function signature
    const filter: ExampleFilter = { status: 'pending' }
    store.setFilter(filter)
    expect(mockSetFilter).toHaveBeenCalledWith(filter)

    // Test fetchItems function signature
    store.fetchItems()
    expect(mockFetchItems).toHaveBeenCalled()
  })
})

describe('Advanced type operations', () => {
  it('should handle template literal types', () => {
    type StatusMessage<T extends ExampleItem['status']> = `Item is ${T}`
    type PriorityLevel<T extends ExampleItem['priority']> = `Priority: ${T}`

    const pendingMessage: StatusMessage<'pending'> = 'Item is pending'
    const highPriorityMessage: PriorityLevel<'high'> = 'Priority: high'

    expect(pendingMessage).toBe('Item is pending')
    expect(highPriorityMessage).toBe('Priority: high')
  })

  it('should handle keyof and typeof operations', () => {
    type ItemKeys = keyof ExampleItem
    type ItemValues = ExampleItem[ItemKeys]

    const itemKeys: ItemKeys[] = [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'createdAt',
      'updatedAt',
    ]
    expect(itemKeys).toContain('id')
    expect(itemKeys).toContain('title')
    expect(itemKeys).toContain('status')

    const mockItem: ExampleItem = {
      id: 'test',
      title: 'Test',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    type ItemType = typeof mockItem
    const anotherItem: ItemType = {
      id: 'another',
      title: 'Another',
      status: 'completed',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(anotherItem.id).toBe('another')
    expect(anotherItem.status).toBe('completed')
  })

  it('should handle index signatures and mapped types', () => {
    type StatusCount = { [K in ExampleItem['status']]: number }
    type PriorityColor = { [K in ExampleItem['priority']]: string }

    const statusCounts: StatusCount = {
      pending: 5,
      in_progress: 3,
      completed: 12,
    }

    const priorityColors: PriorityColor = {
      low: 'green',
      medium: 'yellow',
      high: 'red',
    }

    expect(statusCounts.pending).toBe(5)
    expect(statusCounts.in_progress).toBe(3)
    expect(statusCounts.completed).toBe(12)
    expect(priorityColors.low).toBe('green')
    expect(priorityColors.medium).toBe('yellow')
    expect(priorityColors.high).toBe('red')
  })

  it('should handle function type definitions', () => {
    type ItemProcessor<T> = (item: ExampleItem) => T
    type ItemPredicate = (item: ExampleItem) => boolean
    type ItemTransformer = (item: ExampleItem) => ExampleItem

    const getTitleLength: ItemProcessor<number> = (item) => item.title.length
    const isHighPriority: ItemPredicate = (item) => item.priority === 'high'
    const markAsCompleted: ItemTransformer = (item) => ({ ...item, status: 'completed' })

    const testItem: ExampleItem = {
      id: 'test',
      title: 'Test Item',
      status: 'pending',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(getTitleLength(testItem)).toBe(9)
    expect(isHighPriority(testItem)).toBe(true)
    expect(markAsCompleted(testItem).status).toBe('completed')
  })

  it('should handle conditional types with infer', () => {
    type ExtractArrayType<T> = T extends (infer U)[] ? U : never
    type ExtractPromiseType<T> = T extends Promise<infer U> ? U : never

    type ItemArrayType = ExtractArrayType<ExampleItem[]>
    type PromiseItemType = ExtractPromiseType<Promise<ExampleItem>>

    const extractedItem: ItemArrayType = {
      id: 'extracted',
      title: 'Extracted Item',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const promiseItem: PromiseItemType = {
      id: 'promise',
      title: 'Promise Item',
      status: 'completed',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(extractedItem.id).toBe('extracted')
    expect(promiseItem.id).toBe('promise')
  })

  it('should handle recursive types', () => {
    type NestedExampleItem = ExampleItem & {
      children?: NestedExampleItem[]
    }

    const nestedItem: NestedExampleItem = {
      id: 'parent',
      title: 'Parent Item',
      status: 'pending',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
      children: [
        {
          id: 'child1',
          title: 'Child Item 1',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'child2',
          title: 'Child Item 2',
          status: 'in_progress',
          priority: 'low',
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [
            {
              id: 'grandchild',
              title: 'Grandchild Item',
              status: 'pending',
              priority: 'high',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
    }

    expect(nestedItem.id).toBe('parent')
    expect(nestedItem.children).toHaveLength(2)
    expect(nestedItem.children?.[1].children).toHaveLength(1)
    expect(nestedItem.children?.[1].children?.[0].id).toBe('grandchild')
  })
})

describe('Type compatibility and relationships', () => {
  it('should use compatible types between ExampleItem and ExampleFormData', () => {
    const formData: ExampleFormData = {
      title: 'Test Item',
      description: 'Test description',
      priority: 'high',
    }

    const item: ExampleItem = {
      id: 'generated-id',
      title: formData.title,
      description: formData.description,
      status: 'pending',
      priority: formData.priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(item.title).toBe(formData.title)
    expect(item.description).toBe(formData.description)
    expect(item.priority).toBe(formData.priority)
  })

  it('should use compatible types between ExampleItem and ExampleFilter', () => {
    const item: ExampleItem = {
      id: 'test-id',
      title: 'Test Item',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const filter: ExampleFilter = {
      status: item.status,
      priority: item.priority,
      searchTerm: item.title,
    }

    expect(filter.status).toBe(item.status)
    expect(filter.priority).toBe(item.priority)
    expect(filter.searchTerm).toBe(item.title)
  })

  it('should use compatible types between ExampleStore and other types', () => {
    const items: ExampleItem[] = [
      {
        id: '1',
        title: 'Item 1',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const filter: ExampleFilter = {
      status: 'pending',
      priority: 'high',
    }

    const store: ExampleStore = {
      items,
      filter,
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.items).toEqual(items)
    expect(store.filter).toEqual(filter)
  })

  it('should handle cross-type operations seamlessly', () => {
    // Create form data
    const formData: ExampleFormData = {
      title: 'Cross-type test',
      description: 'Testing type compatibility',
      priority: 'high',
    }

    // Convert to item (simulating creation)
    const newItem: ExampleItem = {
      id: 'generated-id',
      title: formData.title,
      description: formData.description,
      status: 'pending',
      priority: formData.priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Create filter from item
    const filterFromItem: ExampleFilter = {
      status: newItem.status,
      priority: newItem.priority,
      searchTerm: newItem.title,
    }

    // Store operations
    const mockStore: ExampleStore = {
      items: [newItem],
      filter: filterFromItem,
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(mockStore.items[0].title).toBe(formData.title)
    expect(mockStore.filter.priority).toBe(newItem.priority)
    expect(mockStore.filter.status).toBe(newItem.status)
  })

  it('should handle type transformations correctly', () => {
    // Transform ExampleItem to ExampleFormData
    const item: ExampleItem = {
      id: 'transform-test',
      title: 'Transform Test',
      description: 'Testing transformations',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const toFormData = (item: ExampleItem): ExampleFormData => ({
      title: item.title,
      description: item.description,
      priority: item.priority,
    })

    const fromFormData = (formData: ExampleFormData, id: string): ExampleItem => ({
      id,
      title: formData.title,
      description: formData.description,
      status: 'pending',
      priority: formData.priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const transformedFormData = toFormData(item)
    const transformedItem = fromFormData(transformedFormData, 'new-id')

    expect(transformedFormData.title).toBe(item.title)
    expect(transformedFormData.description).toBe(item.description)
    expect(transformedFormData.priority).toBe(item.priority)
    expect(transformedItem.title).toBe(item.title)
    expect(transformedItem.id).toBe('new-id')
  })
})

describe('Type guards and utility functions', () => {
  it('should validate ExampleItem type at runtime', () => {
    const validItem: ExampleItem = {
      id: 'test-id',
      title: 'Test Item',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Type guard function
    const isValidExampleItem = (obj: any): obj is ExampleItem => {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.title === 'string' &&
        ['pending', 'in_progress', 'completed'].includes(obj.status) &&
        ['low', 'medium', 'high'].includes(obj.priority) &&
        obj.createdAt instanceof Date &&
        obj.updatedAt instanceof Date
      )
    }

    expect(isValidExampleItem(validItem)).toBe(true)
    expect(isValidExampleItem({})).toBe(false)
    expect(isValidExampleItem(null)).toBe(false)
    expect(isValidExampleItem('not an object')).toBe(false)
  })

  it('should validate ExampleFormData type at runtime', () => {
    const validFormData: ExampleFormData = {
      title: 'Test Form',
      priority: 'high',
    }

    // Type guard function
    const isValidExampleFormData = (obj: any): obj is ExampleFormData => {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.title === 'string' &&
        ['low', 'medium', 'high'].includes(obj.priority) &&
        (obj.description === undefined || typeof obj.description === 'string')
      )
    }

    expect(isValidExampleFormData(validFormData)).toBe(true)
    expect(isValidExampleFormData({})).toBe(false)
    expect(isValidExampleFormData({ title: 'test' })).toBe(false) // missing priority
    expect(isValidExampleFormData({ priority: 'high' })).toBe(false) // missing title
  })

  it('should validate ExampleFilter type at runtime', () => {
    const validFilter: ExampleFilter = {
      status: 'pending',
      priority: 'high',
      searchTerm: 'test',
    }

    // Type guard function
    const isValidExampleFilter = (obj: any): obj is ExampleFilter => {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        (obj.status === undefined ||
          ['pending', 'in_progress', 'completed'].includes(obj.status)) &&
        (obj.priority === undefined || ['low', 'medium', 'high'].includes(obj.priority)) &&
        (obj.searchTerm === undefined || typeof obj.searchTerm === 'string')
      )
    }

    expect(isValidExampleFilter(validFilter)).toBe(true)
    expect(isValidExampleFilter({})).toBe(true) // empty filter is valid
    expect(isValidExampleFilter({ status: 'invalid' })).toBe(false)
    expect(isValidExampleFilter({ priority: 'invalid' })).toBe(false)
  })

  it('should handle partial type updates correctly', () => {
    const originalItem: ExampleItem = {
      id: 'test-id',
      title: 'Original Title',
      status: 'pending',
      priority: 'low',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    }

    // Simulate partial update
    const partialUpdate: Partial<ExampleItem> = {
      title: 'Updated Title',
      status: 'completed',
      updatedAt: new Date('2023-01-02'),
    }

    const updatedItem: ExampleItem = {
      ...originalItem,
      ...partialUpdate,
    }

    expect(updatedItem.title).toBe('Updated Title')
    expect(updatedItem.status).toBe('completed')
    expect(updatedItem.priority).toBe('low') // unchanged
    expect(updatedItem.id).toBe('test-id') // unchanged
    expect(updatedItem.createdAt).toEqual(new Date('2023-01-01')) // unchanged
    expect(updatedItem.updatedAt).toEqual(new Date('2023-01-02')) // updated
  })

  it('should handle generic type operations', () => {
    type StatusType = ExampleItem['status']
    type PriorityType = ExampleItem['priority']
    type OptionalDescriptionType = ExampleItem['description']

    const statusValues: StatusType[] = ['pending', 'in_progress', 'completed']
    const priorityValues: PriorityType[] = ['low', 'medium', 'high']
    const optionalDescription: OptionalDescriptionType = undefined

    expect(statusValues).toHaveLength(3)
    expect(priorityValues).toHaveLength(3)
    expect(optionalDescription).toBeUndefined()
  })

  it('should handle union type operations', () => {
    type ItemStatus = ExampleItem['status']
    type FilterStatus = ExampleFilter['status']

    // Both should be compatible
    const itemStatus: ItemStatus = 'pending'
    const filterStatus: FilterStatus = itemStatus

    expect(filterStatus).toBe('pending')

    // Test all possible values
    const allStatuses: ItemStatus[] = ['pending', 'in_progress', 'completed']
    for (const status of allStatuses) {
      const filter: ExampleFilter = { status }
      expect(filter.status).toBe(status)
    })
  })

  it('should handle conditional types', () => {
    // Test conditional type behavior
    type RequiredKeys<T> = {
      [K in keyof T]-?: T[K] extends undefined ? never : K
    }[keyof T]

    type OptionalKeys<T> = {
      [K in keyof T]-?: T[K] extends undefined ? K : never
    }[keyof T]

    type RequiredItemKeys = RequiredKeys<ExampleItem>
    type OptionalItemKeys = OptionalKeys<ExampleItem>

    const requiredKeys: RequiredItemKeys[] = [
      'id',
      'title',
      'status',
      'priority',
      'createdAt',
      'updatedAt',
    ]
    expect(requiredKeys).toContain('id')
    expect(requiredKeys).toContain('title')
    expect(requiredKeys).toContain('status')
    expect(requiredKeys).toContain('priority')
    expect(requiredKeys).toContain('createdAt')
    expect(requiredKeys).toContain('updatedAt')
  })

  it('should handle mapped types correctly', () => {
    type ReadonlyExampleItem = Readonly<ExampleItem>
    type OptionalExampleItem = Partial<ExampleItem>
    type RequiredExampleFormData = Required<ExampleFormData>

    const readonlyItem: ReadonlyExampleItem = {
      id: 'test-id',
      title: 'Read Only Item',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const optionalItem: OptionalExampleItem = {
      id: 'partial-id',
      title: 'Partial Item',
    }

    const requiredFormData: RequiredExampleFormData = {
      title: 'Required Form',
      description: 'Required description',
      priority: 'high',
    }

    expect(readonlyItem.id).toBe('test-id')
    expect(optionalItem.id).toBe('partial-id')
    expect(optionalItem.status).toBeUndefined()
    expect(requiredFormData.description).toBe('Required description')
  })

  it('should handle utility types correctly', () => {
    type ItemStatusOnly = Pick<ExampleItem, 'status'>
    type ItemWithoutId = Omit<ExampleItem, 'id'>
    type NonNullableDescription = NonNullable<ExampleItem['description']>

    const statusOnly: ItemStatusOnly = { status: 'pending' }
    const itemWithoutId: ItemWithoutId = {
      title: 'Item Without ID',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const nonNullDescription: NonNullableDescription = 'Non-null description'

    expect(statusOnly.status).toBe('pending')
    expect(itemWithoutId.title).toBe('Item Without ID')
    expect(nonNullDescription).toBe('Non-null description')
  })

  it('should handle record types correctly', () => {
    type StatusRecord = Record<ExampleItem['status'], string>
    type PriorityRecord = Record<ExampleItem['priority'], number>

    const statusMessages: StatusRecord = {
      pending: 'Task is pending',
      in_progress: 'Task is in progress',
      completed: 'Task is completed',
    }

    const priorityWeights: PriorityRecord = {
      low: 1,
      medium: 2,
      high: 3,
    }

    expect(statusMessages.pending).toBe('Task is pending')
    expect(statusMessages.in_progress).toBe('Task is in progress')
    expect(statusMessages.completed).toBe('Task is completed')
    expect(priorityWeights.low).toBe(1)
    expect(priorityWeights.medium).toBe(2)
    expect(priorityWeights.high).toBe(3)
  })
})

describe('Edge cases and validation', () => {
  it('should handle ExampleItem with very long strings', () => {
    const longString = 'a'.repeat(1000)

    const item: ExampleItem = {
      id: longString,
      title: longString,
      description: longString,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(item.id).toHaveLength(1000)
    expect(item.title).toHaveLength(1000)
    expect(item.description).toHaveLength(1000)
  })

  it('should handle ExampleItem with special characters', () => {
    const specialChars = '!@#$%^&*()_+{}|:"<>?[]\\;\',./'

    const item: ExampleItem = {
      id: specialChars,
      title: specialChars,
      description: specialChars,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(item.id).toBe(specialChars)
    expect(item.title).toBe(specialChars)
    expect(item.description).toBe(specialChars)
  })

  it('should handle ExampleFilter with empty string searchTerm', () => {
    const filter: ExampleFilter = {
      searchTerm: '',
    }

    expect(filter.searchTerm).toBe('')
  })

  it('should handle ExampleFilter with whitespace-only searchTerm', () => {
    const filter: ExampleFilter = {
      searchTerm: '   ',
    }

    expect(filter.searchTerm).toBe('   ')
  })

  it('should handle ExampleStore with empty items array', () => {
    const store: ExampleStore = {
      items: [],
      filter: {},
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.items).toEqual([])
    expect(store.items).toHaveLength(0)
  })

  it('should handle ExampleStore with large number of items', () => {
    const largeItemsArray: ExampleItem[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const store: ExampleStore = {
      items: largeItemsArray,
      filter: {},
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.items).toHaveLength(1000)
  })

  it('should handle ExampleStore with unicode characters', () => {
    const unicodeItem: ExampleItem = {
      id: 'unicode-test-🚀',
      title: 'Unicode Test 你好世界',
      description: 'Description with émojis 🎉',
      status: 'pending',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const store: ExampleStore = {
      items: [unicodeItem],
      filter: { searchTerm: '你好' },
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.items[0].title).toBe('Unicode Test 你好世界')
    expect(store.items[0].description).toBe('Description with émojis 🎉')
    expect(store.filter.searchTerm).toBe('你好')
  })

  it('should handle ExampleStore with extreme date values', () => {
    const extremeItem: ExampleItem = {
      id: 'extreme-date-test',
      title: 'Extreme Date Test',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date('1970-01-01T00:00:00.000Z'),
      updatedAt: new Date('2099-12-31T23:59:59.999Z'),
    }

    const store: ExampleStore = {
      items: [extremeItem],
      filter: {},
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(store.items[0].createdAt.getFullYear()).toBe(1970)
    expect(store.items[0].updatedAt.getFullYear()).toBe(2099)
  })

  it('should handle type assertions correctly', () => {
    const unknownData: unknown = {
      id: 'assertion-test',
      title: 'Type Assertion Test',
      status: 'pending',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Type assertion (should be used carefully in real code)
    const item = unknownData as ExampleItem
    expect(item.id).toBe('assertion-test')
    expect(item.title).toBe('Type Assertion Test')
  })

  it('should handle branded types correctly', () => {
    // Example of branded types for stronger typing
    type ItemId = string & { __brand: 'ItemId' }
    type BrandedExampleItem = Omit<ExampleItem, 'id'> & { id: ItemId }

    const createItemId = (id: string): ItemId => id as ItemId
    const brandedId = createItemId('branded-id-123')

    const brandedItem: BrandedExampleItem = {
      id: brandedId,
      title: 'Branded Item',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(brandedItem.id).toBe('branded-id-123')
    expect(brandedItem.title).toBe('Branded Item')
  })

  it('should handle discriminated unions correctly', () => {
    type LoadingState =
      | { isLoading: true; error: null; data: null }
      | { isLoading: false; error: string; data: null }
      | { isLoading: false; error: null; data: ExampleItem[] }

    const loadingState: LoadingState = {
      isLoading: true,
      error: null,
      data: null,
    }

    const errorState: LoadingState = {
      isLoading: false,
      error: 'Failed to load',
      data: null,
    }

    const successState: LoadingState = {
      isLoading: false,
      error: null,
      data: [
        {
          id: 'success-item',
          title: 'Success Item',
          status: 'completed',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    }

    expect(loadingState.isLoading).toBe(true)
    expect(errorState.error).toBe('Failed to load')
    expect(successState.data).toHaveLength(1)
  })

  it('should handle deep readonly types', () => {
    type DeepReadonly<T> = {
      readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
    }

    type DeepReadonlyStore = DeepReadonly<ExampleStore>

    const deepReadonlyStore: DeepReadonlyStore = {
      items: [
        {
          id: 'readonly-item',
          title: 'Readonly Item',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      filter: { status: 'pending' },
      isLoading: false,
      error: null,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      setFilter: vi.fn(),
      fetchItems: vi.fn(),
    }

    expect(deepReadonlyStore.items[0].title).toBe('Readonly Item')
    expect(deepReadonlyStore.filter.status).toBe('pending')
  })
})
