import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  LayoutGrid,
  Network,
  GitBranch,
  Search,
  Filter,
  Settings,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Share2,
} from 'lucide-react'

export interface VisualizationControlsProps {
  viewMode: 'agent-centric' | 'task-centric' | 'event-centric' | 'memory-centric'
  layoutAlgorithm: 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'clustered'
  onViewModeChange: (mode: string) => void
  onLayoutChange: (layout: string) => void
  onFilterChange: (filters: any) => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onReset?: () => void
  onExport?: () => void
  onShare?: () => void
}

export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  viewMode,
  layoutAlgorithm,
  onViewModeChange,
  onLayoutChange,
  onFilterChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onReset,
  onExport,
  onShare,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [showInactive, setShowInactive] = React.useState(true)
  const [showMetrics, setShowMetrics] = React.useState(true)
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([])

  const handleFilterChange = React.useCallback(() => {
    onFilterChange({
      searchTerm,
      showInactive,
      showMetrics,
      statusFilters: selectedStatuses,
      nodeTypes: selectedTypes,
    })
  }, [searchTerm, showInactive, showMetrics, selectedStatuses, selectedTypes, onFilterChange])

  React.useEffect(() => {
    handleFilterChange()
  }, [handleFilterChange])

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'idle', label: 'Idle', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'busy', label: 'Busy', color: 'bg-blue-100 text-blue-800' },
    { value: 'error', label: 'Error', color: 'bg-red-100 text-red-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  ]

  const nodeTypeOptions = [
    { value: 'agent', label: 'Agents', icon: Network },
    { value: 'task', label: 'Tasks', icon: GitBranch },
    { value: 'event', label: 'Events', icon: LayoutGrid },
    { value: 'memory', label: 'Memory', icon: LayoutGrid },
  ]

  return (
    <Card className="w-80 bg-white/95 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Settings className="w-4 h-4" />
          <span>Visualization Controls</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* View Mode Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">View Mode</Label>
          <Select value={viewMode} onValueChange={onViewModeChange}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent-centric">
                <div className="flex items-center space-x-2">
                  <Network className="w-3 h-3" />
                  <span>Agent Network</span>
                </div>
              </SelectItem>
              <SelectItem value="task-centric">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-3 h-3" />
                  <span>Task Flow</span>
                </div>
              </SelectItem>
              <SelectItem value="event-centric">
                <div className="flex items-center space-x-2">
                  <LayoutGrid className="w-3 h-3" />
                  <span>Event Stream</span>
                </div>
              </SelectItem>
              <SelectItem value="memory-centric">
                <div className="flex items-center space-x-2">
                  <LayoutGrid className="w-3 h-3" />
                  <span>Memory Graph</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Layout Algorithm Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Layout Algorithm</Label>
          <Select value={layoutAlgorithm} onValueChange={onLayoutChange}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
              <SelectItem value="force-directed">Force Directed</SelectItem>
              <SelectItem value="circular">Circular</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="clustered">Clustered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Search and Filter */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2 w-3 h-3 text-gray-400" />
            <Input
              placeholder="Search agents, tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Filter by Status</Label>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((status) => (
              <Badge
                key={status.value}
                variant={selectedStatuses.includes(status.value) ? 'default' : 'outline'}
                className={`text-xs cursor-pointer ${
                  selectedStatuses.includes(status.value) ? status.color : ''
                }`}
                onClick={() => {
                  setSelectedStatuses((prev) =>
                    prev.includes(status.value)
                      ? prev.filter((s) => s !== status.value)
                      : [...prev, status.value]
                  )
                }}
              >
                {status.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Node Type Filters */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Show Node Types</Label>
          <div className="grid grid-cols-2 gap-1">
            {nodeTypeOptions.map((type) => {
              const Icon = type.icon
              return (
                <div
                  key={type.value}
                  className={`flex items-center space-x-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                    selectedTypes.includes(type.value) || selectedTypes.length === 0
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => {
                    setSelectedTypes((prev) =>
                      prev.includes(type.value)
                        ? prev.filter((t) => t !== type.value)
                        : [...prev, type.value]
                    )
                  }}
                >
                  <Icon className="w-3 h-3" />
                  <span>{type.label}</span>
                  {(selectedTypes.includes(type.value) || selectedTypes.length === 0) && (
                    <Eye className="w-3 h-3 ml-auto" />
                  )}
                  {selectedTypes.length > 0 && !selectedTypes.includes(type.value) && (
                    <EyeOff className="w-3 h-3 ml-auto text-gray-400" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Display Options</Label>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {showInactive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="text-xs">Show Inactive</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Hide' : 'Show'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LayoutGrid className="w-3 h-3" />
              <span className="text-xs">Show Metrics</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={() => setShowMetrics(!showMetrics)}
            >
              {showMetrics ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Navigation Controls */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Navigation</Label>
          <div className="grid grid-cols-2 gap-1">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onZoomIn}>
              <ZoomIn className="w-3 h-3 mr-1" />
              Zoom In
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onZoomOut}>
              <ZoomOut className="w-3 h-3 mr-1" />
              Zoom Out
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onFitView}>
              <Maximize2 className="w-3 h-3 mr-1" />
              Fit View
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onReset}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Export and Share */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Export & Share</Label>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={onExport}>
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={onShare}>
              <Share2 className="w-3 h-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
