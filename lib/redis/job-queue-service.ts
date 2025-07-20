/**
 * JobQueueService - Redis/Valkey Job Queue Implementation
 *
 * Provides reliable background job processing with priorities, retries, and scheduling
 */

import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { ObservabilityService } from '../observability'
import { RedisClientManager } from './redis-client'
import type { JobData, JobOptions, JobQueueStats } from './types'

export class JobQueueService {
  private static instance: JobQueueService
  private redisManager: RedisClientManager
  private observability = ObservabilityService.getInstance()
  private workers = new Map<string, { lastHeartbeat: Date; queueName: string }>()
  private recurringJobs = new Map<string, NodeJS.Timeout>()

  private constructor() {
    this.redisManager = RedisClientManager.getInstance()
  }

  static getInstance(): JobQueueService {
    if (!JobQueueService.instance) {
      JobQueueService.instance = new JobQueueService()
    }
    return JobQueueService.instance
  }

  async addJob(
    queueName: string,
    type: string,
    payload: any,
    options?: JobOptions
  ): Promise<string> {
    this.validateQueueName(queueName)
    this.validateJobType(type)
    this.validateJobOptions(options)

    return this.observability.trackOperation('job_queue.add', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const jobId = randomUUID()
      const now = Date.now()
      const delay = options?.delay || 0
      const scheduledAt = now + delay

      const job: JobData = {
        id: jobId,
        type,
        payload,
        priority: options?.priority || 0,
        attempts: 0,
        maxAttempts: options?.maxAttempts || 3,
        delay,
        createdAt: new Date(now),
        scheduledAt: new Date(scheduledAt),
        processedAt: undefined,
        completedAt: undefined,
        failedAt: undefined,
        error: undefined,
      }

      const jobKey = this.buildJobKey(queueName, jobId)
      const queueKey =
        delay > 0 ? this.buildDelayedQueueKey(queueName) : this.buildWaitingQueueKey(queueName)

      try {
        // Store job data
        await client.hset(jobKey, this.serializeJob(job))

        // Add job to appropriate queue
        if (delay > 0) {
          await client.zadd(queueKey, scheduledAt, jobId)
        } else {
          await client.zadd(queueKey, job.priority, jobId)
        }

        this.observability.recordEvent('job_queue.job.added', 1, {
          queue: queueName,
          type,
          priority: job.priority.toString(),
          delayed: (delay > 0).toString(),
        })

        return jobId
      } catch (error) {
        this.observability.recordError('job_queue.add.error', error as Error, {
          queue: queueName,
          type,
        })
        throw error
      }
    })
  }

  async getNextJob(queueName: string): Promise<JobData | null> {
    this.validateQueueName(queueName)

    return this.observability.trackOperation('job_queue.get_next', async () => {
      const client = this.redisManager.getClient()

      try {
        // First, move any ready delayed jobs to waiting queue
        await this.processDelayedJobs(queueName)

        // Check if queue is paused
        const pausedKey = this.buildPausedKey(queueName)
        const isPaused = await client.exists(pausedKey)
        if (isPaused) {
          return null
        }

        const waitingQueueKey = this.buildWaitingQueueKey(queueName)
        const activeQueueKey = this.buildActiveQueueKey(queueName)

        // Get highest priority job
        const result = (await client.eval(
          `
          local waiting_queue = KEYS[1]
          local active_queue = KEYS[2]
          
          -- Get job with highest priority (highest score)
          local job_id = redis.call('ZPOPMAX', waiting_queue, 1)
          if not job_id[1] then
            return nil
          end
          
          -- Move to active queue
          redis.call('ZADD', active_queue, ARGV[1], job_id[1])
          return job_id[1]
        `,
          2,
          waitingQueueKey,
          activeQueueKey,
          Date.now().toString()
        )) as string | null

        if (!result) {
          return null
        }

        // Get job data
        const jobKey = this.buildJobKey(queueName, result)
        const jobData = await client.hgetall(jobKey)

        if (!jobData.id) {
          return null
        }

        const job = this.deserializeJob(jobData)
        job.processedAt = new Date()
        job.attempts++

        // Update job data
        await client.hset(jobKey, this.serializeJob(job))

        this.observability.recordEvent('job_queue.job.retrieved', 1, {
          queue: queueName,
          type: job.type,
          attempts: job.attempts.toString(),
        })

        return job
      } catch (error) {
        this.observability.recordError('job_queue.get_next.error', error as Error, {
          queue: queueName,
        })
        return null
      }
    })
  }

  async completeJob(job: JobData): Promise<boolean> {
    return this.observability.trackOperation('job_queue.complete', async () => {
      const client = this.redisManager.getClient()
      const queueName = this.extractQueueFromJobKey(job.id)
      const jobKey = this.buildJobKey(queueName, job.id)
      const activeQueueKey = this.buildActiveQueueKey(queueName)
      const completedQueueKey = this.buildCompletedQueueKey(queueName)

      try {
        // Update job status
        job.completedAt = new Date()

        await client.hset(jobKey, this.serializeJob(job))

        // Move from active to completed
        await client.zrem(activeQueueKey, job.id)
        await client.zadd(completedQueueKey, Date.now(), job.id)

        this.observability.recordEvent('job_queue.job.completed', 1, {
          queue: queueName,
          type: job.type,
          duration: job.completedAt.getTime() - job.processedAt!.getTime(),
        })

        return true
      } catch (error) {
        this.observability.recordError('job_queue.complete.error', error as Error, {
          queue: queueName,
          jobId: job.id,
        })
        return false
      }
    })
  }

  async failJob(job: JobData, error: Error): Promise<boolean> {
    return this.observability.trackOperation('job_queue.fail', async () => {
      const client = this.redisManager.getClient()
      const queueName = this.extractQueueFromJobKey(job.id)
      const jobKey = this.buildJobKey(queueName, job.id)
      const activeQueueKey = this.buildActiveQueueKey(queueName)

      try {
        job.error = error.message
        job.failedAt = new Date()

        if (job.attempts < job.maxAttempts) {
          // Retry job with backoff
          const backoffDelay = this.calculateBackoffDelay(job)
          const retryAt = Date.now() + backoffDelay

          const delayedQueueKey = this.buildDelayedQueueKey(queueName)

          await client.zrem(activeQueueKey, job.id)
          await client.zadd(delayedQueueKey, retryAt, job.id)
          await client.hset(jobKey, this.serializeJob(job))

          this.observability.recordEvent('job_queue.job.retried', 1, {
            queue: queueName,
            type: job.type,
            attempt: job.attempts.toString(),
            backoffDelay: backoffDelay.toString(),
          })
        } else {
          // Move to failed queue
          const failedQueueKey = this.buildFailedQueueKey(queueName)

          await client.zrem(activeQueueKey, job.id)
          await client.zadd(failedQueueKey, Date.now(), job.id)
          await client.hset(jobKey, this.serializeJob(job))

          this.observability.recordEvent('job_queue.job.failed', 1, {
            queue: queueName,
            type: job.type,
            attempts: job.attempts.toString(),
          })
        }

        return true
      } catch (error) {
        this.observability.recordError('job_queue.fail.error', error as Error, {
          queue: queueName,
          jobId: job.id,
        })
        return false
      }
    })
  }

  async getQueueStats(queueName: string): Promise<JobQueueStats> {
    const client = this.redisManager.getClient()

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        client.zcard(this.buildWaitingQueueKey(queueName)),
        client.zcard(this.buildActiveQueueKey(queueName)),
        client.zcard(this.buildCompletedQueueKey(queueName)),
        client.zcard(this.buildFailedQueueKey(queueName)),
        client.zcard(this.buildDelayedQueueKey(queueName)),
      ])

      const pausedKey = this.buildPausedKey(queueName)
      const paused = (await client.exists(pausedKey)) === 1

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
      }
    } catch (error) {
      this.observability.recordError('job_queue.stats.error', error as Error, {
        queue: queueName,
      })
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      }
    }
  }

  async pauseQueue(queueName: string): Promise<boolean> {
    const client = this.redisManager.getClient()
    const pausedKey = this.buildPausedKey(queueName)

    try {
      await client.set(pausedKey, '1')
      return true
    } catch (error) {
      this.observability.recordError('job_queue.pause.error', error as Error, {
        queue: queueName,
      })
      return false
    }
  }

  async resumeQueue(queueName: string): Promise<boolean> {
    const client = this.redisManager.getClient()
    const pausedKey = this.buildPausedKey(queueName)

    try {
      await client.del(pausedKey)
      return true
    } catch (error) {
      this.observability.recordError('job_queue.resume.error', error as Error, {
        queue: queueName,
      })
      return false
    }
  }

  async getFailedJobs(queueName: string, limit = 50): Promise<JobData[]> {
    const client = this.redisManager.getClient()
    const failedQueueKey = this.buildFailedQueueKey(queueName)

    try {
      const jobIds = await client.zrevrange(failedQueueKey, 0, limit - 1)
      const jobs: JobData[] = []

      for (const jobId of jobIds) {
        const jobKey = this.buildJobKey(queueName, jobId)
        const jobData = await client.hgetall(jobKey)
        if (jobData.id) {
          jobs.push(this.deserializeJob(jobData))
        }
      }

      return jobs
    } catch (error) {
      this.observability.recordError('job_queue.get_failed.error', error as Error, {
        queue: queueName,
      })
      return []
    }
  }

  async scheduleJob(
    queueName: string,
    type: string,
    payload: any,
    scheduledTime: Date
  ): Promise<string> {
    const delay = Math.max(0, scheduledTime.getTime() - Date.now())
    return this.addJob(queueName, type, payload, { delay })
  }

  async addRecurringJob(
    queueName: string,
    type: string,
    payload: any,
    cronExpression: string
  ): Promise<string> {
    // This is a simplified implementation - real cron parsing would be more complex
    const recurringJobId = randomUUID()

    // For this implementation, just use a simple interval based on seconds
    const intervalMatch = cronExpression.match(/^\*\/(\d+) \* \* \* \* \*$/)
    if (intervalMatch) {
      const intervalSeconds = Number.parseInt(intervalMatch[1])
      const interval = setInterval(async () => {
        await this.addJob(queueName, type, payload)
      }, intervalSeconds * 1000)

      this.recurringJobs.set(recurringJobId, interval)
    }

    return recurringJobId
  }

  async removeRecurringJob(recurringJobId: string): Promise<boolean> {
    const interval = this.recurringJobs.get(recurringJobId)
    if (interval) {
      clearInterval(interval)
      this.recurringJobs.delete(recurringJobId)
      return true
    }
    return false
  }

  // Job progress and logging methods (simplified implementations)
  async updateJobProgress(job: JobData, percentage: number, message?: string): Promise<void> {
    // Implementation would store progress data
  }

  async getJobProgress(
    jobId: string
  ): Promise<{ percentage: number; message?: string; updatedAt: Date }> {
    return { percentage: 0, updatedAt: new Date() }
  }

  async addJobLog(job: JobData, level: string, message: string): Promise<void> {
    // Implementation would store log entries
  }

  async getJobLogs(
    jobId: string
  ): Promise<Array<{ level: string; message: string; timestamp: Date }>> {
    return []
  }

  async getJobHistory(jobId: string): Promise<{ states: string[]; duration: number }> {
    return { states: [], duration: 0 }
  }

  // Worker management methods (simplified implementations)
  async registerWorker(queueName: string, workerId: string): Promise<boolean> {
    this.workers.set(workerId, { lastHeartbeat: new Date(), queueName })
    return true
  }

  async unregisterWorker(workerId: string): Promise<boolean> {
    this.workers.delete(workerId)
    return true
  }

  async workerHeartbeat(workerId: string): Promise<boolean> {
    const worker = this.workers.get(workerId)
    if (worker) {
      worker.lastHeartbeat = new Date()
      return true
    }
    return false
  }

  async getActiveWorkers(queueName: string): Promise<string[]> {
    return Array.from(this.workers.entries())
      .filter(([_, worker]) => worker.queueName === queueName)
      .map(([workerId]) => workerId)
  }

  async cleanupStaleWorkers(queueName: string, timeoutMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMs)
    let cleaned = 0

    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.queueName === queueName && worker.lastHeartbeat < cutoff) {
        this.workers.delete(workerId)
        cleaned++
      }
    }

    return cleaned
  }

  async getJobBatch(queueName: string, batchSize: number): Promise<JobData[]> {
    const jobs: JobData[] = []

    for (let i = 0; i < batchSize; i++) {
      const job = await this.getNextJob(queueName)
      if (!job) break
      jobs.push(job)
    }

    return jobs
  }

  async cleanupCompletedJobs(queueName: string, olderThanMs: number): Promise<number> {
    const client = this.redisManager.getClient()
    const completedQueueKey = this.buildCompletedQueueKey(queueName)
    const cutoff = Date.now() - olderThanMs

    try {
      const removed = await client.zremrangebyscore(completedQueueKey, 0, cutoff)
      return removed
    } catch (error) {
      this.observability.recordError('job_queue.cleanup_completed.error', error as Error, {
        queue: queueName,
      })
      return 0
    }
  }

  async cleanupFailedJobs(queueName: string, olderThanMs: number): Promise<number> {
    const client = this.redisManager.getClient()
    const failedQueueKey = this.buildFailedQueueKey(queueName)
    const cutoff = Date.now() - olderThanMs

    try {
      const removed = await client.zremrangebyscore(failedQueueKey, 0, cutoff)
      return removed
    } catch (error) {
      this.observability.recordError('job_queue.cleanup_failed.error', error as Error, {
        queue: queueName,
      })
      return 0
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up JobQueue service...')

    // Clear recurring jobs
    for (const interval of this.recurringJobs.values()) {
      clearInterval(interval)
    }
    this.recurringJobs.clear()

    // Clear workers
    this.workers.clear()

    console.log('JobQueue service cleaned up successfully')
  }

  // Private helper methods
  private async processDelayedJobs(queueName: string): Promise<void> {
    const client = this.redisManager.getClient()
    const delayedQueueKey = this.buildDelayedQueueKey(queueName)
    const waitingQueueKey = this.buildWaitingQueueKey(queueName)
    const now = Date.now()

    try {
      // Move ready jobs from delayed to waiting queue
      const readyJobs = await client.zrangebyscore(delayedQueueKey, 0, now)

      for (const jobId of readyJobs) {
        const jobKey = this.buildJobKey(queueName, jobId)
        const jobData = await client.hgetall(jobKey)

        if (jobData.id) {
          const job = this.deserializeJob(jobData)
          await client.zrem(delayedQueueKey, jobId)
          await client.zadd(waitingQueueKey, job.priority, jobId)
        }
      }
    } catch (error) {
      this.observability.recordError('job_queue.process_delayed.error', error as Error, {
        queue: queueName,
      })
    }
  }

  private calculateBackoffDelay(job: JobData): number {
    // Exponential backoff: 1000ms * 2^(attempts-1)
    return 1000 * 2 ** (job.attempts - 1)
  }

  private validateQueueName(queueName: string): void {
    if (!queueName || queueName.trim() === '') {
      throw new Error('Queue name cannot be empty')
    }
  }

  private validateJobType(type: string): void {
    if (!type || type.trim() === '') {
      throw new Error('Job type cannot be empty')
    }
  }

  private validateJobOptions(options?: JobOptions): void {
    if (options?.maxAttempts !== undefined && options.maxAttempts <= 0) {
      throw new Error('Max attempts must be greater than 0')
    }

    if (options?.delay !== undefined && options.delay < 0) {
      throw new Error('Delay cannot be negative')
    }
  }

  private buildJobKey(queueName: string, jobId: string): string {
    return `job:${queueName}:${jobId}`
  }

  private buildWaitingQueueKey(queueName: string): string {
    return `queue:${queueName}:waiting`
  }

  private buildActiveQueueKey(queueName: string): string {
    return `queue:${queueName}:active`
  }

  private buildCompletedQueueKey(queueName: string): string {
    return `queue:${queueName}:completed`
  }

  private buildFailedQueueKey(queueName: string): string {
    return `queue:${queueName}:failed`
  }

  private buildDelayedQueueKey(queueName: string): string {
    return `queue:${queueName}:delayed`
  }

  private buildPausedKey(queueName: string): string {
    return `queue:${queueName}:paused`
  }

  private extractQueueFromJobKey(jobId: string): string {
    // This is a simplified implementation
    return 'default'
  }

  private serializeJob(job: JobData): Record<string, string> {
    return {
      id: job.id,
      type: job.type,
      payload: JSON.stringify(job.payload),
      priority: job.priority.toString(),
      attempts: job.attempts.toString(),
      maxAttempts: job.maxAttempts.toString(),
      delay: job.delay.toString(),
      createdAt: job.createdAt.toISOString(),
      scheduledAt: job.scheduledAt.toISOString(),
      processedAt: job.processedAt?.toISOString() || '',
      completedAt: job.completedAt?.toISOString() || '',
      failedAt: job.failedAt?.toISOString() || '',
      error: job.error || '',
    }
  }

  private deserializeJob(data: Record<string, string>): JobData {
    return {
      id: data.id,
      type: data.type,
      payload: JSON.parse(data.payload),
      priority: Number.parseInt(data.priority),
      attempts: Number.parseInt(data.attempts),
      maxAttempts: Number.parseInt(data.maxAttempts),
      delay: Number.parseInt(data.delay),
      createdAt: new Date(data.createdAt),
      scheduledAt: new Date(data.scheduledAt),
      processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      failedAt: data.failedAt ? new Date(data.failedAt) : undefined,
      error: data.error || undefined,
    }
  }
}
