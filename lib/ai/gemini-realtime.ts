import type { FunctionCall, FunctionResponse } from "@google/genai";
import {
	GoogleGenAI,
	type LiveServerMessage,
	MediaResolution,
	Modality,
	type Session,
} from "@google/genai";

export interface GeminiRealtimeConfig {
	apiKey: string;
	model?: string;
	voiceName?: string;
	responseModalities?: Modality[];
	mediaResolution?: MediaResolution;
	tools?: Array<{
		functionDeclarations: FunctionCall[];
	}>;
	onMessage?: (message: LiveServerMessage) => void;
	onError?: (error: ErrorEvent) => void;
	onClose?: (event: CloseEvent) => void;
	onOpen?: () => void;
}

export interface AudioPart {
	fileData?: {
		fileUri: string;
	};
	inlineData?: {
		data: string;
		mimeType: string;
	};
	text?: string;
}

export interface WavConversionOptions {
	numChannels: number;
	sampleRate: number;
	bitsPerSample: number;
}

export class GeminiRealtimeSession {
	private ai: GoogleGenAI;
	private session: Session | undefined;
	private responseQueue: LiveServerMessage[] = [];
	private audioParts: string[] = [];
	private config: GeminiRealtimeConfig;

	constructor(config: GeminiRealtimeConfig) {
		this.config = config;
		this.ai = new GoogleGenAI({
			apiKey: config.apiKey,
		});
	}

	async connect(): Promise<void> {
		const model =
			this.config.model ||
			"models/gemini-2.5-flash-preview-native-audio-dialog";

		const sessionConfig = {
			responseModalities: this.config.responseModalities || [Modality.AUDIO],
			mediaResolution:
				this.config.mediaResolution || MediaResolution.MEDIA_RESOLUTION_MEDIUM,
			speechConfig: {
				voiceConfig: {
					prebuiltVoiceConfig: {
						voiceName: this.config.voiceName || "Enceladus",
					},
				},
			},
			contextWindowCompression: {
				triggerTokens: "25600",
				slidingWindow: { targetTokens: "12800" },
			},
			tools: this.config.tools || [],
		};

		this.session = await this.ai.live.connect({
			model,
			callbacks: {
				onopen: () => {
					this.config.onOpen?.();
				},
				onmessage: (message: LiveServerMessage) => {
					this.responseQueue.push(message);
					this.config.onMessage?.(message);
				},
				onerror: (e: ErrorEvent) => {
					this.config.onError?.(e);
				},
				onclose: (e: CloseEvent) => {
					this.config.onClose?.(e);
				},
			},
			config: sessionConfig,
		});
	}

	async sendMessage(content: string): Promise<void> {
		if (!this.session) {
			throw new Error("Session not connected");
		}

		this.session.sendClientContent({
			turns: [content],
		});
	}

	async sendToolResponse(functionResponses: FunctionResponse[]): Promise<void> {
		if (!this.session) {
			throw new Error("Session not connected");
		}

		this.session.sendToolResponse({
			functionResponses,
		});
	}

	async waitForMessage(): Promise<LiveServerMessage> {
		while (true) {
			const message = this.responseQueue.shift();
			if (message) {
				return message;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	async handleTurn(): Promise<LiveServerMessage[]> {
		const turn: LiveServerMessage[] = [];
		let done = false;

		while (!done) {
			const message = await this.waitForMessage();
			turn.push(message);

			if (message.serverContent?.turnComplete) {
				done = true;
			}
		}

		return turn;
	}

	processMessage(message: LiveServerMessage): AudioPart | null {
		if (message.toolCall) {
			// Handle tool calls
			message.toolCall.functionCalls?.forEach((_functionCall) => {});

			// Send tool responses if needed
			if (this.session && message.toolCall.functionCalls) {
				const responses: FunctionResponse[] =
					message.toolCall.functionCalls.map((functionCall) => ({
						id: functionCall.id,
						name: functionCall.name,
						response: { response: "Function executed successfully" },
					}));
				this.sendToolResponse(responses);
			}
		}

		if (message.serverContent?.modelTurn?.parts) {
			const part = message.serverContent.modelTurn.parts[0];

			if (part?.inlineData) {
				this.audioParts.push(part.inlineData.data || "");
				return {
					inlineData: part.inlineData,
				};
			}

			if (part?.text) {
				return {
					text: part.text,
				};
			}

			if (part?.fileData) {
				return {
					fileData: part.fileData,
				};
			}
		}

		return null;
	}

	getAudioBuffer(): Buffer | null {
		if (this.audioParts.length === 0) {
			return null;
		}

		// Assuming the audio is in the format specified by the first part
		// In production, you might want to parse the MIME type from the message
		const mimeType = "audio/L16;rate=24000";
		return convertToWav(this.audioParts, mimeType);
	}

	clearAudioBuffer(): void {
		this.audioParts = [];
	}

	close(): void {
		this.session?.close();
		this.session = undefined;
	}

	isConnected(): boolean {
		return this.session !== undefined;
	}
}

// Audio utility functions
export function convertToWav(rawData: string[], mimeType: string): Buffer {
	const options = parseMimeType(mimeType);
	const dataLength = rawData.reduce((a, b) => a + b.length, 0);
	const wavHeader = createWavHeader(dataLength, options);
	const buffer = Buffer.concat(
		rawData.map((data) => Buffer.from(data, "base64")),
	);

	return Buffer.concat([wavHeader, buffer]);
}

export function parseMimeType(mimeType: string): WavConversionOptions {
	const [fileType, ...params] = mimeType.split(";").map((s) => s.trim());
	const [, format] = fileType.split("/");

	const options: Partial<WavConversionOptions> = {
		numChannels: 1,
		bitsPerSample: 16,
		sampleRate: 24_000, // Default sample rate
	};

	// Parse L16 format
	if (format?.startsWith("L")) {
		const bits = Number.parseInt(format.slice(1), 10);
		if (!Number.isNaN(bits)) {
			options.bitsPerSample = bits;
		}
	}

	// Parse parameters
	for (const param of params) {
		const [key, value] = param.split("=").map((s) => s.trim());
		if (key === "rate") {
			options.sampleRate = Number.parseInt(value, 10);
		}
	}

	return options as WavConversionOptions;
}

export function createWavHeader(
	dataLength: number,
	options: WavConversionOptions,
): Buffer {
	const { numChannels, sampleRate, bitsPerSample } = options;

	// WAV file format specification: http://soundfile.sapp.org/doc/WaveFormat
	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	const blockAlign = (numChannels * bitsPerSample) / 8;
	const buffer = Buffer.alloc(44);

	buffer.write("RIFF", 0); // ChunkID
	buffer.writeUInt32LE(36 + dataLength, 4); // ChunkSize
	buffer.write("WAVE", 8); // Format
	buffer.write("fmt ", 12); // Subchunk1ID
	buffer.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
	buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
	buffer.writeUInt16LE(numChannels, 22); // NumChannels
	buffer.writeUInt32LE(sampleRate, 24); // SampleRate
	buffer.writeUInt32LE(byteRate, 28); // ByteRate
	buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
	buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
	buffer.write("data", 36); // Subchunk2ID
	buffer.writeUInt32LE(dataLength, 40); // Subchunk2Size

	return buffer;
}

// Voice presets for Gemini
export const GEMINI_VOICES = {
	Enceladus: "Enceladus", // Default voice
	// Add more voices as they become available
} as const;

export type GeminiVoice = keyof typeof GEMINI_VOICES;
