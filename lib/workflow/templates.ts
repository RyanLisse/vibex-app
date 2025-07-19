/**
 * Workflow Template System
 *
 * Pre-built workflow templates for common patterns and use cases
 */

import { z } from 'zod'
import type { WorkflowTemplate, WorkflowDefinition } from './types'

// Template registry
export class WorkflowTemplateRegistry {
  private templates = new Map<string, WorkflowTemplate>()

  /**
   * Register a new workflow template
   */
  register(template: WorkflowTemplate): void {
    this.templates.set(template.id, template)
  }

  /**
   * Get a template by ID
   */
  get(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id)
  }

  /**
   * Get all templates
   */
  getAll(): WorkflowTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Get templates by category
   */
  getByCategory(category: string): WorkflowTemplate[] {
    return this.getAll().filter((t) => t.category === category)
  }

  /**
   * Get templates by tags
   */
  getByTags(tags: string[]): WorkflowTemplate[] {
    return this.getAll().filter((t) => t.tags?.some((tag) => tags.includes(tag)) ?? false)
  }

  /**
   * Create workflow definition from template
   */
  createFromTemplate(templateId: string, params: Record<string, any>): WorkflowDefinition {
    const template = this.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Validate parameters
    for (const param of template.parameters) {
      if (param.required && !(param.name in params)) {
        throw new Error(`Required parameter ${param.name} not provided`)
      }
      if (param.validation && param.name in params) {
        param.validation.parse(params[param.name])
      }
    }

    // Apply parameters to template definition
    const definition = JSON.parse(JSON.stringify(template.definition), (key, value) => {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const paramName = value.slice(2, -2).trim()
        return params[paramName] ?? value
      }
      return value
    })

    return {
      ...definition,
      id: `${templateId}-${Date.now()}`,
      metadata: {
        ...definition.metadata,
        templateId,
        templateParams: params,
      },
    } as WorkflowDefinition
  }
}

// Create global template registry
export const templateRegistry = new WorkflowTemplateRegistry()

// Pre-built templates

// 1. Data Processing Pipeline Template
templateRegistry.register({
  id: 'data-processing-pipeline',
  name: 'Data Processing Pipeline',
  description: 'Process data through extraction, transformation, and loading stages',
  category: 'data',
  tags: ['etl', 'data', 'pipeline'],
  parameters: [
    {
      name: 'sourceUrl',
      type: 'string',
      description: 'URL of the data source',
      required: true,
      validation: z.string().url(),
    },
    {
      name: 'transformScript',
      type: 'string',
      description: 'Transformation script or expression',
      required: true,
    },
    {
      name: 'destinationTable',
      type: 'string',
      description: 'Destination table name',
      required: true,
    },
  ],
  definition: {
    name: 'Data Processing Pipeline',
    version: 1,
    startStepId: 'extract',
    steps: [
      {
        id: 'extract',
        name: 'Extract Data',
        type: 'action',
        action: {
          type: 'http.request',
          params: {
            url: '{{sourceUrl}}',
            method: 'GET',
          },
          outputMapping: {
            'response.data': 'extractedData',
          },
        },
      },
      {
        id: 'validate',
        name: 'Validate Data',
        type: 'condition',
        condition: {
          expression: 'extractedData != null && extractedData.length > 0',
          trueStepId: 'transform',
          falseStepId: 'error-no-data',
        },
      },
      {
        id: 'transform',
        name: 'Transform Data',
        type: 'transform',
        transform: {
          expression: '{{transformScript}}',
          outputVariable: 'transformedData',
        },
      },
      {
        id: 'load',
        name: 'Load Data',
        type: 'action',
        action: {
          type: 'database.insert',
          params: {
            table: '{{destinationTable}}',
            data: '${transformedData}',
          },
        },
      },
      {
        id: 'error-no-data',
        name: 'Handle No Data Error',
        type: 'action',
        action: {
          type: 'notification.send',
          params: {
            message: 'No data extracted from source',
            severity: 'error',
          },
        },
      },
    ],
  },
  examples: [
    {
      name: 'Process User Data',
      input: {
        sourceUrl: 'https://api.example.com/users',
        transformScript: 'data.map(u => ({ id: u.id, name: u.name, email: u.email }))',
        destinationTable: 'users',
      },
    },
  ],
})

// 2. Approval Workflow Template
templateRegistry.register({
  id: 'approval-workflow',
  name: 'Multi-Stage Approval Workflow',
  description: 'Route requests through multiple approval stages',
  category: 'business',
  tags: ['approval', 'business', 'process'],
  parameters: [
    {
      name: 'requestType',
      type: 'string',
      description: 'Type of request being approved',
      required: true,
    },
    {
      name: 'approvers',
      type: 'array',
      description: 'List of approver groups',
      required: true,
      validation: z.array(
        z.object({
          level: z.number(),
          users: z.array(z.string()),
        })
      ),
    },
    {
      name: 'timeoutHours',
      type: 'number',
      description: 'Timeout for each approval stage in hours',
      default: 48,
    },
  ],
  definition: {
    name: 'Approval Workflow',
    version: 1,
    startStepId: 'init',
    steps: [
      {
        id: 'init',
        name: 'Initialize Request',
        type: 'action',
        action: {
          type: 'workflow.init',
          params: {
            requestType: '{{requestType}}',
            status: 'pending',
          },
        },
      },
      {
        id: 'approval-loop',
        name: 'Approval Loop',
        type: 'loop',
        loop: {
          items: '{{approvers}}',
          itemVariable: 'currentApprover',
          indexVariable: 'approvalLevel',
          bodyStepId: 'request-approval',
        },
      },
      {
        id: 'request-approval',
        name: 'Request Approval',
        type: 'human_approval',
        approval: {
          approvers: '${currentApprover.users}',
          title: 'Approval Required - Level ${approvalLevel + 1}',
          description: 'Please review and approve the {{requestType}} request',
          timeout: '{{timeoutHours * 3600000}}',
          onTimeout: 'escalate',
        },
      },
      {
        id: 'check-approval',
        name: 'Check Approval Status',
        type: 'condition',
        condition: {
          expression: 'approvalStatus === "approved"',
          trueStepId: 'notify-approval',
          falseStepId: 'notify-rejection',
        },
      },
      {
        id: 'notify-approval',
        name: 'Notify Approval',
        type: 'action',
        action: {
          type: 'notification.send',
          params: {
            message: '{{requestType}} request has been approved',
            recipients: '${requestor}',
          },
        },
      },
      {
        id: 'notify-rejection',
        name: 'Notify Rejection',
        type: 'action',
        action: {
          type: 'notification.send',
          params: {
            message: '{{requestType}} request has been rejected',
            recipients: '${requestor}',
          },
        },
      },
    ],
  },
})

// 3. Retry with Circuit Breaker Template
templateRegistry.register({
  id: 'retry-circuit-breaker',
  name: 'Retry with Circuit Breaker',
  description: 'Retry failed operations with circuit breaker pattern',
  category: 'resilience',
  tags: ['retry', 'circuit-breaker', 'resilience'],
  parameters: [
    {
      name: 'operation',
      type: 'object',
      description: 'Operation to execute',
      required: true,
    },
    {
      name: 'maxRetries',
      type: 'number',
      description: 'Maximum retry attempts',
      default: 3,
    },
    {
      name: 'circuitBreakerThreshold',
      type: 'number',
      description: 'Failure threshold for circuit breaker',
      default: 5,
    },
  ],
  definition: {
    name: 'Retry with Circuit Breaker',
    version: 1,
    startStepId: 'check-circuit',
    variables: {
      retryCount: 0,
      failureCount: 0,
      circuitOpen: false,
    },
    steps: [
      {
        id: 'check-circuit',
        name: 'Check Circuit State',
        type: 'condition',
        condition: {
          expression: '!circuitOpen',
          trueStepId: 'execute-operation',
          falseStepId: 'circuit-open-error',
        },
      },
      {
        id: 'execute-operation',
        name: 'Execute Operation',
        type: 'action',
        action: '{{operation}}',
        errorHandler: {
          type: 'retry',
          fallbackStepId: 'handle-failure',
        },
      },
      {
        id: 'handle-failure',
        name: 'Handle Failure',
        type: 'action',
        action: {
          type: 'workflow.update',
          params: {
            'variables.retryCount': '${retryCount + 1}',
            'variables.failureCount': '${failureCount + 1}',
          },
        },
      },
      {
        id: 'check-retry',
        name: 'Check Retry Limit',
        type: 'condition',
        condition: {
          expression: 'retryCount < {{maxRetries}}',
          trueStepId: 'wait-before-retry',
          falseStepId: 'check-circuit-breaker',
        },
      },
      {
        id: 'wait-before-retry',
        name: 'Wait Before Retry',
        type: 'wait',
        wait: {
          duration: '${Math.pow(2, retryCount) * 1000}', // Exponential backoff
        },
      },
      {
        id: 'check-circuit-breaker',
        name: 'Check Circuit Breaker',
        type: 'condition',
        condition: {
          expression: 'failureCount >= {{circuitBreakerThreshold}}',
          trueStepId: 'open-circuit',
          falseStepId: 'operation-failed',
        },
      },
      {
        id: 'open-circuit',
        name: 'Open Circuit',
        type: 'action',
        action: {
          type: 'workflow.update',
          params: {
            'variables.circuitOpen': true,
          },
        },
      },
      {
        id: 'circuit-open-error',
        name: 'Circuit Open Error',
        type: 'action',
        action: {
          type: 'error.throw',
          params: {
            message: 'Circuit breaker is open',
            code: 'CIRCUIT_OPEN',
          },
        },
      },
      {
        id: 'operation-failed',
        name: 'Operation Failed',
        type: 'action',
        action: {
          type: 'error.throw',
          params: {
            message: 'Operation failed after {{maxRetries}} retries',
            code: 'MAX_RETRIES_EXCEEDED',
          },
        },
      },
    ],
  },
})

// 4. Parallel Data Aggregation Template
templateRegistry.register({
  id: 'parallel-aggregation',
  name: 'Parallel Data Aggregation',
  description: 'Fetch data from multiple sources in parallel and aggregate results',
  category: 'data',
  tags: ['parallel', 'aggregation', 'data'],
  parameters: [
    {
      name: 'dataSources',
      type: 'array',
      description: 'List of data sources to fetch from',
      required: true,
      validation: z.array(
        z.object({
          id: z.string(),
          url: z.string().url(),
          transform: z.string().optional(),
        })
      ),
    },
    {
      name: 'aggregationMethod',
      type: 'string',
      description: 'How to aggregate the results',
      default: 'merge',
      validation: z.enum(['merge', 'concat', 'sum', 'average']),
    },
  ],
  definition: {
    name: 'Parallel Data Aggregation',
    version: 1,
    startStepId: 'prepare-sources',
    steps: [
      {
        id: 'prepare-sources',
        name: 'Prepare Data Sources',
        type: 'transform',
        transform: {
          expression: '{{dataSources}}.map(s => s.id)',
          outputVariable: 'sourceIds',
        },
      },
      {
        id: 'fetch-parallel',
        name: 'Fetch Data in Parallel',
        type: 'parallel',
        parallel: {
          steps: '${sourceIds}',
          waitForAll: true,
          continueOnError: true,
        },
      },
      {
        id: 'aggregate-results',
        name: 'Aggregate Results',
        type: 'aggregate',
        aggregate: {
          sources: '${sourceIds}',
          operation: '{{aggregationMethod}}',
          outputVariable: 'aggregatedData',
        },
      },
      {
        id: 'validate-results',
        name: 'Validate Results',
        type: 'condition',
        condition: {
          expression: 'aggregatedData != null && Object.keys(aggregatedData).length > 0',
          trueStepId: 'process-data',
          falseStepId: 'handle-no-data',
        },
      },
      {
        id: 'process-data',
        name: 'Process Aggregated Data',
        type: 'action',
        action: {
          type: 'data.process',
          params: {
            data: '${aggregatedData}',
          },
        },
      },
      {
        id: 'handle-no-data',
        name: 'Handle No Data',
        type: 'action',
        action: {
          type: 'notification.send',
          params: {
            message: 'No data retrieved from any source',
            severity: 'warning',
          },
        },
      },
    ],
  },
})

// 5. Scheduled Maintenance Template
templateRegistry.register({
  id: 'scheduled-maintenance',
  name: 'Scheduled Maintenance Workflow',
  description: 'Perform scheduled maintenance tasks with health checks',
  category: 'operations',
  tags: ['maintenance', 'scheduled', 'operations'],
  parameters: [
    {
      name: 'maintenanceTasks',
      type: 'array',
      description: 'List of maintenance tasks to perform',
      required: true,
    },
    {
      name: 'healthCheckUrl',
      type: 'string',
      description: 'URL for health check',
      required: true,
      validation: z.string().url(),
    },
    {
      name: 'notificationChannels',
      type: 'array',
      description: 'Channels to notify about maintenance',
      default: ['email', 'slack'],
    },
  ],
  definition: {
    name: 'Scheduled Maintenance',
    version: 1,
    startStepId: 'pre-maintenance-check',
    steps: [
      {
        id: 'pre-maintenance-check',
        name: 'Pre-Maintenance Health Check',
        type: 'webhook',
        webhook: {
          url: '{{healthCheckUrl}}',
          method: 'GET',
          responseMapping: {
            status: 'preCheckStatus',
          },
        },
      },
      {
        id: 'notify-start',
        name: 'Notify Maintenance Start',
        type: 'parallel',
        parallel: {
          steps: '{{notificationChannels}}',
          waitForAll: false,
        },
      },
      {
        id: 'execute-tasks',
        name: 'Execute Maintenance Tasks',
        type: 'sequential',
        sequential: {
          steps: '{{maintenanceTasks}}',
          continueOnError: false,
        },
      },
      {
        id: 'post-maintenance-check',
        name: 'Post-Maintenance Health Check',
        type: 'webhook',
        webhook: {
          url: '{{healthCheckUrl}}',
          method: 'GET',
          responseMapping: {
            status: 'postCheckStatus',
          },
        },
      },
      {
        id: 'verify-health',
        name: 'Verify System Health',
        type: 'condition',
        condition: {
          expression: 'postCheckStatus === "healthy"',
          trueStepId: 'notify-success',
          falseStepId: 'rollback',
        },
      },
      {
        id: 'notify-success',
        name: 'Notify Maintenance Complete',
        type: 'action',
        action: {
          type: 'notification.broadcast',
          params: {
            channels: '{{notificationChannels}}',
            message: 'Maintenance completed successfully',
          },
        },
      },
      {
        id: 'rollback',
        name: 'Rollback Changes',
        type: 'action',
        action: {
          type: 'maintenance.rollback',
          params: {
            tasks: '{{maintenanceTasks}}',
          },
        },
      },
    ],
  },
})

// Export template categories
export const TEMPLATE_CATEGORIES = [
  { id: 'data', name: 'Data Processing', description: 'Templates for ETL and data workflows' },
  { id: 'business', name: 'Business Process', description: 'Templates for business workflows' },
  { id: 'resilience', name: 'Resilience', description: 'Templates for fault-tolerant workflows' },
  { id: 'operations', name: 'Operations', description: 'Templates for operational workflows' },
  { id: 'integration', name: 'Integration', description: 'Templates for system integration' },
]

// Helper function to get template suggestions based on use case
export function suggestTemplates(useCase: string): WorkflowTemplate[] {
  const keywords = useCase.toLowerCase().split(' ')
  const templates = templateRegistry.getAll()

  return templates
    .map((template) => {
      let score = 0

      // Check name
      if (keywords.some((k) => template.name.toLowerCase().includes(k))) {
        score += 3
      }

      // Check description
      if (keywords.some((k) => template.description.toLowerCase().includes(k))) {
        score += 2
      }

      // Check tags
      if (template.tags?.some((tag) => keywords.includes(tag.toLowerCase()))) {
        score += 1
      }

      return { template, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ template }) => template)
}
