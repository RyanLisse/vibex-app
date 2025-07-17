export interface StreamingMessage {
  role: 'user' | 'assistant'
  type: string
  data: Record<string, unknown> & {
    text?: string
    isStreaming?: boolean
    streamId?: string
    chunkIndex?: number
    totalChunks?: number
  }
}

export interface IncomingMessage {
  role: 'user' | 'assistant'
  type: string
  data: Record<string, unknown> & {
    text?: string
    isStreaming?: boolean
    streamId?: string
    chunkIndex?: number
    totalChunks?: number
    call_id?: string
    action?: {
      command?: string[]
    }
    output?: string
  }
}