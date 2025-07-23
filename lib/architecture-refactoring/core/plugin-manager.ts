/**
 * Plugin Manager
 * Manages loading and execution of analysis plugins
 */

import { AnalysisPlugin, AnalysisType } from '../types';
import { CodeQualityAnalyzer } from '../analyzers/code-quality-analyzer';
import { DeadCodeDetector } from '../analyzers/dead-code-detector';
import { RedundancyDetector } from '../analyzers/redundancy-detector';
import { PerformanceAnalyzer } from '../analyzers/performance-analyzer';
import { ArchitectureAnalyzer } from '../analyzers/architecture-analyzer';
import { DependencyAnalyzer } from '../analyzers/dependency-analyzer';
import { DatabaseAnalyzer } from '../analyzers/database-analyzer';
import { Logger } from '../services/logger';

export class PluginManager {
  private plugins: Map<string, AnalysisPlugin> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PluginManager');
    this.registerBuiltinPlugins();
  }

  /**
   * Register built-in analysis plugins
   */
  private registerBuiltinPlugins(): void {
    this.registerPlugin('code-quality', new CodeQualityAnalyzer());
    this.registerPlugin('dead-code', new DeadCodeDetector());
    this.registerPlugin('redundancy', new RedundancyDetector());
    this.registerPlugin('performance', new PerformanceAnalyzer());
    this.registerPlugin('architecture', new ArchitectureAnalyzer());
    this.registerPlugin('dependency', new DependencyAnalyzer());
    this.registerPlugin('database', new DatabaseAnalyzer());
  }

  /**
   * Register a new plugin
   */
  registerPlugin(type: string, plugin: AnalysisPlugin): void {
    this.logger.info(`Registering plugin: ${plugin.name} (${type})`);
    this.plugins.set(type, plugin);
  }

  /**
   * Load a plugin by analysis type
   */
  async loadPlugin(type: AnalysisType | string): Promise<AnalysisPlugin | null> {
    const plugin = this.plugins.get(type);
    if (!plugin) {
      this.logger.warn(`Plugin not found for type: ${type}`);
      return null;
    }

    this.logger.info(`Loaded plugin: ${plugin.name}`);
    return plugin;
  }

  /**
   * Get all enabled plugins
   */
  async getEnabledPlugins(): Promise<AnalysisPlugin[]> {
    return Array.from(this.plugins.values());
  }

  /**
   * Execute plugins with the given context
   */
  async executePlugins(context: any): Promise<any[]> {
    const results = [];
    const plugins = await this.getEnabledPlugins();

    for (const plugin of plugins) {
      try {
        this.logger.info(`Executing plugin: ${plugin.name}`);
        const result = await plugin.analyze(context);
        results.push(result);
      } catch (error) {
        this.logger.error(`Plugin ${plugin.name} failed`, error as Error);
        // Continue with other plugins
      }
    }

    return results;
  }

  /**
   * Get plugin by name
   */
  getPluginByName(name: string): AnalysisPlugin | undefined {
    return Array.from(this.plugins.values()).find(plugin => plugin.name === name);
  }

  /**
   * List all available plugins
   */
  listAvailablePlugins(): { type: string; plugin: AnalysisPlugin }[] {
    return Array.from(this.plugins.entries()).map(([type, plugin]) => ({
      type,
      plugin,
    }));
  }

  /**
   * Validate all plugins
   */
  async validatePlugins(): Promise<boolean> {
    let allValid = true;

    for (const [type, plugin] of this.plugins.entries()) {
      try {
        const validation = await plugin.validate({});
        if (!validation.valid) {
          this.logger.error(`Plugin ${plugin.name} validation failed`, {
            errors: validation.errors,
          });
          allValid = false;
        }
      } catch (error) {
        this.logger.error(`Plugin ${plugin.name} validation error`, error as Error);
        allValid = false;
      }
    }

    return allValid;
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(type: string): boolean {
    const plugin = this.plugins.get(type);
    if (plugin) {
      this.logger.info(`Unregistering plugin: ${plugin.name}`);
      return this.plugins.delete(type);
    }
    return false;
  }

  /**
   * Clear all plugins
   */
  clearPlugins(): void {
    this.logger.info('Clearing all plugins');
    this.plugins.clear();
  }

  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(type: string): boolean {
    return this.plugins.has(type);
  }
}