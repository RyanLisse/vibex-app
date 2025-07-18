'use client'

import { Brain, MessageSquare, Mic, Sparkles } from 'lucide-react'
import Link from 'next/link'
import NewTaskForm from '@/components/forms/new-task-form'
import Navbar from '@/components/navigation/navbar'
import TaskList from '@/components/task-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClientPage() {
  return (
    <div className="flex h-screen flex-col gap-y-4 px-4 py-2">
      <Navbar />

      {/* Voice Brainstorming Feature Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Sparkles className="h-5 w-5" />
            New: AI Voice Brainstorming
          </CardTitle>
          <p className="text-blue-600 text-sm">
            Experience the future of ideation with real-time voice transcription and intelligent
            brainstorming agents
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Link href="/voice-brainstorm">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Mic className="mr-2 h-4 w-4" />
                Try Voice Brainstorming
              </Button>
            </Link>
            <Link href="/voice-brainstorm">
              <Button className="border-blue-200 text-blue-700 hover:bg-blue-50" variant="outline">
                <Brain className="mr-2 h-4 w-4" />
                View Demo
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <NewTaskForm />
      <TaskList />
    </div>
  )
}
