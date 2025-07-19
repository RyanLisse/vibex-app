/**
 * ElectricSQL + TanStack Query Integration Example
 *
 * Demonstrates complete real-time database synchronization with
 * automatic cache invalidation and optimistic updates.
 */

'use client'

import React, { useEffect, useState } from 'react'
import {
  useActiveAgentExecutions,
  useAgentExecutions,
  useCreateAgentExecution,
} from './hooks/use-agent-executions'
import { useAgentMemories, useCreateAgentMemory, useSemanticSearch } from './hooks/use-agent-memory'
import {
  useEventsByExecution,
  useObservabilityEvents,
  useRealtimeObservabilityEvents,
} from './hooks/use-observability-events'
import { useActiveWorkflows, useExecuteWorkflow, useWorkflows } from './hooks/use-workflows'
import {
  createQueryProviderConfig,
  QueryDevStatus,
  QueryProvider,
  useElectricBridgeStats,
  useElectricConnection,
} from './provider'

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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">Real-time Dashboard</h1>
        <ConnectionStatus connection={connection} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Active Executions */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold text-lg">Active Executions</h2>
          <div className="space-y-2">
            {activeExecutions?.executions?.slice(0, 5).map((execution) => (
              <div className="flex items-center justify-between" key={execution.id}>
                <span className="text-sm">{execution.agentType}</span>
                <span
                  className={`rounded px-2 py-1 text-xs ${
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
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold text-lg">Recent Events</h2>
          <div className="space-y-2">
            {recentEvents?.events?.slice(0, 5).map((event) => (
              <div className="text-sm" key={event.id}>
                <div className="flex justify-between">
                  <span className="font-medium">{event.eventType}</span>
                  <span
                    className={`rounded px-1 text-xs ${
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
                {event.message && <div className="truncate text-gray-500">{event.message}</div>}
              </div>
            )) || <div className="text-gray-500 text-sm">No recent events</div>}
          </div>
        </div>

        {/* Active Workflows */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold text-lg">Active Workflows</h2>
          <div className="space-y-2">
            {activeWorkflows?.workflows?.slice(0, 5).map((workflow) => (
              <div className="flex items-center justify-between" key={workflow.id}>
                <span className="text-sm">{workflow.name}</span>
                <span className="rounded bg-green-100 px-2 py-1 text-green-800 text-xs">
                  Active
                </span>
              </div>
            )) || <div className="text-gray-500 text-sm">No active workflows</div>}
          </div>
        </div>
      </div>

      {/* Bridge Statistics */}
      {stats && (
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">Bridge Statistics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
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
    <div className="space-y-6 p-6">
      <h2 className="font-bold text-2xl">Interactive Demo</h2>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={createExecution.isPending}
          onClick={handleCreateExecution}
        >
          {createExecution.isPending ? 'Creating...' : 'Create Execution'}
        </button>

        <button
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          disabled={createMemory.isPending}
          onClick={handleCreateMemory}
        >
          {createMemory.isPending ? 'Creating...' : 'Create Memory'}
        </button>

        <button
          className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          onClick={() => refetchExecutions()}
        >
          Force Refetch
        </button>
      </div>

      {/* Semantic Search */}
      <div className="space-y-2">
        <label className="block font-medium text-sm">Semantic Search (WASM-optimized):</label>
        <input
          className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agent memories..."
          type="text"
          value={searchQuery}
        />

        {searchResults && searchResults.length > 0 && (
          <div className="rounded bg-gray-50 p-3">
            <h4 className="mb-2 font-medium">Search Results:</h4>
            {searchResults.slice(0, 3).map((result) => (
              <div className="mb-2 border-b pb-2 text-sm last:border-b-0" key={result.memory.id}>
                <div className="font-medium">{result.memory.contextKey}</div>
                <div className="text-gray-600">{result.memory.content}</div>
                <div className="text-gray-500 text-xs">
                  Similarity: {(result.similarity * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Executions */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">Recent Executions (Real-time)</h3>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {executions?.executions?.slice(0, 10).map((execution) => (
            <div
              className="flex items-center justify-between rounded bg-gray-50 p-2"
              key={execution.id}
            >
              <div>
                <div className="font-medium">{execution.agentType}</div>
                <div className="text-gray-600 text-sm">
                  Started: {execution.startedAt.toLocaleTimeString()}
                </div>
              </div>
              <div
                className={`rounded px-2 py-1 text-xs ${
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
      <div className={`h-3 w-3 rounded-full ${getStatusColor(connection.health)}`} />
      <span className="font-medium text-sm capitalize">{connection.health}</span>
      {connection.offlineQueueSize > 0 && (
        <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
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
        <nav className="border-b bg-white shadow">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <h1 className="font-bold text-xl">ElectricSQL + TanStack Query</h1>
              </div>
              <div className="flex space-x-4">
                <button
                  className={`rounded px-3 py-2 font-medium text-sm ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`rounded px-3 py-2 font-medium text-sm ${
                    activeTab === 'demo'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab('demo')}
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
      <h2 className="mb-4 font-bold text-2xl">Integration Usage Example</h2>

      <div className="mb-4 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">1. Wrap your app with QueryProvider:</h3>
        <pre className="overflow-x-auto text-sm">
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

      <div className="mb-4 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">2. Use hooks in your components:</h3>
        <pre className="overflow-x-auto text-sm">
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

      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">3. Monitor connection status:</h3>
        <pre className="overflow-x-auto text-sm">
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
