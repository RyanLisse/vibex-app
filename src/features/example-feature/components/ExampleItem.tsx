import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getPriorityColor, getStatusIcon } from '../utils/example-utils'
import type { ExampleItem as ExampleItemType } from '../types'

interface ExampleItemProps {
  item: ExampleItemType
  onEdit?: (item: ExampleItemType) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: ExampleItemType['status']) => void
}

export function ExampleItem({ item, onEdit, onDelete, onStatusChange }: ExampleItemProps) {
  const handleStatusToggle = () => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed'
    onStatusChange?.(item.id, newStatus)
  }

  return (
    <article
      className={cn(
        'p-4 border rounded-lg bg-white shadow-sm',
        item.status === 'completed' && 'opacity-60'
      )}
      data-testid={`example-item-${item.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <button
            type="button"
            onClick={handleStatusToggle}
            className="mt-1 text-lg hover:scale-110 transition-transform"
            aria-label={`Mark as ${item.status === 'completed' ? 'pending' : 'completed'}`}
            role="checkbox"
            aria-checked={item.status === 'completed'}
          >
            {getStatusIcon(item.status)}
          </button>

          <div className="flex-1">
            <h3
              className={cn(
                'font-medium text-gray-900',
                item.status === 'completed' && 'line-through'
              )}
            >
              {item.title}
            </h3>

            {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}

            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded',
                  getPriorityColor(item.priority),
                  'bg-gray-100'
                )}
              >
                {item.priority}
              </span>

              <span className="text-xs text-gray-500">{item.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(item)}
              aria-label={`Edit ${item.title}`}
            >
              Edit
            </Button>
          )}

          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(item.id)}
              aria-label={`Delete ${item.title}`}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
