// Build-time logger that doesn't require any dependencies
export function createBuildLogger(component: string) {
  return {
    debug: (...args: any[]) => {
      if (process.env.DEBUG) {
        console.debug(`[${component}]`, ...args)
      }
    },
    info: (...args: any[]) => console.info(`[${component}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${component}]`, ...args),
    error: (...args: any[]) => console.error(`[${component}]`, ...args),
    child: () => createBuildLogger(component),
    startTimer: () => ({ done: () => {} }),
    profile: () => {},
  }
}
