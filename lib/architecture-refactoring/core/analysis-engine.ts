/**
 * Core Analysis Engine
 * Orchestrates the entire analysis process
 */

import {
  AnalysisConfig,
  AnalysisResult,
  RefactoringReport,
  ValidationResult,
  AnalysisEngine as IAnalysisEngine,
  AnalysisContext,
  PluginResult,
  AnalysisError,
  RecoveryAction,
} from '../types';
import { PluginManager } from './plugin-manager';
import { Configuration } from './configuration';
import { ErrorHandler } from './error-handler';
import { PerformanceMonitor } from './performance-monitor';
import { FileSystemService } from '../services/file-system';
import { ASTParser } from '../services/ast-parser';
import { TypeScriptService } from '../services/typescript-service';
import { CacheService } from '../services/cache-service';
import { Logger } from '../services/logger';
import { ReportGenerator } from '../reporters/report-generator';

export class AnalysisEngine implements IAnalysisEngine {
  private pluginManager: PluginManager;
  private configuration: Configuration;
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private reportGenerator: ReportGenerator;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AnalysisEngine');
    this.pluginManager = new PluginManager();
    this.configuration = new Configuration();
    this.errorHandler = new ErrorHandler();
    this.performanceMonitor = new PerformanceMonitor();
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Analyze the codebase according to the provided configuration
   */
  async analyzeCodebase(config: AnalysisConfig): Promise<AnalysisResult[]> {
    const timer = this.performanceMonitor.startTimer('analyzeCodebase');
    this.logger.info('Starting codebase analysis', { config });

    try {
      // Validate configuration
      const validation = await this.configuration.validate(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Create analysis context
      const context = await this.createAnalysisContext(config);

      // Initialize plugins based on analysis types
      await this.initializePlugins(config.analysisTypes, context);

      // Perform analysis
      const results = await this.performAnalysis(context);

      // Post-process results
      const processedResults = await this.postProcessResults(results, config);

      timer.stop();
      this.logger.info('Codebase analysis completed', {
        resultsCount: processedResults.length,
        duration: timer.stop(),
      });

      return processedResults;
    } catch (error) {
      timer.stop();
      const analysisError = this.createAnalysisError(error as Error, 'analyzeCodebase');
      const recovery = await this.errorHandler.handleError(analysisError);
      
      if (recovery.type === 'abort') {
        throw analysisError;
      }
      
      return [];
    }
  }

  /**
   * Generate a comprehensive refactoring report from analysis results
   */
  async generateReport(results: AnalysisResult[]): Promise<RefactoringReport> {
    const timer = this.performanceMonitor.startTimer('generateReport');
    this.logger.info('Generating refactoring report', { resultsCount: results.length });

    try {
      const report = await this.reportGenerator.generate(results, {
        performanceReport: await this.performanceMonitor.generatePerformanceReport(),
        configuration: this.configuration.getConfig(),
      });

      timer.stop();
      this.logger.info('Report generation completed', { reportId: report.id });

      return report;
    } catch (error) {
      timer.stop();
      this.logger.error('Failed to generate report', error as Error);
      throw error;
    }
  }

  /**
   * Validate the provided recommendations
   */
  async validateRecommendations(recommendations: any[]): Promise<ValidationResult> {
    this.logger.info('Validating recommendations', { count: recommendations.length });

    const errors: any[] = [];
    const warnings: any[] = [];

    for (const recommendation of recommendations) {
      try {
        // Validate recommendation structure
        if (!recommendation.type || !recommendation.description) {
          errors.push({
            field: 'recommendation',
            message: 'Missing required fields',
            code: 'INVALID_STRUCTURE',
          });
          continue;
        }

        // Validate automatable flag consistency
        if (recommendation.automatable && recommendation.risks?.some((r: any) => r.level === 'high')) {
          warnings.push({
            field: 'automatable',
            message: 'High-risk recommendations should not be marked as automatable',
            suggestion: 'Consider manual review for high-risk changes',
          });
        }

        // Validate dependencies exist
        if (recommendation.dependencies?.length > 0) {
          for (const dep of recommendation.dependencies) {
            if (!recommendations.find(r => r.id === dep)) {
              errors.push({
                field: 'dependencies',
                message: `Dependency ${dep} not found`,
                code: 'MISSING_DEPENDENCY',
              });
            }
          }
        }
      } catch (error) {
        errors.push({
          field: 'recommendation',
          message: `Validation error: ${(error as Error).message}`,
          code: 'VALIDATION_ERROR',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create the analysis context with all required services
   */
  private async createAnalysisContext(config: AnalysisConfig): Promise<AnalysisContext> {
    const fileSystem = new FileSystemService(config.targetPaths, config.excludePatterns);
    const astParser = new ASTParser();
    const typeChecker = new TypeScriptService(config.targetPaths);
    const cache = new CacheService();

    await typeChecker.initialize();

    return {
      config,
      fileSystem,
      astParser,
      typeChecker,
      logger: this.logger,
      cache,
    };
  }

  /**
   * Initialize plugins based on requested analysis types
   */
  private async initializePlugins(analysisTypes: string[], context: AnalysisContext): Promise<void> {
    for (const type of analysisTypes) {
      const plugin = await this.pluginManager.loadPlugin(type);
      if (plugin) {
        await plugin.configure({
          enabled: true,
          options: context.config,
        });
      }
    }
  }

  /**
   * Perform the actual analysis using all loaded plugins
   */
  private async performAnalysis(context: AnalysisContext): Promise<AnalysisResult[]> {
    const plugins = await this.pluginManager.getEnabledPlugins();
    const results: AnalysisResult[] = [];
    const concurrencyLimit = context.config.concurrencyLimit || 4;

    // Process plugins in batches for controlled concurrency
    const batches = this.createBatches(plugins, concurrencyLimit);

    for (const batch of batches) {
      const batchPromises = batch.map(async (plugin) => {
        try {
          const pluginResult = await plugin.analyze(context);
          results.push(...pluginResult.results);
          
          if (pluginResult.errors.length > 0) {
            this.logger.warn(`Plugin ${plugin.name} reported errors`, {
              errors: pluginResult.errors,
            });
          }
        } catch (error) {
          this.logger.error(`Plugin ${plugin.name} failed`, error as Error);
          const recovery = await this.errorHandler.handleError(
            this.createAnalysisError(error as Error, plugin.name)
          );
          
          if (recovery.type === 'abort') {
            throw error;
          }
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Post-process analysis results
   */
  private async postProcessResults(
    results: AnalysisResult[],
    config: AnalysisConfig
  ): Promise<AnalysisResult[]> {
    // Remove duplicates
    const uniqueResults = this.deduplicateResults(results);

    // Apply filters based on configuration
    const filteredResults = this.filterResults(uniqueResults, config);

    // Sort by severity and priority
    const sortedResults = this.sortResults(filteredResults);

    // Enhance with additional metadata
    const enhancedResults = await this.enhanceResults(sortedResults);

    return enhancedResults;
  }

  /**
   * Remove duplicate results
   */
  private deduplicateResults(results: AnalysisResult[]): AnalysisResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.file}:${result.line}:${result.column}:${result.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Filter results based on configuration
   */
  private filterResults(results: AnalysisResult[], config: AnalysisConfig): AnalysisResult[] {
    return results.filter(result => {
      // Filter by severity if specified
      if (config.strictMode && result.severity === 'low') {
        return false;
      }

      // Filter by excluded patterns
      for (const pattern of config.excludePatterns) {
        if (result.file.match(new RegExp(pattern))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort results by severity and impact
   */
  private sortResults(results: AnalysisResult[]): AnalysisResult[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3, minimal: 4 };

    return results.sort((a, b) => {
      // Sort by severity first
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by performance impact
      const impactDiff = impactOrder[a.impact.performance] - impactOrder[b.impact.performance];
      if (impactDiff !== 0) return impactDiff;

      // Finally by file and line
      const fileDiff = a.file.localeCompare(b.file);
      if (fileDiff !== 0) return fileDiff;

      return (a.line || 0) - (b.line || 0);
    });
  }

  /**
   * Enhance results with additional metadata
   */
  private async enhanceResults(results: AnalysisResult[]): Promise<AnalysisResult[]> {
    return results.map(result => ({
      ...result,
      id: this.generateResultId(result),
      timestamp: new Date(),
      metadata: {
        ...result.metadata,
        engineVersion: '1.0.0',
        analysisRun: new Date().toISOString(),
      },
    }));
  }

  /**
   * Generate a unique ID for a result
   */
  private generateResultId(result: AnalysisResult): string {
    return `${result.analysisType}-${result.file}-${result.line}-${Date.now()}`;
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Create an analysis error with context
   */
  private createAnalysisError(error: Error, context: string): AnalysisError {
    return {
      name: 'AnalysisError',
      message: error.message,
      stack: error.stack,
      code: 'ANALYSIS_ERROR',
      context: {
        analysisType: context as any,
        metadata: { originalError: error.name },
      },
      recoverable: true,
    };
  }
}