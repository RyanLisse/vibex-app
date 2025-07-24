# AI Provider Integration Guide

This guide explains how to integrate and use the unified AI system in your Vibex application.

## Overview

The AI integration system provides a unified interface for working with multiple AI providers:
- **OpenAI** (GPT-4, GPT-3.5, DALL-E, Whisper)
- **Anthropic** (Claude 3 Opus, Sonnet, Haiku)
- **Google AI** (Gemini Pro, Gemini 1.5)

## Architecture

```
┌─────────────────┐
│  Your App Code  │
└────────┬────────┘
         │
┌────────▼────────┐
│ Unified AI API  │ ◄── Single interface for all providers
└────────┬────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    │         │          │         │
┌───▼───┐ ┌──▼───┐ ┌────▼────┐ ┌──▼──┐
│OpenAI │ │Claude│ │ Gemini  │ │ ... │
└───────┘ └──────┘ └─────────┘ └─────┘
```

## Setup

### 1. Environment Variables

Add the following to your `.env.local`:

```bash
# Required for OpenAI integration
OPENAI_API_KEY=sk-...

# Required for Anthropic integration
ANTHROPIC_API_KEY=sk-ant-...

# Required for Google AI integration
GOOGLE_AI_API_KEY=...
```

### 2. Initialize Providers

The providers are automatically initialized when the module loads if environment variables are set. You can also manually initialize:

```typescript
import { initializeProviders } from '@/lib/ai';

// Manual initialization
initializeProviders({
  openai: { apiKey: process.env.OPENAI_API_KEY },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  google: { apiKey: process.env.GOOGLE_AI_API_KEY }
});
```

## Usage Examples

### Basic Chat Completion

```typescript
import { unifiedAI } from '@/lib/ai';

const response = await unifiedAI.createCompletion({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Explain quantum computing' }
  ],
  temperature: 0.7,
  maxTokens: 1000
});

console.log(response.data.choices[0].message.content);
console.log(`Used provider: ${response.provider}`);
console.log(`Latency: ${response.latency}ms`);
```

### Streaming Response

```typescript
const stream = await unifiedAI.createStreamingCompletion({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: 'Write a story' }],
  stream: true
});

for await (const chunk of stream.data) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

### Using Specific Provider

```typescript
// Force a specific provider
const response = await unifiedAI.createCompletion({
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',
  messages: [...]
});
```

### React Hook Usage

```typescript
import { useAIChat } from '@/hooks/use-ai-chat';

function ChatComponent() {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    metadata
  } = useAIChat({
    model: 'gpt-4-turbo-preview',
    systemPrompt: 'You are a coding assistant'
  });

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      
      {metadata && (
        <div>
          Provider: {metadata.provider}, 
          Latency: {metadata.latency}ms
        </div>
      )}
      
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        disabled={isLoading}
      />
    </div>
  );
}
```

### Function Calling

```typescript
const response = await unifiedAI.createCompletion({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'user', content: 'What\'s the weather in Paris?' }
  ],
  tools: [{
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
        },
        required: ['location']
      }
    }
  }],
  toolChoice: 'auto'
});

// Handle tool calls in response
if (response.data.choices[0].message.tool_calls) {
  for (const toolCall of response.data.choices[0].message.tool_calls) {
    console.log(`Function: ${toolCall.function.name}`);
    console.log(`Arguments: ${toolCall.function.arguments}`);
  }
}
```

### Embeddings

```typescript
const embeddings = await unifiedAI.createEmbedding({
  model: 'text-embedding-3-large',
  input: ['Hello world', 'How are you?']
});

console.log(embeddings.data.data[0].embedding); // Vector array
```

### Model Discovery

```typescript
// List all available models
const allModels = await unifiedAI.listModels();

// Find models with specific capabilities
const visionModels = await unifiedAI.listModels({
  capabilities: ['chat', 'vision']
});

// Find the best model for your use case
const bestModel = await unifiedAI.findBestModel({
  capabilities: ['chat', 'function-calling'],
  maxCostPer1kTokens: 0.01,
  minContextWindow: 50000,
  preferredProvider: 'openai'
});
```

## Advanced Features

### Load Balancing

```typescript
const client = new UnifiedAIClient({
  loadBalancing: 'least-latency', // or 'round-robin', 'random'
  fallbackProviders: ['anthropic', 'google']
});
```

### Caching

```typescript
const client = new UnifiedAIClient({
  caching: true,
  cacheTTL: 3600000 // 1 hour
});

// Clear cache when needed
client.clearCache();
```

### Provider Statistics

```typescript
const stats = unifiedAI.getProviderStats();

for (const [provider, stat] of stats) {
  console.log(`${provider}:`);
  console.log(`  Average latency: ${stat.avgLatency}ms`);
  console.log(`  Request count: ${stat.requestCount}`);
}
```

## API Endpoints

The system provides REST API endpoints for integration:

### Chat Endpoint
```bash
POST /api/ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-4-turbo-preview",
  "stream": true
}
```

### Models Endpoint
```bash
# List all models
GET /api/ai/models

# List models with specific capabilities
GET /api/ai/models?capabilities=chat,vision

# Find best model
GET /api/ai/models?findBest=true&capabilities=chat&maxCost=0.01
```

### Embeddings Endpoint
```bash
POST /api/ai/embeddings
Content-Type: application/json

{
  "input": "Text to embed",
  "model": "text-embedding-3-large"
}
```

## Error Handling

```typescript
try {
  const response = await unifiedAI.createCompletion({...});
} catch (error) {
  if (error.message.includes('No AI provider available')) {
    // All providers failed
  } else if (error.message.includes('401')) {
    // Authentication error
  } else {
    // Other error
  }
}
```

## Best Practices

1. **Use Model Discovery**: Let the system find the best model for your needs
2. **Enable Caching**: Reduce costs for repeated queries
3. **Configure Fallbacks**: Ensure reliability with multiple providers
4. **Monitor Costs**: Use the cost information in model metadata
5. **Handle Errors**: Implement proper error handling for production

## Testing

Use mock models in tests to avoid API calls:

```typescript
import { testChatModel } from '@/lib/ai/testing/mock-language-model';

// In your test
const mockResponse = await testChatModel.doGenerate({
  prompt: [{ role: 'user', content: 'Test' }]
});
```

## Troubleshooting

### Provider Not Available
- Check environment variables are set correctly
- Verify API keys are valid
- Ensure providers are initialized

### High Latency
- Enable caching for repeated queries
- Use 'least-latency' load balancing
- Consider using faster models (e.g., GPT-3.5 instead of GPT-4)

### Rate Limits
- Implement retry logic with exponential backoff
- Use multiple providers for load distribution
- Monitor usage with provider statistics

## Future Enhancements

- [ ] Batch API support for cost optimization
- [ ] Fine-tuned model support
- [ ] Custom provider plugins
- [ ] Usage analytics and cost tracking
- [ ] A/B testing framework