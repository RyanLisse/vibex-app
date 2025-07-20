'use client'

import { useDrag } from 'react-dnd'
import { format, isAfter } from 'date-fns'
import { Calendar, User, Tag, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { KanbanTask } from '@/src/schemas/enhanced-task-schemas'

interface KanbanCardProps {
  task: KanbanTask
  index: number
  onEdit?: (task: KanbanTask) => void
  className?: string
}

export function KanbanCard({ task, index, onEdit, className = '' }: KanbanCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'KANBAN_TASK',
    item: { task, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // Check if task is overdue
  const isOverdue = task.dueDate && isAfter(new Date(), task.dueDate)

  // Priority colors
  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    urgent: 'bg-red-100 text-red-800 border-red-200',
  }

  const cardClassName = `
    p-4 bg-white rounded-lg border shadow-sm cursor-move transition-all duration-200
    hover:shadow-md hover:border-blue-300
    ${isDragging ? 'opacity-50 rotate-3 scale-105' : ''}
    ${isOverdue ? 'border-red-300 bg-red-50' : ''}
    ${className}
  `

  return (
    <div
      ref={drag}
      data-testid={`task-card-${task.id}`}
      draggable
      className={cardClassName}
      onClick={() => onEdit?.(task)}
    >
      {/* Task Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-sm leading-tight flex-1 pr-2">{task.name}</h3>

        <div className="flex items-center gap-1">
          {/* Priority Badge */}
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 ${priorityColors[task.priority]}`}
          >
            {task.priority.toUpperCase()}
          </Badge>

          {/* Overdue Indicator */}
          {isOverdue && (
            <div className="text-red-500" data-testid="overdue-indicator" title="Task is overdue">
              <AlertTriangle className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Task Details */}
      <div className="space-y-2">
        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{task.assignee}</span>
          </div>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div
            className={`flex items-center gap-2 text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}
          >
            <Calendar className="h-3 w-3" />
            <span>
              {format(task.dueDate, 'MMM d, yyyy')}
              {isOverdue && ' (Overdue)'}
            </span>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-3 pt-3 border-t border-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">ID: {task.id.slice(-6)}</span>

          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(task)
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Drag Handle Indicator */}
      <div className="absolute top-2 right-2 opacity-30 hover:opacity-60 transition-opacity">
        <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-1 h-1 bg-muted-foreground rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
