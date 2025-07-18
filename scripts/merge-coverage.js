#!/usr/bin/env node

/**
 * Coverage Merge Script
 * Combines coverage reports from different test runners into a unified report
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Import coverage configuration
const coverageConfig = require('../coverage.config.js')

class CoverageMerger {
  constructor() {
    this.reportPaths = []
    this.mergedCoverage = {}
    this.errors = []
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = {
      info: '📊',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    }[level]
    
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  async findCoverageReports() {
    const potentialPaths = [
      './coverage/bun-logic/coverage-final.json',
      './coverage/vitest-components/coverage-final.json', 
      './coverage/vitest-integration/coverage-final.json'
    ]

    for (const reportPath of potentialPaths) {
      if (fs.existsSync(reportPath)) {
        this.reportPaths.push(reportPath)
        this.log(`Found coverage report: ${reportPath}`)
      } else {
        this.log(`Coverage report not found: ${reportPath}`, 'warn')
      }
    }

    if (this.reportPaths.length === 0) {
      throw new Error('No coverage reports found to merge')
    }
  }

  async loadCoverageData() {
    const coverageData = []

    for (const reportPath of this.reportPaths) {
      try {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
        coverageData.push({
          path: reportPath,
          data: data
        })
        this.log(`Loaded coverage data from: ${reportPath}`)
      } catch (error) {
        this.log(`Error loading ${reportPath}: ${error.message}`, 'error')
        this.errors.push(`Failed to load ${reportPath}: ${error.message}`)
      }
    }

    return coverageData
  }

  mergeCoverageData(coverageData) {
    this.log('Merging coverage data...')
    
    const merged = {}
    const fileCoverageMap = new Map()

    // Process each coverage report
    for (const { path: reportPath, data } of coverageData) {
      const reportType = this.getReportType(reportPath)
      
      if (data && typeof data === 'object') {
        // Handle Istanbul format
        if (data.total || Object.keys(data).some(key => data[key] && data[key].lines)) {
          this.mergeIstanbulFormat(data, merged, fileCoverageMap, reportType)
        }
        // Handle V8 format
        else if (data.result && Array.isArray(data.result)) {
          this.mergeV8Format(data, merged, fileCoverageMap, reportType)
        }
        // Handle other formats
        else {
          this.log(`Unknown coverage format in ${reportPath}`, 'warn')
        }
      }
    }

    // Generate summary
    this.generateSummary(merged)
    return merged
  }

  getReportType(reportPath) {
    if (reportPath.includes('bun-logic')) return 'logic'
    if (reportPath.includes('vitest-components')) return 'components'
    if (reportPath.includes('vitest-integration')) return 'integration'
    return 'unknown'
  }

  mergeIstanbulFormat(data, merged, fileCoverageMap, reportType) {
    // Handle file-level coverage
    for (const [filePath, fileData] of Object.entries(data)) {
      if (filePath === 'total' || !fileData || typeof fileData !== 'object') continue

      const normalizedPath = path.normalize(filePath)
      
      if (!merged[normalizedPath]) {
        merged[normalizedPath] = {
          path: normalizedPath,
          lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
          functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
          statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
          branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
          sources: []
        }
      }

      // Merge metrics based on strategy
      this.mergeMetrics(merged[normalizedPath], fileData, reportType)
      merged[normalizedPath].sources.push(reportType)
    }
  }

  mergeV8Format(data, merged, fileCoverageMap, reportType) {
    // Handle V8 coverage format
    for (const result of data.result) {
      if (!result.url || !result.url.startsWith('file://')) continue

      const filePath = result.url.replace('file://', '')
      const normalizedPath = path.normalize(filePath)

      if (!merged[normalizedPath]) {
        merged[normalizedPath] = {
          path: normalizedPath,
          lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
          functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
          statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
          branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
          sources: []
        }
      }

      // Convert V8 format to Istanbul-like format
      const istanbulData = this.convertV8ToIstanbul(result)
      this.mergeMetrics(merged[normalizedPath], istanbulData, reportType)
      merged[normalizedPath].sources.push(reportType)
    }
  }

  convertV8ToIstanbul(v8Data) {
    // Convert V8 coverage to Istanbul format
    const lines = { total: 0, covered: 0, skipped: 0, pct: 0 }
    const functions = { total: 0, covered: 0, skipped: 0, pct: 0 }
    const statements = { total: 0, covered: 0, skipped: 0, pct: 0 }
    const branches = { total: 0, covered: 0, skipped: 0, pct: 0 }

    // Process V8 functions
    if (v8Data.functions) {
      for (const func of v8Data.functions) {
        functions.total++
        if (func.ranges && func.ranges.some(r => r.count > 0)) {
          functions.covered++
        }
      }
      functions.pct = functions.total > 0 ? (functions.covered / functions.total) * 100 : 0
    }

    // Process V8 ranges for statements/lines
    if (v8Data.ranges) {
      for (const range of v8Data.ranges) {
        statements.total++
        if (range.count > 0) {
          statements.covered++
        }
      }
      statements.pct = statements.total > 0 ? (statements.covered / statements.total) * 100 : 0
    }

    // Copy statements to lines (simplified)
    lines.total = statements.total
    lines.covered = statements.covered
    lines.pct = statements.pct

    return { lines, functions, statements, branches }
  }

  mergeMetrics(target, source, reportType) {
    const strategy = coverageConfig.merge.conflictResolution || 'highest'
    
    for (const metric of ['lines', 'functions', 'statements', 'branches']) {
      if (source[metric] && typeof source[metric] === 'object') {
        const sourceData = source[metric]
        const targetData = target[metric]

        if (strategy === 'highest') {
          targetData.total = Math.max(targetData.total, sourceData.total || 0)
          targetData.covered = Math.max(targetData.covered, sourceData.covered || 0)
          targetData.pct = Math.max(targetData.pct, sourceData.pct || 0)
        } else if (strategy === 'union') {
          targetData.total += sourceData.total || 0
          targetData.covered += sourceData.covered || 0
          targetData.pct = targetData.total > 0 ? (targetData.covered / targetData.total) * 100 : 0
        } else if (strategy === 'average') {
          const sources = target.sources.length + 1
          targetData.total = Math.round((targetData.total + (sourceData.total || 0)) / sources)
          targetData.covered = Math.round((targetData.covered + (sourceData.covered || 0)) / sources)
          targetData.pct = (targetData.pct + (sourceData.pct || 0)) / sources
        }
      }
    }
  }

  generateSummary(merged) {
    const summary = {
      total: 0,
      covered: 0,
      files: Object.keys(merged).length,
      lines: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 }
    }

    for (const fileData of Object.values(merged)) {
      for (const metric of ['lines', 'functions', 'statements', 'branches']) {
        if (fileData[metric]) {
          summary[metric].total += fileData[metric].total || 0
          summary[metric].covered += fileData[metric].covered || 0
        }
      }
    }

    // Calculate percentages
    for (const metric of ['lines', 'functions', 'statements', 'branches']) {
      if (summary[metric].total > 0) {
        summary[metric].pct = (summary[metric].covered / summary[metric].total) * 100
      }
    }

    merged.total = summary
    return summary
  }

  async generateReports(mergedData) {
    const outputDir = coverageConfig.merged.outputDir
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Generate JSON report
    const jsonPath = path.join(outputDir, 'coverage-final.json')
    fs.writeFileSync(jsonPath, JSON.stringify(mergedData, null, 2))
    this.log(`Generated JSON report: ${jsonPath}`)

    // Generate summary report
    const summaryPath = coverageConfig.merged.summaryFile
    const summary = {
      timestamp: new Date().toISOString(),
      summary: mergedData.total,
      files: Object.keys(mergedData).filter(k => k !== 'total').length,
      sources: this.reportPaths,
      thresholds: coverageConfig.merged.thresholds,
      passed: this.checkThresholds(mergedData.total)
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
    this.log(`Generated summary report: ${summaryPath}`)

    // Generate HTML report if possible
    try {
      await this.generateHtmlReport(outputDir, mergedData)
    } catch (error) {
      this.log(`Could not generate HTML report: ${error.message}`, 'warn')
    }

    // Generate LCOV report
    try {
      await this.generateLcovReport(outputDir, mergedData)
    } catch (error) {
      this.log(`Could not generate LCOV report: ${error.message}`, 'warn')
    }
  }

  async generateHtmlReport(outputDir, mergedData) {
    // Generate a simple HTML report
    const htmlContent = this.generateHtmlContent(mergedData)
    const htmlPath = path.join(outputDir, 'index.html')
    
    fs.writeFileSync(htmlPath, htmlContent)
    this.log(`Generated HTML report: ${htmlPath}`)
  }

  generateHtmlContent(mergedData) {
    const summary = mergedData.total
    const files = Object.entries(mergedData).filter(([key]) => key !== 'total')

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Report - CodeX Clone</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .high { background-color: #d4edda; }
        .medium { background-color: #fff3cd; }
        .low { background-color: #f8d7da; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .pct { text-align: right; }
    </style>
</head>
<body>
    <h1>📊 Coverage Report - CodeX Clone</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric ${this.getCoverageClass(summary.lines.pct)}">
            <strong>Lines:</strong> ${summary.lines.pct.toFixed(1)}% (${summary.lines.covered}/${summary.lines.total})
        </div>
        <div class="metric ${this.getCoverageClass(summary.functions.pct)}">
            <strong>Functions:</strong> ${summary.functions.pct.toFixed(1)}% (${summary.functions.covered}/${summary.functions.total})
        </div>
        <div class="metric ${this.getCoverageClass(summary.statements.pct)}">
            <strong>Statements:</strong> ${summary.statements.pct.toFixed(1)}% (${summary.statements.covered}/${summary.statements.total})
        </div>
        <div class="metric ${this.getCoverageClass(summary.branches.pct)}">
            <strong>Branches:</strong> ${summary.branches.pct.toFixed(1)}% (${summary.branches.covered}/${summary.branches.total})
        </div>
    </div>

    <h2>Files</h2>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Lines</th>
                <th>Functions</th>
                <th>Statements</th>
                <th>Branches</th>
                <th>Sources</th>
            </tr>
        </thead>
        <tbody>
            ${files.map(([filePath, data]) => `
                <tr>
                    <td>${filePath}</td>
                    <td class="pct ${this.getCoverageClass(data.lines.pct)}">${data.lines.pct.toFixed(1)}%</td>
                    <td class="pct ${this.getCoverageClass(data.functions.pct)}">${data.functions.pct.toFixed(1)}%</td>
                    <td class="pct ${this.getCoverageClass(data.statements.pct)}">${data.statements.pct.toFixed(1)}%</td>
                    <td class="pct ${this.getCoverageClass(data.branches.pct)}">${data.branches.pct.toFixed(1)}%</td>
                    <td>${data.sources.join(', ')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Sources: ${this.reportPaths.join(', ')}</p>
    </footer>
</body>
</html>
    `
  }

  getCoverageClass(pct) {
    if (pct >= 80) return 'high'
    if (pct >= 60) return 'medium'
    return 'low'
  }

  async generateLcovReport(outputDir, mergedData) {
    const lcovPath = path.join(outputDir, 'lcov.info')
    let lcovContent = ''

    const files = Object.entries(mergedData).filter(([key]) => key !== 'total')
    
    for (const [filePath, data] of files) {
      lcovContent += `TN:\n`
      lcovContent += `SF:${filePath}\n`
      
      // Functions
      if (data.functions) {
        lcovContent += `FNF:${data.functions.total}\n`
        lcovContent += `FNH:${data.functions.covered}\n`
      }
      
      // Lines
      if (data.lines) {
        lcovContent += `LF:${data.lines.total}\n`
        lcovContent += `LH:${data.lines.covered}\n`
      }
      
      // Branches
      if (data.branches) {
        lcovContent += `BRF:${data.branches.total}\n`
        lcovContent += `BRH:${data.branches.covered}\n`
      }
      
      lcovContent += `end_of_record\n`
    }

    fs.writeFileSync(lcovPath, lcovContent)
    this.log(`Generated LCOV report: ${lcovPath}`)
  }

  checkThresholds(summary) {
    const thresholds = coverageConfig.merged.thresholds.global
    const results = {}

    for (const [metric, threshold] of Object.entries(thresholds)) {
      if (summary[metric] && summary[metric].pct !== undefined) {
        results[metric] = {
          actual: summary[metric].pct,
          threshold: threshold,
          passed: summary[metric].pct >= threshold
        }
      }
    }

    return results
  }

  async run() {
    try {
      this.log('Starting coverage merge process...')
      
      await this.findCoverageReports()
      const coverageData = await this.loadCoverageData()
      const mergedData = this.mergeCoverageData(coverageData)
      await this.generateReports(mergedData)
      
      // Check thresholds
      const thresholdResults = this.checkThresholds(mergedData.total)
      const allPassed = Object.values(thresholdResults).every(r => r.passed)
      
      this.log('Coverage merge completed!', 'success')
      this.log(`Files merged: ${Object.keys(mergedData).length - 1}`)
      this.log(`Overall coverage: ${mergedData.total.lines.pct.toFixed(1)}%`)
      
      if (allPassed) {
        this.log('All coverage thresholds met!', 'success')
      } else {
        this.log('Some coverage thresholds not met:', 'warn')
        for (const [metric, result] of Object.entries(thresholdResults)) {
          if (!result.passed) {
            this.log(`  ${metric}: ${result.actual.toFixed(1)}% < ${result.threshold}%`, 'warn')
          }
        }
      }

      if (this.errors.length > 0) {
        this.log('Errors encountered:', 'warn')
        this.errors.forEach(error => this.log(`  ${error}`, 'warn'))
      }

      return allPassed ? 0 : 1
      
    } catch (error) {
      this.log(`Coverage merge failed: ${error.message}`, 'error')
      console.error(error)
      return 1
    }
  }
}

// Run if called directly
if (require.main === module) {
  const merger = new CoverageMerger()
  merger.run().then(exitCode => process.exit(exitCode))
}

module.exports = CoverageMerger