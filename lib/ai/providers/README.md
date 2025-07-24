# AI Provider Integration

This directory contains a unified AI provider system that supports multiple AI providers (OpenAI, Anthropic, Google AI) with automatic fallback, load balancing, and advanced features.

## Overview

The AI provider system provides:

- **Unified Interface**: Single API for all AI providers
- **Automatic Fallback**: Seamlessly switch between providers on failure
- **Load Balancing**: Distribute requests across providers
- **Model Discovery**: Find the best model for your use case
- **Caching**: Reduce costs and latency with intelligent caching
- **Type Safety**: Full TypeScript support with Zod validation

## Quick Start

```typescript
import { unifiedAI, initializeProviders } from '@/lib/ai';

// Initialize providers (automatically uses env vars)
initializeProviders();

// Or initialize with explicit config
initializeProviders({
  openai: { apiKey: 'your-key' },
  anthropic: { apiKey: 'your-key' },
  google: { apiKey: 'your-key' }
});

// Create a completion
const result = await unifiedAI.createCompletion({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(result.data.choices[0].message.content);
console.log(`Provider: ${result.provider}, Latency: ${result.latency}ms`);
```

## Features

### 1. Multi-Provider Support

```typescript
// Use a specific provider
const result = await unifiedAI.createCompletion({
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',
  messages: [...]
});

// Let the system choose the best provider
const result = await unifiedAI.createCompletion({
  model: 'gpt-4-turbo-preview',
  messages: [...]
});
```

### 2. Model Discovery

```typescript
// List all available models
const models = await unifiedAI.listModels();

// List models with specific capabilities
const chatModels = await unifiedAI.listModels({
  capabilities: ['chat', 'function-calling']
});

// Find the best model for your use case
const bestModel = await unifiedAI.findBestModel({
  capabilities: ['chat', 'vision'],
  maxCostPer1kTokens: 0.01,
  minContextWindow: 100000
});
```

### 3. Streaming Support

```typescript
const stream = await unifiedAI.createStreamingCompletion({
  model: 'claude-3-5-sonnet-20241022',
  messages: [...],
  stream: true
});

for await (const chunk of stream.data) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

### 4. Function Calling

```typescript
const result = await unifiedAI.createCompletion({
  model: 'gpt-4-turbo-preview',
  messages: [...],
  tools: [{
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' }
        }
      }
    }
  }]
});
```

### 5. Embeddings

```typescript
const embeddings = await unifiedAI.createEmbedding({
  model: 'text-embedding-3-large',
  input: 'Hello, world!'
});
```

### 6. Load Balancing Strategies

```typescript
const client = new UnifiedAIClient({
  loadBalancing: 'least-latency', // or 'round-robin', 'random'
  fallbackProviders: ['anthropic', 'google']
});
```

### 7. Caching

```typescript
const client = new UnifiedAIClient({
  caching: true,
  cacheTTL: 3600000 // 1 hour
});

// Clear cache when needed
client.clearCache();
```

## Provider-Specific Features

### OpenAI

```typescript
import { OpenAIProvider } from '@/lib/ai/providers';

const openai = new OpenAIProvider({ apiKey: 'your-key' });

// Audio transcription
const transcription = await openai.createTranscription(audioFile);

// Text-to-speech
const audio = await openai.createSpeech('Hello, world!', {
  voice: 'alloy',
  model: 'tts-1-hd'
});

// Image generation
const images = await openai.createImage('A sunset over mountains', {
  model: 'dall-e-3',
  size: '1024x1024'
});
```

### Anthropic

```typescript
import { AnthropicProvider } from '@/lib/ai/providers';

const anthropic = new AnthropicProvider({ apiKey: 'your-key' });

// Claude supports very long contexts (up to 200K tokens)
const result = await anthropic.createCompletion({
  model: 'claude-3-opus-20240229',
  messages: [...],
  maxTokens: 4096
});
```

### Google AI

```typescript
import { GoogleAIProvider } from '@/lib/ai/providers';

const google = new GoogleAIProvider({ apiKey: 'your-key' });

// Gemini supports multimodal inputs
const result = await google.createCompletion({
  model: 'gemini-pro-vision',
  messages: [{
    role: 'user',
    content: 'What is in this image?',
    // Add image support as needed
  }]
});
```

## Configuration

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Anthropic  
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### Advanced Configuration

```typescript
const client = new UnifiedAIClient({
  defaultProvider: 'openai',
  fallbackProviders: ['anthropic', 'google'],
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  loadBalancing: 'least-latency',
  caching: true,
  cacheTTL: 3600000 // 1 hour
});
```

## Model Information

### Model Capabilities

- `chat`: Standard chat completions
- `completion`: Text completions
- `embedding`: Generate embeddings
- `image-generation`: Create images
- `image-analysis`: Analyze images
- `audio-transcription`: Convert speech to text
- `audio-generation`: Convert text to speech
- `function-calling`: Call functions/tools
- `streaming`: Stream responses
- `json-mode`: Structured JSON output
- `vision`: Process images in chat

### Cost Comparison

| Model | Provider | Input Cost | Output Cost | Context Window |
|-------|----------|------------|-------------|----------------|
| GPT-4 Turbo | OpenAI | $0.01/1K | $0.03/1K | 128K |
| Claude 3 Opus | Anthropic | $0.015/1K | $0.075/1K | 200K |
| Gemini 1.5 Pro | Google | $0.007/1K | $0.021/1K | 1M |

## Error Handling

```typescript
try {
  const result = await unifiedAI.createCompletion({
    model: 'gpt-4',
    messages: [...]
  });
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Invalid API key');
  } else if (error.message.includes('No AI provider available')) {
    console.error('All providers failed');
  }
}
```

## Performance Monitoring

```typescript
// Get provider statistics
const stats = unifiedAI.getProviderStats();

for (const [provider, stat] of stats) {
  console.log(`${provider}: ${stat.avgLatency}ms avg latency`);
}
```

## Best Practices

1. **Use Model Discovery**: Let the system find the best model for your needs
2. **Enable Caching**: Reduce costs for repeated queries
3. **Configure Fallbacks**: Ensure reliability with multiple providers
4. **Monitor Costs**: Track usage across providers
5. **Set Appropriate Timeouts**: Balance reliability and responsiveness

## Testing

```typescript
import { MockLanguageModelV1 } from 'ai/test';

// Use mock models in tests
const mockModel = new MockLanguageModelV1({
  // Mock configuration
});
```

## Future Enhancements

- [ ] Streaming with function calls
- [ ] Provider-specific optimizations
- [ ] Cost tracking and budgets
- [ ] A/B testing across models
- [ ] Custom provider plugins