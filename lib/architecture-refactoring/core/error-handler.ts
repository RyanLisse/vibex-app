/**
 * Error Handler
 * Manages error recovery and reporting
 */

import {
  AnalysisError,
  RecoveryAction,
  ErrorContext,
} from '../types';
import { Logger } from '../services/logger';

export class ErrorHandler {
  private logger: Logger;
  private errorHistory: AnalysisError[] = [];
  private recoveryStrategies: Map<string, (error: AnalysisError) => RecoveryAction>;

  constructor() {
    this.logger = new Logger('ErrorHandler');
    this.recoveryStrategies = new Map();
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Parse errors - usually can continue with next file
    this.recoveryStrategies.set('PARSE_ERROR', (error) => ({
      type: 'skip',
      message: `Skipping file due to parse error: ${error.context.file}`,
      fallbackStrategy: 'Process remaining files',
      impactOnResults: 'This file will not be analyzed',
    }));

    // Type checking errors - can continue but results may be incomplete
    this.recoveryStrategies.set('TYPE_ERROR', (error) => ({
      type: 'continue',
      message: 'Continuing analysis without type information',
      fallbackStrategy: 'Use AST-based analysis only',
      impactOnResults: 'Type-related issues may be missed',
    }));

    // Resource errors - may need to retry with reduced load
    this.recoveryStrategies.set('RESOURCE_ERROR', (error) => ({
      type: 'retry',
      message: 'Retrying with reduced concurrency',
      fallbackStrategy: 'Reduce concurrent operations',
      impactOnResults: 'Analysis will take longer but should complete',
    }));

    // Critical errors - must abort
    this.recoveryStrategies.set('CRITICAL_ERROR', (error) => ({
      type: 'abort',
      message: 'Critical error encountered, aborting analysis',
      fallbackStrategy: 'None - manual intervention required',
      impactOnResults: 'Analysis cannot continue',
    }));
  }

  /**
   * Handle an analysis error
   */
  async handleError(error: AnalysisError): Promise<RecoveryAction> {
    this.logger.error('Handling analysis error', error, error.context);
    this.errorHistory.push(error);

    // Check if we've seen too many errors
    if (this.errorHistory.length > 100) {
      return {
        type: 'abort',
        message: 'Too many errors encountered',
        fallbackStrategy: 'Review error log and fix issues',
        impactOnResults: 'Analysis aborted due to excessive errors',
      };
    }

    // Get recovery strategy
    const strategy = this.recoveryStrategies.get(error.code) || this.getDefaultRecovery(error);

    // Execute recovery action
    const recovery = typeof strategy === 'function' ? strategy(error) : strategy;

    this.logger.info('Recovery action determined', {
      errorCode: error.code,
      recoveryType: recovery.type,
    });

    return recovery;
  }

  /**
   * Get default recovery action
   */
  private getDefaultRecovery(error: AnalysisError): RecoveryAction {
    if (error.recoverable) {
      return {
        type: 'continue',
        message: 'Attempting to continue despite error',
        fallbackStrategy: 'Skip problematic section',
        impactOnResults: 'Some results may be missing',
      };
    }

    return {
      type: 'abort',
      message: 'Unrecoverable error encountered',
      fallbackStrategy: 'Fix the error and retry',
      impactOnResults: 'Analysis cannot continue',
    };
  }

  /**
   * Handle parse error
   */
  handleParseError(error: Error, context: ErrorContext): RecoveryAction {
    const analysisError: AnalysisError = {
      name: 'ParseError',
      message: error.message,
      stack: error.stack,
      code: 'PARSE_ERROR',
      context,
      recoverable: true,
    };

    return this.handleError(analysisError);
  }

  /**
   * Handle runtime error
   */
  handleRuntimeError(error: Error, context: ErrorContext): RecoveryAction {
    const analysisError: AnalysisError = {
      name: 'RuntimeError',
      message: error.message,
      stack: error.stack,
      code: 'RUNTIME_ERROR',
      context,
      recoverable: true,
    };

    return this.handleError(analysisError);
  }

  /**
   * Handle resource error
   */
  handleResourceError(error: Error, context: ErrorContext): RecoveryAction {
    const analysisError: AnalysisError = {
      name: 'ResourceError',
      message: error.message,
      stack: error.stack,
      code: 'RESOURCE_ERROR',
      context,
      recoverable: true,
    };

    return this.handleError(analysisError);
  }

  /**
   * Generate error report
   */
  generateErrorReport(): {
    totalErrors: number;
    errorsByType: Map<string, number>;
    criticalErrors: AnalysisError[];
    recoveryActions: Map<string, number>;
  } {
    const errorsByType = new Map<string, number>();
    const recoveryActions = new Map<string, number>();
    const criticalErrors: AnalysisError[] = [];

    for (const error of this.errorHistory) {
      // Count errors by type
      const count = errorsByType.get(error.code) || 0;
      errorsByType.set(error.code, count + 1);

      // Track critical errors
      if (!error.recoverable) {
        criticalErrors.push(error);
      }
    }

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      criticalErrors,
      recoveryActions,
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.logger.info('Error history cleared');
  }

  /**
   * Get error history
   */
  getErrorHistory(): AnalysisError[] {
    return [...this.errorHistory];
  }

  /**
   * Add custom recovery strategy
   */
  addRecoveryStrategy(errorCode: string, strategy: (error: AnalysisError) => RecoveryAction): void {
    this.recoveryStrategies.set(errorCode, strategy);
    this.logger.info(`Added recovery strategy for ${errorCode}`);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AnalysisError): boolean {
    const strategy = this.recoveryStrategies.get(error.code);
    if (typeof strategy === 'function') {
      const recovery = strategy(error);
      return recovery.type === 'retry';
    }
    return false;
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    totalErrors: number;
    recoverableErrors: number;
    criticalErrors: number;
    errorRate: number;
    mostCommonError: string | null;
  } {
    const totalErrors = this.errorHistory.length;
    const recoverableErrors = this.errorHistory.filter(e => e.recoverable).length;
    const criticalErrors = totalErrors - recoverableErrors;

    // Find most common error
    const errorCounts = new Map<string, number>();
    for (const error of this.errorHistory) {
      const count = errorCounts.get(error.code) || 0;
      errorCounts.set(error.code, count + 1);
    }

    let mostCommonError: string | null = null;
    let maxCount = 0;
    for (const [code, count] of errorCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = code;
      }
    }

    return {
      totalErrors,
      recoverableErrors,
      criticalErrors,
      errorRate: totalErrors > 0 ? criticalErrors / totalErrors : 0,
      mostCommonError,
    };
  }
}