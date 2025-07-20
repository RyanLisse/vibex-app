// Browser-safe logger that doesn't depend on Node.js APIs
export interface Logger {
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  child: (meta?: any) => Logger
  startTimer: () => { done: () => void }
  profile: (id: string) => void
}

export function createBrowserLogger(component: string): Logger {
  const prefix = `[${component}]`

  return {
    debug: (...args: any[]) => console.debug(prefix, ...args),
    info: (...args: any[]) => console.info(prefix, ...args),
    warn: (...args: any[]) => console.warn(prefix, ...args),
    error: (...args: any[]) => console.error(prefix, ...args),
    child: (meta?: any) => createBrowserLogger(`${component}:${meta?.name || 'child'}`),
    startTimer: () => ({ done: () => {} }),
    profile: (id: string) => console.debug(`${prefix} Profile:`, id),
  }
}

// Export a default logger instance
export const defaultLogger = createBrowserLogger('app')
