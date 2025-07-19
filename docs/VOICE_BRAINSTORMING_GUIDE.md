# Voice Brainstorming System Guide

A comprehensive AI-powered voice brainstorming system that combines real-time transcription, intelligent agents, and multi-modal interaction for enhanced ideation sessions.

## 🎯 Overview

The Voice Brainstorming System integrates:

- **OpenAI Whisper** for real-time voice transcription
- **Letta Multi-Agent System** for intelligent brainstorming guidance
- **Gemini AI** for natural language processing
- **Real-time WebRTC** for seamless voice interaction

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Voice Input   │───▶│  Transcription  │───▶│ Multi-Agent     │
│   (WebRTC)      │    │   (Whisper)     │    │   System        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐           │
│  Voice Output   │◀───│   Text-to-      │◀──────────┘
│  (Speech API)   │    │   Speech        │
└─────────────────┘    └─────────────────┘

Multi-Agent Components:
├── Orchestrator Agent (Main coordinator)
├── Brainstorm Agent (Specialized for ideation)
├── Session Manager (State management)
└── Real-time Transcription (Voice processing)
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Add your API keys
LETTA_API_KEY=your_letta_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start Development Server

```bash
bun run dev
```

### 4. Access Voice Brainstorming

Navigate to `http://localhost:3000/voice-brainstorm`

## 🎤 Features

### Real-time Voice Transcription

- **High Accuracy**: 95%+ transcription accuracy with OpenAI Whisper
- **Live Feedback**: Real-time audio level monitoring
- **Confidence Scoring**: Quality assessment for each transcription
- **Silence Detection**: Automatic session management

### Intelligent Brainstorming Agents

#### Orchestrator Agent

- **Session Coordination**: Manages overall brainstorming flow
- **Multi-modal Input**: Handles both voice and text seamlessly
- **Context Awareness**: Maintains conversation history and user preferences
- **Agent Delegation**: Routes tasks to specialized agents

#### Brainstorm Agent

- **Structured Process**: Guides through 6 brainstorming stages:
  1. **Exploration** - Discovering core ideas
  2. **Clarification** - Defining scope and audience
  3. **Expansion** - Generating alternatives
  4. **Evaluation** - Assessing feasibility
  5. **Refinement** - Combining and improving ideas
  6. **Action Planning** - Creating concrete next steps

- **Creativity Levels**: Adjustable from conservative to wild
- **Idea Extraction**: Automatic identification and categorization
- **Progress Tracking**: Stage advancement and completion metrics

### Multi-Modal Interface

- **Voice-First Design**: Optimized for natural speech interaction
- **Visual Feedback**: Real-time transcription and idea visualization
- **Hybrid Input**: Seamless switching between voice and text
- **Progress Indicators**: Visual stage progression and session metrics

## 📋 Usage Examples

### Starting a Voice Brainstorm Session

```typescript
// Initialize the system
const system = getMultiAgentSystem();
await system.initialize();

// Create a brainstorm session
const session = await system.createSession("user-123", "brainstorm");

// Start voice brainstorming
const brainstormSession = await system.startBrainstormSession(
  session.id,
  "Innovative Mobile App Ideas",
);
```

### Processing Voice Input

```typescript
// Process voice transcript
const response = await fetch("/api/agents/brainstorm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "process_voice_input",
    sessionId: "session-123",
    transcript: "I think we should create an app that helps people...",
    confidence: 0.92,
  }),
});

const data = await response.json();
// Returns: extracted ideas, insights, and agent response
```

### Using the React Component

```tsx
import { VoiceBrainstorm } from "@/components/agents/voice-brainstorm";

function MyBrainstormPage() {
  return (
    <VoiceBrainstorm
      sessionId="my-session"
      onSessionUpdate={(session) => console.log("Session updated:", session)}
      onIdeaGenerated={(idea) => console.log("New idea:", idea)}
    />
  );
}
```

## 🔧 API Reference

### Core Endpoints

#### `POST /api/agents/brainstorm`

**Start Voice Brainstorm**

```json
{
  "action": "start_voice_brainstorm",
  "userId": "user-123",
  "topic": "Product Innovation",
  "voiceEnabled": true,
  "creativityLevel": "balanced"
}
```

**Process Voice Input**

```json
{
  "action": "process_voice_input",
  "sessionId": "session-123",
  "transcript": "Voice transcript text",
  "confidence": 0.95,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Generate Insights**

```json
{
  "action": "generate_insights",
  "sessionId": "session-123",
  "stage": "evaluation",
  "transcripts": ["transcript1", "transcript2"],
  "ideas": [{ "content": "idea text", "score": 8 }]
}
```

#### `POST /api/agents/voice`

**Process Voice Message**

```javascript
const formData = new FormData();
formData.append("sessionId", "session-123");
formData.append("audio", audioBlob);

const response = await fetch("/api/agents/voice", {
  method: "POST",
  body: formData,
});
```

### Response Formats

**Brainstorm Session Response**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-123",
      "type": "brainstorm",
      "status": "active"
    },
    "brainstormSession": {
      "id": "brainstorm-456",
      "topic": "Product Innovation",
      "stage": "exploration",
      "ideas": [],
      "insights": [],
      "duration": 0
    }
  }
}
```

**Voice Processing Response**

```json
{
  "success": true,
  "data": {
    "response": {
      "content": "Great idea! Let me help you explore that further..."
    },
    "extractedIdeas": [
      {
        "content": "Mobile app for productivity",
        "category": "suggestion",
        "confidence": 0.85
      }
    ],
    "insights": [
      "Strong focus on user productivity",
      "Mobile-first thinking approach"
    ]
  }
}
```

## 🎨 Customization

### Creativity Levels

```typescript
type CreativityLevel = "conservative" | "balanced" | "creative" | "wild";

const creativitySettings = {
  conservative: "Focus on practical, proven approaches",
  balanced: "Balance creativity with practicality",
  creative: "Encourage bold thinking and novel approaches",
  wild: "Embrace radical thinking and unconventional ideas",
};
```

### Brainstorming Stages

```typescript
const stages = [
  "exploration", // Discovering core ideas
  "clarification", // Defining scope and audience
  "expansion", // Generating alternatives
  "evaluation", // Assessing feasibility
  "refinement", // Combining and improving
  "action_planning", // Creating next steps
];
```

### Voice Configuration

```typescript
const voiceConfig = {
  transcription: {
    model: "whisper-1",
    language: "en",
    temperature: 0,
    responseFormat: "json",
  },
  audio: {
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
```

## 🧪 Testing

### Unit Tests

```bash
bun run test lib/letta/integration.test.ts
```

### Integration Tests

```bash
bun run test:integration
```

### E2E Tests

```bash
bun run test:e2e:ai
```

### Manual Testing Checklist

- [ ] Voice recording starts/stops correctly
- [ ] Transcription accuracy is acceptable (>90%)
- [ ] Ideas are extracted from voice input
- [ ] Agent responses are contextually relevant
- [ ] Stage progression works smoothly
- [ ] Session state is maintained
- [ ] Error handling works for network issues
- [ ] Audio levels are displayed correctly
- [ ] Silence detection triggers appropriately

## 🔍 Troubleshooting

### Common Issues

**Voice Recording Not Working**

```javascript
// Check microphone permissions
navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => console.log("Microphone access granted"))
  .catch((err) => console.error("Microphone access denied:", err));
```

**Transcription Errors**

- Verify OpenAI API key is set correctly
- Check network connectivity
- Ensure audio format is supported (WebM/Opus)
- Test with shorter audio clips

**Agent Not Responding**

- Verify Letta API key and project ID
- Check agent initialization status
- Review session state and active agents
- Monitor API rate limits

**Low Transcription Accuracy**

- Improve audio quality (reduce background noise)
- Speak clearly and at moderate pace
- Check microphone settings and positioning
- Consider adjusting Whisper model parameters

### Debug Mode

```typescript
// Enable debug logging
const system = new MultiAgentSystem({
  enableVoice: true,
  enableLowLatency: true,
  debug: true, // Add debug flag
});
```

### Performance Monitoring

```javascript
// Monitor session metrics
const status = system.getSystemStatus();
console.log("Active sessions:", status.activeSessions);
console.log("Agent status:", status.agents);
console.log("Event queue size:", status.eventQueueSize);
```

## 🚀 Deployment

### Environment Variables

```bash
# Production environment
LETTA_API_KEY=prod_letta_key
NEXT_PUBLIC_OPENAI_API_KEY=prod_openai_key
GOOGLE_AI_API_KEY=prod_google_key
NODE_ENV=production
```

### Build and Deploy

```bash
# Build the application
bun run build

# Start production server
bun run start
```

### Performance Optimization

- Enable audio compression for voice data
- Implement session cleanup and garbage collection
- Use WebSocket connections for real-time features
- Cache frequently used agent responses
- Optimize transcription batch processing

## 📈 Analytics and Monitoring

### Key Metrics

- Session duration and completion rates
- Transcription accuracy scores
- Ideas generated per session
- Stage progression patterns
- User engagement metrics

### Logging

```typescript
// Session analytics
const analytics = {
  sessionId: session.id,
  duration: session.duration,
  ideasGenerated: session.ideas.length,
  stagesCompleted: getCompletedStages(session),
  transcriptionAccuracy: calculateAccuracy(session.transcripts),
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Add comprehensive tests for new features
- Update documentation for API changes
- Use semantic commit messages
- Maintain backwards compatibility

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for Whisper transcription technology
- Letta team for the multi-agent framework
- Google for Gemini AI capabilities
- The open-source community for various supporting libraries
