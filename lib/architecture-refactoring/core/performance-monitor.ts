/**
 * Performance Monitor
 * Tracks and reports on analysis performance
 */

import {
  PerformanceMonitor as IPerformanceMonitor,
  Timer,
  MemorySnapshot,
  PerformanceReport,
  Bottleneck,
} from '../types';
import { Logger } from '../services/logger';

class TimerImpl implements Timer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  stop(): number {
    if (!this.endTime) {
      this.endTime = Date.now();
    }
    return this.endTime - this.startTime;
  }
}

export class PerformanceMonitor implements IPerformanceMonitor {
  private logger: Logger;
  private timers: Map<string, TimerImpl> = new Map();
  private memorySnapshots: MemorySnapshot[] = [];
  private fileProcessingTimes: Map<string, number> = new Map();
  private operationCounts: Map<string, number> = new Map();

  constructor() {
    this.logger = new Logger('PerformanceMonitor');
  }

  /**
   * Start a timer for an operation
   */
  startTimer(operation: string): Timer {
    const timer = new TimerImpl();
    this.timers.set(operation, timer);
    this.logger.debug(`Timer started: ${operation}`);
    return timer;
  }

  /**
   * Record memory usage at a checkpoint
   */
  recordMemoryUsage(checkpoint: string): MemorySnapshot {
    const memoryUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      timestamp: new Date(),
    };

    this.memorySnapshots.push(snapshot);
    this.logger.debug(`Memory snapshot recorded: ${checkpoint}`, {
      heapUsed: this.formatBytes(snapshot.heapUsed),
      heapTotal: this.formatBytes(snapshot.heapTotal),
    });

    return snapshot;
  }

  /**
   * Track file processing time
   */
  trackFileProcessing(file: string, duration: number): void {
    this.fileProcessingTimes.set(file, duration);
    this.incrementOperationCount('filesProcessed');
    
    this.logger.debug(`File processed: ${file}`, {
      duration: `${duration}ms`,
    });
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const totalDuration = this.calculateTotalDuration();
    const bottlenecks = this.identifyBottlenecks();

    const report: PerformanceReport = {
      totalDuration,
      fileProcessingTimes: this.fileProcessingTimes,
      memoryUsage: this.memorySnapshots,
      bottlenecks,
    };

    this.logger.info('Performance report generated', {
      totalDuration: `${totalDuration}ms`,
      filesProcessed: this.fileProcessingTimes.size,
      bottlenecks: bottlenecks.length,
    });

    return report;
  }

  /**
   * Calculate total duration from all timers
   */
  private calculateTotalDuration(): number {
    let maxDuration = 0;
    
    for (const [operation, timer] of this.timers.entries()) {
      const duration = timer.stop();
      if (operation === 'analyzeCodebase') {
        return duration;
      }
      maxDuration = Math.max(maxDuration, duration);
    }

    return maxDuration;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const avgFileProcessingTime = this.calculateAverageFileProcessingTime();

    // Check for slow file processing
    for (const [file, duration] of this.fileProcessingTimes.entries()) {
      if (duration > avgFileProcessingTime * 3) {
        bottlenecks.push({
          operation: `File processing: ${file}`,
          duration,
          impact: duration > avgFileProcessingTime * 5 ? 'high' : 'medium',
          suggestion: 'Consider optimizing analysis for this file or excluding it',
        });
      }
    }

    // Check for memory issues
    const memoryGrowth = this.calculateMemoryGrowth();
    if (memoryGrowth > 500 * 1024 * 1024) { // 500MB growth
      bottlenecks.push({
        operation: 'Memory usage',
        duration: memoryGrowth,
        impact: memoryGrowth > 1024 * 1024 * 1024 ? 'high' : 'medium',
        suggestion: 'High memory growth detected. Consider processing files in smaller batches',
      });
    }

    // Check for slow operations
    for (const [operation, timer] of this.timers.entries()) {
      const duration = timer.stop();
      if (duration > 30000) { // 30 seconds
        bottlenecks.push({
          operation,
          duration,
          impact: duration > 60000 ? 'high' : 'medium',
          suggestion: `Operation ${operation} is taking too long. Consider optimization`,
        });
      }
    }

    return bottlenecks.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Calculate average file processing time
   */
  private calculateAverageFileProcessingTime(): number {
    if (this.fileProcessingTimes.size === 0) return 0;

    const total = Array.from(this.fileProcessingTimes.values()).reduce((sum, time) => sum + time, 0);
    return total / this.fileProcessingTimes.size;
  }

  /**
   * Calculate memory growth
   */
  private calculateMemoryGrowth(): number {
    if (this.memorySnapshots.length < 2) return 0;

    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];
    return last.heapUsed - first.heapUsed;
  }

  /**
   * Increment operation count
   */
  private incrementOperationCount(operation: string): void {
    const count = this.operationCounts.get(operation) || 0;
    this.operationCounts.set(operation, count + 1);
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    totalOperations: number;
    averageFileProcessingTime: number;
    memoryPeakUsage: number;
    totalFilesProcessed: number;
    operationBreakdown: Map<string, number>;
  } {
    const memoryPeak = Math.max(...this.memorySnapshots.map(s => s.heapUsed), 0);

    return {
      totalOperations: Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0),
      averageFileProcessingTime: this.calculateAverageFileProcessingTime(),
      memoryPeakUsage: memoryPeak,
      totalFilesProcessed: this.fileProcessingTimes.size,
      operationBreakdown: this.operationCounts,
    };
  }

  /**
   * Reset all monitoring data
   */
  reset(): void {
    this.timers.clear();
    this.memorySnapshots = [];
    this.fileProcessingTimes.clear();
    this.operationCounts.clear();
    this.logger.info('Performance monitor reset');
  }

  /**
   * Check if performance thresholds are exceeded
   */
  checkThresholds(thresholds: {
    maxDuration?: number;
    maxMemory?: number;
    maxFileProcessingTime?: number;
  }): {
    exceeded: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (thresholds.maxDuration) {
      const totalDuration = this.calculateTotalDuration();
      if (totalDuration > thresholds.maxDuration) {
        violations.push(`Total duration ${totalDuration}ms exceeds threshold ${thresholds.maxDuration}ms`);
      }
    }

    if (thresholds.maxMemory) {
      const peakMemory = Math.max(...this.memorySnapshots.map(s => s.heapUsed), 0);
      if (peakMemory > thresholds.maxMemory) {
        violations.push(`Peak memory ${this.formatBytes(peakMemory)} exceeds threshold ${this.formatBytes(thresholds.maxMemory)}`);
      }
    }

    if (thresholds.maxFileProcessingTime) {
      for (const [file, duration] of this.fileProcessingTimes.entries()) {
        if (duration > thresholds.maxFileProcessingTime) {
          violations.push(`File ${file} processing time ${duration}ms exceeds threshold ${thresholds.maxFileProcessingTime}ms`);
        }
      }
    }

    return {
      exceeded: violations.length > 0,
      violations,
    };
  }
}