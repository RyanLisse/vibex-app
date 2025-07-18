import { vi } from 'vitest'

// Helper to create a properly typed mock channel instance
export const createMockChannelInstance = () => ({
  name: 'test-channel',
  status: vi.fn().mockReturnValue({ type: 'status', data: {} }),
  update: vi.fn().mockReturnValue({ type: 'update', data: {} }),
  control: vi.fn().mockReturnValue({ type: 'control', data: {} }),
})

// Helper to create mock step object
export const createMockStep = () => ({
  run: vi.fn().mockImplementation(async (name: string, callback: () => Promise<any>) => {
    // Execute callback immediately without delays
    return await callback()
  }),
  sleep: vi.fn().mockResolvedValue(undefined),
  invoke: vi.fn().mockResolvedValue(undefined),
  waitForEvent: vi.fn().mockResolvedValue(undefined),
})

// Helper to create mock publish function
export const createMockPublish = () => 
  vi.fn().mockImplementation(async () => Promise.resolve())

// Helper to reset all Inngest mocks
export const resetInngestMocks = async () => {
  vi.clearAllMocks()
  
  // Re-mock the inngest module to ensure fresh state
  const { inngest, taskControl, createTask } = await vi.importMock('@/lib/inngest')
  
  vi.mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] })
  vi.mocked(taskControl.handler).mockResolvedValue({ success: true })
  vi.mocked(createTask.handler).mockResolvedValue({ message: [] })
}

// Helper to mock streaming behavior without setTimeout
export const mockStreamingResponse = (callbacks?: { onUpdate?: (message: string) => void }) => {
  if (callbacks?.onUpdate) {
    // Execute all streaming chunks immediately in tests
    const chunks = [
      JSON.stringify({
        type: 'message',
        role: 'assistant',
        data: { text: 'Test response chunk 1', id: 'test-id', isStreaming: true }
      }),
      JSON.stringify({
        type: 'message',
        role: 'assistant',
        data: { text: 'Test response chunk 1 chunk 2', id: 'test-id', isStreaming: true }
      }),
      JSON.stringify({
        type: 'message',
        role: 'assistant',
        data: { text: 'Test response chunk 1 chunk 2 complete', id: 'test-id', isStreaming: false }
      })
    ]
    
    // Execute all chunks immediately
    chunks.forEach(chunk => callbacks.onUpdate(chunk))
  }
  
  return Promise.resolve({
    stdout: JSON.stringify({ result: 'success' }),
    sandboxId: 'test-sandbox-id',
  })
}