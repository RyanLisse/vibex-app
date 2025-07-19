# Gemini 2.5 Flash Realtime Audio Integration

This directory contains examples and documentation for integrating Google's Gemini 2.5 Flash with native audio support into your Next.js application.

## Features

- 🎙️ **Real-time audio input** - Record and send voice messages
- 🔊 **Native audio responses** - Receive natural-sounding voice replies
- 💬 **Mixed modality** - Seamlessly switch between text and voice
- 🛠️ **Tool integration** - Use function calling with audio responses
- 🌊 **Streaming support** - Handle real-time audio streams
- 🎭 **Voice selection** - Choose from available voice presets

## Quick Start

### 1. Get your API Key

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Set Environment Variable

Add to your `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies

```bash
npm install @google/genai mime
# or
bun add @google/genai mime
```

### 4. Use in Your App

```tsx
import { GeminiAudioChat } from "@/components/ai/gemini-audio-chat";

export default function MyPage() {
  return <GeminiAudioChat />;
}
```

## Architecture

### Core Library (`lib/ai/gemini-realtime.ts`)

The main library provides:

- `GeminiRealtimeSession` - Manages WebSocket connections and audio sessions
- Audio utilities - WAV conversion, buffering, and streaming
- TypeScript types - Full type safety for all Gemini APIs

### React Hooks

- `useGeminiAudio` - Main hook for managing Gemini audio sessions
- `useAudioRecorder` - Browser audio recording with MediaRecorder API
- `useAudioPlayer` - Audio playback management (coming soon)

### API Routes

- `/api/ai/gemini/session` - Create and manage audio sessions
- `/api/ai/gemini/audio` - Handle audio streaming
- `/api/ai/gemini/tools` - Function calling responses

### UI Components

- `GeminiAudioChat` - Complete chat interface with audio support
- `AudioVisualizer` - Real-time audio waveform visualization (coming soon)
- `VoiceSelector` - Voice preset selection UI (coming soon)

## Examples

### Basic Text Conversation

```typescript
const session = new GeminiRealtimeSession({
  apiKey: process.env.GEMINI_API_KEY,
});

await session.connect();
await session.sendMessage("Hello, how are you?");
const response = await session.handleTurn();
```

### Audio Recording and Sending

```typescript
const { startRecording, stopRecording } = useAudioRecorder({
  onStop: async (audioBlob) => {
    await sendAudio(audioBlob);
  },
});
```

### Tool Integration

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: "getCurrentWeather",
        description: "Get weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
        },
      },
    ],
  },
];

const session = new GeminiRealtimeSession({
  apiKey,
  tools,
});
```

## Standalone Example

Run the standalone example:

```bash
cd examples/gemini-audio
GEMINI_API_KEY=your_key npx tsx standalone-example.ts
```

This will:

1. Connect to Gemini
2. Run multiple example conversations
3. Save audio responses as WAV files

## Voice Options

Currently available voice:

- `Enceladus` - Default voice

More voices will be added as they become available from Google.

## Audio Format

Gemini uses the following audio format:

- Format: Linear PCM (L16)
- Sample Rate: 24kHz
- Channels: Mono
- Bit Depth: 16-bit

The library automatically handles conversion to/from WAV format.

## Best Practices

1. **Session Management** - Always close sessions when done
2. **Error Handling** - Implement proper error boundaries
3. **Audio Permissions** - Request microphone access gracefully
4. **Network Resilience** - Handle connection drops and retries
5. **Memory Management** - Clear audio buffers after use

## Troubleshooting

### "Microphone access denied"

- Ensure your app is served over HTTPS (or localhost)
- Check browser permissions for microphone access

### "API key not configured"

- Verify GEMINI_API_KEY is set in environment variables
- Restart your development server after adding the key

### "Audio not playing"

- Check browser console for CORS or format errors
- Ensure audio context is resumed after user interaction

## Advanced Usage

### Custom Voice Configuration

```typescript
const session = new GeminiRealtimeSession({
  apiKey,
  voiceName: "Enceladus",
  responseModalities: [Modality.AUDIO, Modality.TEXT],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
});
```

### Streaming Audio Processing

```typescript
const session = new GeminiRealtimeSession({
  apiKey,
  onMessage: (message) => {
    if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
      // Process audio chunk in real-time
      processAudioChunk(message.serverContent.modelTurn.parts[0].inlineData);
    }
  },
});
```

### Context Window Management

```typescript
const config = {
  contextWindowCompression: {
    triggerTokens: "25600",
    slidingWindow: { targetTokens: "12800" },
  },
};
```

## Security Considerations

1. **API Key Protection** - Never expose your API key in client-side code
2. **Audio Privacy** - Inform users when recording audio
3. **Data Retention** - Clear audio buffers after processing
4. **HTTPS Required** - Audio recording requires secure context

## Contributing

Feel free to submit issues or pull requests to improve this integration.

## License

This example is provided under the same license as the main project.
