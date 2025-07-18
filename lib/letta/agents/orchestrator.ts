import { z } from 'zod'
import type { AgentConfig, LettaClient, Message } from '../client'

// Orchestrator Agent Configuration
export const OrchestratorConfigSchema = z.object({
  name: z.string().default('Main Orchestrator'),
  geminiModel: z.string().default('gemini-1.5-pro'),
  voiceEnabled: z.boolean().default(true),
  lowLatency: z.boolean().default(true),
  tools: z
    .array(z.string())
    .default(['web_search', 'code_execution', 'file_management', 'agent_communication']),
})

export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>

export class OrchestratorAgent {
  private client: LettaClient
  private agentId: string | null = null
  private config: OrchestratorConfig

  constructor(client: LettaClient, config: Partial<OrchestratorConfig> = {}) {
    this.client = client
    this.config = OrchestratorConfigSchema.parse(config)
  }

  async initialize(): Promise<string> {
    const systemPrompt = `
You are the Main Orchestrator Agent, a sophisticated AI assistant that coordinates multiple specialized agents to help users achieve their goals.

## Core Responsibilities:
1. **User Interaction**: Engage naturally with users through text and voice
2. **Task Analysis**: Break down complex requests into manageable components
3. **Agent Coordination**: Delegate tasks to specialized agents (brainstorm, research, coding, etc.)
4. **Context Management**: Maintain conversation context and user preferences
5. **Quality Assurance**: Ensure all responses meet high standards

## Available Agents:
- **Brainstorm Agent**: Helps refine ideas and explore possibilities
- **Research Agent**: Gathers information and analyzes data
- **Code Agent**: Handles programming and technical tasks
- **Creative Agent**: Assists with creative writing and design

## Communication Style:
- Be conversational and helpful
- Ask clarifying questions when needed
- Provide clear status updates on multi-step tasks
- Adapt tone based on user preferences

## Voice Capabilities:
- Process voice input naturally
- Respond with appropriate voice tone and pacing
- Handle interruptions gracefully
- Maintain context across voice/text switches

## Memory Management:
- Remember user preferences and context
- Track ongoing projects and conversations
- Learn from user feedback and interactions
- Maintain professional boundaries

Always prioritize user experience and provide value in every interaction.
    `.trim()

    const agentConfig: AgentConfig = {
      id: '', // Will be set by API
      name: this.config.name,
      type: 'low-latency',
      model: this.config.geminiModel,
      systemPrompt,
      tools: this.config.tools,
      memoryBlocks: ['user_context', 'conversation_history', 'preferences'],
      voiceEnabled: this.config.voiceEnabled,
      lowLatency: this.config.lowLatency,
    }

    const result = await this.client.createAgent(agentConfig)
    this.agentId = result.id

    return this.agentId
  }

  async processMessage(message: string, streaming = false): Promise<Message | ReadableStream> {
    if (!this.agentId) {
      throw new Error('Orchestrator agent not initialized')
    }

    // Analyze message to determine if other agents are needed
    const analysis = await this.analyzeMessage(message)

    if (analysis.needsBrainstorming) {
      return this.coordinateWithBrainstormAgent(message)
    }

    return this.client.sendMessage(this.agentId, message, streaming)
  }

  async processVoiceMessage(audioData: ArrayBuffer): Promise<{
    audioResponse: ArrayBuffer
    textResponse: string
  }> {
    if (!this.agentId) {
      throw new Error('Orchestrator agent not initialized')
    }

    const session = await this.client.createVoiceSession(this.agentId)
    return this.client.sendVoiceMessage(this.agentId, session.sessionId, audioData)
  }

  private async analyzeMessage(message: string): Promise<{
    needsBrainstorming: boolean
    needsResearch: boolean
    needsCoding: boolean
    complexity: 'low' | 'medium' | 'high'
  }> {
    // Simple keyword-based analysis (can be enhanced with ML)
    const lowerMessage = message.toLowerCase()

    const brainstormKeywords = [
      'idea',
      'brainstorm',
      'think',
      'explore',
      'possibilities',
      'options',
      'alternatives',
      'creative',
      'innovative',
    ]

    const researchKeywords = [
      'research',
      'find',
      'search',
      'information',
      'data',
      'analyze',
      'compare',
      'investigate',
    ]

    const codingKeywords = [
      'code',
      'program',
      'develop',
      'build',
      'implement',
      'function',
      'api',
      'database',
      'algorithm',
    ]

    return {
      needsBrainstorming: brainstormKeywords.some((keyword) => lowerMessage.includes(keyword)),
      needsResearch: researchKeywords.some((keyword) => lowerMessage.includes(keyword)),
      needsCoding: codingKeywords.some((keyword) => lowerMessage.includes(keyword)),
      complexity: message.length > 200 ? 'high' : message.length > 50 ? 'medium' : 'low',
    }
  }

  private async coordinateWithBrainstormAgent(message: string): Promise<Message> {
    if (!this.agentId) {
      throw new Error('Orchestrator agent not initialized')
    }

    // This would coordinate with the brainstorm agent
    // For now, we'll enhance the message and process it
    const enhancedMessage = `
The user wants to brainstorm about: "${message}"

Please help them:
1. Clarify their core idea
2. Explore different angles and possibilities
3. Identify potential challenges and solutions
4. Suggest next steps

Engage them in a collaborative brainstorming session.
    `.trim()

    return this.client.sendMessage(this.agentId, enhancedMessage) as Promise<Message>
  }

  async updateUserContext(context: Record<string, any>): Promise<void> {
    if (!this.agentId) {
      throw new Error('Orchestrator agent not initialized')
    }

    const contextString = JSON.stringify(context, null, 2)
    await this.client.updateMemory(this.agentId, 'user_context', contextString)
  }

  async getConversationHistory(): Promise<Message[]> {
    if (!this.agentId) {
      throw new Error('Orchestrator agent not initialized')
    }

    return this.client.getMessages(this.agentId)
  }

  getAgentId(): string | null {
    return this.agentId
  }
}
