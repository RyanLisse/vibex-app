// Standalone example of Gemini 2.5 Flash realtime audio
// To run this example:
// 1. Install dependencies: npm install @google/genai mime
// 2. Set your GEMINI_API_KEY environment variable
// 3. Run: npx tsx standalone-example.ts

import { type Session } from "@google/genai";

class GeminiAudioExample {
	private ai: GoogleGenAI;
	private session: Session | undefined;
	private responseQueue: LiveServerMessage[] = [];
	private audioParts: string[] = [];

	constructor(apiKey: string) {
		this.ai = new GoogleGenAI({ apiKey });
	}

	async connect(voiceName = "Enceladus") {
		const model = "models/gemini-2.5-flash-preview-native-audio-dialog";

		const tools = [
			{
				functionDeclarations: [
					{
						name: "getCurrentWeather",
						description: "Get the current weather for a location",
						parameters: {
							type: "object",
							properties: {
								location: {
									type: "string",
									description: "The city and state, e.g., San Francisco, CA",
								},
								unit: {
									type: "string",
									enum: ["celsius", "fahrenheit"],
									description: "The temperature unit",
								},
							},
							required: ["location"],
						},
					},
				],
			},
		];

		const config = {
			responseModalities: [Modality.AUDIO],
			mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
			speechConfig: {
				voiceConfig: {
					prebuiltVoiceConfig: {
						voiceName,
					},
				},
			},
			contextWindowCompression: {
				triggerTokens: "25600",
				slidingWindow: { targetTokens: "12800" },
			},
			tools,
		};

		this.session = await this.ai.live.connect({
			model,
			callbacks: {
				onopen: () => {},
				onmessage: (message: LiveServerMessage) => {
					this.responseQueue.push(message);
				},
				onerror: (_e: ErrorEvent) => {},
				onclose: (_e: CloseEvent) => {},
			},
			config,
		});
	}

	async sendMessage(content: string) {
		if (!this.session) {
			throw new Error("Not connected");
		}
		this.session.sendClientContent({
			turns: [content],
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
			this.handleMessage(message);

			if (message.serverContent?.turnComplete) {
				done = true;
			}
		}

		return turn;
	}

	private handleMessage(message: LiveServerMessage) {
		// Handle tool calls
		if (message.toolCall) {
			message.toolCall.functionCalls?.forEach((functionCall) => {
				// Simulate weather response
				if (functionCall.name === "getCurrentWeather") {
					const response = {
						temperature: 72,
						unit: functionCall.args.unit || "fahrenheit",
						description: "Sunny",
						location: functionCall.args.location,
					};

					this.session?.sendToolResponse({
						functionResponses: [
							{
								id: functionCall.id,
								name: functionCall.name,
								response: { response: JSON.stringify(response) },
							},
						],
					});
				}
			});
		}

		// Handle model responses
		if (message.serverContent?.modelTurn?.parts) {
			const part = message.serverContent.modelTurn.parts[0];

			if (part?.text) {
			}

			if (part?.inlineData) {
				this.audioParts.push(part.inlineData.data || "");
			}

			if (part?.fileData) {
			}
		}
	}

	async saveAudio(filename = "output.wav") {
		if (this.audioParts.length === 0) {
			return;
		}

		const mimeType = "audio/L16;rate=24000";
		const wavBuffer = this.convertToWav(this.audioParts, mimeType);

		// Ensure output directory exists
		const outputDir = "./output";
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		const filepath = `${outputDir}/${filename}`;
		await writeFile(filepath, wavBuffer);
	}

	private convertToWav(rawData: string[], mimeType: string): Buffer {
		const options = this.parseMimeType(mimeType);
		const dataLength = rawData.reduce((a, b) => a + b.length, 0);
		const wavHeader = this.createWavHeader(dataLength, options);
		const buffer = Buffer.concat(
			rawData.map((data) => Buffer.from(data, "base64")),
		);

		return Buffer.concat([wavHeader, buffer]);
	}

	private parseMimeType(mimeType: string) {
		const [fileType, ...params] = mimeType.split(";").map((s) => s.trim());
		const [_, format] = fileType.split("/");

		const options = {
			numChannels: 1,
			bitsPerSample: 16,
			sampleRate: 24_000,
		};

		if (format?.startsWith("L")) {
			const bits = Number.parseInt(format.slice(1), 10);
			if (!Number.isNaN(bits)) {
				options.bitsPerSample = bits;
			}
		}

		for (const param of params) {
			const [key, value] = param.split("=").map((s) => s.trim());
			if (key === "rate") {
				options.sampleRate = Number.parseInt(value, 10);
			}
		}

		return options;
	}

	private createWavHeader(
		dataLength: number,
		options: { numChannels: number; sampleRate: number; bitsPerSample: number },
	): Buffer {
		const { numChannels, sampleRate, bitsPerSample } = options;
		const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
		const blockAlign = (numChannels * bitsPerSample) / 8;
		const buffer = Buffer.alloc(44);

		buffer.write("RIFF", 0);
		buffer.writeUInt32LE(36 + dataLength, 4);
		buffer.write("WAVE", 8);
		buffer.write("fmt ", 12);
		buffer.writeUInt32LE(16, 16);
		buffer.writeUInt16LE(1, 20);
		buffer.writeUInt16LE(numChannels, 22);
		buffer.writeUInt32LE(sampleRate, 24);
		buffer.writeUInt32LE(byteRate, 28);
		buffer.writeUInt16LE(blockAlign, 32);
		buffer.writeUInt16LE(bitsPerSample, 34);
		buffer.write("data", 36);
		buffer.writeUInt32LE(dataLength, 40);

		return buffer;
	}

	close() {
		this.session?.close();
		this.session = undefined;
	}
}

// Example usage
async function main() {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		process.exit(1);
	}

	const example = new GeminiAudioExample(apiKey);

	try {
		// Connect to Gemini
		await example.connect();
		await example.sendMessage(
			"Hello! Can you introduce yourself and tell me a joke?",
		);
		await example.handleTurn();
		await example.saveAudio("example1_joke.wav");

		// Clear audio buffer for next example
		example.audioParts = [];
		await example.sendMessage("What's the weather like in San Francisco?");
		await example.handleTurn();
		await example.saveAudio("example2_weather.wav");

		// Clear audio buffer
		example.audioParts = [];
		await example.sendMessage(
			"Can you explain quantum computing in simple terms, then tell me about its potential applications?",
		);
		await example.handleTurn();
		await example.saveAudio("example3_quantum.wav");
	} catch (_error) {
	} finally {
		example.close();
	}
}

// Run the example
if (require.main === module) {
	main().catch(console.error);
}
