'use client'

import React from 'react'
import { VisualizationEngineWithProvider } from '../../components/ambient-agents/visualization-engine'

export default function AmbientAgentsPage() {
  return (
    <div className="h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Ambient Agent Visualization</h1>
          <div className="text-sm text-gray-600">
            Real-time monitoring and management of AI agent workflows
          </div>
        </div>
      </div>

      {/* Main visualization area */}
      <div className="h-[calc(100vh-4rem)]">
        <VisualizationEngineWithProvider
          viewMode="agent-centric"
          layoutAlgorithm="force-directed"
          showPerformanceMetrics={true}
          enableCollaboration={false}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}
