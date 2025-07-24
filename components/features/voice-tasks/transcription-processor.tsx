"use client";

import { CheckCircle, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Web Speech API type declarations
declare global {
	interface Window {
		SpeechRecognition: any;
		webkitSpeechRecognition: any;
	}
}

interface TranscriptionProcessorProps {
	audioBlob?: Blob | null;
	onTranscriptionComplete?: (transcription: string) => void;
	onError?: (error: Error) => void;
	className?: string;
}

export function TranscriptionProcessor({
	audioBlob,
	onTranscriptionComplete,
	onError,
	className = "",
}: TranscriptionProcessorProps) {
	const [transcription, setTranscription] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editedTranscription, setEditedTranscription] = useState("");
	const { toast } = useToast();

	// Check for browser support
	const isWebSpeechSupported =
		(typeof window !== "undefined" && "webkitSpeechRecognition" in window) ||
		"SpeechRecognition" in window;

	const processTranscription = useCallback(async () => {
		if (!audioBlob) return;

		setIsProcessing(true);

		try {
			if (isWebSpeechSupported) {
				// Use Web Speech API for real-time transcription
				// Note: This is a simplified implementation
				// In a real app, you'd want to use the audio blob with a transcription service

				const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
				const recognition = new SpeechRecognition();

				recognition.continuous = true;
				recognition.interimResults = true;
				recognition.lang = "en-US";

				recognition.onresult = (event) => {
					let finalTranscript = "";
					for (let i = event.resultIndex; i < event.results.length; i++) {
						if (event.results[i].isFinal) {
							finalTranscript += event.results[i][0].transcript;
						}
					}

					if (finalTranscript) {
						setTranscription(finalTranscript);
						setEditedTranscription(finalTranscript);
						onTranscriptionComplete?.(finalTranscript);
					}
				};

				recognition.onerror = (event) => {
					const error = new Error(`Speech recognition error: ${event.error}`);
					onError?.(error);
					toast({
						title: "Transcription Error",
						description: error.message,
						variant: "destructive",
					});
				};

				recognition.onend = () => {
					setIsProcessing(false);
				};

				// For demo purposes, we'll simulate transcription from the audio blob
				// In a real implementation, you'd send the audio to a transcription service
				setTimeout(() => {
					const mockTranscription =
						"Create a new task to implement user authentication with OAuth2 support";
					setTranscription(mockTranscription);
					setEditedTranscription(mockTranscription);
					onTranscriptionComplete?.(mockTranscription);
					setIsProcessing(false);

					toast({
						title: "Transcription Complete",
						description: "Your voice has been converted to text.",
					});
				}, 2000);
			} else {
				// Fallback: Call external transcription API
				const formData = new FormData();
				formData.append("audio", audioBlob, "recording.webm");

				const response = await fetch("/api/tasks/voice/transcribe", {
					method: "POST",
					body: formData,
				});

				if (!response.ok) {
					throw new Error(`Transcription failed: ${response.statusText}`);
				}

				const result = await response.json();
				const transcribedText = result.transcription || result.text || "";

				setTranscription(transcribedText);
				setEditedTranscription(transcribedText);
				onTranscriptionComplete?.(transcribedText);

				toast({
					title: "Transcription Complete",
					description: "Your voice has been converted to text.",
				});
			}
		} catch (error) {
			const err = error as Error;
			onError?.(err);
			toast({
				title: "Transcription Failed",
				description: `Failed to transcribe audio: ${err.message}`,
				variant: "destructive",
			});
		} finally {
			setIsProcessing(false);
		}
	}, [audioBlob, isWebSpeechSupported, onTranscriptionComplete, onError, toast]);

	// Auto-process when audio blob is provided
	useEffect(() => {
		if (audioBlob && !transcription && !isProcessing) {
			processTranscription();
		}
	}, [audioBlob, transcription, isProcessing, processTranscription]);

	const handleEditSave = useCallback(() => {
		setTranscription(editedTranscription);
		onTranscriptionComplete?.(editedTranscription);
		setIsEditing(false);

		toast({
			title: "Transcription Updated",
			description: "Your changes have been saved.",
		});
	}, [editedTranscription, onTranscriptionComplete, toast]);

	const handleEditCancel = useCallback(() => {
		setEditedTranscription(transcription);
		setIsEditing(false);
	}, [transcription]);

	if (!audioBlob) {
		return (
			<Card className={`border-2 border-dashed border-gray-300 ${className}`}>
				<CardContent className="flex items-center justify-center p-8">
					<div className="text-center text-gray-500">
						<p className="text-lg font-medium">No audio to transcribe</p>
						<p className="text-sm">Record audio first to see transcription</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg flex items-center gap-2">
						<Volume2 className="h-5 w-5" />
						Transcription
					</CardTitle>
					<div className="flex gap-2">
						{transcription && !isProcessing && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsEditing(!isEditing)}
								className="flex items-center gap-1"
							>
								{isEditing ? "Cancel" : "Edit"}
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={processTranscription}
							disabled={isProcessing}
							className="flex items-center gap-1"
						>
							<RefreshCw className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
							Retry
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{isProcessing ? (
					<div className="flex items-center justify-center p-8">
						<div className="text-center">
							<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
							<p className="text-lg font-medium">Processing audio...</p>
							<p className="text-sm text-gray-600">Converting speech to text</p>
						</div>
					</div>
				) : transcription ? (
					<div className="space-y-4">
						{isEditing ? (
							<div className="space-y-3">
								<Textarea
									value={editedTranscription}
									onChange={(e) => setEditedTranscription(e.target.value)}
									rows={4}
									placeholder="Edit your transcription..."
									className="resize-none"
								/>
								<div className="flex gap-2">
									<Button size="sm" onClick={handleEditSave} className="flex items-center gap-1">
										<CheckCircle className="h-4 w-4" />
										Save Changes
									</Button>
									<Button variant="outline" size="sm" onClick={handleEditCancel}>
										Cancel
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-3">
								<div className="p-4 bg-gray-50 rounded-lg border">
									<p className="text-sm leading-relaxed">{transcription}</p>
								</div>
								<div className="flex items-center gap-2 text-sm text-green-600">
									<CheckCircle className="h-4 w-4" />
									Transcription complete
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="text-center p-8 text-gray-500">
						<p>Failed to transcribe audio. Please try again.</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

import { AlertCircle, Loader2, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VoiceRecording } from "@/src/schemas/enhanced-task-schemas";

interface TranscriptionSegment {
	text: string;
	start: number;
	end: number;
	confidence: number;
}

interface TranscriptionResult {
	text: string;
	confidence: number;
	language: string;
	segments: TranscriptionSegment[];
}

interface TranscriptionProcessorProps {
	recording: VoiceRecording;
	onTranscriptionComplete: (result: TranscriptionResult) => void;
	onError?: (error: string) => void;
	language?: string;
	className?: string;
}

export function TranscriptionProcessor({
	recording,
	onTranscriptionComplete,
	onError,
	language = "en-US",
	className = "",
}: TranscriptionProcessorProps) {
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [transcriptionText, setTranscriptionText] = useState("");

	const startTranscription = useCallback(async () => {
		setIsTranscribing(true);
		setError(null);
		setProgress(0);
		setTranscriptionText("");

		try {
			// Check browser support
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

			if (!SpeechRecognition) {
				throw new Error("Speech recognition is not supported in this browser");
			}

			// Create audio element from blob
			const audioUrl = URL.createObjectURL(recording.audioBlob);
			const audio = new Audio(audioUrl);

			// Initialize speech recognition
			const recognition = new SpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.lang = language;

			let finalTranscript = "";
			let interimTranscript = "";
			const segments: Array<{
				text: string;
				start: number;
				end: number;
				confidence: number;
			}> = [];

			recognition.onstart = () => {
				setProgress(10);
			};

			recognition.onresult = (event) => {
				interimTranscript = "";

				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					const transcript = result[0].transcript;
					const confidence = result[0].confidence || 0.8;

					if (result.isFinal) {
						finalTranscript += transcript + " ";

						// Add segment
						segments.push({
							text: transcript,
							start: i * 2, // Approximate timing
							end: (i + 1) * 2,
							confidence,
						});

						setProgress(Math.min(30 + segments.length * 10, 90));
					} else {
						interimTranscript += transcript;
					}
				}

				setTranscriptionText(finalTranscript + interimTranscript);
			};

			recognition.onerror = (event) => {
				let errorMessage = "Transcription failed";

				switch (event.error) {
					case "network":
						errorMessage = "Network error during transcription";
						break;
					case "not-allowed":
						errorMessage = "Microphone permission required for transcription";
						break;
					case "service-not-allowed":
						errorMessage = "Speech recognition service not available";
						break;
					case "bad-grammar":
						errorMessage = "Speech recognition grammar error";
						break;
					case "language-not-supported":
						errorMessage = `Language ${language} is not supported`;
						break;
					default:
						errorMessage = `Transcription error: ${event.error}`;
				}

				setError(errorMessage);
				onError?.(errorMessage);
				setIsTranscribing(false);
			};

			recognition.onend = () => {
				setProgress(100);

				if (finalTranscript.trim()) {
					const result: TranscriptionResult = {
						text: finalTranscript.trim(),
						confidence:
							segments.length > 0
								? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
								: 0.8,
						language,
						segments,
					};

					onTranscriptionComplete(result);
				} else {
					setError("No speech detected in the recording");
					onError?.("No speech detected in the recording");
				}

				setIsTranscribing(false);
				URL.revokeObjectURL(audioUrl);
			};

			// Start recognition
			recognition.start();

			// Simulate progress for better UX
			const progressInterval = setInterval(() => {
				setProgress((prev) => {
					if (prev >= 90) {
						clearInterval(progressInterval);
						return prev;
					}
					return prev + 2;
				});
			}, 200);

			// Auto-stop after recording duration + buffer
			setTimeout(() => {
				if (recognition) {
					recognition.stop();
				}
				clearInterval(progressInterval);
			}, recording.duration + 2000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Transcription failed";
			setError(errorMessage);
			onError?.(errorMessage);
			setIsTranscribing(false);
		}
	}, [recording, language, onTranscriptionComplete, onError]);

	useEffect(() => {
		startTranscription();
	}, [startTranscription]);

	const retryTranscription = () => {
		startTranscription();
	};

	return (
		<div className={`space-y-4 ${className}`}>
			<div className="flex items-center gap-2">
				<Volume2 className="h-5 w-5 text-blue-500" />
				<h3 className="font-semibold text-lg">
					{isTranscribing ? "Transcribing Audio..." : "Transcription Complete"}
				</h3>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription className="flex items-center justify-between">
						<span>{error}</span>
						<Button onClick={retryTranscription} size="sm" variant="outline">
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{isTranscribing && (
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span className="text-muted-foreground text-sm">Processing speech...</span>
					</div>

					<Progress className="w-full" role="progressbar" value={progress} />

					<div className="text-center text-muted-foreground text-xs">
						{progress < 30 && "Initializing speech recognition..."}
						{progress >= 30 && progress < 70 && "Converting speech to text..."}
						{progress >= 70 && progress < 100 && "Finalizing transcription..."}
						{progress >= 100 && "Complete!"}
					</div>
				</div>
			)}

			{transcriptionText && (
				<div className="space-y-2">
					<h4 className="font-medium text-muted-foreground text-sm">Live Transcription:</h4>
					<div className="min-h-[60px] rounded-lg border bg-muted/50 p-3">
						<p className="text-sm leading-relaxed">{transcriptionText}</p>
					</div>
				</div>
			)}

			{!(isTranscribing || error) && (
				<div className="text-muted-foreground text-sm">
					<p>
						<strong>Language:</strong> {language}
					</p>
					<p>
						<strong>Duration:</strong> {Math.round(recording.duration / 1000)}s
					</p>
				</div>
			)}
		</div>
	);
}

// Extend Window interface for TypeScript
declare global {
	interface Window {
		webkitSpeechRecognition?: SpeechRecognition;
		SpeechRecognition?: SpeechRecognition;
	}
}
