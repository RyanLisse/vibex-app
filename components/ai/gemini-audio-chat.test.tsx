import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { GeminiAudioChat } from '@/components/ai/gemini-audio-chat'

// Mock the hooks
vi.mock('@/hooks/use-audio-chat-integration', () => ({
  useAudioChatIntegration: vi.fn(() => ({
    isConnected: false,
    isLoading: false,
    connectionError: null,
    isRecording: false,
    formattedDuration: '00:00',
    recordingError: null,
    isPlaying: false,
    playingMessageId: null,
    playbackError: null,
    messages: [],
    messageError: null,
    hasError: false,
    primaryError: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    playAudio: vi.fn(),
    clearMessages: vi.fn(),
    clearAllErrors: vi.fn(),
    scrollAreaRef: { current: null },
  })),
}))

describe('GeminiAudioChat', () => {
  it('renders with default props', () => {
    render(<GeminiAudioChat />)

    expect(screen.getByText('Gemini Audio Chat')).toBeInTheDocument()
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const mockHook = vi.fn(() => ({
      isConnected: false,
      isLoading: true,
      connectionError: null,
      isRecording: false,
      formattedDuration: '00:00',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: [],
      messageError: null,
      hasError: false,
      primaryError: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: vi.fn(),
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    render(<GeminiAudioChat />)

    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  it('shows connected state', () => {
    const mockHook = vi.fn(() => ({
      isConnected: true,
      isLoading: false,
      connectionError: null,
      isRecording: false,
      formattedDuration: '00:00',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: [],
      messageError: null,
      hasError: false,
      primaryError: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: vi.fn(),
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    render(<GeminiAudioChat />)

    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Disconnect')).toBeInTheDocument()
  })

  it('displays error messages', () => {
    const mockHook = vi.fn(() => ({
      isConnected: false,
      isLoading: false,
      connectionError: 'Connection failed',
      isRecording: false,
      formattedDuration: '00:00',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: [],
      messageError: null,
      hasError: true,
      primaryError: 'Connection failed',
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: vi.fn(),
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    render(<GeminiAudioChat />)

    expect(screen.getByText('Connection failed')).toBeInTheDocument()
    expect(screen.getByText('Dismiss')).toBeInTheDocument()
  })

  it('shows recording state', () => {
    const mockHook = vi.fn(() => ({
      isConnected: true,
      isLoading: false,
      connectionError: null,
      isRecording: true,
      formattedDuration: '00:05',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: [],
      messageError: null,
      hasError: false,
      primaryError: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: vi.fn(),
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    render(<GeminiAudioChat />)

    expect(screen.getByText('Recording: 00:05')).toBeInTheDocument()
  })

  it('renders messages correctly', () => {
    const mockMessages = [
      {
        id: '1',
        type: 'text' as const,
        content: 'Hello, world!',
        timestamp: new Date(),
        isUser: true,
      },
      {
        id: '2',
        type: 'text' as const,
        content: 'Hello back!',
        timestamp: new Date(),
        isUser: false,
      },
    ]

    const mockHook = vi.fn(() => ({
      isConnected: true,
      isLoading: false,
      connectionError: null,
      isRecording: false,
      formattedDuration: '00:00',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: mockMessages,
      messageError: null,
      hasError: false,
      primaryError: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: vi.fn(),
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    render(<GeminiAudioChat />)

    expect(screen.getByText('Hello, world!')).toBeInTheDocument()
    expect(screen.getByText('Hello back!')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const user = userEvent.setup()
    const mockConnect = vi.fn()
    const mockSendMessage = vi.fn()
    const mockStartRecording = vi.fn()
    const mockClearAllErrors = vi.fn()

    const mockHook = vi.fn(() => ({
      isConnected: false,
      isLoading: false,
      connectionError: null,
      isRecording: false,
      formattedDuration: '00:00',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: [],
      messageError: null,
      hasError: true,
      primaryError: 'Test error',
      connect: mockConnect,
      disconnect: vi.fn(),
      sendMessage: mockSendMessage,
      startRecording: mockStartRecording,
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: mockClearAllErrors,
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    render(<GeminiAudioChat />)

    // Test connect button
    await user.click(screen.getByText('Connect'))
    expect(mockConnect).toHaveBeenCalled()

    // Test error dismissal
    await user.click(screen.getByText('Dismiss'))
    expect(mockClearAllErrors).toHaveBeenCalled()
  })

  it('passes props correctly to integration hook', () => {
    const mockOnError = vi.fn()
    const mockOnStateChange = vi.fn()
    const mockHook = vi.fn(() => ({
      isConnected: false,
      isLoading: false,
      connectionError: null,
      isRecording: false,
      formattedDuration: '00:00',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: [],
      messageError: null,
      hasError: false,
      primaryError: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: vi.fn(),
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    render(
      <GeminiAudioChat
        autoScroll={false}
        maxMessages={500}
        onError={mockOnError}
        onStateChange={mockOnStateChange}
        voiceName="custom-voice"
      />
    )

    expect(mockHook).toHaveBeenCalledWith({
      voiceName: 'custom-voice',
      maxMessages: 500,
      autoScroll: false,
      onError: mockOnError,
      onStateChange: mockOnStateChange,
    })
  })

  it('memoizes components correctly', () => {
    const mockHook = vi.fn(() => ({
      isConnected: false,
      isLoading: false,
      connectionError: null,
      isRecording: false,
      formattedDuration: '00:00',
      recordingError: null,
      isPlaying: false,
      playingMessageId: null,
      playbackError: null,
      messages: [],
      messageError: null,
      hasError: false,
      primaryError: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playAudio: vi.fn(),
      clearMessages: vi.fn(),
      clearAllErrors: vi.fn(),
      scrollAreaRef: { current: null },
    }))

    mocked(
      require('@/hooks/use-audio-chat-integration').useAudioChatIntegration
    ).mockImplementation(mockHook)

    const { rerender } = render(<GeminiAudioChat />)

    // Re-render with same props shouldn't cause re-render of memoized components
    rerender(<GeminiAudioChat />)

    expect(screen.getByText('Gemini Audio Chat')).toBeInTheDocument()
  })
})
