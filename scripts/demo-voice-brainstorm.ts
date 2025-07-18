#!/usr/bin/env bun

/**
 * Voice Brainstorming Demo Script
 *
 * This script demonstrates the voice brainstorming system capabilities
 * by simulating a complete brainstorming session with mock data.
 */

import { MultiAgentSystem } from '../lib/letta/multi-agent-system'
import { createRealtimeTranscription } from '../lib/realtime/transcription'

// Demo configuration
const DEMO_CONFIG = {
  userId: 'demo-user-123',
  topic: 'Revolutionary Mobile App Ideas',
  creativityLevel: 'creative' as const,
  mockTranscripts: [
    'I think we should create an app that helps people manage their daily routines more effectively',
    'What if we combined AI with personal productivity to create something really innovative?',
    "Maybe we could focus on mental health and wellness, that's a growing market",
    'How about an app that uses voice commands to control smart home devices?',
    "I'm thinking about sustainability - an app that helps people reduce their carbon footprint",
  ],
  expectedIdeas: 5,
  sessionDuration: 300, // 5 minutes
}

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'bright')
  console.log('='.repeat(60))
}

function logStep(step: string, status: 'start' | 'success' | 'error' = 'start') {
  const statusColors = {
    start: 'blue',
    success: 'green',
    error: 'red',
  }
  const statusSymbols = {
    start: '🔄',
    success: '✅',
    error: '❌',
  }

  log(`${statusSymbols[status]} ${step}`, statusColors[status])
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mockApiCall(endpoint: string, data: any): Promise<any> {
  // Simulate API latency
  await delay(Math.random() * 1000 + 500)

  // Mock responses based on endpoint
  switch (endpoint) {
    case 'create_agent':
      return { id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` }

    case 'create_session':
      return {
        session: {
          id: `session_${Date.now()}`,
          userId: data.userId,
          type: data.type,
          status: 'active',
          createdAt: new Date(),
        },
      }

    case 'start_brainstorm':
      return {
        brainstormSession: {
          id: `brainstorm_${Date.now()}`,
          topic: data.topic,
          stage: 'exploration',
          ideas: [],
          insights: [],
          duration: 0,
        },
      }

    case 'process_voice':
      return {
        response: { content: generateMockResponse(data.transcript) },
        extractedIdeas: extractMockIdeas(data.transcript),
        insights: generateMockInsights(data.transcript),
      }

    case 'advance_stage': {
      const stages = [
        'exploration',
        'clarification',
        'expansion',
        'evaluation',
        'refinement',
        'action_planning',
      ]
      const currentIndex = stages.indexOf(data.currentStage)
      const nextStage = stages[Math.min(currentIndex + 1, stages.length - 1)]
      return {
        session: { ...data.session, stage: nextStage },
      }
    }

    default:
      return { success: true }
  }
}

function generateMockResponse(transcript: string): string {
  const responses = [
    "That's a fascinating idea! Let me help you explore that concept further.",
    'I can see the potential in that approach. What specific problem would this solve?',
    'Interesting perspective! How do you envision users interacting with this feature?',
    "Great thinking! Let's dive deeper into the technical feasibility of this idea.",
    'I love the creativity here! What would make this stand out from existing solutions?',
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

function extractMockIdeas(
  transcript: string
): Array<{ content: string; category: string; confidence: number }> {
  const ideas = []

  // Simple keyword-based idea extraction simulation
  if (transcript.includes('app')) {
    ideas.push({
      content: transcript.substring(0, Math.min(transcript.length, 100)),
      category: 'application',
      confidence: 0.8 + Math.random() * 0.2,
    })
  }

  if (transcript.includes('AI') || transcript.includes('artificial intelligence')) {
    ideas.push({
      content: 'AI-powered feature integration',
      category: 'technology',
      confidence: 0.9,
    })
  }

  return ideas
}

function generateMockInsights(transcript: string): string[] {
  const insights = [
    'Strong focus on user experience',
    'Technology-forward thinking',
    'Market-aware approach',
    'Innovation-driven mindset',
    'Problem-solving orientation',
  ]

  return insights.slice(0, Math.floor(Math.random() * 3) + 1)
}

async function runVoiceBrainstormDemo() {
  logSection('🎤 Voice Brainstorming System Demo')

  log('Welcome to the AI-Powered Voice Brainstorming Demo!', 'cyan')
  log('This demo simulates a complete brainstorming session with mock data.\n', 'cyan')

  try {
    // Step 1: Initialize Multi-Agent System
    logStep('Initializing Multi-Agent System...')

    // Mock the system initialization
    const orchestratorId = await mockApiCall('create_agent', { type: 'orchestrator' })
    const brainstormId = await mockApiCall('create_agent', { type: 'brainstorm' })

    logStep('Multi-Agent System initialized successfully', 'success')
    log(`  • Orchestrator Agent: ${orchestratorId.id}`, 'green')
    log(`  • Brainstorm Agent: ${brainstormId.id}`, 'green')

    // Step 2: Create Session
    logStep('Creating brainstorming session...')

    const sessionData = await mockApiCall('create_session', {
      userId: DEMO_CONFIG.userId,
      type: 'brainstorm',
    })

    logStep('Session created successfully', 'success')
    log(`  • Session ID: ${sessionData.session.id}`, 'green')
    log(`  • User ID: ${sessionData.session.userId}`, 'green')

    // Step 3: Start Brainstorm Session
    logStep('Starting voice brainstorm session...')

    const brainstormData = await mockApiCall('start_brainstorm', {
      sessionId: sessionData.session.id,
      topic: DEMO_CONFIG.topic,
      creativityLevel: DEMO_CONFIG.creativityLevel,
    })

    logStep('Brainstorm session started', 'success')
    log(`  • Topic: ${brainstormData.brainstormSession.topic}`, 'green')
    log(`  • Stage: ${brainstormData.brainstormSession.stage}`, 'green')
    log(`  • Creativity Level: ${DEMO_CONFIG.creativityLevel}`, 'green')

    // Step 4: Simulate Voice Transcription and Processing
    logSection('🎙️ Voice Processing Simulation')

    const allIdeas: any[] = []
    const allInsights: string[] = []
    let currentStage = 'exploration'

    for (let i = 0; i < DEMO_CONFIG.mockTranscripts.length; i++) {
      const transcript = DEMO_CONFIG.mockTranscripts[i]

      logStep(`Processing voice input ${i + 1}/${DEMO_CONFIG.mockTranscripts.length}...`)
      log(`  🗣️  "${transcript}"`, 'yellow')

      // Simulate transcription processing
      await delay(1500)

      const voiceResponse = await mockApiCall('process_voice', {
        sessionId: sessionData.session.id,
        transcript,
        confidence: 0.9 + Math.random() * 0.1,
      })

      logStep('Voice input processed', 'success')
      log(`  🤖 Agent: "${voiceResponse.response.content}"`, 'cyan')

      if (voiceResponse.extractedIdeas.length > 0) {
        log(`  💡 Ideas extracted: ${voiceResponse.extractedIdeas.length}`, 'magenta')
        voiceResponse.extractedIdeas.forEach((idea: any, idx: number) => {
          log(
            `     ${idx + 1}. ${idea.content} (${(idea.confidence * 100).toFixed(1)}%)`,
            'magenta'
          )
        })
        allIdeas.push(...voiceResponse.extractedIdeas)
      }

      if (voiceResponse.insights.length > 0) {
        log(`  🔍 Insights: ${voiceResponse.insights.join(', ')}`, 'blue')
        allInsights.push(...voiceResponse.insights)
      }

      // Simulate stage advancement every 2 inputs
      if ((i + 1) % 2 === 0 && currentStage !== 'action_planning') {
        logStep('Advancing brainstorm stage...')
        const stageResponse = await mockApiCall('advance_stage', {
          sessionId: sessionData.session.id,
          currentStage,
          session: brainstormData.brainstormSession,
        })
        currentStage = stageResponse.session.stage
        logStep(`Advanced to ${currentStage} stage`, 'success')
      }

      console.log('') // Add spacing
    }

    // Step 5: Generate Session Summary
    logSection('📊 Session Summary')

    const uniqueIdeas = Array.from(new Set(allIdeas.map((idea) => idea.content)))
    const uniqueInsights = Array.from(new Set(allInsights))

    log('Brainstorming Session Complete!', 'bright')
    log(`  • Duration: ${DEMO_CONFIG.sessionDuration / 60} minutes (simulated)`, 'green')
    log(`  • Voice Inputs Processed: ${DEMO_CONFIG.mockTranscripts.length}`, 'green')
    log(`  • Ideas Generated: ${uniqueIdeas.length}`, 'green')
    log(`  • Insights Discovered: ${uniqueInsights.length}`, 'green')
    log(`  • Final Stage: ${currentStage}`, 'green')

    // Display top ideas
    if (uniqueIdeas.length > 0) {
      log('\n💡 Generated Ideas:', 'bright')
      uniqueIdeas.slice(0, 5).forEach((idea, idx) => {
        log(`   ${idx + 1}. ${idea}`, 'magenta')
      })
    }

    // Display insights
    if (uniqueInsights.length > 0) {
      log('\n🔍 Key Insights:', 'bright')
      uniqueInsights.slice(0, 5).forEach((insight, idx) => {
        log(`   ${idx + 1}. ${insight}`, 'blue')
      })
    }

    // Step 6: Next Steps Recommendations
    logSection('🚀 Next Steps')

    const nextSteps = [
      'Develop the top 3 ideas into detailed concepts',
      'Create quick prototypes to validate assumptions',
      'Conduct user research to gather feedback',
      'Analyze market competition and opportunities',
      'Define technical requirements and feasibility',
    ]

    log('Recommended Next Steps:', 'bright')
    nextSteps.forEach((step, idx) => {
      log(`   ${idx + 1}. ${step}`, 'cyan')
    })

    // Demo completion
    logSection('✨ Demo Complete')

    log('The Voice Brainstorming System Demo has completed successfully!', 'green')
    log('\nKey Features Demonstrated:', 'bright')
    log('  ✅ Multi-Agent System Initialization', 'green')
    log('  ✅ Voice Transcription Processing', 'green')
    log('  ✅ Intelligent Idea Extraction', 'green')
    log('  ✅ Contextual Agent Responses', 'green')
    log('  ✅ Brainstorming Stage Progression', 'green')
    log('  ✅ Session Analytics and Insights', 'green')

    log('\n🎯 Ready to try the real system?', 'cyan')
    log('   Run: bun run dev', 'cyan')
    log('   Visit: http://localhost:3000/voice-brainstorm', 'cyan')
  } catch (error) {
    logStep('Demo failed with error', 'error')
    console.error(error)
    process.exit(1)
  }
}

// Performance monitoring
async function runPerformanceTest() {
  logSection('⚡ Performance Test')

  const startTime = Date.now()
  const iterations = 10

  logStep(`Running ${iterations} concurrent session simulations...`)

  const promises = Array.from({ length: iterations }, async (_, i) => {
    const sessionData = await mockApiCall('create_session', {
      userId: `perf-user-${i}`,
      type: 'brainstorm',
    })

    const brainstormData = await mockApiCall('start_brainstorm', {
      sessionId: sessionData.session.id,
      topic: `Performance Test Topic ${i}`,
    })

    // Process multiple voice inputs
    for (let j = 0; j < 3; j++) {
      await mockApiCall('process_voice', {
        sessionId: sessionData.session.id,
        transcript: `Performance test transcript ${i}-${j}`,
        confidence: 0.95,
      })
    }

    return { sessionId: sessionData.session.id, ideas: 3 }
  })

  const results = await Promise.all(promises)
  const endTime = Date.now()
  const duration = endTime - startTime

  logStep('Performance test completed', 'success')
  log(`  • Sessions: ${results.length}`, 'green')
  log(`  • Total Duration: ${duration}ms`, 'green')
  log(`  • Average per Session: ${(duration / results.length).toFixed(2)}ms`, 'green')
  log(`  • Ideas Generated: ${results.reduce((sum, r) => sum + r.ideas, 0)}`, 'green')
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--performance') || args.includes('-p')) {
    await runPerformanceTest()
  } else {
    await runVoiceBrainstormDemo()
  }

  if (args.includes('--with-performance')) {
    console.log('\n')
    await runPerformanceTest()
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

// Run the demo
if (import.meta.main) {
  main().catch(console.error)
}
