'use client'

import {
  Brain,
  Lightbulb,
  MessageSquare,
  Mic,
  Rocket,
  Settings,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { MultiAgentChat } from '@/components/agents/multi-agent-chat'
import { VoiceBrainstorm } from '@/components/agents/voice-brainstorm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DemoStats {
  totalSessions: number
  ideasGenerated: number
  averageSessionTime: number
  voiceAccuracy: number
}

export default function VoiceBrainstormPage() {
  const [userId] = useState(`user_${Date.now()}`)
  const [demoStats, setDemoStats] = useState<DemoStats>({
    totalSessions: 0,
    ideasGenerated: 0,
    averageSessionTime: 0,
    voiceAccuracy: 95.2,
  })
  const [activeDemo, setActiveDemo] = useState<'voice' | 'chat' | 'multi'>('voice')

  useEffect(() => {
    // Simulate demo stats
    setDemoStats({
      totalSessions: Math.floor(Math.random() * 50) + 10,
      ideasGenerated: Math.floor(Math.random() * 200) + 50,
      averageSessionTime: Math.floor(Math.random() * 15) + 8,
      voiceAccuracy: 95.2 + Math.random() * 3,
    })
  }, [])

  const handleSessionUpdate = (session: any) => {
    setDemoStats((prev) => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      averageSessionTime: Math.floor((prev.averageSessionTime + session.duration / 60) / 2),
    }))
  }

  const handleIdeaGenerated = (idea: any) => {
    setDemoStats((prev) => ({
      ...prev,
      ideasGenerated: prev.ideasGenerated + 1,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold text-4xl text-transparent">
            AI-Powered Voice Brainstorming
          </h1>
          <p className="mx-auto max-w-3xl text-muted-foreground text-xl">
            Experience the future of ideation with real-time voice transcription, intelligent
            brainstorming agents, and multi-modal AI collaboration.
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl">{demoStats.totalSessions}</p>
                  <p className="text-muted-foreground text-sm">Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Lightbulb className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl">{demoStats.ideasGenerated}</p>
                  <p className="text-muted-foreground text-sm">Ideas Generated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl">{demoStats.averageSessionTime}m</p>
                  <p className="text-muted-foreground text-sm">Avg. Session</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Mic className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl">{demoStats.voiceAccuracy.toFixed(1)}%</p>
                  <p className="text-muted-foreground text-sm">Voice Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Mic className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Real-time Transcription</h3>
                  <p className="text-muted-foreground text-sm">
                    OpenAI Whisper-powered voice recognition with live feedback and confidence
                    scoring.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Brain className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Intelligent Brainstorming</h3>
                  <p className="text-muted-foreground text-sm">
                    Letta-powered agents guide you through structured brainstorming stages.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Multi-Agent System</h3>
                  <p className="text-muted-foreground text-sm">
                    Orchestrator and specialized agents work together for optimal results.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Choose Your Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                className="flex h-auto flex-col items-center gap-2 p-4"
                onClick={() => setActiveDemo('voice')}
                variant={activeDemo === 'voice' ? 'default' : 'outline'}
              >
                <Mic className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Voice Brainstorming</div>
                  <div className="text-muted-foreground text-xs">Pure voice-driven ideation</div>
                </div>
              </Button>

              <Button
                className="flex h-auto flex-col items-center gap-2 p-4"
                onClick={() => setActiveDemo('chat')}
                variant={activeDemo === 'chat' ? 'default' : 'outline'}
              >
                <MessageSquare className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Text Chat</div>
                  <div className="text-muted-foreground text-xs">Traditional chat interface</div>
                </div>
              </Button>

              <Button
                className="flex h-auto flex-col items-center gap-2 p-4"
                onClick={() => setActiveDemo('multi')}
                variant={activeDemo === 'multi' ? 'default' : 'outline'}
              >
                <Users className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Multi-Modal</div>
                  <div className="text-muted-foreground text-xs">Voice + text + agents</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Demo Content */}
        <div className="mb-8">
          {activeDemo === 'voice' && (
            <VoiceBrainstorm
              onIdeaGenerated={handleIdeaGenerated}
              onSessionUpdate={handleSessionUpdate}
              sessionId={`voice_${userId}`}
            />
          )}

          {activeDemo === 'chat' && (
            <MultiAgentChat initialSessionType="brainstorm" userId={userId} />
          )}

          {activeDemo === 'multi' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Multi-Modal Brainstorming
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Combine voice input, text chat, and AI agents for the ultimate brainstorming
                    experience.
                  </p>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <VoiceBrainstorm
                  className="h-fit"
                  onIdeaGenerated={handleIdeaGenerated}
                  onSessionUpdate={handleSessionUpdate}
                  sessionId={`multi_voice_${userId}`}
                />

                <MultiAgentChat className="h-fit" initialSessionType="brainstorm" userId={userId} />
              </div>
            </div>
          )}
        </div>

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              {[
                { icon: Mic, title: 'Speak', desc: 'Voice input captured' },
                { icon: Brain, title: 'Transcribe', desc: 'AI converts to text' },
                { icon: Lightbulb, title: 'Extract', desc: 'Ideas identified' },
                { icon: Users, title: 'Analyze', desc: 'Agents process' },
                { icon: TrendingUp, title: 'Enhance', desc: 'Insights generated' },
                { icon: Rocket, title: 'Act', desc: 'Next steps planned' },
              ].map((step, index) => (
                <div className="text-center" key={index}>
                  <div className="mx-auto mb-2 w-fit rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 p-3">
                    <step.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="mb-1 font-semibold text-sm">{step.title}</h3>
                  <p className="text-muted-foreground text-xs">{step.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Technical Stack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { name: 'OpenAI Whisper', desc: 'Voice transcription' },
                { name: 'Letta Agents', desc: 'Multi-agent system' },
                { name: 'Gemini AI', desc: 'Language processing' },
                { name: 'Next.js 15', desc: 'React framework' },
                { name: 'WebRTC', desc: 'Real-time audio' },
                { name: 'WebSockets', desc: 'Live communication' },
                { name: 'Tailwind CSS', desc: 'Modern styling' },
                { name: 'TypeScript', desc: 'Type safety' },
              ].map((tech, index) => (
                <div className="rounded-lg bg-muted/30 p-3 text-center" key={index}>
                  <Badge className="mb-2" variant="outline">
                    {tech.name}
                  </Badge>
                  <p className="text-muted-foreground text-xs">{tech.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
