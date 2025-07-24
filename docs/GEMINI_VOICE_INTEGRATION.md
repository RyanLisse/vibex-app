# Gemini Flash 2.5 Voice Integration Guide

## Overview

This guide explains how to use Google's Gemini Flash 2.5 (Gemini 2.0 Flash Experimental) for voice transcription in the task management system.

## Features

- **Native Audio Support**: Gemini 2.0 Flash supports direct audio input without external transcription
- **Multi-language Support**: Automatic language detection and transcription
- **Task Extraction**: AI-powered extraction of task details from voice transcriptions
- **Fallback Support**: Automatic fallback to OpenAI Whisper if Gemini is unavailable
- **Confidence Scoring**: Transcription confidence levels for quality assurance

## Setup

### 1. Get Google AI API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### 2. Configure Environment

Add to your `.env.local`:

```bash
# Required for Gemini
GOOGLE_AI_API_KEY=your-google-ai-api-key-here

# Optional fallback to OpenAI Whisper
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. Verify Installation

The integration is already set up in the codebase. Key files:

- `/lib/services/transcription.ts` - Transcription service
- `/lib/ai/providers/google.ts` - Google AI provider with Gemini models
- `/app/api/tasks/voice/route.ts` - Voice task API endpoint

## Usage

### Voice Task Creation

1. **Record Audio**: Use the voice recorder component
2. **Automatic Transcription**: Audio is sent to Gemini 2.0 Flash
3. **Task Extraction**: AI analyzes transcription and extracts:
   - Task title
   - Description
   - Priority level
   - Due dates
   - Assignees
   - Labels/tags

### API Endpoint

```typescript
POST /api/tasks/voice

// Form data
{
  audio: File, // Audio file (webm, mp3, wav, etc.)
  data: {
    userId: string,
    language?: string, // Optional, defaults to "en"
    defaultAssignee?: string
  }
}

// Response
{
  task: {
    id: string,
    title: string,
    description: string,
    priority: "low" | "medium" | "high",
    // ... other task fields
  },
  transcription: {
    text: string,
    confidence: number,
    language: string,
    duration: number,
    segments: Array<{
      start: number,
      end: number,
      text: string,
      confidence: number
    }>
  },
  parsedData: {
    title: string,
    description?: string,
    priority?: string,
    dueDate?: string,
    assignee?: string,
    labels?: string[]
  }
}
```

### Transcribe Only (Without Task Creation)

```typescript
PUT /api/tasks/voice

// Form data
{
  audio: File // Audio file
}

// Response
{
  transcription: {
    text: string,
    confidence: number,
    language: string,
    duration: number,
    segments: Array<...>
  },
  suggestions: {
    title: string,
    description?: string,
    priority?: string,
    // ... extracted task details
  }
}
```

## Supported Audio Formats

Gemini 2.0 Flash supports various audio formats:
- WebM (recommended for web recording)
- MP3
- WAV
- M4A
- OGG
- FLAC

## Example Integration

### React Component

```typescript
import { VoiceInput } from "@/src/components/ui/kibo-ui/voice";

function TaskCreationForm() {
  const handleTranscript = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("data", JSON.stringify({
      userId: currentUser.id,
      language: "en"
    }));

    const response = await fetch("/api/tasks/voice", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (result.success) {
      console.log("Task created:", result.data.task);
      console.log("Transcription:", result.data.transcription);
    }
  };

  return (
    <VoiceInput
      onRecordingEnd={handleTranscript}
      maxDuration={60}
    />
  );
}
```

### Direct API Usage

```typescript
import { transcriptionService } from "@/lib/services/transcription";

// Transcribe audio
const result = await transcriptionService.transcribe({
  audioBlob: audioFile,
  language: "en",
  format: "verbose_json"
});

// Extract task details
const taskData = await transcriptionService.extractTaskFromTranscription(
  result.text
);
```

## Advanced Features

### Custom Prompts

You can provide custom prompts for better transcription:

```typescript
const result = await transcriptionService.transcribe({
  audioBlob: audioFile,
  prompt: "Technical task description with programming terms",
  temperature: 0.3 // Lower temperature for more accurate transcription
});
```

### Multi-language Support

```typescript
const result = await transcriptionService.transcribe({
  audioBlob: audioFile,
  language: "es", // Spanish
  format: "verbose_json"
});
```

### Confidence Thresholds

Tasks with low confidence are flagged for review:

- **High Confidence** (>0.8): Auto-approved
- **Medium Confidence** (0.7-0.8): Flagged for review
- **Low Confidence** (<0.7): Requires manual verification

## Performance Considerations

1. **File Size**: Keep audio files under 10MB for optimal performance
2. **Duration**: Shorter recordings (under 60 seconds) process faster
3. **Quality**: Higher quality audio improves transcription accuracy
4. **Caching**: Transcriptions are not cached due to privacy considerations

## Error Handling

The service includes automatic error handling:

1. **Gemini Unavailable**: Falls back to OpenAI Whisper
2. **No API Keys**: Returns helpful error message
3. **Network Errors**: Includes retry logic
4. **Invalid Audio**: Validates file format before processing

## Security

- Audio files are not stored permanently
- Transcriptions are processed in memory
- API keys are never exposed to the client
- All requests require authentication

## Troubleshooting

### Common Issues

1. **"No transcription service available"**
   - Ensure `GOOGLE_AI_API_KEY` is set in environment
   - Check API key validity in Google AI Studio

2. **"Transcription failed"**
   - Check audio file format and size
   - Verify network connectivity
   - Check API quota limits

3. **Low Confidence Scores**
   - Ensure clear audio recording
   - Reduce background noise
   - Speak clearly and at moderate pace

### Debug Mode

Enable debug logging:

```typescript
// In transcription service
console.log("Transcription request:", {
  fileSize: audioBlob.size,
  fileType: audioBlob.type,
  language: options.language
});
```

## Cost Optimization

Gemini 2.0 Flash pricing:
- **Input**: $0.00035 per 1K tokens
- **Output**: $0.00105 per 1K tokens
- **Audio**: Converted to tokens internally

Tips to reduce costs:
1. Keep recordings concise
2. Use appropriate quality settings
3. Implement client-side silence detection
4. Cache task templates for common requests

## Future Enhancements

- Real-time transcription during recording
- Speaker diarization for multi-person tasks
- Custom vocabulary for technical terms
- Offline transcription support
- Voice commands for task management