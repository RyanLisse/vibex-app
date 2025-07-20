"use client";


import { Mic, Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VoiceRecording } from "@/src/schemas/enhanced-task-schemas";


interface VoiceRecorderProps {
	onRecordingComplete: (recording: VoiceRecording) => void;
	onError?: (error: string) => void;
	isRecording: boolean;
	maxDuration?: number; // in seconds
	className?: string;
}

export function VoiceRecorder({
	onRecordingComplete,
	onError,
	isRecording,
	maxDuration = 300, // 5 minutes default
	className = "",
}: VoiceRecorderProps) {
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
		null,
	);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const [duration, setDuration] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const streamRef = useRef<MediaStream | null>(null);

	// Initialize recording when isRecording becomes true
	useEffect(() => {
		if (isRecording && !mediaRecorder) {
			startRecording();
		} else if (!isRecording && mediaRecorder) {
			stopRecording();
		}
	}, [isRecording, mediaRecorder, startRecording, stopRecording]);

	// Timer for recording duration
	useEffect(() => {
		if (isRecording && !isPaused) {
			intervalRef.current = setInterval(() => {
				setDuration((prev) => {
					const newDuration = prev + 1;

					// Auto-stop at max duration
					if (newDuration >= maxDuration) {
						stopRecording();
						return maxDuration;
					}

					return newDuration;
				});
			}, 1000);
		} else if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isRecording, isPaused, maxDuration, stopRecording]);

	const startRecording = useCallback(async () => {
		try {
			// Request microphone access
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			streamRef.current = stream;

			// Create MediaRecorder
			const recorder = new MediaRecorder(stream, {
				mimeType: MediaRecorder.isTypeSupported("audio/webm")
					? "audio/webm"
					: "audio/mp4",
			});

			const chunks: Blob[] = [];

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			recorder.onstop = () => {
				const audioBlob = new Blob(chunks, { type: recorder.mimeType });

				const recording: VoiceRecording = {
					id: crypto.randomUUID(),
					audioBlob,
					duration: duration * 1000, // Convert to milliseconds
					timestamp: new Date(),
				};

				onRecordingComplete(recording);

				// Cleanup
				if (streamRef.current) {
					streamRef.current.getTracks().forEach((track) => track.stop());
					streamRef.current = null;
				}

				setAudioChunks([]);
				setDuration(0);
				setMediaRecorder(null);
				setIsPaused(false);
			};

			recorder.onerror = (event) => {
				const error =
					"Recording failed: " + (event.error?.message || "Unknown error");
				onError?.(error);
				cleanup();
			};

			recorder.start(100); // Collect data every 100ms
			setMediaRecorder(recorder);
			setAudioChunks(chunks);
		} catch (error) {
			let errorMessage = "Failed to start recording";

			if (error instanceof Error) {
				if (error.name === "NotAllowedError") {
					errorMessage = "Microphone access denied";
				} else if (error.name === "NotFoundError") {
					errorMessage = "No microphone found";
				} else {
					errorMessage = error.message;
				}
			}

			onError?.(errorMessage);
			cleanup();
		}
	}, [onError, duration, onRecordingComplete]);

	const stopRecording = useCallback(() => {
		if (mediaRecorder && mediaRecorder.state !== "inactive") {
			mediaRecorder.stop();
		}
	}, [mediaRecorder]);

	const pauseRecording = () => {
		if (mediaRecorder && mediaRecorder.state === "recording") {
			mediaRecorder.pause();
			setIsPaused(true);
		}
	};

	const resumeRecording = () => {
		if (mediaRecorder && mediaRecorder.state === "paused") {
			mediaRecorder.resume();
			setIsPaused(false);
		}
	};

	const cleanup = () => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}

		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}

		setMediaRecorder(null);
		setAudioChunks([]);
		setDuration(0);
		setIsPaused(false);
	};

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const progressPercentage = (duration / maxDuration) * 100;

	if (!isRecording) {
		return null;
	}

	return (
		<div className={`space-y-4 rounded-lg border bg-muted/50 p-4 ${className}`}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
					<span className="font-medium text-sm">
						{isPaused ? "Paused" : "Recording"}
					</span>
				</div>

				<div className="font-mono text-lg">{formatTime(duration)}</div>
			</div>

			{/* Progress bar */}
			<div className="space-y-1">
				<Progress className="h-2" value={progressPercentage} />
				<div className="flex justify-between text-muted-foreground text-xs">
					<span>0:00</span>
					<span>{formatTime(maxDuration)}</span>
				</div>
			</div>

			{/* Recording controls */}
			<div className="flex items-center justify-center gap-2">
				{isPaused ? (
					<Button
						className="gap-1"
						onClick={resumeRecording}
						size="sm"
						variant="outline"
					>
						<Play className="h-4 w-4" />
						Resume
					</Button>
				) : (
					<Button
						className="gap-1"
						onClick={pauseRecording}
						size="sm"
						variant="outline"
					>
						<Pause className="h-4 w-4" />
						Pause
					</Button>
				)}

				<Button
					className="gap-1"
					onClick={stopRecording}
					size="sm"
					variant="destructive"
				>
					<Square className="h-4 w-4" />
					Stop
				</Button>
			</div>

			{/* Visual indicator */}
			<div className="flex justify-center">
				<div className="flex items-center gap-1">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							className={`h-8 w-1 rounded-full transition-all duration-150 ${
								isPaused ? "bg-muted-foreground/30" : "animate-pulse bg-red-500"
							}`}
							key={i}
							style={{
								animationDelay: `${i * 100}ms`,
								height: isPaused ? "8px" : `${20 + Math.random() * 20}px`,
							}}
						/>
					))}
				</div>
			</div>

			{duration >= maxDuration * 0.9 && (
				<div className="text-center text-sm text-yellow-600">
					Recording will stop automatically in {maxDuration - duration} seconds
				</div>
			)}
		</div>
	);
}
