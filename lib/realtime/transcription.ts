import { z } from 'zod'

// Transcription Configuration
export const TranscriptionConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string().default('whisper-1'),
  language: z.string().optional(),
  prompt: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0),
  responseFormat: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).default('json'),
})

export type TranscriptionConfig = z.infer<typeof TranscriptionConfigSchema>

// Real-time Transcription Events
export const TranscriptionEventSchema = z.object({
  type: z.enum([
    'transcription_start',
    'transcription_partial',
    'transcription_complete',
    'transcription_error',
    'audio_level',
    'silence_detected',
  ]),
  timestamp: z.date(),
  data: z.record(z.string(), z.any()),
})

export type TranscriptionEvent = z.infer<typeof TranscriptionEventSchema>

// Transcription Result
export const TranscriptionResultSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  words: z
    .array(
      z.object({
        word: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number().optional(),
      })
    )
    .optional(),
  language: z.string().optional(),
  duration: z.number().optional(),
})

export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>

export class RealtimeTranscription {
  private config: TranscriptionConfig
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private isRecording = false
  private eventListeners: Map<string, ((event: TranscriptionEvent) => void)[]> = new Map()
  private silenceThreshold = -50 // dB
  private silenceTimeout = 2000 // ms
  private silenceTimer: NodeJS.Timeout | null = null

  constructor(config: TranscriptionConfig) {
    this.config = TranscriptionConfigSchema.parse(config)
  }

  // Event Management
  on(eventType: TranscriptionEvent['type'], callback: (event: TranscriptionEvent) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }
    this.eventListeners.get(eventType)!.push(callback)
  }

  off(eventType: TranscriptionEvent['type'], callback: (event: TranscriptionEvent) => void) {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(eventType: TranscriptionEvent['type'], data: Record<string, any> = {}) {
    const event: TranscriptionEvent = {
      type: eventType,
      timestamp: new Date(),
      data,
    }

    const listeners = this.eventListeners.get(eventType) || []
    listeners.forEach((callback) => callback(event))
  }

  // Audio Recording
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording')
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16_000,
        },
      })

      // Setup audio context for level monitoring
      this.audioContext = new (AudioContext as any)({ sampleRate: 16_000 }) as AudioContext
      const source = this.audioContext.createMediaStreamSource(stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      // Setup media recorder
      this.mediaRecorder = new (MediaRecorder as any)(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16_000,
      }) as MediaRecorder

      const audioChunks: Blob[] = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        await this.transcribeAudio(audioBlob)

        // Cleanup
        stream.getTracks().forEach((track) => track.stop())
        this.audioContext?.close()
        this.audioContext = null
        this.analyser = null
      }

      // Start recording
      this.mediaRecorder.start(100) // Collect data every 100ms
      this.isRecording = true

      // Start audio level monitoring
      this.startAudioLevelMonitoring()

      this.emit('transcription_start')
    } catch (error) {
      this.emit('transcription_error', { error: error.message })
      throw error
    }
  }

  stopRecording(): void {
    if (!(this.isRecording && this.mediaRecorder)) {
      return
    }

    this.mediaRecorder.stop()
    this.isRecording = false

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }

  private startAudioLevelMonitoring() {
    if (!this.analyser) return

    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const checkAudioLevel = () => {
      if (!(this.isRecording && this.analyser)) return

      this.analyser.getByteFrequencyData(dataArray)

      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / bufferLength)
      const decibels = 20 * Math.log10(rms / 255)

      this.emit('audio_level', { level: decibels, rms })

      // Silence detection
      if (decibels < this.silenceThreshold) {
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            this.emit('silence_detected', { duration: this.silenceTimeout })
          }, this.silenceTimeout)
        }
      } else if (this.silenceTimer) {
        clearTimeout(this.silenceTimer)
        this.silenceTimer = null
      }

      requestAnimationFrame(checkAudioLevel)
    }

    checkAudioLevel()
  }

  private async transcribeAudio(audioBlob: Blob): Promise<void> {
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', this.config.model)
      formData.append('response_format', this.config.responseFormat)
      formData.append('temperature', this.config.temperature.toString())

      if (this.config.language) {
        formData.append('language', this.config.language)
      }

      if (this.config.prompt) {
        formData.append('prompt', this.config.prompt)
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      const transcriptionResult: TranscriptionResult = {
        text: result.text || '',
        confidence: result.confidence,
        words: result.words,
        language: result.language,
        duration: result.duration,
      }

      this.emit('transcription_complete', { result: transcriptionResult })
    } catch (error) {
      this.emit('transcription_error', { error: error.message })
    }
  }

  // Streaming transcription (for real-time partial results)
  async startStreamingTranscription(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording')
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16_000,
        },
      })

      // Setup WebSocket connection for streaming
      const ws = new (WebSocket as any)('wss://api.openai.com/v1/realtime') as WebSocket

      ws.onopen = () => {
        // Send configuration
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: this.config.prompt || 'Transcribe the following audio accurately.',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1',
              },
            },
          })
        )
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'input_audio_buffer.speech_started':
            this.emit('transcription_start')
            break

          case 'conversation.item.input_audio_transcription.completed':
            this.emit('transcription_partial', {
              text: data.transcript,
              confidence: data.confidence,
            })
            break

          case 'conversation.item.input_audio_transcription.failed':
            this.emit('transcription_error', { error: data.error })
            break
        }
      }

      // Setup audio streaming
      this.audioContext = new (AudioContext as any)({ sampleRate: 16_000 }) as AudioContext
      const source = this.audioContext.createMediaStreamSource(stream)

      // Create a script processor for real-time audio data
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)

        // Convert to PCM16
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32_768, Math.min(32_767, inputData[i] * 32_768))
        }

        // Send audio data to WebSocket
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: Array.from(pcm16),
            })
          )
        }
      }

      source.connect(processor)
      processor.connect(this.audioContext.destination)

      this.isRecording = true

      // Cleanup function
      const cleanup = () => {
        stream.getTracks().forEach((track) => track.stop())
        processor.disconnect()
        this.audioContext?.close()
        ws.close()
        this.isRecording = false
      }

      // Store cleanup function for later use
      ;(this as any).cleanup = cleanup
    } catch (error) {
      this.emit('transcription_error', { error: error.message })
      throw error
    }
  }

  stopStreamingTranscription(): void {
    if ((this as any).cleanup) {
      ;(this as any).cleanup()
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  // Configuration
  updateConfig(newConfig: Partial<TranscriptionConfig>) {
    this.config = TranscriptionConfigSchema.parse({
      ...this.config,
      ...newConfig,
    })
  }

  getConfig(): TranscriptionConfig {
    return { ...this.config }
  }
}

// Factory function
export function createRealtimeTranscription(
  config?: Partial<TranscriptionConfig>
): RealtimeTranscription {
  const defaultConfig: TranscriptionConfig = {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    model: 'whisper-1',
    temperature: 0,
    responseFormat: 'json',
  }

  return new RealtimeTranscription({
    ...defaultConfig,
    ...config,
  })
}
