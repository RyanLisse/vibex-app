'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface FilterState {
  assignee?: string
  priority?: string
  tags: string[]
  search: string
}

interface TaskFiltersProps {
  onFilterChange: (filters: FilterState) => void
  assignees: string[]
  tags: string[]
  className?: string
}

export function TaskFilters({ onFilterChange, assignees, tags, className = '' }: TaskFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    tags: [],
    search: '',
  })
  const [isOpen, setIsOpen] = useState(false)

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      tags: [],
      search: '',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const handleTagToggle = (tag: string, checked: boolean) => {
    const newTags = checked ? [...filters.tags, tag] : filters.tags.filter((t) => t !== tag)

    updateFilters({ tags: newTags })
  }

  const hasActiveFilters = !!(
    filters.assignee ||
    filters.priority ||
    filters.tags.length > 0 ||
    filters.search
  )

  const activeFilterCount = [
    filters.assignee,
    filters.priority,
    filters.tags.length > 0 ? 'tags' : null,
    filters.search,
  ].filter(Boolean).length

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Quick Assignee Filter */}
      <div className="flex items-center gap-2">
        <Label htmlFor="assignee" className="text-sm font-medium whitespace-nowrap">
          Assignee:
        </Label>
        <Select
          value={filters.assignee || ''}
          onValueChange={(value) => updateFilters({ assignee: value || undefined })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All assignees</SelectItem>
            {assignees.map((assignee) => (
              <SelectItem key={assignee} value={assignee}>
                {assignee}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Priority Filter */}
      <div className="flex items-center gap-2">
        <Label htmlFor="priority" className="text-sm font-medium whitespace-nowrap">
          Priority:
        </Label>
        <Select
          value={filters.priority || ''}
          onValueChange={(value) => updateFilters({ priority: value || undefined })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 relative">
            <Filter className="h-4 w-4" />
            Tags
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by Tags</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Tags Filter */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">
                Tags:
              </Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags available</p>
                ) : (
                  tags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={filters.tags.includes(tag)}
                        onCheckedChange={(checked) => handleTagToggle(tag, checked as boolean)}
                      />
                      <Label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer flex-1">
                        {tag}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {filters.assignee && (
              <Badge variant="secondary" className="gap-1">
                Assignee: {filters.assignee}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilters({ assignee: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {filters.priority && (
              <Badge variant="secondary" className="gap-1">
                Priority: {filters.priority}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilters({ priority: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                Tag: {tag}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleTagToggle(tag, false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
