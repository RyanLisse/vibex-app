import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMultiAgentSystem } from '@/lib/letta/multi-agent-system'
import { getLogger } from '@/lib/logging/safe-wrapper'

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const logger = getLogger('api-agents-brainstorm')

// Enhanced brainstorm request schemas
const StartVoiceBrainstormSchema = z.object({
  userId: z.string(),
  topic: z.string(),
  voiceEnabled: z.boolean().default(true),
  creativityLevel: z.enum(['conservative', 'balanced', 'creative', 'wild']).default('balanced'),
  focusAreas: z.array(z.string()).default([]),
})

const ProcessVoiceInputSchema = z.object({
  sessionId: z.string(),
  transcript: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  audioLevel: z.number().optional(),
  timestamp: z.string().datetime().optional(),
})

const AnalyzeIdeasSchema = z.object({
  sessionId: z.string(),
  ideas: z.array(
    z.object({
      content: z.string(),
      source: z.enum(['voice', 'text']),
      timestamp: z.string().datetime(),
    })
  ),
})

const GenerateInsightsSchema = z.object({
  sessionId: z.string(),
  stage: z.enum([
    'exploration',
    'clarification',
    'expansion',
    'evaluation',
    'refinement',
    'action_planning',
  ]),
  transcripts: z.array(z.string()),
  ideas: z.array(
    z.object({
      content: z.string(),
      score: z.number(),
    })
  ),
})

// GET /api/agents/brainstorm - Get brainstorm session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const action = searchParams.get('action')

    const system = getMultiAgentSystem()

    switch (action) {
      case 'status': {
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'Session ID required' },
            { status: 400 }
          )
        }

        const session = await system.getSession(sessionId)
        const brainstormSession = system.getBrainstormSummary
          ? await system.getBrainstormSummary(sessionId)
          : null

        return NextResponse.json({
          success: true,
          data: {
            session,
            brainstormSession,
          },
        })
      }

      case 'capabilities': {
        return NextResponse.json({
          success: true,
          data: {
            voiceEnabled: true,
            realtimeTranscription: true,
            creativityLevels: ['conservative', 'balanced', 'creative', 'wild'],
            stages: [
              'exploration',
              'clarification',
              'expansion',
              'evaluation',
              'refinement',
              'action_planning',
            ],
            supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt'],
          },
        })
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Error in brainstorm GET', error as Error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agents/brainstorm - Enhanced brainstorm operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const system = getMultiAgentSystem()

    switch (action) {
      case 'start_voice_brainstorm': {
        const { userId, topic, voiceEnabled, creativityLevel, focusAreas } =
          StartVoiceBrainstormSchema.parse(body)

        // Create a specialized voice brainstorm session
        const session = await system.createSession(userId, 'brainstorm')
        const brainstormSession = await system.startBrainstormSession(session.id, topic)

        // Configure the brainstorm agent for voice interaction
        const enhancedPrompt = generateVoiceBrainstormPrompt(topic, creativityLevel, focusAreas)

        return NextResponse.json({
          success: true,
          data: {
            session,
            brainstormSession,
            voiceConfig: {
              enabled: voiceEnabled,
              creativityLevel,
              focusAreas,
              prompt: enhancedPrompt,
            },
          },
        })
      }

      case 'process_voice_input': {
        const { sessionId, transcript, confidence, audioLevel, timestamp } =
          ProcessVoiceInputSchema.parse(body)

        // Process the voice transcript through the brainstorm agent
        const response = await system.processMessage(
          sessionId,
          `[Voice Input - Confidence: ${confidence || 'N/A'}] ${transcript}`,
          false
        )

        // Extract and analyze ideas from the transcript
        const extractedIdeas = await extractIdeasFromTranscript(transcript)

        // Generate contextual insights based on current stage
        const session = await system.getSession(sessionId)
        const insights = session
          ? await generateStageInsights(session, transcript, extractedIdeas)
          : []

        return NextResponse.json({
          success: true,
          data: {
            response,
            extractedIdeas,
            insights,
            processingMetadata: {
              confidence,
              audioLevel,
              timestamp: timestamp || new Date().toISOString(),
              wordCount: transcript.split(' ').length,
            },
          },
        })
      }

      case 'analyze_ideas': {
        const { sessionId, ideas } = AnalyzeIdeasSchema.parse(body)

        // Use AI to analyze and score ideas
        const analysis = await analyzeIdeasWithAI(ideas)

        // Update brainstorm session with analyzed ideas
        // Intentionally sequential to maintain order and avoid overwhelming the system
        for (const idea of ideas) {
          // This would typically update the brainstorm agent's memory
          await system.processMessage(
            sessionId,
            `Analyze this idea: "${idea.content}" (Source: ${idea.source})`,
            false
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            analysis,
            recommendations: generateIdeaRecommendations(analysis),
          },
        })
      }

      case 'generate_insights': {
        const { stage, transcripts, ideas } = GenerateInsightsSchema.parse(body)

        // Generate stage-specific insights
        const insights = await generateAdvancedInsights(stage, transcripts, ideas)

        // Get next stage recommendations
        const nextStageRecommendations = getNextStageRecommendations(stage, insights)

        return NextResponse.json({
          success: true,
          data: {
            insights,
            nextStageRecommendations,
            stageProgress: calculateStageProgress(stage, transcripts, ideas),
          },
        })
      }

      case 'voice_summary': {
        const { sessionId } = z.object({ sessionId: z.string() }).parse(body)

        const summary = await system.getBrainstormSummary(sessionId)
        const voiceSummary = await generateVoiceFriendlySummary(summary)

        return NextResponse.json({
          success: true,
          data: {
            summary,
            voiceSummary,
            audioScript: generateAudioScript(voiceSummary),
          },
        })
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Error in brainstorm POST', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function generateVoiceBrainstormPrompt(
  topic: string,
  creativityLevel: string,
  focusAreas: string[]
): string {
  const creativityInstructions = {
    conservative: 'Focus on practical, proven approaches. Prioritize feasibility.',
    balanced:
      'Balance creativity with practicality. Explore both innovative and traditional solutions.',
    creative: 'Encourage bold thinking and novel approaches. Push boundaries.',
    wild: 'Embrace radical thinking and unconventional ideas. Challenge all assumptions.',
  }

  return `
You are facilitating a voice-powered brainstorming session about: "${topic}"

Creativity Level: ${creativityLevel.toUpperCase()}
${creativityInstructions[creativityLevel as keyof typeof creativityInstructions]}

Focus Areas: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'General exploration'}

Voice Interaction Guidelines:
- Respond conversationally and naturally
- Ask follow-up questions to dig deeper
- Acknowledge and build on user's voice input
- Use encouraging language to maintain creative flow
- Provide verbal cues for stage transitions
- Summarize key points periodically

Remember: This is a voice conversation, so keep responses engaging and easy to follow when spoken aloud.
  `.trim()
}

function extractIdeasFromTranscript(transcript: string): Array<{
  content: string
  category: string
  confidence: number
}> {
  // Enhanced idea extraction using pattern matching and NLP techniques
  const ideas: Array<{
    content: string
    category: string
    confidence: number
  }> = []

  // Idea trigger patterns
  const ideaPatterns = [
    {
      pattern: /(?:what if|imagine if|suppose|let's say)\s+(.+?)(?:\.|$)/gi,
      category: 'hypothetical',
      confidence: 0.8,
    },
    {
      pattern: /(?:we could|might|should|would)\s+(.+?)(?:\.|$)/gi,
      category: 'suggestion',
      confidence: 0.7,
    },
    {
      pattern: /(?:idea|thought|concept|approach):\s*(.+?)(?:\.|$)/gi,
      category: 'explicit',
      confidence: 0.9,
    },
    {
      pattern: /(?:solution|answer|way to)\s+(.+?)(?:\.|$)/gi,
      category: 'solution',
      confidence: 0.8,
    },
    {
      pattern: /(?:maybe|perhaps|possibly)\s+(.+?)(?:\.|$)/gi,
      category: 'possibility',
      confidence: 0.6,
    },
  ]

  for (const { pattern, category, confidence } of ideaPatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(transcript)) !== null) {
      const content = match[1].trim()
      if (content.length > 10 && content.length < 200) {
        ideas.push({
          content,
          category,
          confidence,
        })
      }
    }
  }

  // Remove duplicates and sort by confidence
  const uniqueIdeas = ideas.filter(
    (idea, index, self) =>
      index === self.findIndex((i) => i.content.toLowerCase() === idea.content.toLowerCase())
  )

  return uniqueIdeas.sort((a, b) => b.confidence - a.confidence)
}

function analyzeIdeasWithAI(ideas: Array<{ content: string; source: string }>): {
  scores: Array<{
    content: string
    feasibility: number
    impact: number
    novelty: number
    overall: number
  }>
  categories: Record<string, string[]>
  themes: string[]
} {
  // Simulate AI analysis (in production, this would call an AI service)
  const scores = ideas.map((idea) => ({
    content: idea.content,
    feasibility: Math.random() * 10,
    impact: Math.random() * 10,
    novelty: Math.random() * 10,
    overall: Math.random() * 10,
  }))

  // Categorize ideas
  const categories: Record<string, string[]> = {
    Technical: [],
    Business: [],
    Creative: [],
    Process: [],
    Strategic: [],
  }

  for (const idea of ideas) {
    const category =
      Object.keys(categories)[Math.floor(Math.random() * Object.keys(categories).length)]
    categories[category].push(idea.content)
  }

  // Extract themes
  const themes = ['Innovation', 'Efficiency', 'User Experience', 'Scalability', 'Sustainability']

  return { scores, categories, themes }
}

function generateIdeaRecommendations(_analysis: unknown): string[] {
  return [
    'Focus on high-impact, high-feasibility ideas first',
    'Combine complementary ideas for hybrid solutions',
    'Consider the novel approaches for differentiation',
    'Validate assumptions with quick experiments',
    'Prioritize ideas that align with your core strengths',
  ]
}

function generateStageInsights(session: unknown, _transcript: string, ideas: unknown[]): string[] {
  const insights: string[] = []

  // Stage-specific insight generation
  switch ((session as any).type) {
    case 'exploration':
      insights.push("You're exploring the core concept well")
      if (ideas.length > 0) {
        insights.push(`Generated ${ideas.length} initial ideas from this input`)
      }
      break

    case 'expansion':
      insights.push('Good variety in your thinking approaches')
      break

    case 'evaluation':
      insights.push('Consider both short-term and long-term implications')
      break

    default:
      insights.push('Continue exploring and developing your ideas')
      break
  }

  return insights
}

function generateAdvancedInsights(
  _stage: string,
  _transcripts: string[],
  _ideas: Array<{ content: string; score: number }>
): {
  patterns: string[]
  gaps: string[]
  strengths: string[]
  recommendations: string[]
} {
  return {
    patterns: [
      'Strong focus on user-centered solutions',
      'Tendency toward technical implementations',
      'Creative problem-solving approach evident',
    ],
    gaps: [
      'Consider market validation aspects',
      'Explore resource requirements more deeply',
      'Think about potential obstacles',
    ],
    strengths: [
      'Clear articulation of core concepts',
      'Good balance of practical and innovative ideas',
      'Strong understanding of user needs',
    ],
    recommendations: [
      'Develop the top 3 ideas further',
      'Create quick prototypes to test assumptions',
      'Seek feedback from potential users',
    ],
  }
}

function getNextStageRecommendations(stage: string, _insights: unknown): string[] {
  const stageMap: Record<string, string[]> = {
    exploration: [
      'Move to clarification to define scope and audience',
      'Ensure core concept is well-articulated',
    ],
    clarification: [
      'Ready for expansion - generate more alternatives',
      'Consider different approaches and variations',
    ],
    expansion: [
      'Time to evaluate - assess feasibility and impact',
      'Compare and contrast your options',
    ],
    evaluation: ['Begin refinement - combine best elements', 'Address identified weaknesses'],
    refinement: ['Create action plan with concrete steps', 'Define timelines and resource needs'],
  }

  return stageMap[stage] || ['Continue with current stage']
}

function calculateStageProgress(
  _stage: string,
  transcripts: string[],
  ideas: Array<{ content: string; score: number }>
): number {
  // Simple progress calculation based on activity
  const baseProgress = Math.min(transcripts.length * 10, 60)
  const ideaBonus = Math.min(ideas.length * 5, 30)
  const qualityBonus =
    ideas.length > 0
      ? Math.min(ideas.reduce((sum, idea) => sum + idea.score, 0) / ideas.length, 10)
      : 0

  return Math.min(baseProgress + ideaBonus + qualityBonus, 100)
}

function generateVoiceFriendlySummary(summary: unknown): {
  spokenSummary: string
  keyPoints: string[]
  nextSteps: string[]
} {
  return {
    spokenSummary: `Great brainstorming session! We explored ${(summary as any)?.session?.topic || 'your idea'} and generated several promising directions.`,
    keyPoints: [
      'Identified core problem and opportunity',
      'Generated multiple solution approaches',
      'Evaluated feasibility and impact',
    ],
    nextSteps: ['Develop top ideas further', 'Create quick prototypes', 'Gather user feedback'],
  }
}

function generateAudioScript(voiceSummary: unknown): string {
  return `
${(voiceSummary as any).spokenSummary}

Here are the key points we covered:
${(voiceSummary as any).keyPoints.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}

For next steps, I recommend:
${(voiceSummary as any).nextSteps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}

Would you like to continue exploring any of these areas further?
  `.trim()
}
