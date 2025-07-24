"use client";

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
