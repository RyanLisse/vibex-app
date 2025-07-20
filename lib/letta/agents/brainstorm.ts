import { z } from 'zod'
import type { AgentConfig, LettaClient, Message } from '../client'

// Brainstorm Agent Configuration
export const BrainstormConfigSchema = z.object({
  name: z.string().default('Brainstorm Guide'),
  model: z.string().default('gemini-1.5-pro'),
  creativityLevel: z.enum(['conservative', 'balanced', 'creative', 'wild']).default('balanced'),
  focusAreas: z
    .array(z.string())
    .default(['problem_solving', 'innovation', 'strategic_thinking', 'creative_exploration']),
})

export type BrainstormConfig = z.infer<typeof BrainstormConfigSchema>

// Brainstorm Session Types
export const BrainstormSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  topic: z.string(),
  stage: z.enum([
    'exploration',
    'clarification',
    'expansion',
    'evaluation',
    'refinement',
    'action_planning',
  ]),
  ideas: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      category: z.string(),
      score: z.number().min(0).max(10),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })
  ),
  insights: z.array(z.string()),
  nextSteps: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type BrainstormSession = z.infer<typeof BrainstormSessionSchema>

export class BrainstormAgent {
  private client: LettaClient
  private agentId: string | null = null
  private config: BrainstormConfig
  private activeSessions: Map<string, BrainstormSession> = new Map()
  private sessionIdMap: Map<string, string> = new Map() // Maps external sessionId to internal brainstorm sessionId

  constructor(client: LettaClient, config: Partial<BrainstormConfig> = {}) {
    this.client = client
    this.config = BrainstormConfigSchema.parse(config)
  }

  async initialize(): Promise<string> {
    const systemPrompt = this.generateSystemPrompt()

    const agentConfig: AgentConfig = {
      id: '',
      name: this.config.name,
      type: 'memgpt',
      model: this.config.model,
      systemPrompt,
      tools: [
        'idea_generation',
        'concept_mapping',
        'swot_analysis',
        'mind_mapping',
        'scenario_planning',
      ],
      memoryBlocks: [
        'session_context',
        'user_preferences',
        'idea_repository',
        'brainstorm_history',
      ],
      voiceEnabled: true,
      lowLatency: false,
    }

    const result = await this.client.createAgent(agentConfig)
    this.agentId = result.id

    return this.agentId
  }

  private generateSystemPrompt(): string {
    const creativityInstructions = {
      conservative:
        'Focus on practical, proven approaches. Prioritize feasibility and risk mitigation.',
      balanced:
        'Balance creativity with practicality. Explore both innovative and traditional solutions.',
      creative:
        'Encourage bold thinking and novel approaches. Push boundaries while maintaining some grounding.',
      wild: 'Embrace radical thinking and unconventional ideas. Challenge all assumptions and explore the impossible.',
    }

    return `
You are the Brainstorm Guide, a specialized AI agent designed to help users refine, expand, and develop their ideas through structured brainstorming sessions.

## Core Mission:
Guide users through a comprehensive brainstorming process that transforms vague concepts into actionable plans.

## Creativity Level: ${this.config.creativityLevel.toUpperCase()}
${creativityInstructions[this.config.creativityLevel]}

## Brainstorming Framework:

### 1. EXPLORATION STAGE
- Help users articulate their initial idea clearly
- Ask probing questions to understand the core concept
- Identify the problem or opportunity being addressed
- Explore the user's motivations and goals

### 2. CLARIFICATION STAGE  
- Define key terms and concepts
- Establish scope and boundaries
- Identify target audience or beneficiaries
- Clarify success criteria and constraints

### 3. EXPANSION STAGE
- Generate multiple variations and alternatives
- Use techniques like:
  - "What if..." scenarios
  - Reverse brainstorming
  - SCAMPER method (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse)
  - Mind mapping
  - Analogical thinking

### 4. EVALUATION STAGE
- Assess ideas using multiple criteria:
  - Feasibility (technical, financial, time)
  - Impact potential
  - Uniqueness/differentiation
  - Alignment with goals
  - Resource requirements

### 5. REFINEMENT STAGE
- Combine complementary ideas
- Address identified weaknesses
- Develop hybrid solutions
- Create implementation frameworks

### 6. ACTION PLANNING STAGE
- Break down selected ideas into actionable steps
- Identify required resources and skills
- Create timelines and milestones
- Suggest next immediate actions

## Communication Style:
- Ask thoughtful, open-ended questions
- Use the Socratic method to guide discovery
- Encourage wild ideas before evaluating them
- Build on user responses enthusiastically
- Provide structured summaries at each stage
- Use visual thinking techniques when helpful

## Tools and Techniques:
- Mind mapping and concept visualization
- SWOT analysis (Strengths, Weaknesses, Opportunities, Threats)
- Force field analysis
- Scenario planning
- Design thinking principles
- Lateral thinking exercises

## Memory Management:
- Track the evolution of ideas throughout the session
- Remember user preferences and thinking patterns
- Build a repository of successful brainstorming approaches
- Maintain context across multiple sessions

Always maintain an encouraging, curious, and non-judgmental attitude. Every idea has potential value, and your role is to help users discover and develop that potential.
    `.trim()
  }

  async startBrainstormSession(
    userId: string,
    topic: string,
    externalSessionId?: string
  ): Promise<BrainstormSession> {
    const brainstormSessionId = `brainstorm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session: BrainstormSession = {
      id: brainstormSessionId,
      userId,
      topic,
      stage: 'exploration',
      ideas: [],
      insights: [],
      nextSteps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.activeSessions.set(brainstormSessionId, session)

    // Map external sessionId to internal brainstorm sessionId if provided
    if (externalSessionId) {
      this.sessionIdMap.set(externalSessionId, brainstormSessionId)
    }

    // Initialize the brainstorming session with the agent
    if (this.agentId) {
      const initMessage = `
Starting a new brainstorming session:
- User ID: ${userId}
- Topic: ${topic}
- Session ID: ${brainstormSessionId}

Begin with the EXPLORATION stage. Help the user articulate and explore their idea about: "${topic}"

Ask engaging questions to understand:
1. What sparked this idea?
2. What problem or opportunity does it address?
3. Who would benefit from this?
4. What's the desired outcome?

Keep the conversation flowing naturally while gathering this foundational information.
      `.trim()

      await this.client.sendMessage(this.agentId, initMessage)
    }

    return session
  }

  async processMessage(
    sessionId: string,
    message: string,
    streaming = false
  ): Promise<Message | ReadableStream> {
    if (!this.agentId) {
      throw new Error('Brainstorm agent not initialized')
    }

    // Check if this is an external sessionId that needs to be mapped
    const brainstormSessionId = this.sessionIdMap.get(sessionId) || sessionId
    const session = this.activeSessions.get(brainstormSessionId)
    if (!session) {
      throw new Error('Brainstorm session not found')
    }

    // Update session context
    const contextMessage = `
Session Context:
- Session ID: ${brainstormSessionId}
- Current Stage: ${session.stage}
- Topic: ${session.topic}
- Ideas Generated: ${session.ideas.length}
- User Message: "${message}"

Continue guiding the brainstorming process based on the current stage and user input.
    `.trim()

    const response = await this.client.sendMessage(this.agentId, contextMessage, streaming)

    // Update session timestamp
    session.updatedAt = new Date()
    this.activeSessions.set(sessionId, session)

    return response
  }

  async advanceStage(sessionId: string): Promise<BrainstormSession> {
    // Check if this is an external sessionId that needs to be mapped
    const brainstormSessionId = this.sessionIdMap.get(sessionId) || sessionId
    const session = this.activeSessions.get(brainstormSessionId)
    if (!session) {
      throw new Error('Brainstorm session not found')
    }

    const stageOrder: BrainstormSession['stage'][] = [
      'exploration',
      'clarification',
      'expansion',
      'evaluation',
      'refinement',
      'action_planning',
    ]

    const currentIndex = stageOrder.indexOf(session.stage)
    if (currentIndex < stageOrder.length - 1) {
      session.stage = stageOrder[currentIndex + 1]
      session.updatedAt = new Date()
      this.activeSessions.set(sessionId, session)

      // Notify the agent about stage advancement
      if (this.agentId) {
        const stageMessage = `
The brainstorming session has advanced to the ${session.stage.toUpperCase()} stage.

Please guide the user through this new stage according to the framework:
- Current stage: ${session.stage}
- Session ID: ${brainstormSessionId}
- Ideas so far: ${session.ideas.length}

Transition smoothly and explain what we'll focus on in this stage.
        `.trim()

        await this.client.sendMessage(this.agentId, stageMessage)
      }
    }

    return session
  }

  async addIdea(sessionId: string, content: string, category = 'general'): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error('Brainstorm session not found')
    }

    const idea = {
      id: `idea_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      content,
      category,
      score: 5, // Default neutral score
      pros: [],
      cons: [],
    }

    session.ideas.push(idea)
    session.updatedAt = new Date()
    this.activeSessions.set(sessionId, session)
  }

  async evaluateIdea(
    sessionId: string,
    ideaId: string,
    score: number,
    pros: string[] = [],
    cons: string[] = []
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error('Brainstorm session not found')
    }

    const idea = session.ideas.find((i) => i.id === ideaId)
    if (!idea) {
      throw new Error('Idea not found')
    }

    idea.score = Math.max(0, Math.min(10, score))
    idea.pros = [...idea.pros, ...pros]
    idea.cons = [...idea.cons, ...cons]

    session.updatedAt = new Date()
    this.activeSessions.set(sessionId, session)
  }

  async getSessionSummary(sessionId: string): Promise<{
    session: BrainstormSession
    topIdeas: BrainstormSession['ideas']
    recommendations: string[]
  }> {
    // Check if this is an external sessionId that needs to be mapped
    const brainstormSessionId = this.sessionIdMap.get(sessionId) || sessionId
    const session = this.activeSessions.get(brainstormSessionId)
    if (!session) {
      throw new Error('Brainstorm session not found')
    }

    const topIdeas = session.ideas.sort((a, b) => b.score - a.score).slice(0, 5)

    const recommendations = [
      'Consider combining your top-rated ideas for a hybrid approach',
      'Prototype the most feasible idea first to validate assumptions',
      'Seek feedback from potential users or stakeholders',
      'Research similar solutions to identify differentiation opportunities',
      'Create a detailed implementation plan for your chosen direction',
    ]

    return {
      session,
      topIdeas,
      recommendations,
    }
  }

  async endSession(sessionId: string): Promise<BrainstormSession> {
    // Check if this is an external sessionId that needs to be mapped
    const brainstormSessionId = this.sessionIdMap.get(sessionId) || sessionId
    const session = this.activeSessions.get(brainstormSessionId)
    if (!session) {
      throw new Error('Brainstorm session not found')
    }

    // Generate final summary and next steps
    if (this.agentId) {
      const summaryMessage = `
Brainstorming session ending. Please provide a comprehensive summary:

Session Details:
- Topic: ${session.topic}
- Ideas Generated: ${session.ideas.length}
- Current Stage: ${session.stage}

Please summarize:
1. Key insights discovered
2. Most promising ideas
3. Recommended next steps
4. Any additional considerations

Make this a valuable conclusion to the brainstorming process.
      `.trim()

      await this.client.sendMessage(this.agentId, summaryMessage)
    }

    // Keep session in memory but mark as completed
    session.updatedAt = new Date()

    return session
  }

  getActiveSession(sessionId: string): BrainstormSession | undefined {
    return this.activeSessions.get(sessionId)
  }

  getAgentId(): string | null {
    return this.agentId
  }
}
