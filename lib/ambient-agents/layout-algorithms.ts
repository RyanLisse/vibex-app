import type { Edge, Node } from '@xyflow/react'
import * as d3 from 'd3-force'
import dagre from 'dagre'

export interface LayoutOptions {
  nodeWidth?: number
  nodeHeight?: number
  spacing?: number
  direction?: 'TB' | 'BT' | 'LR' | 'RL'
}

export const layoutAlgorithms = {
  hierarchical: (nodes: Node[], edges: Edge[], options: LayoutOptions = {}): Node[] => {
    const { nodeWidth = 280, nodeHeight = 200, spacing = 50, direction = 'TB' } = options

    // Create a new directed graph
    const g = new dagre.graphlib.Graph()
    g.setGraph({
      rankdir: direction,
      nodesep: spacing,
      ranksep: spacing * 2,
      marginx: 50,
      marginy: 50,
    })
    g.setDefaultEdgeLabel(() => ({}))

    // Add nodes to the graph
    nodes.forEach((node) => {
      g.setNode(node.id, {
        width: nodeWidth,
        height: nodeHeight,
      })
    })

    // Add edges to the graph
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target)
    })

    // Apply dagre layout
    dagre.layout(g)

    // Update node positions
    return nodes.map((node) => {
      const nodeWithPosition = g.node(node.id)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      }
    })
  },

  forceDirected: (nodes: Node[], edges: Edge[], options: LayoutOptions = {}): Node[] => {
    const { spacing = 100 } = options

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        'link',
        d3
          .forceLink(edges as any)
          .id((d: any) => d.id)
          .distance(spacing)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(400, 300))
      .force('collision', d3.forceCollide().radius(60))

    // Run simulation for a fixed number of iterations
    for (let i = 0; i < 300; i++) {
      simulation.tick()
    }

    // Update node positions
    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: (simulation.nodes()[index] as any).x || 0,
        y: (simulation.nodes()[index] as any).y || 0,
      },
    }))
  },

  circular: (nodes: Node[], edges: Edge[], options: LayoutOptions = {}): Node[] => {
    const { spacing = 200 } = options
    const radius = Math.max(spacing, nodes.length * 30)
    const centerX = 400
    const centerY = 300

    return nodes.map((node, index) => {
      const angle = (index * 2 * Math.PI) / nodes.length
      return {
        ...node,
        position: {
          x: Math.cos(angle) * radius + centerX,
          y: Math.sin(angle) * radius + centerY,
        },
      }
    })
  },

  grid: (nodes: Node[], edges: Edge[], options: LayoutOptions = {}): Node[] => {
    const { spacing = 200 } = options
    const cols = Math.ceil(Math.sqrt(nodes.length))

    return nodes.map((node, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols

      return {
        ...node,
        position: {
          x: col * spacing + 100,
          y: row * spacing + 100,
        },
      }
    })
  },

  clustered: (nodes: Node[], edges: Edge[], options: LayoutOptions = {}): Node[] => {
    const { spacing = 150 } = options

    // Group nodes by type
    const nodesByType = nodes.reduce(
      (acc, node) => {
        const type = node.type || 'default'
        if (!acc[type]) acc[type] = []
        acc[type].push(node)
        return acc
      },
      {} as Record<string, Node[]>
    )

    const typeNames = Object.keys(nodesByType)
    const clusterRadius = 200
    const centerX = 400
    const centerY = 300

    let result: Node[] = []

    typeNames.forEach((type, typeIndex) => {
      const clusterNodes = nodesByType[type]
      const clusterAngle = (typeIndex * 2 * Math.PI) / typeNames.length
      const clusterCenterX = Math.cos(clusterAngle) * clusterRadius + centerX
      const clusterCenterY = Math.sin(clusterAngle) * clusterRadius + centerY

      const positionedNodes = clusterNodes.map((node, nodeIndex) => {
        const nodeAngle = (nodeIndex * 2 * Math.PI) / clusterNodes.length
        const nodeRadius = Math.min(100, clusterNodes.length * 15)

        return {
          ...node,
          position: {
            x: Math.cos(nodeAngle) * nodeRadius + clusterCenterX,
            y: Math.sin(nodeAngle) * nodeRadius + clusterCenterY,
          },
        }
      })

      result = [...result, ...positionedNodes]
    })

    return result
  },
}

export const applyLayoutAlgorithm = (
  nodes: Node[],
  edges: Edge[],
  algorithm: keyof typeof layoutAlgorithms,
  options?: LayoutOptions
): Node[] => {
  if (!layoutAlgorithms[algorithm]) {
    console.warn(`Unknown layout algorithm: ${algorithm}`)
    return nodes
  }

  try {
    return layoutAlgorithms[algorithm](nodes, edges, options)
  } catch (error) {
    console.error(`Error applying layout algorithm ${algorithm}:`, error)
    return nodes
  }
}

export const getLayoutAlgorithmOptions = (algorithm: keyof typeof layoutAlgorithms) => {
  const baseOptions = {
    nodeWidth: 280,
    nodeHeight: 200,
    spacing: 100,
  }

  switch (algorithm) {
    case 'hierarchical':
      return {
        ...baseOptions,
        direction: 'TB' as const,
        spacing: 50,
      }
    case 'forceDirected':
      return {
        ...baseOptions,
        spacing: 100,
        strength: -300,
      }
    case 'circular':
      return {
        ...baseOptions,
        spacing: 200,
      }
    case 'grid':
      return {
        ...baseOptions,
        spacing: 200,
      }
    case 'clustered':
      return {
        ...baseOptions,
        spacing: 150,
        clusterRadius: 200,
      }
    default:
      return baseOptions
  }
}
