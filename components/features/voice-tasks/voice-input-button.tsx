"use client";

import { Mic, MicOff, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputButtonProps {
	onRecordingStart?: () => void;
	onRecordingStop?: (audioBlob: Blob) => void;
	onError?: (error: Error) => void;
	disabled?: boolean;
	className?: string;
}

export function VoiceInputButton({
	onRecordingStart,
	onRecordingStop,
	onError,
	disabled = false,
	className = "",
}: VoiceInputButtonProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const { toast } = useToast();

	// Check for browser support
	const isSupported =
		typeof window !== "undefined" &&
		navigator.mediaDevices &&
		navigator.mediaDevices.getUserMedia &&
		window.MediaRecorder;

	const startRecording = useCallback(async () => {
		if (!isSupported) {
			const error = new Error("Voice recording not supported in this browser");
			onError?.(error);
			toast({
				title: "Voice Recording Not Supported",
				description: "Your browser doesn't support voice recording. Please use a modern browser.",
				variant: "destructive",
			});
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			const recorder = new MediaRecorder(stream, {
				mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
			});

			const chunks: Blob[] = [];

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			recorder.onstop = () => {
				const audioBlob = new Blob(chunks, {
					type: recorder.mimeType || "audio/webm",
				});
				onRecordingStop?.(audioBlob);

				// Stop all tracks to release microphone
				stream.getTracks().forEach((track) => track.stop());
			};

			recorder.onerror = (event) => {
				const error = new Error(`Recording error: ${event.error?.message || "Unknown error"}`);
				onError?.(error);
				toast({
					title: "Recording Error",
					description: error.message,
					variant: "destructive",
				});
			};

			setMediaRecorder(recorder);
			setAudioChunks(chunks);
			recorder.start(100); // Collect data every 100ms
			setIsRecording(true);
			onRecordingStart?.();

			toast({
				title: "Recording Started",
				description: "Speak now to create a voice task.",
			});
		} catch (error) {
			const err = error as Error;
			onError?.(err);

			if (err.name === "NotAllowedError") {
				toast({
					title: "Microphone Permission Denied",
					description: "Please allow microphone access to record voice tasks.",
					variant: "destructive",
				});
			} else if (err.name === "NotFoundError") {
				toast({
					title: "No Microphone Found",
					description: "No microphone device was found. Please connect a microphone.",
					variant: "destructive",
				});
			} else {
				toast({
					title: "Recording Failed",
					description: `Failed to start recording: ${err.message}`,
					variant: "destructive",
				});
			}
		}
	}, [isSupported, onRecordingStart, onRecordingStop, onError, toast]);

	const stopRecording = useCallback(() => {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			setIsRecording(false);
			setMediaRecorder(null);

			toast({
				title: "Recording Stopped",
				description: "Processing your voice input...",
			});
		}
	}, [mediaRecorder, isRecording, toast]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (mediaRecorder && isRecording) {
				mediaRecorder.stop();
			}
		};
	}, [mediaRecorder, isRecording]);

	if (!isSupported) {
		return (
			<Button disabled={true} className={`flex items-center gap-2 ${className}`} variant="outline">
				<MicOff className="h-4 w-4" />
				Voice Not Supported
			</Button>
		);
	}

	return (
		<Button
			onClick={isRecording ? stopRecording : startRecording}
			disabled={disabled}
			className={`flex items-center gap-2 ${className} ${
				isRecording ? "bg-red-500 hover:bg-red-600 text-white" : ""
			}`}
			variant={isRecording ? "default" : "outline"}
		>
			{isRecording ? (
				<>
					<Square className="h-4 w-4" />
					Stop Recording
				</>
			) : (
				<>
					<Mic className="h-4 w-4" />
					Voice Task
				</>
			)}
		</Button>
	);
}

import type React from "react";

interface VoiceInputButtonProps {
	isRecording?: boolean;
	onToggleRecording?: () => void;
	disabled?: boolean;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
	isRecording = false,
	onToggleRecording,
	disabled = false,
}) => {
	return (
		<button
			type="button"
			onClick={onToggleRecording}
			disabled={disabled}
			className={`
				px-4 py-2 rounded-md font-medium transition-colors
				${
					isRecording
						? "bg-red-500 text-white hover:bg-red-600"
						: "bg-blue-500 text-white hover:bg-blue-600"
				}
				${disabled ? "opacity-50 cursor-not-allowed" : ""}
			`}
			aria-label={isRecording ? "Stop recording" : "Start recording"}
		>
			{isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
		</button>
	);
};

export default VoiceInputButton;
