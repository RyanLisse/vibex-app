'use client'

import {
  Activity,
  ArrowRight,
  Brain,
  Lightbulb,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  TrendingUp,
  Volume2,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  createRealtimeTranscription,
  type TranscriptionEvent,
  type TranscriptionResult,
} from '@/lib/realtime/transcription'
import { cn } from '@/lib/utils'

// Types
interface BrainstormIdea {
  id: string
  content: string
  category: string
  score: number
  pros: string[]
  cons: string[]
  timestamp: Date
  source: 'voice' | 'text'
}

interface BrainstormSession {
  id: string
  topic: string
  stage:
    | 'exploration'
    | 'clarification'
    | 'expansion'
    | 'evaluation'
    | 'refinement'
    | 'action_planning'
  ideas: BrainstormIdea[]
  insights: string[]
  nextSteps: string[]
  voiceTranscripts: string[]
  duration: number
}

interface VoiceBrainstormProps {
  sessionId?: string
  onSessionUpdate?: (session: BrainstormSession) => void
  onIdeaGenerated?: (idea: BrainstormIdea) => void
  className?: string
}

const STAGE_DESCRIPTIONS = {
  exploration: 'Discovering and articulating your core idea',
  clarification: 'Defining scope, audience, and success criteria',
  expansion: 'Generating multiple variations and alternatives',
  evaluation: 'Assessing feasibility and impact potential',
  refinement: 'Combining ideas and addressing weaknesses',
  action_planning: 'Creating actionable steps and timelines',
}

const STAGE_PROMPTS = {
  exploration:
    'Tell me about your idea. What sparked this thought? What problem are you trying to solve?',
  clarification:
    "Let's clarify the details. Who is your target audience? What does success look like?",
  expansion:
    "Now let's explore possibilities. What if we approached this differently? What are some alternatives?",
  evaluation:
    'Time to evaluate. What are the pros and cons of each approach? Which seems most feasible?',
  refinement: "Let's refine the best ideas. How can we combine strengths and address weaknesses?",
  action_planning: "What are the concrete next steps? Let's create an action plan with timelines.",
}

export function VoiceBrainstorm({
  sessionId,
  onSessionUpdate,
  onIdeaGenerated,
  className,
}: VoiceBrainstormProps) {
  // State
  const [session, setSession] = useState<BrainstormSession | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([])
  const [sessionStarted, setSessionStarted] = useState(false)

  // Refs
  const transcriptionRef = useRef(createRealtimeTranscription())
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)

  // Initialize transcription events
  useEffect(() => {
    const transcription = transcriptionRef.current

    const handleTranscriptionStart = () => {
      setIsProcessing(true)
      setCurrentTranscript('')
    }

    const handleTranscriptionPartial = (event: TranscriptionEvent) => {
      if (event.data.text) {
        setCurrentTranscript(event.data.text)
      }
    }

    const handleTranscriptionComplete = async (event: TranscriptionEvent) => {
      const result = event.data.result as TranscriptionResult
      if (result.text.trim()) {
        setTranscriptionHistory((prev) => [...prev, result.text])
        await processVoiceInput(result.text)
      }
      setCurrentTranscript('')
      setIsProcessing(false)
    }

    const handleAudioLevel = (event: TranscriptionEvent) => {
      const level = Math.max(0, Math.min(100, (event.data.level + 60) * 2))
      setAudioLevel(level)
    }

    const handleSilenceDetected = () => {
      if (isRecording) {
        stopRecording()
      }
    }

    const handleTranscriptionError = (event: TranscriptionEvent) => {
      console.error('Transcription error:', event.data.error)
      setIsProcessing(false)
      setCurrentTranscript('')
    }

    // Register event listeners
    transcription.on('transcription_start', handleTranscriptionStart)
    transcription.on('transcription_partial', handleTranscriptionPartial)
    transcription.on('transcription_complete', handleTranscriptionComplete)
    transcription.on('audio_level', handleAudioLevel)
    transcription.on('silence_detected', handleSilenceDetected)
    transcription.on('transcription_error', handleTranscriptionError)

    return () => {
      // Cleanup
      transcription.off('transcription_start', handleTranscriptionStart)
      transcription.off('transcription_partial', handleTranscriptionPartial)
      transcription.off('transcription_complete', handleTranscriptionComplete)
      transcription.off('audio_level', handleAudioLevel)
      transcription.off('silence_detected', handleSilenceDetected)
      transcription.off('transcription_error', handleTranscriptionError)
    }
  }, [isRecording])

  // Session timer
  useEffect(() => {
    if (sessionStarted && !sessionTimerRef.current) {
      startTimeRef.current = new Date()
      sessionTimerRef.current = setInterval(() => {
        if (session && startTimeRef.current) {
          const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
          setSession((prev) => (prev ? { ...prev, duration } : null))
        }
      }, 1000)
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current)
        sessionTimerRef.current = null
      }
    }
  }, [sessionStarted, session])

  const startBrainstormSession = async (topic: string) => {
    const newSession: BrainstormSession = {
      id: sessionId || `brainstorm_${Date.now()}`,
      topic,
      stage: 'exploration',
      ideas: [],
      insights: [],
      nextSteps: [],
      voiceTranscripts: [],
      duration: 0,
    }

    setSession(newSession)
    setSessionStarted(true)
    onSessionUpdate?.(newSession)

    // Start with exploration prompt
    await speakPrompt(STAGE_PROMPTS.exploration)
  }

  const processVoiceInput = async (transcript: string) => {
    if (!session) return

    // Add transcript to session
    const updatedSession = {
      ...session,
      voiceTranscripts: [...session.voiceTranscripts, transcript],
    }

    // Analyze transcript for ideas
    const ideas = await extractIdeasFromTranscript(transcript)
    if (ideas.length > 0) {
      updatedSession.ideas = [...updatedSession.ideas, ...ideas]
      ideas.forEach((idea) => onIdeaGenerated?.(idea))
    }

    // Send to brainstorm agent for processing
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          sessionId: session.id,
          message: `Voice input: "${transcript}"`,
          streaming: false,
        }),
      })

      const data = await response.json()
      if (data.success && data.data.response.content) {
        // Speak the agent's response
        await speakResponse(data.data.response.content)
      }
    } catch (error) {
      console.error('Failed to process voice input:', error)
    }

    setSession(updatedSession)
    onSessionUpdate?.(updatedSession)
  }

  const extractIdeasFromTranscript = async (transcript: string): Promise<BrainstormIdea[]> => {
    // Simple keyword-based idea extraction (can be enhanced with AI)
    const ideaKeywords = [
      'idea',
      'think',
      'maybe',
      'could',
      'should',
      'what if',
      'how about',
      'solution',
      'approach',
      'way',
      'method',
      'strategy',
    ]

    const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 10)
    const ideas: BrainstormIdea[] = []

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      if (ideaKeywords.some((keyword) => lowerSentence.includes(keyword))) {
        const idea: BrainstormIdea = {
          id: `idea_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          content: sentence.trim(),
          category: 'voice-generated',
          score: 5,
          pros: [],
          cons: [],
          timestamp: new Date(),
          source: 'voice',
        }
        ideas.push(idea)
      }
    }

    return ideas
  }

  const speakPrompt = async (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const speakResponse = async (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const startRecording = async () => {
    try {
      await transcriptionRef.current.startStreamingTranscription()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const stopRecording = () => {
    transcriptionRef.current.stopStreamingTranscription()
    setIsRecording(false)
    setAudioLevel(0)
  }

  const advanceStage = async () => {
    if (!session) return

    const stages: BrainstormSession['stage'][] = [
      'exploration',
      'clarification',
      'expansion',
      'evaluation',
      'refinement',
      'action_planning',
    ]

    const currentIndex = stages.indexOf(session.stage)
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1]
      const updatedSession = { ...session, stage: nextStage }

      setSession(updatedSession)
      onSessionUpdate?.(updatedSession)

      // Speak the new stage prompt
      await speakPrompt(STAGE_PROMPTS[nextStage])

      // Notify brainstorm agent
      try {
        await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'advance_brainstorm_stage',
            sessionId: session.id,
          }),
        })
      } catch (error) {
        console.error('Failed to advance stage:', error)
      }
    }
  }

  const resetSession = () => {
    setSession(null)
    setSessionStarted(false)
    setTranscriptionHistory([])
    setCurrentTranscript('')
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
    startTimeRef.current = null
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!session) {
    return (
      <Card className={cn('mx-auto w-full max-w-2xl', className)}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="h-6 w-6" />
            Voice Brainstorming
          </CardTitle>
          <p className="text-muted-foreground">Start a voice-powered brainstorming session</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button className="w-full" onClick={() => startBrainstormSession('New Idea')} size="lg">
              <Mic className="mr-2 h-5 w-5" />
              Start Voice Brainstorming
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('mx-auto w-full max-w-4xl space-y-4', className)}>
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {session.topic}
              </CardTitle>
              <div className="mt-2 flex items-center gap-4">
                <Badge className="capitalize" variant="outline">
                  {session.stage.replace('_', ' ')}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  {formatDuration(session.duration)}
                </span>
                <span className="text-muted-foreground text-sm">{session.ideas.length} ideas</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={advanceStage} size="sm" variant="outline">
                <ArrowRight className="mr-1 h-4 w-4" />
                Next Stage
              </Button>
              <Button onClick={resetSession} size="sm" variant="ghost">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Voice Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Input
            </CardTitle>
            <p className="text-muted-foreground text-sm">{STAGE_DESCRIPTIONS[session.stage]}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recording Controls */}
            <div className="flex items-center justify-center">
              <Button
                className="h-32 w-32 rounded-full"
                onClick={isRecording ? stopRecording : startRecording}
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <Progress className="flex-1" value={audioLevel} />
                </div>
                <p className="text-center text-muted-foreground text-xs">
                  Listening... Speak naturally
                </p>
              </div>
            )}

            {/* Current Transcript */}
            {(currentTranscript || isProcessing) && (
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Volume2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      {isProcessing && !currentTranscript && (
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                          <span className="text-muted-foreground text-sm">Processing...</span>
                        </div>
                      )}
                      {currentTranscript && <p className="text-sm">{currentTranscript}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stage Prompt */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <p className="font-medium text-primary text-sm">{STAGE_PROMPTS[session.stage]}</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Ideas Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Generated Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {session.ideas.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    Start speaking to generate ideas
                  </p>
                ) : (
                  session.ideas.map((idea) => (
                    <Card className="bg-muted/30" key={idea.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1 text-sm">{idea.content}</p>
                          <div className="flex items-center gap-1">
                            <Badge
                              className="text-xs"
                              variant={idea.source === 'voice' ? 'default' : 'secondary'}
                            >
                              {idea.source === 'voice' ? <Mic className="h-3 w-3" /> : 'Text'}
                            </Badge>
                            <Badge className="text-xs" variant="outline">
                              {idea.score}/10
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">
                            {idea.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="text-muted-foreground text-xs capitalize">
                            {idea.category}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Transcript History */}
      {transcriptionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {transcriptionHistory.map((transcript, index) => (
                  <div className="rounded bg-muted/30 p-2 text-sm" key={index}>
                    {transcript}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
