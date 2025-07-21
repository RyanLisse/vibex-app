/**
 * Configuration Manager
 * Handles configuration validation and management
 */

import {
  AnalysisConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  PerformanceThresholds,
} from '../types';
import { Logger } from '../services/logger';

export class Configuration {
  private config: AnalysisConfig | null = null;
  private logger: Logger;
  private defaultConfig: Partial<AnalysisConfig> = {
    excludePatterns: [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage',
      '*.test.ts',
      '*.test.tsx',
      '*.spec.ts',
      '*.spec.tsx',
    ],
    strictMode: false,
    performanceThresholds: {
      maxAnalysisTime: 300000, // 5 minutes
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      maxFileSize: 10 * 1024 * 1024, // 10MB
      concurrencyLimit: 4,
    },
    concurrencyLimit: 4,
    outputFormat: 'json',
  };

  constructor() {
    this.logger = new Logger('Configuration');
  }

  /**
   * Validate the analysis configuration
   */
  async validate(config: AnalysisConfig): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate target paths
    if (!config.targetPaths || config.targetPaths.length === 0) {
      errors.push({
        field: 'targetPaths',
        message: 'At least one target path must be specified',
        code: 'MISSING_TARGET_PATHS',
      });
    }

    // Validate analysis types
    if (!config.analysisTypes || config.analysisTypes.length === 0) {
      errors.push({
        field: 'analysisTypes',
        message: 'At least one analysis type must be specified',
        code: 'MISSING_ANALYSIS_TYPES',
      });
    }

    // Validate performance thresholds
    if (config.performanceThresholds) {
      const thresholds = config.performanceThresholds;
      
      if (thresholds.maxAnalysisTime && thresholds.maxAnalysisTime < 60000) {
        warnings.push({
          field: 'performanceThresholds.maxAnalysisTime',
          message: 'Analysis time threshold is very low (< 1 minute)',
          suggestion: 'Consider increasing to at least 60000ms for thorough analysis',
        });
      }

      if (thresholds.maxMemoryUsage && thresholds.maxMemoryUsage < 512 * 1024 * 1024) {
        warnings.push({
          field: 'performanceThresholds.maxMemoryUsage',
          message: 'Memory usage threshold is low (< 512MB)',
          suggestion: 'Large codebases may require more memory',
        });
      }

      if (thresholds.concurrencyLimit && thresholds.concurrencyLimit > 8) {
        warnings.push({
          field: 'performanceThresholds.concurrencyLimit',
          message: 'High concurrency limit may cause system overload',
          suggestion: 'Consider reducing to 4-8 for optimal performance',
        });
      }
    }

    // Validate exclude patterns
    if (config.excludePatterns) {
      for (const pattern of config.excludePatterns) {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push({
            field: 'excludePatterns',
            message: `Invalid regex pattern: ${pattern}`,
            code: 'INVALID_REGEX',
          });
        }
      }
    }

    // Validate output format
    const validFormats = ['json', 'html', 'markdown'];
    if (config.outputFormat && !validFormats.includes(config.outputFormat)) {
      errors.push({
        field: 'outputFormat',
        message: `Invalid output format. Must be one of: ${validFormats.join(', ')}`,
        code: 'INVALID_OUTPUT_FORMAT',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Set the configuration
   */
  async setConfig(config: AnalysisConfig): Promise<void> {
    const validation = await this.validate(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.config = this.mergeWithDefaults(config);
    this.logger.info('Configuration set', { config: this.config });
  }

  /**
   * Get the current configuration
   */
  getConfig(): AnalysisConfig | null {
    return this.config;
  }

  /**
   * Get a specific configuration value
   */
  get<K extends keyof AnalysisConfig>(key: K): AnalysisConfig[K] | undefined {
    return this.config?.[key];
  }

  /**
   * Update a specific configuration value
   */
  async set<K extends keyof AnalysisConfig>(key: K, value: AnalysisConfig[K]): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const newConfig = { ...this.config, [key]: value };
    await this.setConfig(newConfig);
  }

  /**
   * Merge user config with defaults
   */
  private mergeWithDefaults(config: AnalysisConfig): AnalysisConfig {
    return {
      ...this.defaultConfig,
      ...config,
      performanceThresholds: {
        ...this.defaultConfig.performanceThresholds,
        ...config.performanceThresholds,
      } as PerformanceThresholds,
      excludePatterns: [
        ...(this.defaultConfig.excludePatterns || []),
        ...(config.excludePatterns || []),
      ],
    } as AnalysisConfig;
  }

  /**
   * Load configuration from a file
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content) as AnalysisConfig;
      await this.setConfig(config);
    } catch (error) {
      this.logger.error('Failed to load configuration from file', error as Error);
      throw error;
    }
  }

  /**
   * Save configuration to a file
   */
  async saveToFile(filePath: string): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save');
    }

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, JSON.stringify(this.config, null, 2));
      this.logger.info('Configuration saved to file', { filePath });
    } catch (error) {
      this.logger.error('Failed to save configuration to file', error as Error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = null;
    this.logger.info('Configuration reset');
  }

  /**
   * Get default configuration
   */
  getDefaults(): Partial<AnalysisConfig> {
    return { ...this.defaultConfig };
  }

  /**
   * Validate a single configuration field
   */
  validateField<K extends keyof AnalysisConfig>(
    field: K,
    value: AnalysisConfig[K]
  ): ValidationResult {
    const tempConfig = { ...this.getDefaults(), [field]: value } as AnalysisConfig;
    return this.validate(tempConfig);
  }
}