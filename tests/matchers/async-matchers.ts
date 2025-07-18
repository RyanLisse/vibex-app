// Async matchers for testing

export const asyncMatchers = {
  toResolve: async (received: Promise<any>) => {
    try {
      await received
      return {
        pass: true,
        message: () => 'Expected promise to resolve',
      }
    } catch {
      return {
        pass: false,
        message: () => 'Expected promise to resolve but it rejected',
      }
    }
  },

  toReject: async (received: Promise<any>) => {
    try {
      await received
      return {
        pass: false,
        message: () => 'Expected promise to reject but it resolved',
      }
    } catch {
      return {
        pass: true,
        message: () => 'Expected promise to reject',
      }
    }
  },
}
