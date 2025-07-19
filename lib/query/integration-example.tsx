/**
 * ElectricSQL + TanStack Query Integration Example
 *
 * Demonstrates complete real-time database synchronization with
 * automatic cache invalidation and optimistic updates.
 */

'use client'

import React, { useEffect, useState } from 'react'
import {
  QueryProvider,
  useElectricConnection,
  useElectricBridgeStats,
  QueryDevStatus,
  createQueryProviderConfig,
} from './provider'
import {
  useAgentExecutions,
  useCreateAgentExecution,
  useActiveAgentExecutions,
} from './hooks/use-agent-executions'
import {
  useObservabilityEvents,
  useRealtimeObservabilityEvents,
  useEventsByExecution,
} from './hooks/use-observability-events'
import { useAgentMemories, useSemanticSearch, useCreateAgentMemory } from './hooks/use-agent-memory'
import { useWorkflows, useExecuteWorkflow, useActiveWorkflows } from './hooks/use-workflows'

/**
 * Real-time Dashboard Component
 * Shows live data with automatic updates from ElectricSQL
 */
function RealtimeDashboard() {
  const connection = useElectricConnection()
  const { stats } = useElectricBridgeStats()

  // Real-time queries - automatically update when database changes
  const { data: activeExecutions } = useActiveAgentExecutions()
  const { data: recentEvents } = useRealtimeObservabilityEvents()
  const { data: activeWorkflows } = useActiveWorkflows()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Real-time Dashboard</h1>
        <ConnectionStatus connection={connection} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Executions */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-3">Active Executions</h2>
          <div className="space-y-2">
            {activeExecutions?.executions?.slice(0, 5).map((execution) => (
              <div key={execution.id} className="flex justify-between items-center">
                <span className="text-sm">{execution.agentType}</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    execution.status === 'running'
                      ? 'bg-blue-100 text-blue-800'
                      : execution.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {execution.status}
                </span>
              </div>
            )) || <div className="text-gray-500 text-sm">No active executions</div>}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Events</h2>
          <div className="space-y-2">
            {recentEvents?.events?.slice(0, 5).map((event) => (
              <div key={event.id} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{event.eventType}</span>
                  <span
                    className={`px-1 rounded text-xs ${
                      event.severity === 'error'
                        ? 'bg-red-100 text-red-800'
                        : event.severity === 'warn'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {event.severity}
                  </span>
                </div>
                {event.message && <div className="text-gray-500 truncate">{event.message}</div>}
              </div>
            )) || <div className="text-gray-500 text-sm">No recent events</div>}
          </div>
        </div>

        {/* Active Workflows */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-3">Active Workflows</h2>
          <div className="space-y-2">
            {activeWorkflows?.workflows?.slice(0, 5).map((workflow) => (
              <div key={workflow.id} className="flex justify-between items-center">
                <span className="text-sm">{workflow.name}</span>
                <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            )) || <div className="text-gray-500 text-sm">No active workflows</div>}
          </div>
        </div>
      </div>

      {/* Bridge Statistics */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Bridge Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 ${stats.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {stats.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Subscriptions:</span>
              <span className="ml-2">{stats.subscribedTables.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Pending Invalidations:</span>
              <span className="ml-2">{stats.queuedInvalidations}</span>
            </div>
            <div>
              <span className="text-gray-600">Sync Status:</span>
              <span className="ml-2 capitalize">{connection.syncStatus}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Interactive Demo Component
 * Shows optimistic updates and real-time synchronization
 */
function InteractiveDemo() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mutations with optimistic updates
  const createExecution = useCreateAgentExecution()
  const createMemory = useCreateAgentMemory()
  const executeWorkflow = useExecuteWorkflow()

  // Real-time queries
  const { data: executions, refetch: refetchExecutions } = useAgentExecutions()
  const { data: searchResults } = useSemanticSearch(searchQuery, {
    limit: 10,
    useWASM: true, // Enable WASM optimization
  })

  const handleCreateExecution = async () => {
    try {
      await createExecution.mutateAsync({
        agentType: 'demo-agent',
        input: { message: 'Demo execution created at ' + new Date().toISOString() },
        metadata: { source: 'interactive-demo' },
      })

      // Note: No manual refetch needed - ElectricSQL bridge handles cache invalidation
      console.log('✅ Execution created with automatic cache update!')
    } catch (error) {
      console.error('Failed to create execution:', error)
    }
  }

  const handleCreateMemory = async () => {
    try {
      await createMemory.mutateAsync({
        agentType: 'demo-agent',
        contextKey: 'demo-context',
        content: `Demo memory created at ${new Date().toISOString()}`,
        importance: Math.floor(Math.random() * 10) + 1,
        metadata: { source: 'interactive-demo' },
      })

      console.log('✅ Memory created with automatic cache update!')
    } catch (error) {
      console.error('Failed to create memory:', error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Interactive Demo</h2>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleCreateExecution}
          disabled={createExecution.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {createExecution.isPending ? 'Creating...' : 'Create Execution'}
        </button>

        <button
          onClick={handleCreateMemory}
          disabled={createMemory.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {createMemory.isPending ? 'Creating...' : 'Create Memory'}
        </button>

        <button
          onClick={() => refetchExecutions()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Force Refetch
        </button>
      </div>

      {/* Semantic Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Semantic Search (WASM-optimized):</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agent memories..."
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {searchResults && searchResults.length > 0 && (
          <div className="bg-gray-50 rounded p-3">
            <h4 className="font-medium mb-2">Search Results:</h4>
            {searchResults.slice(0, 3).map((result) => (
              <div key={result.memory.id} className="text-sm border-b pb-2 mb-2 last:border-b-0">
                <div className="font-medium">{result.memory.contextKey}</div>
                <div className="text-gray-600">{result.memory.content}</div>
                <div className="text-xs text-gray-500">
                  Similarity: {(result.similarity * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Executions */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold mb-3">Recent Executions (Real-time)</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {executions?.executions?.slice(0, 10).map((execution) => (
            <div
              key={execution.id}
              className="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <div>
                <div className="font-medium">{execution.agentType}</div>
                <div className="text-sm text-gray-600">
                  Started: {execution.startedAt.toLocaleTimeString()}
                </div>
              </div>
              <div
                className={`px-2 py-1 rounded text-xs ${
                  execution.status === 'running'
                    ? 'bg-blue-100 text-blue-800'
                    : execution.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : execution.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {execution.status}
              </div>
            </div>
          )) || <div className="text-gray-500">No executions found</div>}
        </div>
      </div>
    </div>
  )
}

/**
 * Connection Status Component
 */
function ConnectionStatus({
  connection,
}: {
  connection: ReturnType<typeof useElectricConnection>
}) {
  const getStatusColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'disconnected':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor(connection.health)}`} />
      <span className="text-sm font-medium capitalize">{connection.health}</span>
      {connection.offlineQueueSize > 0 && (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
          {connection.offlineQueueSize} queued
        </span>
      )}
    </div>
  )
}

/**
 * Complete Integration Example App
 */
export function IntegrationExampleApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'demo'>('dashboard')

  // Create query provider configuration
  const queryConfig = createQueryProviderConfig({
    enableDevtools: true,
    electricBridge: {
      debugMode: true,
      batchInvalidationMs: 50, // Faster updates for demo
    },
  })

  return (
    <QueryProvider config={queryConfig}>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold">ElectricSQL + TanStack Query</h1>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('demo')}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    activeTab === 'demo'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Interactive Demo
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main>{activeTab === 'dashboard' ? <RealtimeDashboard /> : <InteractiveDemo />}</main>

        {/* Development Status - Only in development */}
        <QueryDevStatus />
      </div>
    </QueryProvider>
  )
}

/**
 * Usage Example for integrating into existing apps
 */
export function ExampleUsage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Integration Usage Example</h2>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="font-semibold mb-2">1. Wrap your app with QueryProvider:</h3>
        <pre className="text-sm overflow-x-auto">
          {`import { QueryProvider, createQueryProviderConfig } from '@/lib/query/provider'

function App() {
  const config = createQueryProviderConfig({
    enableDevtools: true,
    electricBridge: {
      enableRealTimeInvalidation: true,
      batchInvalidationMs: 100,
    },
  })

  return (
    <QueryProvider config={config}>
      <YourAppContent />
    </QueryProvider>
  )
}`}
        </pre>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="font-semibold mb-2">2. Use hooks in your components:</h3>
        <pre className="text-sm overflow-x-auto">
          {`import { useAgentExecutions, useCreateAgentExecution } from '@/lib/query/hooks/use-agent-executions'

function ExecutionsPage() {
  const { data: executions, isLoading } = useAgentExecutions()
  const createExecution = useCreateAgentExecution()

  const handleCreate = async () => {
    await createExecution.mutateAsync({
      agentType: 'my-agent',
      input: { task: 'example' },
    })
    // Cache automatically updates via ElectricSQL bridge!
  }

  return (
    <div>
      {executions?.executions?.map(execution => (
        <div key={execution.id}>{execution.agentType}</div>
      ))}
      <button onClick={handleCreate}>Create Execution</button>
    </div>
  )
}`}
        </pre>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">3. Monitor connection status:</h3>
        <pre className="text-sm overflow-x-auto">
          {`import { useElectricConnection } from '@/lib/query/provider'

function ConnectionMonitor() {
  const connection = useElectricConnection()

  return (
    <div className={\`status \${connection.health}\`}>
      Connection: {connection.health}
      {connection.offlineQueueSize > 0 && (
        <span>({connection.offlineQueueSize} queued operations)</span>
      )}
    </div>
  )
}`}
        </pre>
      </div>
    </div>
  )
}

export default IntegrationExampleApp
