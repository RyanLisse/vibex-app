import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ClientPage from './client-page'

// Mock the imported components
vi.mock('@/components/navigation/navbar', () => ({
  default: () => <div data-testid="navbar">Mock Navbar</div>,
}))

vi.mock('@/components/task-list', () => ({
  default: () => <div data-testid="task-list">Mock Task List</div>,
}))

vi.mock('@/components/forms/new-task-form', () => ({
  default: () => <div data-testid="new-task-form">Mock New Task Form</div>,
}))

describe('ClientPage', () => {
  it('should render all main components', () => {
    render(<ClientPage />)

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('new-task-form')).toBeInTheDocument()
    expect(screen.getByTestId('task-list')).toBeInTheDocument()
  })

  it('should render components in correct order', () => {
    const { container } = render(<ClientPage />)
    
    const children = container.firstChild?.childNodes
    expect(children).toHaveLength(3)
    
    // Check the order of components
    expect(children?.[0]).toHaveAttribute('data-testid', 'navbar')
    expect(children?.[1]).toHaveAttribute('data-testid', 'new-task-form')
    expect(children?.[2]).toHaveAttribute('data-testid', 'task-list')
  })

  it('should have correct layout structure', () => {
    const { container } = render(<ClientPage />)
    
    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass(
      'flex',
      'flex-col',
      'px-4',
      'py-2',
      'h-screen',
      'gap-y-4'
    )
  })

  it('should render navbar component', () => {
    render(<ClientPage />)
    
    const navbar = screen.getByTestId('navbar')
    expect(navbar).toBeInTheDocument()
    expect(navbar).toHaveTextContent('Mock Navbar')
  })

  it('should render new task form component', () => {
    render(<ClientPage />)
    
    const newTaskForm = screen.getByTestId('new-task-form')
    expect(newTaskForm).toBeInTheDocument()
    expect(newTaskForm).toHaveTextContent('Mock New Task Form')
  })

  it('should render task list component', () => {
    render(<ClientPage />)
    
    const taskList = screen.getByTestId('task-list')
    expect(taskList).toBeInTheDocument()
    expect(taskList).toHaveTextContent('Mock Task List')
  })

  it('should render without any console errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<ClientPage />)
    
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should have full height layout', () => {
    const { container } = render(<ClientPage />)
    
    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass('h-screen')
  })

  it('should have proper spacing', () => {
    const { container } = render(<ClientPage />)
    
    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass('gap-y-4')
    expect(mainContainer).toHaveClass('px-4')
    expect(mainContainer).toHaveClass('py-2')
  })

  it('should be a default export', () => {
    expect(ClientPage).toBeDefined()
    expect(typeof ClientPage).toBe('function')
  })

  it('should render as a flex column layout', () => {
    const { container } = render(<ClientPage />)
    
    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass('flex', 'flex-col')
  })

  it('should maintain consistent structure across re-renders', () => {
    const { rerender } = render(<ClientPage />)
    
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('new-task-form')).toBeInTheDocument()
    expect(screen.getByTestId('task-list')).toBeInTheDocument()
    
    rerender(<ClientPage />)
    
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('new-task-form')).toBeInTheDocument()
    expect(screen.getByTestId('task-list')).toBeInTheDocument()
  })

  it('should not render any other content', () => {
    const { container } = render(<ClientPage />)
    
    const mainContainer = container.firstChild
    expect(mainContainer?.childNodes).toHaveLength(3)
  })

  it('should handle component mounting and unmounting', () => {
    const { unmount } = render(<ClientPage />)
    
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('new-task-form')).toBeInTheDocument()
    expect(screen.getByTestId('task-list')).toBeInTheDocument()
    
    unmount()
    
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('new-task-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('task-list')).not.toBeInTheDocument()
  })
})