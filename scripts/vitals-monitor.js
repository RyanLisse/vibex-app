#!/usr/bin/env node

const { getCLS, getFID, getFCP, getLCP, getTTFB } = require('web-vitals')
const fs = require('fs')
const path = require('path')

class VitalsMonitor {
  constructor() {
    this.vitals = {
      timestamp: Date.now(),
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
    }
  }

  async measureVitals() {
    const puppeteer = require('puppeteer')

    try {
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()

      // Inject web-vitals library
      await page.addScriptTag({
        url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js',
      })

      // Navigate to the page
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' })

      // Measure Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitalsData = {}
          let completedMetrics = 0
          const totalMetrics = 5

          const checkComplete = () => {
            completedMetrics++
            if (completedMetrics === totalMetrics) {
              resolve(vitalsData)
            }
          }

          // Cumulative Layout Shift
          webVitals.getCLS((metric) => {
            vitalsData.cls = metric.value
            checkComplete()
          })

          // First Input Delay
          webVitals.getFID((metric) => {
            vitalsData.fid = metric.value
            checkComplete()
          })

          // First Contentful Paint
          webVitals.getFCP((metric) => {
            vitalsData.fcp = metric.value
            checkComplete()
          })

          // Largest Contentful Paint
          webVitals.getLCP((metric) => {
            vitalsData.lcp = metric.value
            checkComplete()
          })

          // Time to First Byte
          webVitals.getTTFB((metric) => {
            vitalsData.ttfb = metric.value
            checkComplete()
          })

          // Fallback timeout
          setTimeout(() => {
            resolve(vitalsData)
          }, 10_000)
        })
      })

      this.vitals = { ...this.vitals, ...vitals }

      await browser.close()

      console.log('Core Web Vitals:')
      console.log(`  CLS (Cumulative Layout Shift): ${vitals.cls || 'N/A'}`)
      console.log(`  FID (First Input Delay): ${vitals.fid || 'N/A'}ms`)
      console.log(`  FCP (First Contentful Paint): ${vitals.fcp || 'N/A'}ms`)
      console.log(`  LCP (Largest Contentful Paint): ${vitals.lcp || 'N/A'}ms`)
      console.log(`  TTFB (Time to First Byte): ${vitals.ttfb || 'N/A'}ms`)
    } catch (error) {
      console.error('Vitals measurement failed:', error.message)
    }
  }

  evaluateVitals() {
    const thresholds = {
      cls: { good: 0.1, poor: 0.25 },
      fid: { good: 100, poor: 300 },
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      ttfb: { good: 800, poor: 1800 },
    }

    const results = {}

    Object.keys(thresholds).forEach((metric) => {
      const value = this.vitals[metric]
      const threshold = thresholds[metric]

      if (value === null || value === undefined) {
        results[metric] = { status: 'unknown', message: 'Unable to measure' }
        return
      }

      if (value <= threshold.good) {
        results[metric] = { status: 'good', message: 'Good performance' }
      } else if (value <= threshold.poor) {
        results[metric] = { status: 'needs-improvement', message: 'Needs improvement' }
      } else {
        results[metric] = { status: 'poor', message: 'Poor performance' }
      }
    })

    return results
  }

  generateVitalsReport() {
    const evaluation = this.evaluateVitals()

    const report = {
      timestamp: new Date().toISOString(),
      vitals: this.vitals,
      evaluation,
      score: this.calculateScore(evaluation),
      recommendations: this.generateRecommendations(evaluation),
    }

    // Save report to file
    const reportPath = path.join(process.cwd(), 'vitals-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    console.log('\\n=== Core Web Vitals Report ===')
    console.log(`Report saved to: ${reportPath}`)
    console.log(`Overall Score: ${report.score}/100`)

    // Display results
    Object.keys(evaluation).forEach((metric) => {
      const result = evaluation[metric]
      const icon =
        result.status === 'good' ? '✅' : result.status === 'needs-improvement' ? '⚠️' : '❌'
      console.log(`  ${icon} ${metric.toUpperCase()}: ${result.message}`)
    })

    if (report.recommendations.length > 0) {
      console.log('\\n💡 Recommendations:')
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`)
      })
    }

    return report
  }

  calculateScore(evaluation) {
    const weights = {
      cls: 15,
      fid: 10,
      fcp: 10,
      lcp: 25,
      ttfb: 40,
    }

    let totalScore = 0
    let totalWeight = 0

    Object.keys(evaluation).forEach((metric) => {
      const result = evaluation[metric]
      const weight = weights[metric]

      if (result.status === 'good') {
        totalScore += weight
      } else if (result.status === 'needs-improvement') {
        totalScore += weight * 0.6
      } else if (result.status === 'poor') {
        totalScore += weight * 0.2
      }

      totalWeight += weight
    })

    return Math.round((totalScore / totalWeight) * 100)
  }

  generateRecommendations(evaluation) {
    const recommendations = []

    Object.keys(evaluation).forEach((metric) => {
      const result = evaluation[metric]

      if (result.status === 'poor' || result.status === 'needs-improvement') {
        switch (metric) {
          case 'cls':
            recommendations.push(
              'Optimize layout stability: use CSS aspect-ratio, avoid dynamic content insertion above the fold'
            )
            break
          case 'fid':
            recommendations.push(
              'Reduce JavaScript execution time: code splitting, optimize event handlers, use Web Workers'
            )
            break
          case 'fcp':
            recommendations.push(
              'Optimize First Contentful Paint: reduce server response time, eliminate render-blocking resources'
            )
            break
          case 'lcp':
            recommendations.push(
              'Optimize Largest Contentful Paint: optimize images, preload key resources, reduce server response time'
            )
            break
          case 'ttfb':
            recommendations.push(
              'Optimize Time to First Byte: use CDN, optimize server-side rendering, implement caching'
            )
            break
        }
      }
    })

    return recommendations
  }

  async run() {
    console.log('📊 Starting Core Web Vitals Analysis...')

    await this.measureVitals()
    const report = this.generateVitalsReport()

    console.log('\\n✅ Web Vitals analysis complete!')
    return report
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new VitalsMonitor()
  monitor.run().catch(console.error)
}

module.exports = VitalsMonitor
