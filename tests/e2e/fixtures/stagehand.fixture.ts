import { test as base } from '@playwright/test'
import { Stagehand } from '@browserbasehq/stagehand'
import { Browserbase } from '@browserbasehq/sdk'

type StagehandFixtures = {
  stagehand: Stagehand
  browserbaseSession: {
    sessionId: string
    debugUrl: string
  }
}

export const test = base.extend<StagehandFixtures>({
  browserbaseSession: async ({}, use) => {
    const browserbase = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    })

    const session = await browserbase.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    })

    const debugUrl = await browserbase.sessions.debug(session.id)

    await use({
      sessionId: session.id,
      debugUrl: debugUrl.debuggerFullscreenUrl,
    })

    // Cleanup session after test
    await browserbase.sessions.retrieve(session.id).then(async (session) => {
      if (session.status === 'RUNNING') {
        // Session will auto-cleanup, but we can explicitly end it if needed
      }
    })
  },

  stagehand: async ({ browserbaseSession }, use) => {
    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey: process.env.BROWSERBASE_API_KEY!,
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      verbose: 1,
      logger: console.log,
      browserbaseSessionID: browserbaseSession.sessionId,
      disablePino: true,
      headless: process.env.CI === 'true',
      domSettleTimeoutMs: 30_000,
    })

    await stagehand.init()

    await use(stagehand)

    await stagehand.close()
  },
})

export { expect } from '@playwright/test'
