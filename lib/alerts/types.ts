import type { EventSeverity } from '../observability/types'

export interface CriticalError {
  id: string
  timestamp: Date
  severity: EventSeverity
  type: CriticalErrorType
  message: string
  source: string
  metadata: Record<string, any>
  stackTrace?: string
  correlationId?: string
  environment: string
  userId?: string
  sessionId?: string
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
  occurrenceCount: number
  lastOccurrence: Date
  firstOccurrence: Date
}

export enum CriticalErrorType {
  DATABASE_CONNECTION_FAILURE = 'database_connection_failure',
  REDIS_CONNECTION_FAILURE = 'redis_connection_failure',
  AUTH_SERVICE_FAILURE = 'auth_service_failure',
  WORKFLOW_EXECUTION_FAILURE = 'workflow_execution_failure',
  MEMORY_THRESHOLD_EXCEEDED = 'memory_threshold_exceeded',
  ERROR_RATE_THRESHOLD_EXCEEDED = 'error_rate_threshold_exceeded',
  THIRD_PARTY_SERVICE_FAILURE = 'third_party_service_failure',
  SYSTEM_HEALTH_FAILURE = 'system_health_failure',
  API_GATEWAY_FAILURE = 'api_gateway_failure',
  FILE_SYSTEM_FAILURE = 'file_system_failure',
}

export interface AlertConfig {
  enabled: boolean
  channels: AlertChannel[]
  rateLimiting: {
    maxAlertsPerHour: number
    cooldownMinutes: number
  }
  deduplication: {
    enabled: boolean
    windowMinutes: number
  }
  escalation: {
    enabled: boolean
    escalateAfterMinutes: number
    escalationChannels: AlertChannel[]
  }
}

export interface AlertChannel {
  type: AlertChannelType
  name: string
  enabled: boolean
  config: Record<string, any>
  errorTypes: CriticalErrorType[]
  priority: AlertPriority
}

export enum AlertChannelType {
  WEBHOOK = 'webhook',
  EMAIL = 'email',
  SLACK = 'slack',
  DISCORD = 'discord',
  TEAMS = 'teams',
  PAGERDUTY = 'pagerduty',
  LOG = 'log',
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AlertNotification {
  id: string
  alertId: string
  channelType: AlertChannelType
  channelName: string
  status: AlertNotificationStatus
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  errorMessage?: string
  retryCount: number
  maxRetries: number
}

export enum AlertNotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRY = 'retry',
}

export interface AlertTemplate {
  type: CriticalErrorType
  subject: string
  message: string
  severity: EventSeverity
  priority: AlertPriority
}

export interface AlertMetrics {
  totalAlerts: number
  alertsByType: Record<CriticalErrorType, number>
  alertsByChannel: Record<AlertChannelType, number>
  averageResolutionTime: number
  unresolvedAlerts: number
  alertsLast24Hours: number
  alertsLast7Days: number
  meanTimeToAlert: number
  meanTimeToResolution: number
}
