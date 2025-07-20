'use client'

import { useState, useCallback } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { KanbanColumn } from './kanban-column'
import { TaskFilters } from './task-filters'
import type { KanbanTask, KanbanColumn as KanbanColumnType, MoveKanbanTask } from '@/src/schemas/enhanced-task-schemas'

interface KanbanBoardProps {
  tasks: KanbanTask[]
  columns: KanbanColumnType[]
  onTaskMove: (move: MoveKanbanTask) => void | Promise<void>
  onTaskEdit?: (task: KanbanTask) => void
  enableFilters?: boolean
  className?: string
}

interface FilterState {
  assignee?: string
  priority?: string
  tags: string[]
  search: string
}

export function KanbanBoard({
  tasks,
  columns,
  onTaskMove,
  onTaskEdit,
  enableFilters = true,
  className = '',
}: KanbanBoardProps) {
  const [filters, setFilters] = useState<FilterState>({
    tags: [],
    search: '',
  })
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null)

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    // Assignee filter
    if (filters.assignee && task.assignee !== filters.assignee) {
      return false
    }

    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false
    }

    // Tags filter
    if (filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(filterTag =>
        task.tags.includes(filterTag)
      )
      if (!hasMatchingTag) return false
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch = 
        task.name.toLowerCase().includes(searchLower) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchLower))
      if (!matchesSearch) return false
    }

    return true
  })

  // Group tasks by column
  const tasksByColumn = columns.reduce((acc, column) => {
    acc[column.id] = filteredTasks.filter(task => task.column === column.id)
    return acc
  }, {} as Record<string, KanbanTask[]>)

  // Handle task movement between columns
  const handleTaskMove = useCallback(async (taskId: string, fromColumn: string, toColumn: string, newOrder: number) => {
    // Check if target column has space (if maxItems is set)
    const targetColumn = columns.find(col => col.id === toColumn)
    const targetTasks = tasksByColumn[toColumn] || []

    if (targetColumn?.maxItems && targetTasks.length >= targetColumn.maxItems) {
      // Don't allow move if column is full
      console.warn(`Column ${toColumn} is full`)
      return
    }

    const move: MoveKanbanTask = {
      taskId,
      fromColumn,
      toColumn,
      newOrder,
    }

    try {
      await onTaskMove(move)
    } catch (error) {
      console.error('Failed to move task:', error)
      // Optionally show error toast/notification
    }
  }, [columns, tasksByColumn, onTaskMove])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }))
  }, [])

  // Get unique assignees and tags for filter options
  const uniqueAssignees = [...new Set(tasks.map(task => task.assignee).filter(Boolean))]
  const uniqueTags = [...new Set(tasks.flatMap(task => task.tags))]

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`space-y-6 ${className}`}>
        {/* Filters */}
        {enableFilters && (
          <TaskFilters
            onFilterChange={handleFilterChange}
            assignees={uniqueAssignees}
            tags={uniqueTags}
          />
        )}

        {/* Board Statistics */}
        <div className="grid grid-cols-4 gap-4 text-center">
          {columns.map(column => {
            const columnTasks = tasksByColumn[column.id] || []
            const isOverloaded = column.maxItems && columnTasks.length > column.maxItems
            
            return (
              <div key={column.id} className="space-y-1">
                <h3 className="font-medium text-sm">{column.name}</h3>
                <p className={`text-2xl font-bold ${isOverloaded ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {columnTasks.length}
                  {column.maxItems && ` / ${column.maxItems}`}
                </p>
              </div>
            )
          })}
        </div>

        {/* Kanban Columns */}
        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map(column => {
            const columnTasks = tasksByColumn[column.id] || []
            const isOverloaded = column.maxItems && columnTasks.length > column.maxItems

            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: column.color }}
                    />
                    <h2 className="font-semibold text-lg">
                      {column.name} ({columnTasks.length})
                    </h2>
                  </div>
                  
                  {isOverloaded && (
                    <div 
                      className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                      data-testid="overload-indicator"
                    >
                      {columnTasks.length}/{column.maxItems} tasks
                    </div>
                  )}
                </div>

                <KanbanColumn
                  column={column}
                  tasks={columnTasks}
                  onTaskMove={handleTaskMove}
                  onTaskEdit={onTaskEdit}
                  isOverloaded={isOverloaded}
                />
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <p>
              Showing {filteredTasks.length} of {tasks.length} tasks
              {filters.search && ` matching "${filters.search}"`}
              {filters.assignee && ` assigned to ${filters.assignee}`}
              {filters.priority && ` with ${filters.priority} priority`}
              {filters.tags.length > 0 && ` tagged with ${filters.tags.join(', ')}`}
            </p>
          </div>
        </div>
      </div>
    </DndProvider>
  )
}