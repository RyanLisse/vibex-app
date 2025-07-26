/**
 * Audio Transcription Service
 *
 * Provides audio transcription capabilities using Google's Gemini Flash 2.5
 * with fallback to other providers if needed.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Transcription options schema
export const TranscriptionOptionsSchema = z.object({
	audioBlob: z.instanceof(Blob),
	language: z.string().optional().default("en"),
	prompt: z.string().optional(),
	temperature: z.number().optional().default(0.2),
	format: z.enum(["text", "json", "verbose_json"]).optional().default("text"),
});

export type TranscriptionOptions = z.infer<typeof TranscriptionOptionsSchema>;

// Transcription response schema
export const TranscriptionResponseSchema = z.object({
	text: z.string(),
	duration: z.number().optional(),
	language: z.string().optional(),
	segments: z
		.array(
			z.object({
				start: z.number(),
				end: z.number(),
				text: z.string(),
				confidence: z.number().optional(),
			})
		)
		.optional(),
	metadata: z.record(z.any()).optional(),
});

export type TranscriptionResponse = z.infer<typeof TranscriptionResponseSchema>;

export class TranscriptionService {
	private geminiClient: GoogleGenerativeAI | null = null;

	constructor() {
		// Initialize Gemini client if API key is available
		const apiKey = process.env.GOOGLE_AI_API_KEY;
		if (apiKey) {
			this.geminiClient = new GoogleGenerativeAI(apiKey);
		}
	}

	/**
	 * Transcribe audio using Gemini Flash 2.5
	 */
	async transcribeWithGemini(options: TranscriptionOptions): Promise<TranscriptionResponse> {
		if (!this.geminiClient) {
			throw new Error("Google AI API key not configured");
		}

		try {
			// Use Gemini 2.0 Flash with native audio support
			const model = this.geminiClient.getGenerativeModel({
				model: "gemini-2.0-flash-exp",
				generationConfig: {
					temperature: options.temperature,
					maxOutputTokens: 2048,
				},
			});

			// Convert blob to base64
			const audioData = await this.blobToBase64(options.audioBlob);

			// Create prompt for transcription
			const prompt =
				options.prompt ||
				`Please transcribe the following audio accurately. ${
					options.language !== "en" ? `The audio is in ${options.language}.` : ""
				} ${
					options.format === "json"
						? "Return the transcription as JSON with timestamps for each segment."
						: options.format === "verbose_json"
							? "Return detailed transcription with confidence scores and metadata."
							: "Return only the transcribed text."
				}`;

			// Send audio to Gemini for transcription
			const result = await model.generateContent([
				{
					inlineData: {
						mimeType: options.audioBlob.type || "audio/webm",
						data: audioData,
					},
				},
				{ text: prompt },
			]);

			const response = result.response;
			const transcriptionText = response.text();

			// Parse response based on format
			if (options.format === "text") {
				return {
					text: transcriptionText.trim(),
					language: options.language,
				};
			}
			// Try to parse JSON response
			try {
				const jsonResponse = JSON.parse(transcriptionText);
				return {
					text: jsonResponse.text || transcriptionText,
					duration: jsonResponse.duration,
					language: jsonResponse.language || options.language,
					segments: jsonResponse.segments,
					metadata: jsonResponse.metadata,
				};
			} catch {
				// Fallback if JSON parsing fails
				return {
					text: transcriptionText.trim(),
					language: options.language,
				};
			}
		} catch (error) {
			console.error("Gemini transcription error:", error);
			throw new Error(
				`Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		}
	}

	/**
	 * Main transcribe method with fallback options
	 */
	async transcribe(options: TranscriptionOptions): Promise<TranscriptionResponse> {
		const validatedOptions = TranscriptionOptionsSchema.parse(options);

		// Try Gemini first if available
		if (this.geminiClient) {
			try {
				return await this.transcribeWithGemini(validatedOptions);
			} catch (error) {
				console.warn("Gemini transcription failed, trying fallback:", error);
			}
		}

		// Fallback to OpenAI Whisper if available
		if (process.env.OPENAI_API_KEY) {
			return await this.transcribeWithWhisper(validatedOptions);
		}

		// If no transcription service is available, throw error
		throw new Error(
			"No transcription service available. Please configure GOOGLE_AI_API_KEY or OPENAI_API_KEY."
		);
	}

	/**
	 * Fallback transcription using OpenAI Whisper
	 */
	private async transcribeWithWhisper(
		options: TranscriptionOptions
	): Promise<TranscriptionResponse> {
		const formData = new FormData();
		formData.append("file", options.audioBlob, "audio.webm");
		formData.append("model", "whisper-1");
		if (options.language) {
			formData.append("language", options.language);
		}
		if (options.prompt) {
			formData.append("prompt", options.prompt);
		}
		formData.append("response_format", options.format || "text");
		formData.append("temperature", options.temperature.toString());

		const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			},
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
		}

		if (options.format === "text") {
			const text = await response.text();
			return { text: text.trim(), language: options.language };
		}
		const jsonResponse = await response.json();
		return {
			text: jsonResponse.text,
			duration: jsonResponse.duration,
			language: jsonResponse.language || options.language,
			segments: jsonResponse.segments,
		};
	}

	/**
	 * Convert blob to base64 string
	 */
	private async blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				if (reader.result && typeof reader.result === "string") {
					// Remove data URL prefix to get just the base64 string
					const base64 = reader.result.split(",")[1];
					resolve(base64);
				} else {
					reject(new Error("Failed to convert blob to base64"));
				}
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	/**
	 * Extract task information from transcribed text using Gemini
	 */
	async extractTaskFromTranscription(transcription: string): Promise<{
		title: string;
		description?: string;
		priority?: "low" | "medium" | "high" | "urgent";
		dueDate?: string;
		assignee?: string;
		labels?: string[];
	}> {
		if (!this.geminiClient) {
			// Simple extraction without AI
			return {
				title: transcription.slice(0, 100),
				description: transcription.length > 100 ? transcription : undefined,
				priority: "medium",
			};
		}

		try {
			const model = this.geminiClient.getGenerativeModel({
				model: "gemini-1.5-flash-latest",
				generationConfig: {
					temperature: 0.3,
					responseMimeType: "application/json",
				},
			});

			const prompt = `Extract task information from the following voice transcription. 
      Return a JSON object with the following fields:
      - title: string (required, max 100 chars)
      - description: string (optional, detailed description)
      - priority: "low" | "medium" | "high" | "urgent" (optional, default "medium")
      - dueDate: string in ISO format (optional, if mentioned)
      - assignee: string (optional, if mentioned)
      - labels: string[] (optional, relevant tags)
      
      Transcription: "${transcription}"`;

			const result = await model.generateContent(prompt);
			const response = result.response;
			const taskData = JSON.parse(response.text());

			return {
				title: taskData.title || transcription.slice(0, 100),
				description: taskData.description,
				priority: taskData.priority || "medium",
				dueDate: taskData.dueDate,
				assignee: taskData.assignee,
				labels: taskData.labels,
			};
		} catch (error) {
			console.error("Task extraction error:", error);
			// Fallback to simple extraction
			return {
				title: transcription.slice(0, 100),
				description: transcription.length > 100 ? transcription : undefined,
				priority: "medium",
			};
		}
	}
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
