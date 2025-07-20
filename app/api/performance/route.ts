// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Performance Monitoring API Route
 *
 * Provides real-time performance metrics, analysis results, and optimization data
 * for the database performance dashboard.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { databaseIndexOptimizer } from '@/lib/performance/database-index-optimizer'
import { databaseQueryAnalyzer } from '@/lib/performance/database-query-analyzer'
import { performanceBenchmarker } from '@/lib/performance/performance-benchmarker'
import { withPerformanceMonitoring } from '@/lib/performance/performance-middleware'
import { queryPerformanceMonitor } from '@/lib/performance/query-performance-monitor'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'

// Request schemas
const PerformanceMetricsSchema = z.object({
  timeRange: z.enum(['5m', '1h', '24h', '7d']).default('1h'),
  includeDetails: z.boolean().default(false),
})

const AnalysisRequestSchema = z.object({
  includeRecommendations: z.boolean().default(true),
  analyzeSlowQueries: z.boolean().default(true),
})

const BenchmarkRequestSchema = z.object({
  suites: z.array(z.string()).optional(),
  compareWithBaseline: z.boolean().default(true),
})

/**
 * GET /api/performance - Get current performance metrics
 */
export const GET = withPerformanceMonitoring(async (request: NextRequest) => {
  const tracer = trace.getTracer('performance-api')
  const span = tracer.startSpan('performance.getMetrics')

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    const validatedParams = PerformanceMetricsSchema.parse(params)

    // Get current performance metrics
    const currentMetrics = queryPerformanceMonitor.getCurrentMetrics()

    // Get performance trends
    const trends = queryPerformanceMonitor.analyzePerformanceTrends()

    // Get slow queries report
    const timeRangeMs = getTimeRangeMs(validatedParams.timeRange)
    const slowQueries = queryPerformanceMonitor.getSlowQueriesReport(timeRangeMs)

    // Get database statistics if details requested
    let databaseStats = null
    if (validatedParams.includeDetails) {
      try {
        const indexAnalysis = await databaseIndexOptimizer.analyzeCurrentIndexes()
        databaseStats = {
          totalIndexes: indexAnalysis.length,
          unusedIndexes: indexAnalysis.filter((idx) => idx.isUnused).length,
          indexSizes: indexAnalysis.reduce((total, idx) => {
            const sizeMatch = idx.size.match(/(\d+(?:\.\d+)?)\s*(\w+)/)
            if (sizeMatch) {
              const value = Number.parseFloat(sizeMatch[1])
              const unit = sizeMatch[2].toLowerCase()
              const bytes = convertToBytes(value, unit)
              return total + bytes
            }
            return total
          }, 0),
        }
      } catch (_error) {}
    }

    const response = {
      timestamp: new Date().toISOString(),
      timeRange: validatedParams.timeRange,
      metrics: currentMetrics,
      trends,
      slowQueries: slowQueries.slice(0, 10), // Top 10 slowest
      databaseStats,
    }

    span.setStatus({ code: SpanStatusCode.OK })
    return NextResponse.json(createApiSuccessResponse(response, 'Performance metrics retrieved'))
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Invalid parameters', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createApiErrorResponse('Failed to retrieve performance metrics', 500),
      { status: 500 }
    )
  } finally {
    span.end()
  }
})

/**
 * POST /api/performance/analyze - Run performance analysis
 */
export const POST = withPerformanceMonitoring(async (request: NextRequest) => {
  const tracer = trace.getTracer('performance-api')
  const span = tracer.startSpan('performance.analyze')

  try {
    const body = await request.json()
    const validatedBody = AnalysisRequestSchema.parse(body)

    // Run comprehensive analysis
    const analysisReport = await databaseQueryAnalyzer.generateAnalysisReport()

    // Get optimization plan if recommendations requested
    let optimizationPlan = null
    if (validatedBody.includeRecommendations && analysisReport.missingIndexes.length > 0) {
      optimizationPlan = await databaseIndexOptimizer.generateOptimizationPlan(
        analysisReport.missingIndexes
      )
    }

    // Analyze slow queries if requested
    let slowQueryAnalysis = null
    if (validatedBody.analyzeSlowQueries && analysisReport.slowQueries.length > 0) {
      slowQueryAnalysis = {
        totalSlowQueries: analysisReport.slowQueries.length,
        averageSlowQueryTime:
          analysisReport.slowQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          analysisReport.slowQueries.length,
        mostProblematicQueries: analysisReport.slowQueries
          .sort((a, b) => b.executionTime - a.executionTime)
          .slice(0, 5)
          .map((q) => ({
            query: `${q.query.substring(0, 100)}...`,
            executionTime: q.executionTime,
            bottlenecks: q.bottlenecks,
            recommendations: q.recommendations,
          })),
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      analysisReport: {
        ...analysisReport,
        slowQueries: analysisReport.slowQueries.map((q) => ({
          ...q,
          query: `${q.query.substring(0, 100)}...`, // Truncate for API response
        })),
      },
      optimizationPlan,
      slowQueryAnalysis,
    }

    span.setStatus({ code: SpanStatusCode.OK })
    return NextResponse.json(createApiSuccessResponse(response, 'Performance analysis completed'))
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Invalid request body', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    return NextResponse.json(createApiErrorResponse('Performance analysis failed', 500), {
      status: 500,
    })
  } finally {
    span.end()
  }
})

/**
 * POST /api/performance/benchmark - Run performance benchmarks
 */
export async function PUT(request: NextRequest) {
  const tracer = trace.getTracer('performance-api')
  const span = tracer.startSpan('performance.benchmark')

  try {
    const body = await request.json()
    const validatedBody = BenchmarkRequestSchema.parse(body)

    // Run benchmark suite
    const benchmarkResults = await performanceBenchmarker.runBenchmarkSuite()

    // Compare with baseline if requested
    let baselineComparison = null
    if (validatedBody.compareWithBaseline) {
      try {
        baselineComparison = await performanceBenchmarker.compareAgainstBaseline()
      } catch (_error) {
        // Continue without baseline comparison
      }
    }

    // Filter suites if specified
    let filteredResults = benchmarkResults
    if (validatedBody.suites && validatedBody.suites.length > 0) {
      filteredResults = benchmarkResults.filter((suite) =>
        validatedBody.suites?.includes(suite.name)
      )
    }

    const response = {
      timestamp: new Date().toISOString(),
      benchmarkResults: filteredResults,
      baselineComparison,
      summary: {
        totalSuites: filteredResults.length,
        totalTests: filteredResults.reduce((sum, suite) => sum + suite.summary.totalTests, 0),
        totalPassed: filteredResults.reduce((sum, suite) => sum + suite.summary.passed, 0),
        totalFailed: filteredResults.reduce((sum, suite) => sum + suite.summary.failed, 0),
        averageExecutionTime:
          filteredResults.reduce((sum, suite) => sum + suite.summary.averageExecutionTime, 0) /
          filteredResults.length,
      },
    }

    span.setStatus({ code: SpanStatusCode.OK })
    return NextResponse.json(createApiSuccessResponse(response, 'Benchmarks completed'))
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Invalid request body', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    return NextResponse.json(createApiErrorResponse('Benchmark execution failed', 500), {
      status: 500,
    })
  } finally {
    span.end()
  }
}

/**
 * Helper function to convert time range to milliseconds
 */
function getTimeRangeMs(timeRange: string): number {
  switch (timeRange) {
    case '5m':
      return 5 * 60 * 1000
    case '1h':
      return 60 * 60 * 1000
    case '24h':
      return 24 * 60 * 60 * 1000
    case '7d':
      return 7 * 24 * 60 * 60 * 1000
    default:
      return 60 * 60 * 1000
  }
}

/**
 * Helper function to convert size units to bytes
 */
function convertToBytes(value: number, unit: string): number {
  const units: Record<string, number> = {
    bytes: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  }

  return value * (units[unit.toLowerCase()] || 1)
}
