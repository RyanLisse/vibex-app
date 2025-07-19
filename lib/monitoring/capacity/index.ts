/**
 * Capacity Planning and Predictive Analytics
 *
 * Monitors resource usage, predicts future capacity needs, and provides recommendations
 */

import { sql } from 'drizzle-orm'
import { db } from '@/db/config'
import { observability } from '@/lib/observability'
import { queryPerformanceMonitor } from '@/lib/performance/query-performance-monitor'
import { notificationManager } from '../notifications'
import { prometheusRegistry } from '../prometheus'

export interface CapacityThreshold {
  resource: string
  metric: string
  warningThreshold: number
  criticalThreshold: number
  unit: string
  growthRate?: number // Percentage per day
}

export interface CapacityMetric {
  resource: string
  current: number
  max: number
  unit: string
  utilizationPercent: number
  trend: 'increasing' | 'decreasing' | 'stable'
  growthRate: number // Percentage per day
  daysUntilWarning?: number
  daysUntilCritical?: number
}

export interface CapacityForecast {
  resource: string
  timeframe: number // days
  predictions: {
    date: Date
    value: number
    confidence: number
  }[]
  recommendations: string[]
}

export interface CapacityReport {
  generatedAt: Date
  metrics: CapacityMetric[]
  forecasts: CapacityForecast[]
  recommendations: {
    immediate: string[]
    shortTerm: string[] // 1-7 days
    mediumTerm: string[] // 7-30 days
    longTerm: string[] // 30+ days
  }
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'critical'
    details: string[]
  }
}

// Default capacity thresholds
const defaultThresholds: CapacityThreshold[] = [
  {
    resource: 'storage',
    metric: 'disk_usage_gb',
    warningThreshold: 80, // 80% of available storage
    criticalThreshold: 90, // 90% of available storage
    unit: 'GB',
  },
  {
    resource: 'memory',
    metric: 'memory_usage_gb',
    warningThreshold: 3.5, // 3.5GB
    criticalThreshold: 4.5, // 4.5GB
    unit: 'GB',
  },
  {
    resource: 'cpu',
    metric: 'cpu_usage_percent',
    warningThreshold: 70,
    criticalThreshold: 85,
    unit: '%',
  },
  {
    resource: 'database_connections',
    metric: 'connection_pool_usage',
    warningThreshold: 80,
    criticalThreshold: 95,
    unit: 'connections',
  },
  {
    resource: 'api_rate_limit',
    metric: 'requests_per_second',
    warningThreshold: 800,
    criticalThreshold: 950,
    unit: 'req/s',
  },
  {
    resource: 'database_size',
    metric: 'total_db_size_gb',
    warningThreshold: 100,
    criticalThreshold: 150,
    unit: 'GB',
  },
]

// Time series data point
interface DataPoint {
  timestamp: Date
  value: number
}

// Capacity planning manager
export class CapacityPlanningManager {
  private thresholds: CapacityThreshold[] = []
  private historicalData: Map<string, DataPoint[]> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private forecastInterval: NodeJS.Timeout | null = null
  private config: any

  async initialize(config: any): Promise<void> {
    this.config = config
    this.thresholds = [...defaultThresholds, ...(config.thresholds || [])]

    // Load historical data
    await this.loadHistoricalData()

    // Start monitoring
    this.startMonitoring()

    // Start forecasting
    this.startForecasting()

    console.log(`📈 Capacity planning initialized with ${this.thresholds.length} thresholds`)
  }

  private async loadHistoricalData(): Promise<void> {
    // In production, load from time-series database
    // For demo, generate synthetic historical data
    for (const threshold of this.thresholds) {
      const data: DataPoint[] = []
      const now = Date.now()

      // Generate 30 days of historical data
      for (let i = 30 * 24; i >= 0; i--) {
        const timestamp = new Date(now - i * 3_600_000) // Hour intervals
        const baseValue = threshold.warningThreshold * 0.5
        const growth = (30 * 24 - i) * 0.001 // Slow growth over time
        const noise = Math.random() * 0.1 - 0.05 // ±5% noise
        const value = baseValue * (1 + growth + noise)

        data.push({ timestamp, value })
      }

      this.historicalData.set(threshold.metric, data)
    }
  }

  private startMonitoring(): void {
    // Collect metrics every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, 300_000)

    // Initial collection
    this.collectMetrics()
  }

  private startForecasting(): void {
    // Run forecasts every hour
    this.forecastInterval = setInterval(() => {
      this.runForecasts()
    }, 3_600_000)

    // Initial forecast
    this.runForecasts()
  }

  private async collectMetrics(): Promise<void> {
    for (const threshold of this.thresholds) {
      try {
        const value = await this.getMetricValue(threshold)
        const dataPoint: DataPoint = {
          timestamp: new Date(),
          value,
        }

        // Add to historical data
        const history = this.historicalData.get(threshold.metric) || []
        history.push(dataPoint)

        // Keep only last 30 days of data
        const thirtyDaysAgo = Date.now() - 30 * 24 * 3_600_000
        const filtered = history.filter((dp) => dp.timestamp.getTime() > thirtyDaysAgo)
        this.historicalData.set(threshold.metric, filtered)

        // Check thresholds
        await this.checkThreshold(threshold, value)

        // Record in observability
        observability.recordEvent('capacity.metric', {
          resource: threshold.resource,
          metric: threshold.metric,
          value,
          unit: threshold.unit,
        })
      } catch (error) {
        console.error(`Failed to collect metric ${threshold.metric}:`, error)
      }
    }
  }

  private async getMetricValue(threshold: CapacityThreshold): Promise<number> {
    // In production, query actual metrics
    // For demo, generate realistic values
    switch (threshold.metric) {
      case 'disk_usage_gb':
        return 40 + Math.random() * 20 // 40-60GB

      case 'memory_usage_gb': {
        const memoryUsage = process.memoryUsage()
        return memoryUsage.rss / 1024 / 1024 / 1024
      }

      case 'cpu_usage_percent':
        return 30 + Math.random() * 40 // 30-70%

      case 'connection_pool_usage':
        return 20 + Math.random() * 40 // 20-60 connections

      case 'requests_per_second':
        return 200 + Math.random() * 400 // 200-600 req/s

      case 'total_db_size_gb':
        return 30 + Math.random() * 20 // 30-50GB

      default:
        return Math.random() * threshold.warningThreshold
    }
  }

  private async checkThreshold(threshold: CapacityThreshold, value: number): Promise<void> {
    const utilizationPercent = (value / threshold.criticalThreshold) * 100

    if (value >= threshold.criticalThreshold) {
      await notificationManager.sendNotification({
        title: `Critical: ${threshold.resource} capacity`,
        message: `${threshold.resource} is at ${value.toFixed(2)}${threshold.unit} (${utilizationPercent.toFixed(1)}% of critical threshold)`,
        severity: 'critical',
        data: {
          resource: threshold.resource,
          current: value,
          threshold: threshold.criticalThreshold,
          unit: threshold.unit,
        },
      })
    } else if (value >= threshold.warningThreshold) {
      await notificationManager.sendNotification({
        title: `Warning: ${threshold.resource} capacity`,
        message: `${threshold.resource} is at ${value.toFixed(2)}${threshold.unit} (${utilizationPercent.toFixed(1)}% of critical threshold)`,
        severity: 'high',
        data: {
          resource: threshold.resource,
          current: value,
          threshold: threshold.warningThreshold,
          unit: threshold.unit,
        },
      })
    }
  }

  private async runForecasts(): Promise<void> {
    const report = await this.generateReport()

    // Check for critical forecasts
    for (const forecast of report.forecasts) {
      const criticalPredictions = forecast.predictions.filter((p) => {
        const threshold = this.getThreshold(forecast.resource)
        return threshold && p.value >= threshold.criticalThreshold
      })

      if (criticalPredictions.length > 0) {
        const daysUntilCritical = Math.ceil(
          (criticalPredictions[0].date.getTime() - Date.now()) / (24 * 3_600_000)
        )

        if (daysUntilCritical <= 7) {
          await notificationManager.sendNotification({
            title: `Capacity Alert: ${forecast.resource}`,
            message: `${forecast.resource} is predicted to reach critical capacity in ${daysUntilCritical} days`,
            severity: 'high',
            data: {
              resource: forecast.resource,
              daysUntilCritical,
              recommendations: forecast.recommendations,
            },
          })
        }
      }
    }
  }

  private getThreshold(resource: string): CapacityThreshold | undefined {
    return this.thresholds.find((t) => t.resource === resource)
  }

  async getCurrentMetrics(): Promise<CapacityMetric[]> {
    const metrics: CapacityMetric[] = []

    for (const threshold of this.thresholds) {
      const history = this.historicalData.get(threshold.metric) || []
      if (history.length === 0) continue

      const current = history[history.length - 1].value
      const growthRate = this.calculateGrowthRate(history)
      const trend = growthRate > 0.5 ? 'increasing' : growthRate < -0.5 ? 'decreasing' : 'stable'

      // Calculate days until thresholds
      let daysUntilWarning: number | undefined
      let daysUntilCritical: number | undefined

      if (growthRate > 0) {
        const currentUtilization = current / threshold.criticalThreshold
        const warningUtilization = threshold.warningThreshold / threshold.criticalThreshold
        const criticalUtilization = 1.0

        const dailyGrowth = growthRate / 100

        if (currentUtilization < warningUtilization) {
          daysUntilWarning =
            Math.log(warningUtilization / currentUtilization) / Math.log(1 + dailyGrowth)
        }

        if (currentUtilization < criticalUtilization) {
          daysUntilCritical =
            Math.log(criticalUtilization / currentUtilization) / Math.log(1 + dailyGrowth)
        }
      }

      metrics.push({
        resource: threshold.resource,
        current,
        max: threshold.criticalThreshold,
        unit: threshold.unit,
        utilizationPercent: (current / threshold.criticalThreshold) * 100,
        trend,
        growthRate,
        daysUntilWarning: daysUntilWarning ? Math.ceil(daysUntilWarning) : undefined,
        daysUntilCritical: daysUntilCritical ? Math.ceil(daysUntilCritical) : undefined,
      })
    }

    return metrics
  }

  private calculateGrowthRate(history: DataPoint[]): number {
    if (history.length < 2) return 0

    // Calculate daily growth rate using linear regression
    const n = Math.min(history.length, 7 * 24) // Use last 7 days
    const recent = history.slice(-n)

    const firstValue = recent[0].value
    const lastValue = recent[recent.length - 1].value
    const days =
      (recent[recent.length - 1].timestamp.getTime() - recent[0].timestamp.getTime()) /
      (24 * 3_600_000)

    if (days === 0 || firstValue === 0) return 0

    const totalGrowth = ((lastValue - firstValue) / firstValue) * 100
    return totalGrowth / days // Percentage per day
  }

  async forecastResource(resource: string, days: number): Promise<CapacityForecast> {
    const threshold = this.getThreshold(resource)
    if (!threshold) throw new Error(`Unknown resource: ${resource}`)

    const history = this.historicalData.get(threshold.metric) || []
    if (history.length === 0) {
      return {
        resource,
        timeframe: days,
        predictions: [],
        recommendations: ['Insufficient data for forecasting'],
      }
    }

    const predictions: CapacityForecast['predictions'] = []
    const growthRate = this.calculateGrowthRate(history)
    const currentValue = history[history.length - 1].value
    const dailyGrowth = growthRate / 100

    // Generate predictions
    for (let i = 1; i <= days; i++) {
      const date = new Date(Date.now() + i * 24 * 3_600_000)
      const value = currentValue * (1 + dailyGrowth) ** i

      // Confidence decreases with time
      const confidence = Math.max(0.5, 1 - (i / days) * 0.5)

      predictions.push({ date, value, confidence })
    }

    // Generate recommendations
    const recommendations: string[] = []
    const lastPrediction = predictions[predictions.length - 1]

    if (lastPrediction.value >= threshold.criticalThreshold) {
      recommendations.push(`Urgent: ${resource} will exceed critical threshold within ${days} days`)
      recommendations.push(`Consider scaling ${resource} capacity immediately`)
    } else if (lastPrediction.value >= threshold.warningThreshold) {
      recommendations.push(`Warning: ${resource} will exceed warning threshold within ${days} days`)
      recommendations.push(`Plan for ${resource} capacity increase`)
    }

    if (growthRate > 5) {
      recommendations.push(`Rapid growth detected (${growthRate.toFixed(1)}% per day)`)
      recommendations.push('Investigate cause of increased usage')
    }

    return {
      resource,
      timeframe: days,
      predictions,
      recommendations,
    }
  }

  async generateReport(): Promise<CapacityReport> {
    const metrics = await this.getCurrentMetrics()
    const forecasts: CapacityForecast[] = []

    // Generate 30-day forecasts for all resources
    for (const threshold of this.thresholds) {
      const forecast = await this.forecastResource(threshold.resource, 30)
      forecasts.push(forecast)
    }

    // Categorize recommendations
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      mediumTerm: [] as string[],
      longTerm: [] as string[],
    }

    // Analyze metrics and forecasts
    for (const metric of metrics) {
      if (metric.utilizationPercent >= 90) {
        recommendations.immediate.push(
          `${metric.resource}: Currently at ${metric.utilizationPercent.toFixed(1)}% capacity`
        )
      } else if (metric.utilizationPercent >= 75) {
        recommendations.shortTerm.push(
          `${metric.resource}: Monitor closely, at ${metric.utilizationPercent.toFixed(1)}% capacity`
        )
      }

      if (metric.daysUntilCritical && metric.daysUntilCritical <= 7) {
        recommendations.immediate.push(
          `${metric.resource}: Will reach critical capacity in ${metric.daysUntilCritical} days`
        )
      } else if (metric.daysUntilCritical && metric.daysUntilCritical <= 30) {
        recommendations.mediumTerm.push(
          `${metric.resource}: Plan capacity increase within ${metric.daysUntilCritical} days`
        )
      }

      if (metric.growthRate > 10) {
        recommendations.shortTerm.push(
          `${metric.resource}: Experiencing rapid growth (${metric.growthRate.toFixed(1)}% per day)`
        )
      }
    }

    // Determine overall risk assessment
    let overallRisk: CapacityReport['riskAssessment']['overall'] = 'low'
    const riskDetails: string[] = []

    const criticalMetrics = metrics.filter((m) => m.utilizationPercent >= 85)
    const highGrowthMetrics = metrics.filter((m) => m.growthRate > 5)
    const nearTermRisks = metrics.filter((m) => m.daysUntilCritical && m.daysUntilCritical <= 7)

    if (criticalMetrics.length > 0) {
      overallRisk = 'critical'
      riskDetails.push(`${criticalMetrics.length} resources at critical utilization`)
    } else if (nearTermRisks.length > 0) {
      overallRisk = 'high'
      riskDetails.push(
        `${nearTermRisks.length} resources will reach critical capacity within 7 days`
      )
    } else if (highGrowthMetrics.length > 2) {
      overallRisk = 'medium'
      riskDetails.push('Multiple resources showing rapid growth')
    }

    return {
      generatedAt: new Date(),
      metrics,
      forecasts,
      recommendations,
      riskAssessment: {
        overall: overallRisk,
        details: riskDetails,
      },
    }
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.forecastInterval) {
      clearInterval(this.forecastInterval)
      this.forecastInterval = null
    }
  }
}

// Export singleton instance
export const capacityPlanningManager = new CapacityPlanningManager()

// Initialize capacity planning
export async function initializeCapacityPlanning(config: any): Promise<void> {
  await capacityPlanningManager.initialize(config)
}

// Convenience functions
export async function getCapacityMetrics(): Promise<CapacityMetric[]> {
  return capacityPlanningManager.getCurrentMetrics()
}

export async function getCapacityForecast(
  resource: string,
  days: number
): Promise<CapacityForecast> {
  return capacityPlanningManager.forecastResource(resource, days)
}

export async function getCapacityReport(): Promise<CapacityReport> {
  return capacityPlanningManager.generateReport()
}
