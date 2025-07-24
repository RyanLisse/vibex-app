import { defineConfig, devices } from '@playwright/test';

/**
 * Consolidated E2E Testing Configuration
 *
 * Supports both standard Playwright tests and AI-powered Stagehand tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Test execution settings optimized for both Playwright and Stagehand */
  fullyParallel: !process.env.STAGEHAND_DEBUG, // Disable parallel for Stagehand debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : (process.env.STAGEHAND_DEBUG ? 1 : undefined),

  /* Enhanced timeout settings for AI-powered tests */
  timeout: process.env.STAGEHAND_DEBUG ? 120000 : 30000, // 2 minutes for Stagehand tests
  expect: {
    timeout: process.env.STAGEHAND_DEBUG ? 15000 : 5000,
  },

  /* Reporter configuration with better debugging support */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.STAGEHAND_DEBUG ? [['line']] : [])
  ],

  /* Enhanced settings for both standard and AI-powered tests */
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.STAGEHAND_DEBUG ? 'retain-on-failure' : 'off',

    /* Extended timeouts for AI operations */
    actionTimeout: process.env.STAGEHAND_DEBUG ? 30000 : 10000,
    navigationTimeout: process.env.STAGEHAND_DEBUG ? 60000 : 30000,
  },

  /* Configure projects for both standard and AI-powered tests */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enhanced settings for Stagehand compatibility
        launchOptions: {
          args: process.env.STAGEHAND_DEBUG ? [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox'
          ] : []
        }
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox optimizations for AI testing
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // WebKit settings for better AI test compatibility
      },
    },

    // Dedicated project for AI-powered Stagehand tests
    {
      name: 'stagehand-ai',
      testMatch: ['**/ai-powered-*.spec.ts', '**/visual-regression-*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-dev-shm-usage'
          ]
        }
      },
    },
  ],

  /* Enhanced web server configuration for both test types */
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Extended timeout for AI tests
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Global setup for enhanced E2E testing */
  globalSetup: require.resolve('./tests/e2e/setup/global-setup.ts'),
});