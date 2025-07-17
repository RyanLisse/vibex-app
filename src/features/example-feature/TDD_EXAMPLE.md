# TDD Example: ExampleItem Component

This document demonstrates the Test-Driven Development (TDD) workflow used to create the `ExampleItem` component.

## TDD Process Overview

The TDD process follows three main phases:
1. **Red**: Write a failing test
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve the code while keeping tests green

## Step-by-Step Implementation

### Step 1: RED - Write the First Failing Test

```typescript
// ExampleItem.test.tsx
describe('ExampleItem', () => {
  it('should render item title', () => {
    const mockItem = {
      id: '1',
      title: 'Test Task',
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    render(<ExampleItem item={mockItem} />)
    expect(screen.getByText('Test Task')).toBeInTheDocument()
  })
})
```

**Result**: Test fails because `ExampleItem` component doesn't exist.

### Step 2: GREEN - Minimal Implementation

```typescript
// ExampleItem.tsx
interface ExampleItemProps {
  item: {
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed'
    priority: 'low' | 'medium' | 'high'
    createdAt: Date
    updatedAt: Date
  }
}

export function ExampleItem({ item }: ExampleItemProps) {
  return <div>{item.title}</div>
}
```

**Result**: Test passes with minimal implementation.

### Step 3: REFACTOR - Improve Structure

```typescript
// types.ts - Extract types
export interface ExampleItem {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
}

// ExampleItem.tsx - Use proper types
import type { ExampleItem as ExampleItemType } from '../types'

interface ExampleItemProps {
  item: ExampleItemType
}

export function ExampleItem({ item }: ExampleItemProps) {
  return <div>{item.title}</div>
}
```

**Result**: Tests still pass, code is better structured.

### Step 4: RED - Add Description Test

```typescript
it('should render item description when provided', () => {
  const mockItem = {
    // ... other properties
    description: 'This is a test description'
  }
  
  render(<ExampleItem item={mockItem} />)
  expect(screen.getByText('This is a test description')).toBeInTheDocument()
})
```

**Result**: Test fails because description is not implemented.

### Step 5: GREEN - Add Description Support

```typescript
// Update types.ts
export interface ExampleItem {
  // ... other properties
  description?: string
}

// Update ExampleItem.tsx
export function ExampleItem({ item }: ExampleItemProps) {
  return (
    <div>
      <div>{item.title}</div>
      {item.description && <div>{item.description}</div>}
    </div>
  )
}
```

**Result**: Test passes.

### Step 6: RED - Add Priority Display Test

```typescript
it('should display priority with correct color', () => {
  const mockItem = {
    // ... other properties
    priority: 'high' as const
  }
  
  render(<ExampleItem item={mockItem} />)
  
  const priorityElement = screen.getByText('high')
  expect(priorityElement).toHaveClass('text-red-600')
})
```

**Result**: Test fails because priority display is not implemented.

### Step 7: GREEN - Add Priority Display

```typescript
// utils/example-utils.ts
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-600'
    case 'medium': return 'text-yellow-600'
    case 'low': return 'text-green-600'
    default: return 'text-gray-600'
  }
}

// ExampleItem.tsx
import { getPriorityColor } from '../utils/example-utils'

export function ExampleItem({ item }: ExampleItemProps) {
  return (
    <div>
      <div>{item.title}</div>
      {item.description && <div>{item.description}</div>}
      <span className={getPriorityColor(item.priority)}>
        {item.priority}
      </span>
    </div>
  )
}
```

**Result**: Test passes.

### Step 8: RED - Add Interactive Tests

```typescript
it('should call onEdit when edit button is clicked', async () => {
  const onEdit = vi.fn()
  const { user } = render(<ExampleItem item={mockItem} onEdit={onEdit} />)
  
  await user.click(screen.getByRole('button', { name: /edit/i }))
  expect(onEdit).toHaveBeenCalledWith(mockItem)
})
```

**Result**: Test fails because edit functionality is not implemented.

### Step 9: GREEN - Add Edit Functionality

```typescript
interface ExampleItemProps {
  item: ExampleItemType
  onEdit?: (item: ExampleItemType) => void
}

export function ExampleItem({ item, onEdit }: ExampleItemProps) {
  return (
    <div>
      <div>{item.title}</div>
      {item.description && <div>{item.description}</div>}
      <span className={getPriorityColor(item.priority)}>
        {item.priority}
      </span>
      {onEdit && (
        <button onClick={() => onEdit(item)}>
          Edit
        </button>
      )}
    </div>
  )
}
```

**Result**: Test passes.

### Step 10: REFACTOR - Final Polish

```typescript
// Final implementation with proper styling, accessibility, and structure
export function ExampleItem({ item, onEdit, onDelete, onStatusChange }: ExampleItemProps) {
  return (
    <article className="p-4 border rounded-lg bg-white shadow-sm">
      {/* Proper semantic HTML, accessibility attributes, and styling */}
      {/* Implementation details in the actual component file */}
    </article>
  )
}
```

## Key TDD Benefits Demonstrated

1. **Clear Requirements**: Tests define expected behavior before implementation
2. **Incremental Development**: Build features one test at a time
3. **Refactoring Safety**: Tests catch regressions during refactoring
4. **Better Design**: TDD encourages modular, testable code
5. **Documentation**: Tests serve as living documentation

## Testing Best Practices Applied

1. **Descriptive Test Names**: Each test clearly states what it verifies
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **User-Centric Testing**: Testing from user's perspective with React Testing Library
4. **Test Isolation**: Each test is independent and self-contained
5. **Edge Cases**: Testing with and without optional properties
6. **Accessibility**: Testing ARIA attributes and keyboard navigation

## Coverage Achieved

- ✅ Component rendering
- ✅ Conditional content display
- ✅ User interactions
- ✅ Accessibility features
- ✅ Visual styling
- ✅ Error handling
- ✅ Edge cases

This TDD approach ensures robust, well-tested code that meets requirements and handles edge cases properly.