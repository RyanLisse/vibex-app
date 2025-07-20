'use client'

import { useDrop } from 'react-dnd'
import { KanbanCard } from './kanban-card'
import type {
  KanbanTask,
  KanbanColumn as KanbanColumnType,
} from '@/src/schemas/enhanced-task-schemas'

interface KanbanColumnProps {
  column: KanbanColumnType
  tasks: KanbanTask[]
  onTaskMove: (taskId: string, fromColumn: string, toColumn: string, newOrder: number) => void
  onTaskEdit?: (task: KanbanTask) => void
  isOverloaded?: boolean
  className?: string
}

export function KanbanColumn({
  column,
  tasks,
  onTaskMove,
  onTaskEdit,
  isOverloaded = false,
  className = '',
}: KanbanColumnProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'KANBAN_TASK',
    drop: (item: { task: KanbanTask; index: number }) => {
      // Don't allow drop if column is full
      if (column.maxItems && tasks.length >= column.maxItems && item.task.column !== column.id) {
        return
      }

      // Calculate new order (append to end)
      const newOrder = tasks.length

      onTaskMove(item.task.id, item.task.column, column.id, newOrder)
    },
    canDrop: (item: { task: KanbanTask }) => {
      // Don't allow drop if it's the same column
      if (item.task.column === column.id) return false

      // Don't allow drop if column is full
      if (column.maxItems && tasks.length >= column.maxItems) return false

      return true
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const dropZoneClassName = `
    min-h-[200px] p-4 rounded-lg border-2 border-dashed transition-colors
    ${isOver && canDrop ? 'border-blue-500 bg-blue-50' : 'border-muted-foreground/25'}
    ${isOver && !canDrop ? 'border-red-500 bg-red-50' : ''}
    ${isOverloaded ? 'bg-red-50/50' : 'bg-muted/25'}
  `

  return (
    <div
      ref={drop}
      data-testid={`column-${column.id}`}
      data-droppable="true"
      className={`${dropZoneClassName} ${className}`}
    >
      {/* Drop indicator */}
      {isOver && (
        <div className="mb-4 p-2 text-center text-sm rounded-lg bg-blue-100 text-blue-700">
          {canDrop ? 'Drop task here' : 'Column is full'}
        </div>
      )}

      {/* Column full warning */}
      {isOverloaded && (
        <div className="mb-4 p-2 text-center text-sm rounded-lg bg-red-100 text-red-700">
          Column is over capacity
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 && !isOver ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks in this column</p>
            <p className="text-xs mt-1">Drag tasks here to move them</p>
          </div>
        ) : (
          tasks.map((task, index) => (
            <KanbanCard key={task.id} task={task} index={index} onEdit={onTaskEdit} />
          ))
        )}
      </div>

      {/* Column capacity indicator */}
      {column.maxItems && (
        <div className="mt-4 pt-3 border-t border-muted-foreground/20">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Capacity</span>
            <span className={tasks.length > column.maxItems ? 'text-red-500 font-medium' : ''}>
              {tasks.length} / {column.maxItems}
            </span>
          </div>
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                tasks.length > column.maxItems ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{
                width: `${Math.min((tasks.length / column.maxItems) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
