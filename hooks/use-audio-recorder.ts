import { useCallback, useRef, useState } from "react";

export interface UseAudioRecorderReturn {
	isRecording: boolean;
	isPaused: boolean;
	audioBlob: Blob | null;
	audioUrl: string | null;
	startRecording: () => Promise<void>;
	stopRecording: () => void;
	pauseRecording: () => void;
	resumeRecording: () => void;
	resetRecording: () => void;
	error: Error | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
	const [isRecording, setIsRecording] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const startRecording = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: "audio/webm" });
				setAudioBlob(blob);
				setAudioUrl(URL.createObjectURL(blob));
				chunksRef.current = [];
			};

			mediaRecorder.onerror = (event: any) => {
				setError(new Error(event.error?.message || "Recording error"));
			};

			mediaRecorderRef.current = mediaRecorder;
			mediaRecorder.start();
			setIsRecording(true);
			setIsPaused(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to start recording"));
		}
	}, []);

	const stopRecording = useCallback(() => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
			setIsRecording(false);
			setIsPaused(false);
		}
	}, []);

	const pauseRecording = useCallback(() => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
			mediaRecorderRef.current.pause();
			setIsPaused(true);
		}
	}, []);

	const resumeRecording = useCallback(() => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
			mediaRecorderRef.current.resume();
			setIsPaused(false);
		}
	}, []);

	const resetRecording = useCallback(() => {
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl);
		}
		setAudioBlob(null);
		setAudioUrl(null);
		setError(null);
		chunksRef.current = [];
	}, [audioUrl]);

	return {
		isRecording,
		isPaused,
		audioBlob,
		audioUrl,
		startRecording,
		stopRecording,
		pauseRecording,
		resumeRecording,
		resetRecording,
		error,
	};
}
