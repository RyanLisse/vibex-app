import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAudioPlaybackOptions {
	preloadStrategy?: "none" | "metadata" | "auto";
	onPlayStart?: () => void;
	onPlayEnd?: () => void;
	onError?: (error: Error) => void;
}

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const activeAudioUrls = useRef<Set<string>>(new Set());

	const createAudioElement = useCallback(
		(src: string): HTMLAudioElement => {
			const audio = new Audio(src);
			audio.preload = options.preloadStrategy || "metadata";

			// Add event listeners
			audio.addEventListener("loadstart", () => setIsLoading(true));
			audio.addEventListener("loadedmetadata", () => {
				setDuration(audio.duration);
				setIsLoading(false);
			});
			audio.addEventListener("timeupdate", () =>
				setCurrentTime(audio.currentTime),
			);
			audio.addEventListener("play", () => {
				setIsPlaying(true);
				options.onPlayStart?.();
			});
			audio.addEventListener("pause", () => setIsPlaying(false));
			audio.addEventListener("ended", () => {
				setIsPlaying(false);
				setCurrentTime(0);
				options.onPlayEnd?.();
			});
			audio.addEventListener("error", (_e) => {
				const errorMessage = "Failed to load audio";
				setError(errorMessage);
				setIsLoading(false);
				options.onError?.(new Error(errorMessage));
			});

			return audio;
		},
		[options],
	);

	const playAudio = useCallback(
		async (audioUrl: string) => {
			try {
				setError(null);

				// Stop any currently playing audio
				if (audioRef.current) {
					audioRef.current.pause();
					audioRef.current.currentTime = 0;
				}

				// Create new audio element
				const audio = createAudioElement(audioUrl);
				audioRef.current = audio;
				activeAudioUrls.current.add(audioUrl);

				await audio.play();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to play audio";
				setError(errorMessage);
				options.onError?.(new Error(errorMessage));
			}
		},
		[createAudioElement, options.onError],
	);

	const pauseAudio = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
		}
	}, []);

	const resumeAudio = useCallback(async () => {
		if (audioRef.current) {
			try {
				await audioRef.current.play();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to resume audio";
				setError(errorMessage);
				options.onError?.(new Error(errorMessage));
			}
		}
	}, [options.onError]);

	const stopAudio = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
	}, []);

	const seekTo = useCallback(
		(time: number) => {
			if (audioRef.current) {
				audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
			}
		},
		[duration],
	);

	const setVolume = useCallback((volume: number) => {
		if (audioRef.current) {
			audioRef.current.volume = Math.max(0, Math.min(1, volume));
		}
	}, []);

	// Clean up audio resources
	const cleanupAudio = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.remove();
			audioRef.current = null;
		}

		// Revoke object URLs to prevent memory leaks
		activeAudioUrls.current.forEach((url) => {
			if (url.startsWith("blob:")) {
				URL.revokeObjectURL(url);
			}
		});
		activeAudioUrls.current.clear();
	}, []);

	// Clean up on unmount
	useEffect(() => {
		return () => {
			cleanupAudio();
		};
	}, [cleanupAudio]);

	// Format time for display
	const formatTime = useCallback((seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}, []);

	return {
		isPlaying,
		duration,
		currentTime,
		error,
		isLoading,
		playAudio,
		pauseAudio,
		resumeAudio,
		stopAudio,
		seekTo,
		setVolume,
		cleanupAudio,
		formatTime,
		formattedDuration: formatTime(duration),
		formattedCurrentTime: formatTime(currentTime),
		progress: duration > 0 ? (currentTime / duration) * 100 : 0,
	};
}
