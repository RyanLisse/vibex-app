/**
 * Enhanced TypeScript types for the audio chat system
 */

export interface AudioChatMessage {
  id: string
  type: 'text' | 'audio' | 'tool'
  content: string
  audioUrl?: string
  timestamp: Date
  isUser: boolean
  metadata?: {
    duration?: number
    size?: number
    mimeType?: string
    transcription?: string
  }
}

export interface AudioChatConnectionState {
  isConnected: boolean
  isLoading: boolean
  sessionId: string | null
  error: string | null
  lastConnectedAt?: Date
  reconnectAttempts: number
}

export interface AudioChatRecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  error: string | null
  audioUrl: string | null
}

export interface AudioChatPlaybackState {
  isPlaying: boolean
  currentMessageId: string | null
  currentTime: number
  duration: number
  error: string | null
  volume: number
}

export interface AudioChatMessagesState {
  messages: AudioChatMessage[]
  error: string | null
  hasMore: boolean
  isLoading: boolean
  totalCount: number
}

export interface AudioChatState {
  connection: AudioChatConnectionState
  recording: AudioChatRecordingState
  playback: AudioChatPlaybackState
  messages: AudioChatMessagesState
}

export interface AudioChatConfig {
  voiceName: string
  maxMessages: number
  autoScroll: boolean
  enableRetry: boolean
  retryDelay: number
  maxRetries: number
  audioQuality: 'low' | 'medium' | 'high'
  enableTranscription: boolean
}

export interface AudioChatCallbacks {
  onMessage?: (message: AudioChatMessage) => void
  onError?: (error: Error, context: string) => void
  onStateChange?: (state: AudioChatState) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onRecordingStart?: () => void
  onRecordingStop?: (audioBlob: Blob) => void
  onPlaybackStart?: (messageId: string) => void
  onPlaybackEnd?: (messageId: string) => void
}

export type AudioChatErrorType =
  | 'connection'
  | 'recording'
  | 'playback'
  | 'message'
  | 'permission'
  | 'network'
  | 'validation'

export interface AudioChatError {
  type: AudioChatErrorType
  message: string
  timestamp: Date
  context?: Record<string, any>
  recoverable: boolean
}

export interface AudioChatMetrics {
  totalMessages: number
  totalAudioMessages: number
  totalTextMessages: number
  averageRecordingDuration: number
  totalPlaybackTime: number
  connectionUptime: number
  errorCount: number
  lastActivity: Date
}
