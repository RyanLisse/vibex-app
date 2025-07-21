import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { StreamingMessage, IncomingMessage, MessageType } from './message-types';

describe('message-types', () => {
  beforeEach(() => {
    // Setup test data
  });

  afterEach(() => {
    // Cleanup
  });

  it('should define StreamingMessage interface correctly', () => {
    const streamingMessage: StreamingMessage = {
      role: 'assistant',
      type: 'message',
      data: { text: 'test', isStreaming: true, streamId: 'test-id' }
    };

    expect(streamingMessage.role).toBe('assistant');
    expect(streamingMessage.type).toBe('message');
    expect(streamingMessage.data.isStreaming).toBe(true);
  });

  it('should define IncomingMessage interface correctly', () => {
    const incomingMessage: IncomingMessage = {
      role: 'user',
      type: 'message',
      data: { text: 'Hello world' }
    };

    expect(incomingMessage.role).toBe('user');
    expect(incomingMessage.type).toBe('message');
    expect(incomingMessage.data.text).toBe('Hello world');
  });
});