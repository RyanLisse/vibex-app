"use client";

import { Download, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface VoiceRecorderProps {
	audioBlob?: Blob | null;
	isRecording?: boolean;
	recordingDuration?: number;
	onClear?: () => void;
	className?: string;
}

export function VoiceRecorder({
	audioBlob,
	isRecording = false,
	recordingDuration = 0,
	onClear,
	className = "",
}: VoiceRecorderProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackProgress, setPlaybackProgress] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);
	const audioRef = useRef<HTMLAudioElement>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);

	// Create audio URL when blob changes
	useEffect(() => {
		if (audioBlob) {
			const url = URL.createObjectURL(audioBlob);
			setAudioUrl(url);
			return () => URL.revokeObjectURL(url);
		}
		setAudioUrl(null);
	}, [audioBlob]);

	// Set up audio element when URL changes
	useEffect(() => {
		if (audioUrl && audioRef.current) {
			const audio = audioRef.current;
			audio.src = audioUrl;

			const handleLoadedMetadata = () => {
				setAudioDuration(audio.duration);
			};

			const handleTimeUpdate = () => {
				if (audio.duration > 0) {
					setPlaybackProgress((audio.currentTime / audio.duration) * 100);
				}
			};

			const handleEnded = () => {
				setIsPlaying(false);
				setPlaybackProgress(0);
			};

			audio.addEventListener("loadedmetadata", handleLoadedMetadata);
			audio.addEventListener("timeupdate", handleTimeUpdate);
			audio.addEventListener("ended", handleEnded);

			return () => {
				audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
				audio.removeEventListener("timeupdate", handleTimeUpdate);
				audio.removeEventListener("ended", handleEnded);
			};
		}
	}, [audioUrl]);

	const handlePlayPause = useCallback(() => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause();
				setIsPlaying(false);
			} else {
				audioRef.current.play();
				setIsPlaying(true);
			}
		}
	}, [isPlaying]);

	const handleDownload = useCallback(() => {
		if (audioUrl) {
			const link = document.createElement("a");
			link.href = audioUrl;
			link.download = `voice-task-${Date.now()}.webm`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}, [audioUrl]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	if (isRecording) {
		return (
			<Card className={className}>
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
						Recording...
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="text-2xl font-mono text-center">{formatTime(recordingDuration)}</div>
						<Progress value={100} className="h-2" />
						<p className="text-sm text-gray-600 text-center">
							Speak clearly to create your voice task
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!audioBlob || !audioUrl) {
		return (
			<Card className={`border-2 border-dashed border-gray-300 ${className}`}>
				<CardContent className="flex items-center justify-center p-8">
					<div className="text-center text-gray-500">
						<p className="text-lg font-medium">No voice recording</p>
						<p className="text-sm">Click "Voice Task" to start recording</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">Voice Recording</CardTitle>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownload}
							className="flex items-center gap-1"
						>
							<Download className="h-4 w-4" />
							Download
						</Button>
						{onClear && (
							<Button
								variant="outline"
								size="sm"
								onClick={onClear}
								className="flex items-center gap-1 text-red-600 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
								Clear
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{/* Audio element (hidden) */}
					<audio ref={audioRef} preload="metadata" />

					{/* Playback controls */}
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePlayPause}
							className="flex items-center gap-2"
						>
							<Play className={`h-4 w-4 ${isPlaying ? "animate-pulse" : ""}`} />
							{isPlaying ? "Playing" : "Play"}
						</Button>

						<div className="flex-1 space-y-2">
							<Progress value={playbackProgress} className="h-2" />
							<div className="flex justify-between text-xs text-gray-500">
								<span>{formatTime((playbackProgress / 100) * audioDuration)}</span>
								<span>{formatTime(audioDuration)}</span>
							</div>
						</div>
					</div>

					<div className="text-sm text-gray-600">Duration: {formatTime(audioDuration)}</div>
				</div>
			</CardContent>
		</Card>
	);
}

import type React from "react";
import { useCallback, useState } from "react";

interface VoiceRecorderProps {
	onRecordingComplete?: (audioBlob: Blob) => void;
	onError?: (error: Error) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onError }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

	const startRecording = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream);
			const chunks: BlobPart[] = [];

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			recorder.onstop = () => {
				const audioBlob = new Blob(chunks, { type: "audio/webm" });
				onRecordingComplete?.(audioBlob);
				stream.getTracks().forEach((track) => track.stop());
			};

			recorder.start();
			setMediaRecorder(recorder);
			setIsRecording(true);
		} catch (error) {
			onError?.(error as Error);
		}
	}, [onRecordingComplete, onError]);

	const stopRecording = useCallback(() => {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			setIsRecording(false);
			setMediaRecorder(null);
		}
	}, [mediaRecorder, isRecording]);

	const toggleRecording = useCallback(() => {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	}, [isRecording, stopRecording, startRecording]);

	return (
		<div className="flex flex-col items-center space-y-4">
			<button
				onClick={toggleRecording}
				className={`
					px-6 py-3 rounded-full font-medium transition-all duration-200
					${
						isRecording
							? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
							: "bg-blue-500 text-white hover:bg-blue-600"
					}
				`}
			>
				{isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
			</button>
			{isRecording && <div className="text-sm text-gray-600">Recording in progress...</div>}
		</div>
	);
};

export default VoiceRecorder;
