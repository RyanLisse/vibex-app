// Performance matchers for testing

export const performanceMatchers = {
  toCompleteWithinTime: async (received: () => Promise<any>, maxTime: number) => {
    const start = performance.now()
    try {
      await received()
      const duration = performance.now() - start
      const pass = duration <= maxTime

      return {
        pass,
        message: () => `Expected function to complete within ${maxTime}ms, but took ${duration}ms`,
      }
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `Expected function to complete within ${maxTime}ms, but threw an error: ${error}`,
      }
    }
  },

  toHaveMemoryUsage: (received: any, maxMemory: number) => {
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024
    const pass = memoryUsage <= maxMemory

    return {
      pass,
      message: () => `Expected memory usage to be under ${maxMemory}MB, but was ${memoryUsage}MB`,
    }
  },
}
