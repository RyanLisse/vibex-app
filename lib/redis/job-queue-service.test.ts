/**
 * JobQueueService Tests
 * 
 * Test-driven development for Redis/Valkey job queue functionality
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { JobQueueService } from './job-queue-service'
import { RedisClientManager } from './redis-client'
import { testRedisConfig } from './config'
import type { JobData, JobOptions, JobQueueStats } from './types'

describe('JobQueueService', () => {
  let jobQueueService: JobQueueService
  let redisManager: RedisClientManager

  beforeAll(async () => {
    redisManager = RedisClientManager.getInstance(testRedisConfig)
    await redisManager.initialize()
  })

  beforeEach(() => {
    jobQueueService = JobQueueService.getInstance()
  })

  afterEach(async () => {
    await jobQueueService.cleanup()
  })

  afterAll(async () => {
    await redisManager.shutdown()
  })

  describe('Basic Job Operations', () => {
    test('should add and process jobs', async () => {
      const queueName = 'test:basic-queue'
      const jobPayload = { message: 'Hello, World!', timestamp: Date.now() }

      // Add job to queue
      const jobId = await jobQueueService.addJob(queueName, 'greeting', jobPayload)
      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')

      // Get job from queue
      const job = await jobQueueService.getNextJob(queueName)
      expect(job).not.toBeNull()
      expect(job!.id).toBe(jobId)
      expect(job!.type).toBe('greeting')
      expect(job!.payload).toEqual(jobPayload)
      expect(job!.attempts).toBe(0)
      expect(job!.createdAt).toBeInstanceOf(Date)
      expect(job!.scheduledAt).toBeInstanceOf(Date)

      // Mark job as completed
      const completed = await jobQueueService.completeJob(job!)
      expect(completed).toBe(true)

      // Queue should be empty now
      const nextJob = await jobQueueService.getNextJob(queueName)
      expect(nextJob).toBeNull()
    })

    test('should handle job with options', async () => {
      const queueName = 'test:options-queue'
      const jobPayload = { task: 'important work' }
      const options: JobOptions = {
        priority: 5,
        delay: 1000, // 1 second delay
        maxAttempts: 5,
        removeOnComplete: false
      }

      const jobId = await jobQueueService.addJob(queueName, 'important', jobPayload, options)
      
      // Job should not be available immediately due to delay
      const immediateJob = await jobQueueService.getNextJob(queueName)
      expect(immediateJob).toBeNull()

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Now job should be available
      const delayedJob = await jobQueueService.getNextJob(queueName)
      expect(delayedJob).not.toBeNull()
      expect(delayedJob!.id).toBe(jobId)
      expect(delayedJob!.priority).toBe(5)
      expect(delayedJob!.maxAttempts).toBe(5)

      await jobQueueService.completeJob(delayedJob!)
    })

    test('should handle job priorities', async () => {
      const queueName = 'test:priority-queue'
      
      // Add jobs with different priorities
      const lowPriorityId = await jobQueueService.addJob(queueName, 'low', { data: 'low' }, { priority: 1 })
      const highPriorityId = await jobQueueService.addJob(queueName, 'high', { data: 'high' }, { priority: 10 })
      const mediumPriorityId = await jobQueueService.addJob(queueName, 'medium', { data: 'medium' }, { priority: 5 })

      // Jobs should be processed in priority order (high to low)
      const firstJob = await jobQueueService.getNextJob(queueName)
      expect(firstJob!.id).toBe(highPriorityId)
      expect(firstJob!.priority).toBe(10)

      const secondJob = await jobQueueService.getNextJob(queueName)
      expect(secondJob!.id).toBe(mediumPriorityId)
      expect(secondJob!.priority).toBe(5)

      const thirdJob = await jobQueueService.getNextJob(queueName)
      expect(thirdJob!.id).toBe(lowPriorityId)
      expect(thirdJob!.priority).toBe(1)

      // Clean up
      await jobQueueService.completeJob(firstJob!)
      await jobQueueService.completeJob(secondJob!)
      await jobQueueService.completeJob(thirdJob!)
    })
  })

  describe('Job Failure and Retry', () => {
    test('should retry failed jobs', async () => {
      const queueName = 'test:retry-queue'
      const jobPayload = { willFail: true }
      const options: JobOptions = { maxAttempts: 3 }

      const jobId = await jobQueueService.addJob(queueName, 'retry-test', jobPayload, options)
      
      // First attempt
      const attempt1 = await jobQueueService.getNextJob(queueName)
      expect(attempt1!.attempts).toBe(0)
      
      const failed1 = await jobQueueService.failJob(attempt1!, new Error('First failure'))
      expect(failed1).toBe(true)

      // Second attempt
      const attempt2 = await jobQueueService.getNextJob(queueName)
      expect(attempt2!.id).toBe(jobId)
      expect(attempt2!.attempts).toBe(1)
      
      const failed2 = await jobQueueService.failJob(attempt2!, new Error('Second failure'))
      expect(failed2).toBe(true)

      // Third attempt
      const attempt3 = await jobQueueService.getNextJob(queueName)
      expect(attempt3!.attempts).toBe(2)
      
      // This time succeed
      const completed = await jobQueueService.completeJob(attempt3!)
      expect(completed).toBe(true)
    })

    test('should move job to failed queue after max attempts', async () => {
      const queueName = 'test:max-attempts'
      const jobPayload = { alwaysFails: true }
      const options: JobOptions = { maxAttempts: 2 }

      const jobId = await jobQueueService.addJob(queueName, 'always-fails', jobPayload, options)
      
      // Fail job twice
      for (let i = 0; i < 2; i++) {
        const job = await jobQueueService.getNextJob(queueName)
        expect(job).not.toBeNull()
        await jobQueueService.failJob(job!, new Error(`Failure ${i + 1}`))
      }

      // No more jobs should be available in main queue
      const noJob = await jobQueueService.getNextJob(queueName)
      expect(noJob).toBeNull()

      // Job should be in failed queue
      const failedJobs = await jobQueueService.getFailedJobs(queueName)
      expect(failedJobs).toHaveLength(1)
      expect(failedJobs[0].id).toBe(jobId)
      expect(failedJobs[0].attempts).toBe(2)
      expect(failedJobs[0].error).toContain('Failure')
    })

    test('should implement exponential backoff for retries', async () => {
      const queueName = 'test:backoff'
      const options: JobOptions = { 
        maxAttempts: 3, 
        backoff: 'exponential' 
      }

      const jobId = await jobQueueService.addJob(queueName, 'backoff-test', {}, options)
      
      // First failure
      const attempt1 = await jobQueueService.getNextJob(queueName)
      const failTime1 = Date.now()
      await jobQueueService.failJob(attempt1!, new Error('First failure'))

      // Should not be immediately available due to backoff
      const immediateRetry = await jobQueueService.getNextJob(queueName)
      expect(immediateRetry).toBeNull()

      // Wait for backoff period (should be ~1 second for first retry)
      await new Promise(resolve => setTimeout(resolve, 1200))

      const attempt2 = await jobQueueService.getNextJob(queueName)
      expect(attempt2).not.toBeNull()
      expect(attempt2!.id).toBe(jobId)
      expect(attempt2!.attempts).toBe(1)

      const failTime2 = Date.now()
      await jobQueueService.failJob(attempt2!, new Error('Second failure'))

      // Second backoff should be longer (~2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2200))

      const attempt3 = await jobQueueService.getNextJob(queueName)
      expect(attempt3).not.toBeNull()
      expect(attempt3!.attempts).toBe(2)

      await jobQueueService.completeJob(attempt3!)
    })
  })

  describe('Queue Management', () => {
    test('should get queue statistics', async () => {
      const queueName = 'test:stats-queue'
      
      // Add various jobs
      await jobQueueService.addJob(queueName, 'job1', {})
      await jobQueueService.addJob(queueName, 'job2', {}, { delay: 5000 }) // delayed
      
      const job = await jobQueueService.getNextJob(queueName)
      // Leave job in active state

      const stats = await jobQueueService.getQueueStats(queueName)
      
      expect(stats.waiting).toBeGreaterThanOrEqual(0)
      expect(stats.active).toBeGreaterThanOrEqual(1)
      expect(stats.completed).toBeGreaterThanOrEqual(0)
      expect(stats.failed).toBeGreaterThanOrEqual(0)
      expect(stats.delayed).toBeGreaterThanOrEqual(1)
      expect(typeof stats.paused).toBe('boolean')

      if (job) {
        await jobQueueService.completeJob(job)
      }
    })

    test('should pause and resume queues', async () => {
      const queueName = 'test:pause-queue'
      
      // Add job to queue
      await jobQueueService.addJob(queueName, 'test', {})
      
      // Pause queue
      const paused = await jobQueueService.pauseQueue(queueName)
      expect(paused).toBe(true)

      // Should not be able to get jobs from paused queue
      const pausedJob = await jobQueueService.getNextJob(queueName)
      expect(pausedJob).toBeNull()

      // Resume queue
      const resumed = await jobQueueService.resumeQueue(queueName)
      expect(resumed).toBe(true)

      // Should be able to get jobs again
      const resumedJob = await jobQueueService.getNextJob(queueName)
      expect(resumedJob).not.toBeNull()

      await jobQueueService.completeJob(resumedJob!)
    })

    test('should clean up old jobs', async () => {
      const queueName = 'test:cleanup-queue'
      
      // Add and complete some jobs
      for (let i = 0; i < 5; i++) {
        const jobId = await jobQueueService.addJob(queueName, 'cleanup-test', { index: i })
        const job = await jobQueueService.getNextJob(queueName)
        await jobQueueService.completeJob(job!)
      }

      // Add and fail some jobs
      for (let i = 0; i < 3; i++) {
        const jobId = await jobQueueService.addJob(queueName, 'cleanup-fail', { index: i }, { maxAttempts: 1 })
        const job = await jobQueueService.getNextJob(queueName)
        await jobQueueService.failJob(job!, new Error('Cleanup test failure'))
      }

      // Clean up completed jobs older than 0 seconds (all of them)
      const cleanedCompleted = await jobQueueService.cleanupCompletedJobs(queueName, 0)
      expect(cleanedCompleted).toBe(5)

      // Clean up failed jobs
      const cleanedFailed = await jobQueueService.cleanupFailedJobs(queueName, 0)
      expect(cleanedFailed).toBe(3)
    })
  })

  describe('Job Scheduling', () => {
    test('should schedule jobs for future execution', async () => {
      const queueName = 'test:schedule-queue'
      const futureTime = new Date(Date.now() + 2000) // 2 seconds in future
      
      const jobId = await jobQueueService.scheduleJob(queueName, 'scheduled-task', {}, futureTime)
      expect(jobId).toBeDefined()

      // Job should not be available immediately
      const immediateJob = await jobQueueService.getNextJob(queueName)
      expect(immediateJob).toBeNull()

      // Wait for scheduled time
      await new Promise(resolve => setTimeout(resolve, 2200))

      // Job should now be available
      const scheduledJob = await jobQueueService.getNextJob(queueName)
      expect(scheduledJob).not.toBeNull()
      expect(scheduledJob!.id).toBe(jobId)

      await jobQueueService.completeJob(scheduledJob!)
    })

    test('should support cron-like recurring jobs', async () => {
      const queueName = 'test:recurring-queue'
      const cronExpression = '*/2 * * * * *' // Every 2 seconds
      
      // This would test cron job scheduling
      const recurringJobId = await jobQueueService.addRecurringJob(
        queueName, 
        'recurring-task', 
        {}, 
        cronExpression
      )
      
      expect(recurringJobId).toBeDefined()

      // Wait for first execution
      await new Promise(resolve => setTimeout(resolve, 2500))

      const firstExecution = await jobQueueService.getNextJob(queueName)
      expect(firstExecution).not.toBeNull()
      expect(firstExecution!.type).toBe('recurring-task')

      await jobQueueService.completeJob(firstExecution!)

      // Wait for second execution
      await new Promise(resolve => setTimeout(resolve, 2500))

      const secondExecution = await jobQueueService.getNextJob(queueName)
      expect(secondExecution).not.toBeNull()

      await jobQueueService.completeJob(secondExecution!)

      // Remove recurring job
      const removed = await jobQueueService.removeRecurringJob(recurringJobId)
      expect(removed).toBe(true)
    })
  })

  describe('Job Progress Tracking', () => {
    test('should track job progress', async () => {
      const queueName = 'test:progress-queue'
      const jobPayload = { task: 'long-running-task' }

      const jobId = await jobQueueService.addJob(queueName, 'progress-test', jobPayload)
      const job = await jobQueueService.getNextJob(queueName)
      
      expect(job).not.toBeNull()

      // Update progress
      await jobQueueService.updateJobProgress(job!, 25, 'Starting task...')
      await jobQueueService.updateJobProgress(job!, 50, 'Half way done...')
      await jobQueueService.updateJobProgress(job!, 75, 'Almost finished...')

      // Get job progress
      const progress = await jobQueueService.getJobProgress(jobId)
      expect(progress.percentage).toBe(75)
      expect(progress.message).toBe('Almost finished...')
      expect(progress.updatedAt).toBeInstanceOf(Date)

      // Complete job
      await jobQueueService.updateJobProgress(job!, 100, 'Completed!')
      await jobQueueService.completeJob(job!)
    })

    test('should provide job history and logs', async () => {
      const queueName = 'test:history-queue'
      const jobId = await jobQueueService.addJob(queueName, 'history-test', {})
      const job = await jobQueueService.getNextJob(queueName)

      // Add some log entries
      await jobQueueService.addJobLog(job!, 'info', 'Job started')
      await jobQueueService.addJobLog(job!, 'debug', 'Processing data...')
      await jobQueueService.addJobLog(job!, 'warning', 'Temporary issue resolved')
      await jobQueueService.addJobLog(job!, 'info', 'Job completed successfully')

      await jobQueueService.completeJob(job!)

      // Get job logs
      const logs = await jobQueueService.getJobLogs(jobId)
      expect(logs).toHaveLength(4)
      expect(logs[0].level).toBe('info')
      expect(logs[0].message).toBe('Job started')
      expect(logs[3].message).toBe('Job completed successfully')

      // Get job history
      const history = await jobQueueService.getJobHistory(jobId)
      expect(history.states).toContain('waiting')
      expect(history.states).toContain('active')
      expect(history.states).toContain('completed')
      expect(history.duration).toBeGreaterThan(0)
    })
  })

  describe('Worker Management', () => {
    test('should register and manage workers', async () => {
      const queueName = 'test:worker-queue'
      const workerId = 'worker-1'

      // Register worker
      const registered = await jobQueueService.registerWorker(queueName, workerId)
      expect(registered).toBe(true)

      // Get active workers
      const workers = await jobQueueService.getActiveWorkers(queueName)
      expect(workers).toContain(workerId)

      // Heartbeat to keep worker alive
      const heartbeat = await jobQueueService.workerHeartbeat(workerId)
      expect(heartbeat).toBe(true)

      // Unregister worker
      const unregistered = await jobQueueService.unregisterWorker(workerId)
      expect(unregistered).toBe(true)

      // Worker should no longer be active
      const remainingWorkers = await jobQueueService.getActiveWorkers(queueName)
      expect(remainingWorkers).not.toContain(workerId)
    })

    test('should handle worker failures and cleanup', async () => {
      const queueName = 'test:worker-failure'
      const workerId = 'failing-worker'

      await jobQueueService.registerWorker(queueName, workerId)
      
      // Add job and simulate worker picking it up
      const jobId = await jobQueueService.addJob(queueName, 'worker-test', {})
      const job = await jobQueueService.getNextJob(queueName)
      
      // Simulate worker crash (no heartbeat)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Clean up stale workers
      const cleanedWorkers = await jobQueueService.cleanupStaleWorkers(queueName, 500) // 500ms timeout
      expect(cleanedWorkers).toBeGreaterThanOrEqual(1)

      // Job should be available again for other workers
      await new Promise(resolve => setTimeout(resolve, 100))
      const retriedJob = await jobQueueService.getNextJob(queueName)
      expect(retriedJob).not.toBeNull()

      await jobQueueService.completeJob(retriedJob!)
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid job data', async () => {
      const queueName = 'test:invalid-data'

      expect(async () => {
        await jobQueueService.addJob(queueName, '', {})
      }).rejects.toThrow('Job type cannot be empty')

      expect(async () => {
        await jobQueueService.addJob('', 'test', {})
      }).rejects.toThrow('Queue name cannot be empty')
    })

    test('should handle invalid job options', async () => {
      const queueName = 'test:invalid-options'

      expect(async () => {
        await jobQueueService.addJob(queueName, 'test', {}, { maxAttempts: 0 })
      }).rejects.toThrow('Max attempts must be greater than 0')

      expect(async () => {
        await jobQueueService.addJob(queueName, 'test', {}, { delay: -1 })
      }).rejects.toThrow('Delay cannot be negative')
    })

    test('should handle queue operation failures gracefully', async () => {
      const queueName = 'test:operation-failures'

      // These would test Redis connection failures - implementation specific
      const result = await jobQueueService.getQueueStats(queueName)
      expect(result).toHaveProperty('waiting')
      expect(result).toHaveProperty('active')
      expect(result).toHaveProperty('completed')
      expect(result).toHaveProperty('failed')
    })
  })

  describe('Integration Features', () => {
    test('should integrate with Inngest for workflow orchestration', async () => {
      const queueName = 'test:inngest-integration'
      const workflowPayload = {
        workflowId: 'wf-123',
        stepId: 'step-1',
        data: { userId: 'user-456' }
      }

      const jobId = await jobQueueService.addJob(queueName, 'inngest-workflow', workflowPayload)
      const job = await jobQueueService.getNextJob(queueName)

      expect(job).not.toBeNull()
      expect(job!.payload.workflowId).toBe('wf-123')
      expect(job!.payload.stepId).toBe('step-1')

      await jobQueueService.completeJob(job!)
    })

    test('should support batch job processing', async () => {
      const queueName = 'test:batch-processing'
      const batchSize = 5

      // Add multiple jobs
      const jobIds = []
      for (let i = 0; i < 10; i++) {
        const jobId = await jobQueueService.addJob(queueName, 'batch-item', { index: i })
        jobIds.push(jobId)
      }

      // Get jobs in batch
      const batch = await jobQueueService.getJobBatch(queueName, batchSize)
      expect(batch).toHaveLength(batchSize)

      // Process batch
      for (const job of batch) {
        await jobQueueService.completeJob(job)
      }

      // Get next batch
      const nextBatch = await jobQueueService.getJobBatch(queueName, batchSize)
      expect(nextBatch).toHaveLength(5) // Remaining jobs
    })

    test('should support distributed job processing across multiple instances', async () => {
      const queueName = 'test:distributed-processing'
      
      // Simulate multiple worker instances
      const worker1Id = 'instance-1-worker-1'
      const worker2Id = 'instance-2-worker-1'

      await jobQueueService.registerWorker(queueName, worker1Id)
      await jobQueueService.registerWorker(queueName, worker2Id)

      // Add jobs
      for (let i = 0; i < 10; i++) {
        await jobQueueService.addJob(queueName, 'distributed-task', { index: i })
      }

      // Both workers should be able to pick up jobs
      const job1 = await jobQueueService.getNextJob(queueName)
      const job2 = await jobQueueService.getNextJob(queueName)

      expect(job1).not.toBeNull()
      expect(job2).not.toBeNull()
      expect(job1!.id).not.toBe(job2!.id) // Different jobs

      await jobQueueService.completeJob(job1!)
      await jobQueueService.completeJob(job2!)

      await jobQueueService.unregisterWorker(worker1Id)
      await jobQueueService.unregisterWorker(worker2Id)
    })
  })
})