/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Components to be implemented
import { VoiceInputButton } from '@/components/features/voice-tasks/voice-input-button'
import { VoiceRecorder } from '@/components/features/voice-tasks/voice-recorder'
import { TranscriptionProcessor } from '@/components/features/voice-tasks/transcription-processor'
import { VoiceTaskForm } from '@/components/features/voice-tasks/voice-task-form'

// Types
import type { VoiceRecording, TranscriptionResult, VoiceTask } from '@/src/schemas/enhanced-task-schemas'

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onstart: null,
  onend: null,
  onresult: null,
  onerror: null,
}

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  requestData: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive',
  stream: null,
  mimeType: 'audio/webm',
  ondataavailable: null,
  onstart: null,
  onstop: null,
  onerror: null,
}

global.SpeechRecognition = vi.fn(() => mockSpeechRecognition) as any
global.webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition) as any
global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any

// Mock getUserMedia
const mockGetUserMedia = vi.fn()
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
})

describe('Voice-Dictated Task Creation Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('VoiceInputButton', () => {
    it('should render voice input button', () => {
      render(<VoiceInputButton onStartRecording={vi.fn()} />)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByTestId('microphone-icon')).toBeInTheDocument()
    })

    it('should start recording when clicked', async () => {
      const mockOnStartRecording = vi.fn()
      
      render(<VoiceInputButton onStartRecording={mockOnStartRecording} />)
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      expect(mockOnStartRecording).toHaveBeenCalled()
    })

    it('should show recording state with visual feedback', async () => {
      render(<VoiceInputButton onStartRecording={vi.fn()} isRecording={true} />)
      
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument()
      expect(screen.getByText(/recording/i)).toBeInTheDocument()
    })

    it('should handle microphone permission denied', async () => {
      const mockOnError = vi.fn()
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
      
      render(
        <VoiceInputButton 
          onStartRecording={vi.fn()} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Permission denied')
        )
      })
    })
  })

  describe('VoiceRecorder', () => {
    it('should start audio recording', async () => {
      const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      const mockOnRecordingComplete = vi.fn()
      
      render(
        <VoiceRecorder 
          onRecordingComplete={mockOnRecordingComplete}
          isRecording={true}
        />
      )
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream)
    })

    it('should stop recording and return audio data', async () => {
      const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      const mockOnRecordingComplete = vi.fn()
      
      const { rerender } = render(
        <VoiceRecorder 
          onRecordingComplete={mockOnRecordingComplete}
          isRecording={true}
        />
      )
      
      // Simulate stop recording
      rerender(
        <VoiceRecorder 
          onRecordingComplete={mockOnRecordingComplete}
          isRecording={false}
        />
      )
      
      // Simulate MediaRecorder ondataavailable event
      const audioBlob = new Blob(['audio-data'], { type: 'audio/webm' })
      mockMediaRecorder.ondataavailable({ data: audioBlob })
      mockMediaRecorder.onstop()
      
      await waitFor(() => {
        expect(mockOnRecordingComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.any(String),
            audioBlob,
            duration: expect.any(Number),
            timestamp: expect.any(Date),
          })
        )
      })
    })

    it('should show recording duration', async () => {
      vi.useFakeTimers()
      
      render(
        <VoiceRecorder 
          onRecordingComplete={vi.fn()}
          isRecording={true}
        />
      )
      
      // Advance timer
      vi.advanceTimersByTime(5000)
      
      expect(screen.getByText(/00:05/)).toBeInTheDocument()
      
      vi.useRealTimers()
    })

    it('should handle recording errors', async () => {
      const mockOnError = vi.fn()
      mockGetUserMedia.mockRejectedValue(new Error('Microphone not available'))
      
      render(
        <VoiceRecorder 
          onRecordingComplete={vi.fn()}
          onError={mockOnError}
          isRecording={true}
        />
      )
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Microphone not available')
        )
      })
    })
  })

  describe('TranscriptionProcessor', () => {
    const mockVoiceRecording: VoiceRecording = {
      id: 'test-recording',
      audioBlob: new Blob(['audio-data'], { type: 'audio/webm' }),
      duration: 5000,
      timestamp: new Date(),
    }

    it('should transcribe audio using Speech Recognition API', async () => {
      const mockOnTranscriptionComplete = vi.fn()
      
      render(
        <TranscriptionProcessor 
          recording={mockVoiceRecording}
          onTranscriptionComplete={mockOnTranscriptionComplete}
        />
      )
      
      expect(global.SpeechRecognition).toHaveBeenCalled()
      expect(mockSpeechRecognition.start).toHaveBeenCalled()
      
      // Simulate successful transcription
      const mockResult = {
        results: [
          {
            0: {
              transcript: 'Create a new task to fix the login bug with high priority',
              confidence: 0.95,
            },
            isFinal: true,
          },
        ],
      }
      
      mockSpeechRecognition.onresult(mockResult)
      
      await waitFor(() => {
        expect(mockOnTranscriptionComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Create a new task to fix the login bug with high priority',
            confidence: 0.95,
            language: 'en-US',
            segments: expect.any(Array),
          })
        )
      })
    })

    it('should handle transcription errors gracefully', async () => {
      const mockOnError = vi.fn()
      
      render(
        <TranscriptionProcessor 
          recording={mockVoiceRecording}
          onTranscriptionComplete={vi.fn()}
          onError={mockOnError}
        />
      )
      
      // Simulate error
      const mockError = { error: 'network' }
      mockSpeechRecognition.onerror(mockError)
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('transcription failed')
        )
      })
    })

    it('should show transcription progress', () => {
      render(
        <TranscriptionProcessor 
          recording={mockVoiceRecording}
          onTranscriptionComplete={vi.fn()}
        />
      )
      
      expect(screen.getByText(/transcribing/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should support different languages', async () => {
      render(
        <TranscriptionProcessor 
          recording={mockVoiceRecording}
          onTranscriptionComplete={vi.fn()}
          language="es-ES"
        />
      )
      
      expect(mockSpeechRecognition.lang).toBe('es-ES')
    })
  })

  describe('VoiceTaskForm', () => {
    const mockTranscriptionResult: TranscriptionResult = {
      text: 'Create a new task to fix the login bug with high priority and assign it to John',
      confidence: 0.95,
      language: 'en-US',
      segments: [
        { text: 'Create a new task to fix the login bug', start: 0, end: 2.5, confidence: 0.96 },
        { text: 'with high priority and assign it to John', start: 2.5, end: 5, confidence: 0.94 },
      ],
    }

    it('should extract task data from transcription', () => {
      render(
        <VoiceTaskForm 
          transcription={mockTranscriptionResult}
          onSubmit={vi.fn()}
        />
      )
      
      // Should auto-populate fields based on transcription
      expect(screen.getByDisplayValue(/fix the login bug/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/high/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/john/i)).toBeInTheDocument()
    })

    it('should allow manual editing of extracted data', async () => {
      render(
        <VoiceTaskForm 
          transcription={mockTranscriptionResult}
          onSubmit={vi.fn()}
        />
      )
      
      const titleField = screen.getByLabelText(/title/i)
      await userEvent.clear(titleField)
      await userEvent.type(titleField, 'Updated task title')
      
      expect(screen.getByDisplayValue('Updated task title')).toBeInTheDocument()
    })

    it('should show confidence indicators for extracted data', () => {
      render(
        <VoiceTaskForm 
          transcription={mockTranscriptionResult}
          onSubmit={vi.fn()}
        />
      )
      
      expect(screen.getByText(/confidence: 95%/i)).toBeInTheDocument()
    })

    it('should handle poor transcription quality', () => {
      const poorTranscription: TranscriptionResult = {
        text: 'create task something something',
        confidence: 0.3,
        language: 'en-US',
        segments: [],
      }
      
      render(
        <VoiceTaskForm 
          transcription={poorTranscription}
          onSubmit={vi.fn()}
        />
      )
      
      expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
      expect(screen.getByText(/please review/i)).toBeInTheDocument()
    })

    it('should submit voice task with correct metadata', async () => {
      const mockOnSubmit = vi.fn()
      
      render(
        <VoiceTaskForm 
          transcription={mockTranscriptionResult}
          onSubmit={mockOnSubmit}
        />
      )
      
      const submitButton = screen.getByText(/create task/i)
      await userEvent.click(submitButton)
      
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('fix the login bug'),
          priority: 'high',
          assignee: 'John',
          creationMethod: 'voice',
          metadata: expect.objectContaining({
            transcription: mockTranscriptionResult,
            voiceCreated: true,
          }),
          tags: expect.arrayContaining(['voice-created']),
        })
      )
    })
  })

  describe('AI-Powered Text Extraction', () => {
    it('should extract title from natural language', () => {
      const transcription = 'I need to create a task for fixing the broken navigation menu'
      
      // This would use AI/NLP to extract task components
      const extracted = extractTaskFromTranscription(transcription)
      
      expect(extracted.title).toBe('Fix broken navigation menu')
      expect(extracted.description).toContain('navigation menu')
    })

    it('should detect priority keywords', () => {
      const transcription = 'urgent task to fix critical security vulnerability'
      
      const extracted = extractTaskFromTranscription(transcription)
      
      expect(extracted.priority).toBe('urgent')
    })

    it('should detect assignee mentions', () => {
      const transcription = 'assign this to Sarah or maybe John can handle it'
      
      const extracted = extractTaskFromTranscription(transcription)
      
      expect(extracted.assignee).toBe('Sarah')
    })
  })

  describe('Integration Tests', () => {
    it('should complete full voice task creation workflow', async () => {
      const mockCreateTask = vi.fn()
      
      // Mock successful recording
      const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      // This would be a full page component combining all voice features
      const VoiceTaskWorkflow = () => (
        <div>
          <VoiceInputButton 
            onStartRecording={async () => {
              // Would trigger recording -> transcription -> form workflow
              const mockTask = {
                title: 'Voice-created task',
                description: 'Created via voice input',
                creationMethod: 'voice',
                tags: ['voice-created'],
              }
              mockCreateTask(mockTask)
            }}
          />
        </div>
      )
      
      render(<VoiceTaskWorkflow />)
      
      const voiceButton = screen.getByRole('button')
      await userEvent.click(voiceButton)
      
      await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            creationMethod: 'voice',
            tags: expect.arrayContaining(['voice-created']),
          })
        )
      })
    })
  })
})

// Helper function that would be implemented
function extractTaskFromTranscription(text: string) {
  // This would contain AI/NLP logic to extract task components
  // For now, return mock data for testing
  return {
    title: 'Extracted title',
    description: text,
    priority: 'medium',
    assignee: '',
  }
}