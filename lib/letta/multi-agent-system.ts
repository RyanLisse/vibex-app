import { LettaClient, Message } from './client';
import { OrchestratorAgent, OrchestratorConfig } from './agents/orchestrator';
import { BrainstormAgent, BrainstormConfig, BrainstormSession } from './agents/brainstorm';
import { z } from 'zod';

// Multi-Agent System Configuration
export const MultiAgentConfigSchema = z.object({
  orchestrator: z.object({}).optional(),
  brainstorm: z.object({}).optional(),
  enableVoice: z.boolean().default(true),
  enableLowLatency: z.boolean().default(true),
  maxConcurrentSessions: z.number().default(10),
});

export type MultiAgentConfig = z.infer<typeof MultiAgentConfigSchema>;

// Session Management
export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['chat', 'voice', 'brainstorm', 'multi-agent']),
  status: z.enum(['active', 'paused', 'completed', 'error']),
  activeAgents: z.array(z.string()),
  context: z.record(z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastActivity: z.date(),
});

export type Session = z.infer<typeof SessionSchema>;

// Agent Communication Event
export const AgentEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'message',
    'task_delegation',
    'status_update',
    'collaboration_request',
    'session_handoff',
  ]),
  fromAgent: z.string(),
  toAgent: z.string().optional(),
  payload: z.record(z.any()),
  timestamp: z.date(),
  sessionId: z.string(),
});

export type AgentEvent = z.infer<typeof AgentEventSchema>;

export class MultiAgentSystem {
  private client: LettaClient;
  private config: MultiAgentConfig;
  private orchestrator: OrchestratorAgent;
  private brainstormAgent: BrainstormAgent;
  private sessions: Map<string, Session> = new Map();
  private eventQueue: AgentEvent[] = [];
  private isInitialized = false;

  constructor(config: Partial<MultiAgentConfig> = {}) {
    this.config = MultiAgentConfigSchema.parse(config);
    this.client = this.createLettaClient();
    this.orchestrator = new OrchestratorAgent(this.client, this.config.orchestrator);
    this.brainstormAgent = new BrainstormAgent(this.client, this.config.brainstorm);
  }

  private createLettaClient(): LettaClient {
    return new LettaClient({
      apiKey: process.env.LETTA_API_KEY!,
      baseUrl: process.env.LETTA_BASE_URL || 'https://api.letta.com',
      projectId: process.env.LETTA_PROJECT_ID,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize all agents
      await Promise.all([
        this.orchestrator.initialize(),
        this.brainstormAgent.initialize(),
      ]);

      this.isInitialized = true;
      console.log('Multi-Agent System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Multi-Agent System:', error);
      throw error;
    }
  }

  // Session Management
  async createSession(
    userId: string,
    type: Session['type'] = 'chat'
  ): Promise<Session> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: Session = {
      id: sessionId,
      userId,
      type,
      status: 'active',
      activeAgents: ['orchestrator'],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    
    // Initialize session context with orchestrator
    await this.orchestrator.updateUserContext({
      sessionId,
      userId,
      sessionType: type,
      startTime: new Date().toISOString(),
    });

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'completed';
    session.updatedAt = new Date();
    
    // Clean up any active brainstorm sessions
    if (session.type === 'brainstorm') {
      const brainstormSession = this.brainstormAgent.getActiveSession(sessionId);
      if (brainstormSession) {
        await this.brainstormAgent.endSession(sessionId);
      }
    }

    this.sessions.set(sessionId, session);
  }

  // Message Processing
  async processMessage(
    sessionId: string,
    message: string,
    streaming = false
  ): Promise<Message | ReadableStream> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Update session activity
    session.lastActivity = new Date();
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    // Route message based on session type and context
    if (session.type === 'brainstorm') {
      return this.processBrainstormMessage(sessionId, message, streaming);
    }

    // Default to orchestrator for general chat
    return this.orchestrator.processMessage(message, streaming);
  }

  private async processBrainstormMessage(
    sessionId: string,
    message: string,
    streaming: boolean
  ): Promise<Message | ReadableStream> {
    // Check if there's an active brainstorm session
    let brainstormSession = this.brainstormAgent.getActiveSession(sessionId);
    
    if (!brainstormSession) {
      // Extract topic from message or ask user
      const topic = this.extractTopicFromMessage(message) || 'General Brainstorming';
      const session = this.sessions.get(sessionId)!;
      brainstormSession = await this.brainstormAgent.startBrainstormSession(
        session.userId,
        topic
      );
    }

    return this.brainstormAgent.processMessage(sessionId, message, streaming);
  }

  private extractTopicFromMessage(message: string): string | null {
    // Simple topic extraction - can be enhanced with NLP
    const topicPatterns = [
      /brainstorm about (.+)/i,
      /help me with (.+)/i,
      /thinking about (.+)/i,
      /idea for (.+)/i,
    ];

    for (const pattern of topicPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  // Voice Processing
  async processVoiceMessage(
    sessionId: string,
    audioData: ArrayBuffer
  ): Promise<{
    audioResponse: ArrayBuffer;
    textResponse: string;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Update session activity
    session.lastActivity = new Date();
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    // Process with orchestrator (voice-enabled)
    return this.orchestrator.processVoiceMessage(audioData);
  }

  // Agent Communication
  async delegateTask(
    fromSessionId: string,
    toAgent: 'brainstorm' | 'orchestrator',
    task: string,
    context: Record<string, any> = {}
  ): Promise<Message> {
    const session = this.sessions.get(fromSessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const event: AgentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'task_delegation',
      fromAgent: 'orchestrator',
      toAgent,
      payload: { task, context },
      timestamp: new Date(),
      sessionId: fromSessionId,
    };

    this.eventQueue.push(event);

    // Execute delegation
    if (toAgent === 'brainstorm') {
      // Start or continue brainstorm session
      let brainstormSession = this.brainstormAgent.getActiveSession(fromSessionId);
      if (!brainstormSession) {
        brainstormSession = await this.brainstormAgent.startBrainstormSession(
          session.userId,
          task
        );
      }
      
      return this.brainstormAgent.processMessage(fromSessionId, task) as Promise<Message>;
    }

    // Default to orchestrator
    return this.orchestrator.processMessage(task) as Promise<Message>;
  }

  // Brainstorm-specific methods
  async startBrainstormSession(
    sessionId: string,
    topic: string
  ): Promise<BrainstormSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Update session type
    session.type = 'brainstorm';
    session.activeAgents = ['orchestrator', 'brainstorm'];
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    return this.brainstormAgent.startBrainstormSession(session.userId, topic);
  }

  async getBrainstormSummary(sessionId: string) {
    return this.brainstormAgent.getSessionSummary(sessionId);
  }

  async advanceBrainstormStage(sessionId: string) {
    return this.brainstormAgent.advanceStage(sessionId);
  }

  // System Status
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      activeSessions: this.sessions.size,
      agents: {
        orchestrator: {
          id: this.orchestrator.getAgentId(),
          status: this.orchestrator.getAgentId() ? 'active' : 'inactive',
        },
        brainstorm: {
          id: this.brainstormAgent.getAgentId(),
          status: this.brainstormAgent.getAgentId() ? 'active' : 'inactive',
        },
      },
      eventQueueSize: this.eventQueue.length,
      config: this.config,
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // End all active sessions
    for (const [sessionId] of this.sessions) {
      try {
        await this.endSession(sessionId);
      } catch (error) {
        console.error(`Error ending session ${sessionId}:`, error);
      }
    }

    this.sessions.clear();
    this.eventQueue = [];
    this.isInitialized = false;
  }
}

// Singleton instance for the application
let multiAgentSystem: MultiAgentSystem | null = null;

export function getMultiAgentSystem(config?: Partial<MultiAgentConfig>): MultiAgentSystem {
  if (!multiAgentSystem) {
    multiAgentSystem = new MultiAgentSystem(config);
  }
  return multiAgentSystem;
}

export async function initializeMultiAgentSystem(
  config?: Partial<MultiAgentConfig>
): Promise<MultiAgentSystem> {
  const system = getMultiAgentSystem(config);
  await system.initialize();
  return system;
}