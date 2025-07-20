import type { Metadata } from "next";
import { GeminiAudioChat } from "@/components/ai/gemini-audio-chat";

export const metadata: Metadata = {
	title: "Gemini Audio Chat - AI Voice Conversations",
	description:
		"Experience real-time audio conversations with Google Gemini 2.5 Flash",
};

export default function GeminiAudioPage() {
	return (
		<div className="container mx-auto py-8">
			<div className="mb-8 text-center">
				<h1 className="mb-4 font-bold text-4xl">Gemini 2.5 Flash Audio Chat</h1>
				<p className="mx-auto max-w-2xl text-muted-foreground">
					Experience the power of Google&apos;s Gemini 2.5 Flash with native
					audio support. Have natural conversations using voice or text, with
					real-time responses.
				</p>
			</div>

			<div className="flex justify-center">
				<GeminiAudioChat />
			</div>

			<div className="mt-8">
				<h2 className="mb-4 text-center font-semibold text-2xl">Features</h2>
				<div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
					<div className="rounded-lg border p-4">
						<h3 className="mb-2 font-semibold">🎙️ Voice Input</h3>
						<p className="text-muted-foreground text-sm">
							Record your voice and send audio messages directly to Gemini
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<h3 className="mb-2 font-semibold">🔊 Audio Responses</h3>
						<p className="text-muted-foreground text-sm">
							Receive natural-sounding voice responses from the AI
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<h3 className="mb-2 font-semibold">💬 Text & Voice</h3>
						<p className="text-muted-foreground text-sm">
							Seamlessly switch between text and voice communication
						</p>
					</div>
				</div>
			</div>

			<div className="mt-8 text-center">
				<h2 className="mb-4 font-semibold text-2xl">Getting Started</h2>
				<div className="mx-auto max-w-2xl rounded-lg bg-muted p-6 text-left">
					<ol className="list-inside list-decimal space-y-2">
						<li>
							Get your Gemini API key from{" "}
							<a
								className="text-primary underline"
								href="https://aistudio.google.com/app/apikey"
								rel="noopener noreferrer"
								target="_blank"
							>
								Google AI Studio
							</a>
						</li>
						<li>Add the API key to your .env.local file as GEMINI_API_KEY</li>
						<li>Click &quot;Connect&quot; to start a conversation</li>
						<li>
							Use the microphone button to record audio or type your message
						</li>
						<li>Enjoy real-time AI conversations!</li>
					</ol>
				</div>
			</div>
		</div>
	);
}
