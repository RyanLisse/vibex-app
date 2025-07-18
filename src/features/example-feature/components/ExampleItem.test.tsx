import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { ExampleItem as ExampleItemType } from '../types'
import { ExampleItem } from './ExampleItem'

const mockItem: ExampleItemType = {
  id: '1',
  title: 'Test Task',
  description: 'This is a test task',
  status: 'pending',
  priority: 'high',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('ExampleItem', () => {
  it('should render item title and description', () => {
    render(<ExampleItem item={mockItem} />)

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('This is a test task')).toBeInTheDocument()
  })

  it('should display priority with correct color', () => {
    render(<ExampleItem item={mockItem} />)

    const priorityElement = screen.getByText('high')
    expect(priorityElement).toHaveClass('text-red-600')
  })

  it('should display status icon', () => {
    render(<ExampleItem item={mockItem} />)

    expect(screen.getByText('○')).toBeInTheDocument()
  })

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn()
    const { user } = render(<ExampleItem item={mockItem} onEdit={onEdit} />)

    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledWith(mockItem)
  })

  it('should call onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn()
    const { user } = render(<ExampleItem item={mockItem} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('should call onStatusChange when status is changed', async () => {
    const onStatusChange = vi.fn()
    const { user } = render(<ExampleItem item={mockItem} onStatusChange={onStatusChange} />)

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(onStatusChange).toHaveBeenCalledWith('1', 'completed')
  })

  it('should not render description when not provided', () => {
    const itemWithoutDescription = { ...mockItem, description: undefined }
    render(<ExampleItem item={itemWithoutDescription} />)

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.queryByText('This is a test task')).not.toBeInTheDocument()
  })

  it('should be accessible', () => {
    render(<ExampleItem item={mockItem} />)

    // Should have proper ARIA labels
    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toHaveAccessibleName()
  })
})
