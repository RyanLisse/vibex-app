"use client";

/**
 * Kibo-UI Voice Input Component
 * Voice input component with visual feedback and transcription
 */

import { Loader2, Mic, MicOff } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
	onTranscript?: (transcript: string) => void;
	onRecordingStart?: () => void;
	onRecordingEnd?: (audioBlob: Blob) => void;
	onError?: (error: Error) => void;
	className?: string;
	disabled?: boolean;
	autoStop?: boolean;
	maxDuration?: number; // in seconds
}

export function VoiceInput({
	onTranscript,
	onRecordingStart,
	onRecordingEnd,
	onError,
	className,
	disabled = false,
	autoStop = true,
	maxDuration = 60,
}: VoiceInputProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [audioLevel, setAudioLevel] = useState(0);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Set up audio analysis for visual feedback
			audioContextRef.current = new AudioContext();
			analyserRef.current = audioContextRef.current.createAnalyser();
			const source = audioContextRef.current.createMediaStreamSource(stream);
			source.connect(analyserRef.current);
			analyserRef.current.fftSize = 256;

			// Set up media recorder
			mediaRecorderRef.current = new MediaRecorder(stream);
			chunksRef.current = [];

			mediaRecorderRef.current.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};

			mediaRecorderRef.current.onstop = async () => {
				const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
				setIsProcessing(true);
				onRecordingEnd?.(audioBlob);

				// Simulate transcription (replace with actual API call)
				if (onTranscript) {
					setTimeout(() => {
						onTranscript("This is a sample transcription of the recorded audio.");
						setIsProcessing(false);
					}, 1500);
				} else {
					setIsProcessing(false);
				}
			};

			mediaRecorderRef.current.start();
			setIsRecording(true);
			onRecordingStart?.();

			// Start audio level monitoring
			monitorAudioLevel();

			// Set up auto-stop timer
			if (autoStop && maxDuration) {
				timerRef.current = setTimeout(() => {
					stopRecording();
				}, maxDuration * 1000);
			}
		} catch (error) {
			onError?.(error as Error);
			console.error("Error starting recording:", error);
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
			setIsRecording(false);

			// Clean up timer
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}

			// Clean up audio context
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}

			// Stop animation frame
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}

			setAudioLevel(0);
		}
	};

	const monitorAudioLevel = () => {
		if (!analyserRef.current) return;

		const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
		analyserRef.current.getByteFrequencyData(dataArray);

		// Calculate average volume
		const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
		setAudioLevel(average / 255); // Normalize to 0-1

		if (isRecording) {
			animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
		}
	};

	useEffect(() => {
		return () => {
			stopRecording();
		};
	}, []);

	return (
		<Card className={cn("voice-input", className)}>
			<CardContent className="p-4">
				<div className="flex flex-col items-center space-y-4">
					<Button
						onClick={isRecording ? stopRecording : startRecording}
						disabled={disabled || isProcessing}
						variant={isRecording ? "destructive" : "default"}
						size="lg"
						className="rounded-full w-20 h-20"
					>
						{isProcessing ? (
							<Loader2 className="h-8 w-8 animate-spin" />
						) : isRecording ? (
							<MicOff className="h-8 w-8" />
						) : (
							<Mic className="h-8 w-8" />
						)}
					</Button>

					{isRecording && (
						<div className="w-full space-y-2">
							<div className="text-center text-sm text-muted-foreground">Recording...</div>
							<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
								<div
									className="h-full bg-red-500 transition-all duration-100"
									style={{ width: `${audioLevel * 100}%` }}
								/>
							</div>
						</div>
					)}

					{isProcessing && (
						<div className="text-center text-sm text-muted-foreground">Processing...</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export function VoiceInputTrigger({
	onClick,
	isRecording = false,
	className,
	children,
}: {
	onClick?: () => void;
	isRecording?: boolean;
	className?: string;
	children?: React.ReactNode;
}) {
	return (
		<Button
			onClick={onClick}
			variant={isRecording ? "destructive" : "outline"}
			size="icon"
			className={cn("voice-input-trigger", className)}
		>
			{children || (isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />)}
		</Button>
	);
}
