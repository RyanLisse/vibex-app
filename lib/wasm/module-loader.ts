/**
 * WASM Module Loader
 *
 * Manages the loading, caching, and initialization of WebAssembly modules
 * with progressive enhancement and error handling.
 */

import { observability } from '../observability'
import { wasmDetector } from './detection'
import { wasmPerformanceTracker } from './performance-tracker'

export interface WASMModuleConfig {
  url?: string
  bytes?: Uint8Array
  imports?: WebAssembly.Imports
  streaming?: boolean
  cache?: boolean
  fallbackUrl?: string
  timeout?: number
  retries?: number
}

export interface LoadedModule {
  module: WebAssembly.Module
  instance: WebAssembly.Instance
  exports: any
  memory?: WebAssembly.Memory
  loadTime: number
  size: number
  version?: string
}

export interface ModuleLoadProgress {
  phase: 'downloading' | 'compiling' | 'instantiating' | 'ready'
  progress: number
  bytesLoaded?: number
  totalBytes?: number
}

/**
 * WASM Module Loader with caching and progressive loading
 */
export class WASMModuleLoader {
  private static instance: WASMModuleLoader
  private moduleCache: Map<string, LoadedModule> = new Map()
  private loadingPromises: Map<string, Promise<LoadedModule>> = new Map()
  private compiledModules: Map<string, WebAssembly.Module> = new Map()

  static getInstance(): WASMModuleLoader {
    if (!WASMModuleLoader.instance) {
      WASMModuleLoader.instance = new WASMModuleLoader()
    }
    return WASMModuleLoader.instance
  }

  /**
   * Load a WASM module with caching and error handling
   */
  async loadModule(
    moduleId: string,
    config: WASMModuleConfig,
    onProgress?: (progress: ModuleLoadProgress) => void
  ): Promise<LoadedModule> {
    // Check cache first
    if (config.cache !== false && this.moduleCache.has(moduleId)) {
      return this.moduleCache.get(moduleId)!
    }

    // Check if already loading
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId)!
    }

    // Start loading
    const loadingPromise = this.loadModuleInternal(moduleId, config, onProgress)
    this.loadingPromises.set(moduleId, loadingPromise)

    try {
      const module = await loadingPromise
      this.loadingPromises.delete(moduleId)
      return module
    } catch (error) {
      this.loadingPromises.delete(moduleId)
      throw error
    }
  }

  /**
   * Internal module loading implementation
   */
  private async loadModuleInternal(
    moduleId: string,
    config: WASMModuleConfig,
    onProgress?: (progress: ModuleLoadProgress) => void
  ): Promise<LoadedModule> {
    return observability.trackOperation(`wasm.module.load.${moduleId}`, async () => {
      const startTime = performance.now()
      let moduleBytes: ArrayBuffer
      let wasmModule: WebAssembly.Module
      let size = 0

      try {
        // Phase 1: Download or use provided bytes
        onProgress?.({ phase: 'downloading', progress: 0 })

        if (config.bytes) {
          moduleBytes = config.bytes.buffer
          size = config.bytes.length
        } else if (config.url) {
          moduleBytes = await this.downloadModule(config.url, config, (loaded, total) => {
            onProgress?.({
              phase: 'downloading',
              progress: (loaded / total) * 33,
              bytesLoaded: loaded,
              totalBytes: total,
            })
          })
          size = moduleBytes.byteLength
        } else {
          throw new Error('No module source provided')
        }

        // Phase 2: Compile
        onProgress?.({ phase: 'compiling', progress: 33 })

        if (config.streaming && config.url && WebAssembly.compileStreaming) {
          // Use streaming compilation for better performance
          const response = await fetch(config.url)
          wasmModule = await WebAssembly.compileStreaming(response)
        } else {
          wasmModule = await WebAssembly.compile(moduleBytes)
        }

        onProgress?.({ phase: 'compiling', progress: 66 })

        // Cache compiled module
        this.compiledModules.set(moduleId, wasmModule)

        // Phase 3: Instantiate
        onProgress?.({ phase: 'instantiating', progress: 66 })

        const wasmInstance = await WebAssembly.instantiate(wasmModule, config.imports || {})

        onProgress?.({ phase: 'instantiating', progress: 90 })

        // Extract memory if available
        let memory: WebAssembly.Memory | undefined
        if (wasmInstance.exports.memory instanceof WebAssembly.Memory) {
          memory = wasmInstance.exports.memory
        }

        const loadTime = performance.now() - startTime
        const loadedModule: LoadedModule = {
          module: wasmModule,
          instance: wasmInstance,
          exports: wasmInstance.exports,
          memory,
          loadTime,
          size,
          version: this.extractVersion(wasmInstance.exports),
        }

        // Cache the loaded module
        if (config.cache !== false) {
          this.moduleCache.set(moduleId, loadedModule)
        }

        onProgress?.({ phase: 'ready', progress: 100 })

        // Track successful load
        observability.recordEvent('wasm.module.loaded', {
          moduleId,
          loadTime,
          size,
          streaming: config.streaming,
          cached: false,
        })

        return loadedModule
      } catch (error) {
        // Try fallback URL if provided
        if (config.fallbackUrl && config.url) {
          console.warn(`Failed to load WASM from ${config.url}, trying fallback`, error)
          return this.loadModuleInternal(
            moduleId,
            { ...config, url: config.fallbackUrl, fallbackUrl: undefined },
            onProgress
          )
        }

        observability.recordEvent('wasm.module.load_failed', {
          moduleId,
          error: (error as Error).message,
        })

        throw error
      }
    })
  }

  /**
   * Download module with progress tracking and retries
   */
  private async downloadModule(
    url: string,
    config: WASMModuleConfig,
    onProgress: (loaded: number, total: number) => void
  ): Promise<ArrayBuffer> {
    const timeout = config.timeout || 30_000
    const retries = config.retries || 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentLength = response.headers.get('content-length')
        const total = contentLength ? parseInt(contentLength, 10) : 0

        if (!response.body) {
          return response.arrayBuffer()
        }

        // Stream with progress
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let loaded = 0

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          chunks.push(value)
          loaded += value.length
          onProgress(loaded, total)
        }

        // Combine chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const result = new Uint8Array(totalLength)
        let position = 0

        for (const chunk of chunks) {
          result.set(chunk, position)
          position += chunk.length
        }

        return result.buffer
      } catch (error) {
        lastError = error as Error

        if (attempt < retries - 1) {
          console.warn(`Download attempt ${attempt + 1} failed, retrying...`, error)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    throw lastError || new Error('Download failed')
  }

  /**
   * Preload multiple modules in parallel
   */
  async preloadModules(
    modules: Array<{ id: string; config: WASMModuleConfig }>,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Map<string, LoadedModule>> {
    const total = modules.length
    let loaded = 0
    const results = new Map<string, LoadedModule>()

    await Promise.all(
      modules.map(async ({ id, config }) => {
        try {
          const module = await this.loadModule(id, config)
          results.set(id, module)
          loaded++
          onProgress?.(loaded, total)
        } catch (error) {
          console.error(`Failed to preload module ${id}:`, error)
        }
      })
    )

    return results
  }

  /**
   * Create a specialized instance with custom imports
   */
  async createInstance(
    moduleId: string,
    imports: WebAssembly.Imports
  ): Promise<WebAssembly.Instance> {
    const cachedModule = this.compiledModules.get(moduleId)

    if (!cachedModule) {
      throw new Error(`Module ${moduleId} not loaded`)
    }

    return WebAssembly.instantiate(cachedModule, imports)
  }

  /**
   * Get module exports with type safety
   */
  getExports<T = any>(moduleId: string): T | null {
    const module = this.moduleCache.get(moduleId)
    return module ? (module.exports as T) : null
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(moduleId: string): boolean {
    return this.moduleCache.has(moduleId)
  }

  /**
   * Get module information
   */
  getModuleInfo(moduleId: string): {
    loaded: boolean
    size?: number
    loadTime?: number
    version?: string
    memoryPages?: number
  } | null {
    const module = this.moduleCache.get(moduleId)

    if (!module) {
      return { loaded: false }
    }

    return {
      loaded: true,
      size: module.size,
      loadTime: module.loadTime,
      version: module.version,
      memoryPages: module.memory ? module.memory.buffer.byteLength / 65536 : undefined,
    }
  }

  /**
   * Validate WASM module exports
   */
  validateExports(
    moduleId: string,
    requiredExports: string[]
  ): { valid: boolean; missing: string[] } {
    const module = this.moduleCache.get(moduleId)

    if (!module) {
      return { valid: false, missing: requiredExports }
    }

    const missing = requiredExports.filter((name) => !(name in module.exports))

    return {
      valid: missing.length === 0,
      missing,
    }
  }

  /**
   * Extract version from module exports if available
   */
  private extractVersion(exports: any): string | undefined {
    if (typeof exports.get_version === 'function') {
      try {
        return exports.get_version()
      } catch {
        // Ignore errors
      }
    }

    if (typeof exports.version === 'number') {
      return exports.version.toString()
    }

    return undefined
  }

  /**
   * Get loader statistics
   */
  getStats(): {
    loadedModules: number
    totalSize: number
    averageLoadTime: number
    cachedModules: string[]
  } {
    const modules = Array.from(this.moduleCache.values())

    return {
      loadedModules: modules.length,
      totalSize: modules.reduce((sum, m) => sum + m.size, 0),
      averageLoadTime:
        modules.length > 0 ? modules.reduce((sum, m) => sum + m.loadTime, 0) / modules.length : 0,
      cachedModules: Array.from(this.moduleCache.keys()),
    }
  }

  /**
   * Clear module cache
   */
  clearCache(moduleId?: string): void {
    if (moduleId) {
      this.moduleCache.delete(moduleId)
      this.compiledModules.delete(moduleId)
    } else {
      this.moduleCache.clear()
      this.compiledModules.clear()
    }
  }

  /**
   * Unload a module and free memory
   */
  unloadModule(moduleId: string): void {
    const module = this.moduleCache.get(moduleId)

    if (module && module.memory) {
      // Clear memory contents for security
      try {
        const uint8Array = new Uint8Array(module.memory.buffer)
        uint8Array.fill(0)
      } catch (error) {
        console.warn('Failed to clear module memory:', error)
      }
    }

    this.moduleCache.delete(moduleId)
    this.compiledModules.delete(moduleId)

    observability.recordEvent('wasm.module.unloaded', { moduleId })
  }
}

// Export singleton instance
export const moduleLoader = WASMModuleLoader.getInstance()

// Utility functions
export const loadWASMModule = (
  moduleId: string,
  config: WASMModuleConfig,
  onProgress?: (progress: ModuleLoadProgress) => void
) => moduleLoader.loadModule(moduleId, config, onProgress)

export const preloadWASMModules = (modules: Array<{ id: string; config: WASMModuleConfig }>) =>
  moduleLoader.preloadModules(modules)

export const getWASMExports = <T = any>(moduleId: string): T | null =>
  moduleLoader.getExports<T>(moduleId)
