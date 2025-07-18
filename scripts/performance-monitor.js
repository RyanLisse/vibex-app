#!/usr/bin/env node

const { performance } = require('node:perf_hooks')
const fs = require('node:fs')
const path = require('node:path')

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      timestamp: Date.now(),
      buildTime: 0,
      bundleSize: {},
      memoryUsage: {},
      loadTimes: {},
      vitals: {},
    }
  }

  async measureBuildTime() {
    const start = performance.now()

    try {
      const { exec } = require('node:child_process')
      await new Promise((resolve, reject) => {
        exec('npm run build', (error, stdout, _stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve(stdout)
          }
        })
      })

      this.metrics.buildTime = performance.now() - start
    } catch (_error) {
      this.metrics.buildTime = -1
    }
  }

  async analyzeBundleSize() {
    const buildDir = path.join(process.cwd(), '.next/static')

    if (!fs.existsSync(buildDir)) {
      return
    }

    const getDirectorySize = (dir) => {
      let totalSize = 0
      const files = fs.readdirSync(dir)

      files.forEach((file) => {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
          totalSize += getDirectorySize(filePath)
        } else {
          totalSize += stat.size
        }
      })

      return totalSize
    }

    this.metrics.bundleSize = {
      total: getDirectorySize(buildDir),
      js: getDirectorySize(path.join(buildDir, 'chunks')),
      css: getDirectorySize(path.join(buildDir, 'css')),
      media: getDirectorySize(path.join(buildDir, 'media')),
    }
  }

  measureMemoryUsage() {
    const usage = process.memoryUsage()
    this.metrics.memoryUsage = {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
    }
  }

  async measureLoadTimes() {
    const puppeteer = require('puppeteer')

    try {
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()

      // Measure page load performance
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' })

      const performanceMetrics = await page.evaluate(() => {
        return {
          domContentLoaded:
            performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
          firstPaint: performance
            .getEntriesByType('paint')
            .find((entry) => entry.name === 'first-paint')?.startTime,
          firstContentfulPaint: performance
            .getEntriesByType('paint')
            .find((entry) => entry.name === 'first-contentful-paint')?.startTime,
          largestContentfulPaint: performance.getEntriesByType('largest-contentful-paint')[0]
            ?.startTime,
        }
      })

      this.metrics.loadTimes = performanceMetrics

      await browser.close()
    } catch (_error) {}
  }

  identifyBottlenecks() {
    const bottlenecks = []

    // Check build time
    if (this.metrics.buildTime > 60_000) {
      bottlenecks.push({
        type: 'build',
        severity: 'high',
        issue: 'Build time exceeds 60 seconds',
        suggestion: 'Consider code splitting and bundle optimization',
      })
    }

    // Check bundle size
    if (this.metrics.bundleSize.total > 5 * 1024 * 1024) {
      bottlenecks.push({
        type: 'bundle',
        severity: 'high',
        issue: 'Bundle size exceeds 5MB',
        suggestion: 'Implement code splitting and lazy loading',
      })
    }

    // Check memory usage
    if (this.metrics.memoryUsage.heapUsed > 100 * 1024 * 1024) {
      bottlenecks.push({
        type: 'memory',
        severity: 'medium',
        issue: 'High memory usage detected',
        suggestion: 'Check for memory leaks and optimize data structures',
      })
    }

    // Check load times
    if (this.metrics.loadTimes.loadComplete > 3000) {
      bottlenecks.push({
        type: 'load',
        severity: 'high',
        issue: 'Page load time exceeds 3 seconds',
        suggestion: 'Optimize images, implement caching, and reduce bundle size',
      })
    }

    return bottlenecks
  }

  generateReport() {
    const bottlenecks = this.identifyBottlenecks()

    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      bottlenecks,
      recommendations: this.generateRecommendations(bottlenecks),
    }

    // Save report to file
    const reportPath = path.join(process.cwd(), 'performance-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    if (bottlenecks.length > 0) {
      bottlenecks.forEach((_bottleneck, _index) => {})
    } else {
    }

    return report
  }

  generateRecommendations(bottlenecks) {
    const recommendations = []

    const bundleBottlenecks = bottlenecks.filter((b) => b.type === 'bundle')
    if (bundleBottlenecks.length > 0) {
      recommendations.push({
        category: 'Bundle Optimization',
        actions: [
          'Implement dynamic imports for route-based code splitting',
          'Use next/dynamic for component-level code splitting',
          'Analyze bundle with webpack-bundle-analyzer',
          'Remove unused dependencies and code',
        ],
      })
    }

    const loadBottlenecks = bottlenecks.filter((b) => b.type === 'load')
    if (loadBottlenecks.length > 0) {
      recommendations.push({
        category: 'Load Performance',
        actions: [
          'Implement image optimization with next/image',
          'Add service worker for caching',
          'Optimize font loading strategies',
          'Implement preloading for critical resources',
        ],
      })
    }

    return recommendations
  }

  async run() {
    this.measureMemoryUsage()
    await this.measureBuildTime()
    await this.analyzeBundleSize()
    await this.measureLoadTimes()

    const report = this.generateReport()
    return report
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor()
  monitor.run().catch(console.error)
}

module.exports = PerformanceMonitor
