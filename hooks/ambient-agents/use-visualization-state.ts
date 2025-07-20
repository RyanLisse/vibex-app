import { Edge, Node } from '@xyflow/react'
import { useCallback, useState } from 'react'

export interface VisualizationState {
  viewMode: 'agent-centric' | 'task-centric' | 'event-centric' | 'memory-centric'
  layoutAlgorithm: 'hierarchical' | 'force-directed' | 'circular' | 'custom'
  filters: {
    searchTerm: string
    showInactive: boolean
    showMetrics: boolean
    nodeTypes: string[]
    statusFilters: string[]
  }
  selectedNodes: string[]
  visibilitySettings: {
    showPerformanceMetrics: boolean
    showEventFlow: boolean
    showMemoryConnections: boolean
  }
  zoomLevel: number
  panPosition: { x: number; y: number }
}

const defaultState: VisualizationState = {
  viewMode: 'agent-centric',
  layoutAlgorithm: 'force-directed',
  filters: {
    searchTerm: '',
    showInactive: true,
    showMetrics: true,
    nodeTypes: [],
    statusFilters: [],
  },
  selectedNodes: [],
  visibilitySettings: {
    showPerformanceMetrics: true,
    showEventFlow: true,
    showMemoryConnections: true,
  },
  zoomLevel: 1,
  panPosition: { x: 0, y: 0 },
}

export const useVisualizationState = (initialState?: Partial<VisualizationState>) => {
  const [visualizationState, setVisualizationState] = useState<VisualizationState>({
    ...defaultState,
    ...initialState,
  })

  const updateViewMode = useCallback((viewMode: VisualizationState['viewMode']) => {
    setVisualizationState((prev) => ({
      ...prev,
      viewMode,
    }))
  }, [])

  const updateLayout = useCallback((layoutAlgorithm: VisualizationState['layoutAlgorithm']) => {
    setVisualizationState((prev) => ({
      ...prev,
      layoutAlgorithm,
    }))
  }, [])

  const applyFilters = useCallback((filters: Partial<VisualizationState['filters']>) => {
    setVisualizationState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...filters,
      },
    }))
  }, [])

  const toggleNodeVisibility = useCallback((nodeId: string) => {
    setVisualizationState((prev) => ({
      ...prev,
      selectedNodes: prev.selectedNodes.includes(nodeId)
        ? prev.selectedNodes.filter((id) => id !== nodeId)
        : [...prev.selectedNodes, nodeId],
    }))
  }, [])

  const updateVisibilitySettings = useCallback(
    (settings: Partial<VisualizationState['visibilitySettings']>) => {
      setVisualizationState((prev) => ({
        ...prev,
        visibilitySettings: {
          ...prev.visibilitySettings,
          ...settings,
        },
      }))
    },
    []
  )

  const updateZoomAndPan = useCallback(
    (zoomLevel: number, panPosition: { x: number; y: number }) => {
      setVisualizationState((prev) => ({
        ...prev,
        zoomLevel,
        panPosition,
      }))
    },
    []
  )

  const resetState = useCallback(() => {
    setVisualizationState(defaultState)
  }, [])

  const saveState = useCallback(() => {
    localStorage.setItem('ambient-agent-visualization-state', JSON.stringify(visualizationState))
  }, [visualizationState])

  const loadState = useCallback(() => {
    try {
      const saved = localStorage.getItem('ambient-agent-visualization-state')
      if (saved) {
        const parsedState = JSON.parse(saved)
        setVisualizationState((prev) => ({
          ...prev,
          ...parsedState,
        }))
      }
    } catch (error) {
      console.warn('Failed to load visualization state:', error)
    }
  }, [])

  return {
    visualizationState,
    updateViewMode,
    updateLayout,
    applyFilters,
    toggleNodeVisibility,
    updateVisibilitySettings,
    updateZoomAndPan,
    resetState,
    saveState,
    loadState,
  }
}
