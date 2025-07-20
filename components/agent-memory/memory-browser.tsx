'use client'

import {
  AlertTriangle,
  BookOpen,
  Brain,
  Clock,
  Edit,
  Eye,
  Filter,
  Lightbulb,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

interface AgentMemory {
  id: string
  agentId: string
  agentType: string
  category: 'learned_pattern' | 'context' | 'preference' | 'error_resolution' | 'optimization'
  content: string
  context: Record<string, any>
  importance: number
  tags: string[]
  similarity?: number
  createdAt: Date
  updatedAt: Date
}

interface MemorySearchFilters {
  agentId?: string
  agentType?: string
  category?: string
  search?: string
  minImportance?: number
  tags?: string[]
}

export function MemoryBrowser() {
  const [memories, setMemories] = useState<AgentMemory[]>([])
  const [selectedMemory, setSelectedMemory] = useState<AgentMemory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<MemorySearchFilters>({})
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [stats, setStats] = useState<any>(null)

  // Create memory form state
  const [newMemory, setNewMemory] = useState({
    agentId: '',
    agentType: '',
    category: 'context' as const,
    content: '',
    importance: 0.5,
    tags: [] as string[],
  })

  // Load memories
  const loadMemories = useCallback(
    async (searchMode = false) => {
      try {
        if (searchMode) {
          setIsSearching(true)
        } else {
          setIsLoading(true)
        }

        const params = new URLSearchParams()
        if (filters.agentId) params.append('agentId', filters.agentId)
        if (filters.agentType) params.append('agentType', filters.agentType)
        if (filters.category) params.append('category', filters.category)
        if (searchQuery) params.append('search', searchQuery)
        if (filters.minImportance) params.append('minImportance', filters.minImportance.toString())

        const response = await fetch(`/api/agent-memory?${params}`)
        const data = await response.json()

        setMemories(data.memories || [])
        setStats(data.stats)

        if (data.memories?.length > 0 && !selectedMemory) {
          setSelectedMemory(data.memories[0])
        }
      } catch (error) {
        console.error('Failed to load memories:', error)
      } finally {
        setIsLoading(false)
        setIsSearching(false)
      }
    },
    [
      filters.agentId,
      filters.agentType,
      filters.category,
      filters.minImportance,
      searchQuery,
      selectedMemory,
    ]
  )

  // Semantic search
  const performSemanticSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setIsSearching(true)
      const response = await fetch('/api/agent-memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          agentId: filters.agentId,
          agentType: filters.agentType,
          categories: filters.category ? [filters.category] : undefined,
          limit: 50,
          minSimilarity: 0.7,
        }),
      })

      const data = await response.json()
      setMemories(data.results || [])

      if (data.results?.length > 0) {
        setSelectedMemory(data.results[0])
      }
    } catch (error) {
      console.error('Failed to perform semantic search:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Create new memory
  const createMemory = async () => {
    try {
      const response = await fetch('/api/agent-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory),
      })

      if (response.ok) {
        setShowCreateForm(false)
        setNewMemory({
          agentId: '',
          agentType: '',
          category: 'context',
          content: '',
          importance: 0.5,
          tags: [],
        })
        loadMemories()
      }
    } catch (error) {
      console.error('Failed to create memory:', error)
    }
  }

  // Delete memory
  const deleteMemory = async (memoryId: string) => {
    try {
      const response = await fetch(`/api/agent-memory/${memoryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId))
        if (selectedMemory?.id === memoryId) {
          setSelectedMemory(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'learned_pattern':
        return <TrendingUp className="h-4 w-4" />
      case 'context':
        return <BookOpen className="h-4 w-4" />
      case 'preference':
        return <Star className="h-4 w-4" />
      case 'error_resolution':
        return <AlertTriangle className="h-4 w-4" />
      case 'optimization':
        return <Settings className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'learned_pattern':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'context':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'preference':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'error_resolution':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'optimization':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Brain className="h-6 w-6" />
          <h2 className="font-bold text-2xl">Agent Memory Browser</h2>
          {stats && <Badge variant="outline">{stats.totalMemories} memories</Badge>}
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Memory
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="mb-4 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
            <Input
              className="pl-10"
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSemanticSearch()}
              placeholder="Search memories or enter query for semantic search..."
              value={searchQuery}
            />
          </div>
          <Button disabled={isSearching || !searchQuery.trim()} onClick={performSemanticSearch}>
            {isSearching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
          <Button onClick={() => loadMemories()} variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <Select
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, agentType: value || undefined }))
            }
            value={filters.agentType || ''}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Agent Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="chat">Chat Agent</SelectItem>
              <SelectItem value="code">Code Agent</SelectItem>
              <SelectItem value="analysis">Analysis Agent</SelectItem>
              <SelectItem value="workflow">Workflow Agent</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, category: value || undefined }))
            }
            value={filters.category || ''}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              <SelectItem value="learned_pattern">Learned Pattern</SelectItem>
              <SelectItem value="context">Context</SelectItem>
              <SelectItem value="preference">Preference</SelectItem>
              <SelectItem value="error_resolution">Error Resolution</SelectItem>
              <SelectItem value="optimization">Optimization</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => loadMemories(true)} variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Create Memory Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-lg">Create New Memory</h3>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block font-medium text-sm">Agent ID</label>
              <Input
                onChange={(e) => setNewMemory((prev) => ({ ...prev, agentId: e.target.value }))}
                placeholder="agent-123"
                value={newMemory.agentId}
              />
            </div>
            <div>
              <label className="mb-2 block font-medium text-sm">Agent Type</label>
              <Input
                onChange={(e) => setNewMemory((prev) => ({ ...prev, agentType: e.target.value }))}
                placeholder="chat, code, analysis, etc."
                value={newMemory.agentType}
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block font-medium text-sm">Category</label>
              <Select
                onValueChange={(value: any) =>
                  setNewMemory((prev) => ({ ...prev, category: value }))
                }
                value={newMemory.category}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learned_pattern">Learned Pattern</SelectItem>
                  <SelectItem value="context">Context</SelectItem>
                  <SelectItem value="preference">Preference</SelectItem>
                  <SelectItem value="error_resolution">Error Resolution</SelectItem>
                  <SelectItem value="optimization">Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block font-medium text-sm">Importance (0-1)</label>
              <Input
                max="1"
                min="0"
                onChange={(e) =>
                  setNewMemory((prev) => ({
                    ...prev,
                    importance: Number.parseFloat(e.target.value),
                  }))
                }
                step="0.1"
                type="number"
                value={newMemory.importance}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block font-medium text-sm">Content</label>
            <Textarea
              onChange={(e) => setNewMemory((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Describe the memory content..."
              rows={3}
              value={newMemory.content}
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block font-medium text-sm">Tags (comma-separated)</label>
            <Input
              onChange={(e) =>
                setNewMemory((prev) => ({
                  ...prev,
                  tags: e.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="learning, user-preference, optimization"
              value={newMemory.tags.join(', ')}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setShowCreateForm(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!(newMemory.content && newMemory.agentId && newMemory.agentType)}
              onClick={createMemory}
            >
              Create Memory
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Memory List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="mb-4 font-semibold">Memories</h3>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="py-8 text-center">
                    <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
                    <span>Loading memories...</span>
                  </div>
                ) : memories.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Brain className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No memories found</p>
                  </div>
                ) : (
                  memories.map((memory) => (
                    <div
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        selectedMemory?.id === memory.id
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted/50'
                      }`}
                      key={memory.id}
                      onClick={() => setSelectedMemory(memory)}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(memory.category)}
                          <Badge
                            className={`text-xs ${getCategoryColor(memory.category)}`}
                            variant="secondary"
                          >
                            {memory.category.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star
                            className={`h-3 w-3 ${memory.importance > 0.7 ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                          />
                          {memory.similarity && (
                            <Badge className="text-xs" variant="outline">
                              {Math.round(memory.similarity * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div
                        className="mb-2 overflow-hidden text-sm"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {memory.content}
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{memory.agentType}</span>
                        <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
                      </div>

                      {memory.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {memory.tags.slice(0, 3).map((tag) => (
                            <Badge className="text-xs" key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                          {memory.tags.length > 3 && (
                            <Badge className="text-xs" variant="outline">
                              +{memory.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Memory Details */}
        <div className="lg:col-span-2">
          {selectedMemory ? (
            <Card className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(selectedMemory.category)}
                  <div>
                    <h3 className="font-semibold text-lg">Memory Details</h3>
                    <Badge className={getCategoryColor(selectedMemory.category)}>
                      {selectedMemory.category.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => deleteMemory(selectedMemory.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs className="space-y-4" defaultValue="content">
                <TabsList>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="context">Context</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                </TabsList>

                <TabsContent className="space-y-4" value="content">
                  <div>
                    <h4 className="mb-2 font-medium">Memory Content</h4>
                    <div className="rounded-lg bg-muted p-4">
                      <p className="whitespace-pre-wrap">{selectedMemory.content}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="mb-2 font-medium">Agent Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Agent ID:</span>
                          <span className="font-mono">{selectedMemory.agentId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Agent Type:</span>
                          <span>{selectedMemory.agentType}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-medium">Memory Properties</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Importance:</span>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-20 rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-blue-600"
                                style={{ width: `${selectedMemory.importance * 100}%` }}
                              />
                            </div>
                            <span>{(selectedMemory.importance * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        {selectedMemory.similarity && (
                          <div className="flex justify-between">
                            <span>Similarity:</span>
                            <span>{Math.round(selectedMemory.similarity * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedMemory.tags.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMemory.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            <Tag className="mr-1 h-3 w-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent className="space-y-4" value="context">
                  <div>
                    <h4 className="mb-2 font-medium">Context Data</h4>
                    <ScrollArea className="h-64 rounded border p-3">
                      <pre className="text-sm">
                        {JSON.stringify(selectedMemory.context, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent className="space-y-4" value="metadata">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="mb-2 font-medium">Timestamps</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Created: {new Date(selectedMemory.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Updated: {new Date(selectedMemory.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-medium">Actions</h4>
                      <div className="space-y-2">
                        <Button className="w-full" size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          View Related Memories
                        </Button>
                        <Button className="w-full" size="sm" variant="outline">
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Generate Insights
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="py-12 text-center text-muted-foreground">
                <Brain className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <h3 className="mb-2 font-medium text-lg">No Memory Selected</h3>
                <p>Select a memory from the list to view its details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-lg">Memory Statistics</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="font-bold text-2xl">{stats.totalMemories}</div>
              <div className="text-muted-foreground text-sm">Total Memories</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl">{(stats.avgImportance * 100).toFixed(0)}%</div>
              <div className="text-muted-foreground text-sm">Avg Importance</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl">
                {Object.keys(stats.categoryCounts || {}).length}
              </div>
              <div className="text-muted-foreground text-sm">Categories</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl">
                {Math.max(...Object.values(stats.categoryCounts || {}).map(Number))}
              </div>
              <div className="text-muted-foreground text-sm">Largest Category</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
