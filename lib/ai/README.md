# AI SDK Testing Patterns

This directory contains testing utilities and mock implementations for AI-powered features in the Vibex app.

## Files

### `models.test.ts`
Comprehensive mock language models and testing utilities for AI features:

- **Mock Models**: `testChatModel`, `testClaudeModel`, `testGPTModel`
- **Deterministic Responses**: Based on prompt content patterns
- **Streaming Support**: Mock streaming responses with `simulateReadableStream`
- **Test Utilities**: Helper functions for conversation testing

## Usage in Tests

### Integration Tests
```typescript
import { testChatModel, aiTestUtils } from '@/lib/ai/models.test'

// Test AI API routes
test('AI chat API returns streamed response', async () => {
  // Use testChatModel in your API route tests
})
```

### Component Tests
```typescript
import { mockModels } from '@/lib/ai/models.test'

// Test AI-powered components
test('chat component renders AI responses', async () => {
  // Mock AI responses for component testing
})
```

### E2E Tests
```typescript
// Use with Playwright for complete AI workflow testing
test('AI chat functionality works end-to-end', async ({ page }) => {
  // Test complete AI interactions
})
```

## Mock Response Patterns

The mock models provide deterministic responses based on prompt keywords:

- `"explain"` → Explanation response
- `"code"` → Code example response  
- `"summary"` → Bullet point summary
- `"error"/"fail"` → Error response
- Default → Standard test response

## Test Configuration

All mock models are configured with:
- `temperature: 0` for deterministic responses
- Realistic chunk delays for streaming
- Proper token estimation
- Error simulation capabilities

This ensures consistent, reliable testing of AI-powered features while avoiding API costs and rate limits.