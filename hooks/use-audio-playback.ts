"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioChatMessage } from "@/types/audio-chat";

export interface AudioPlaybackState {
	isPlaying: boolean;
	isPaused: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	error: string | null;
	currentMessageId: string | null;
	isLoading: boolean;
	playbackRate: number;
}

export interface UseAudioPlaybackOptions {
	autoPlay?: boolean;
	defaultVolume?: number;
	defaultPlaybackRate?: number;
	onPlay?: (messageId: string) => void;
	onPause?: (messageId: string) => void;
	onStop?: (messageId: string) => void;
	onEnd?: (messageId: string) => void;
	onError?: (error: Error, messageId?: string) => void;
	onTimeUpdate?: (currentTime: number, duration: number) => void;
	onLoadStart?: (messageId: string) => void;
	onLoadEnd?: (messageId: string) => void;
}

export interface UseAudioPlaybackReturn {
	state: AudioPlaybackState;
	actions: {
		play: (messageId: string, audioUrl: string) => Promise<void>;
		pause: () => void;
		resume: () => void;
		stop: () => void;
		seek: (time: number) => void;
		setVolume: (volume: number) => void;
		setPlaybackRate: (rate: number) => void;
		toggle: () => void;
	};
	utils: {
		formatTime: (seconds: number) => string;
		getProgress: () => number;
		canPlay: (audioUrl?: string) => boolean;
		isCurrentMessage: (messageId: string) => boolean;
	};
}

const initialState: AudioPlaybackState = {
	isPlaying: false,
	isPaused: false,
	currentTime: 0,
	duration: 0,
	volume: 1.0,
	error: null,
	currentMessageId: null,
	isLoading: false,
	playbackRate: 1.0,
};

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}): UseAudioPlaybackReturn {
	const [state, setState] = useState<AudioPlaybackState>(initialState);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const currentUrlRef = useRef<string | null>(null);

	const {
		autoPlay = false,
		defaultVolume = 1.0,
		defaultPlaybackRate = 1.0,
		onPlay,
		onPause,
		onStop,
		onEnd,
		onError,
		onTimeUpdate,
		onLoadStart,
		onLoadEnd,
	} = options;

	// Initialize audio element and default settings
	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio();
			audioRef.current.preload = "metadata";
		}

		const audio = audioRef.current;

		// Set default volume and playback rate
		audio.volume = defaultVolume;
		audio.playbackRate = defaultPlaybackRate;

		setState((prev) => ({
			...prev,
			volume: defaultVolume,
			playbackRate: defaultPlaybackRate,
		}));

		// Audio event listeners
		const handleLoadStart = () => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			if (state.currentMessageId) {
				onLoadStart?.(state.currentMessageId);
			}
		};

		const handleLoadedMetadata = () => {
			setState((prev) => ({
				...prev,
				duration: audio.duration || 0,
				isLoading: false,
			}));
			if (state.currentMessageId) {
				onLoadEnd?.(state.currentMessageId);
			}
		};

		const handleTimeUpdate = () => {
			const currentTime = audio.currentTime;
			const duration = audio.duration || 0;

			setState((prev) => ({ ...prev, currentTime }));
			onTimeUpdate?.(currentTime, duration);
		};

		const handlePlay = () => {
			setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
			if (state.currentMessageId) {
				onPlay?.(state.currentMessageId);
			}
		};

		const handlePause = () => {
			setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
			if (state.currentMessageId) {
				onPause?.(state.currentMessageId);
			}
		};

		const handleEnded = () => {
			setState((prev) => ({
				...prev,
				isPlaying: false,
				isPaused: false,
				currentTime: 0,
			}));
			if (state.currentMessageId) {
				onEnd?.(state.currentMessageId);
			}
		};

		const handleError = (event: Event) => {
			const error = new Error(`Audio playback error: ${audio.error?.message || "Unknown error"}`);
			setState((prev) => ({
				...prev,
				error: error.message,
				isPlaying: false,
				isLoading: false,
			}));
			onError?.(error, state.currentMessageId || undefined);
		};

		const handleVolumeChange = () => {
			setState((prev) => ({ ...prev, volume: audio.volume }));
		};

		const handleRateChange = () => {
			setState((prev) => ({ ...prev, playbackRate: audio.playbackRate }));
		};

		// Add event listeners
		audio.addEventListener("loadstart", handleLoadStart);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);
		audio.addEventListener("volumechange", handleVolumeChange);
		audio.addEventListener("ratechange", handleRateChange);

		return () => {
			// Cleanup event listeners
			audio.removeEventListener("loadstart", handleLoadStart);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
			audio.removeEventListener("volumechange", handleVolumeChange);
			audio.removeEventListener("ratechange", handleRateChange);
		};
	}, [
		defaultVolume,
		defaultPlaybackRate,
		state.currentMessageId,
		onPlay,
		onPause,
		onStop,
		onEnd,
		onError,
		onTimeUpdate,
		onLoadStart,
		onLoadEnd,
	]);

	// Play audio from URL
	const play = useCallback(
		async (messageId: string, audioUrl: string) => {
			if (!audioRef.current) return;

			const audio = audioRef.current;

			try {
				// Stop current playback if different message
				if (state.currentMessageId && state.currentMessageId !== messageId) {
					audio.pause();
					audio.currentTime = 0;
				}

				// Load new audio if URL changed
				if (currentUrlRef.current !== audioUrl) {
					audio.src = audioUrl;
					currentUrlRef.current = audioUrl;
				}

				setState((prev) => ({
					...prev,
					currentMessageId: messageId,
					error: null,
					isLoading: true,
				}));

				await audio.play();
			} catch (error) {
				const playError = error instanceof Error ? error : new Error("Failed to play audio");
				setState((prev) => ({
					...prev,
					error: playError.message,
					isPlaying: false,
					isLoading: false,
				}));
				onError?.(playError, messageId);
			}
		},
		[state.currentMessageId, onError]
	);

	// Pause playback
	const pause = useCallback(() => {
		if (audioRef.current && state.isPlaying) {
			audioRef.current.pause();
		}
	}, [state.isPlaying]);

	// Resume playback
	const resume = useCallback(async () => {
		if (audioRef.current && state.isPaused) {
			try {
				await audioRef.current.play();
			} catch (error) {
				const playError = error instanceof Error ? error : new Error("Failed to resume audio");
				setState((prev) => ({ ...prev, error: playError.message }));
				onError?.(playError, state.currentMessageId || undefined);
			}
		}
	}, [state.isPaused, state.currentMessageId, onError]);

	// Stop playback
	const stop = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			setState((prev) => ({
				...prev,
				isPlaying: false,
				isPaused: false,
				currentTime: 0,
			}));
			if (state.currentMessageId) {
				onStop?.(state.currentMessageId);
			}
		}
	}, [state.currentMessageId, onStop]);

	// Seek to specific time
	const seek = useCallback(
		(time: number) => {
			if (audioRef.current) {
				const clampedTime = Math.max(0, Math.min(time, state.duration));
				audioRef.current.currentTime = clampedTime;
				setState((prev) => ({ ...prev, currentTime: clampedTime }));
			}
		},
		[state.duration]
	);

	// Set volume
	const setVolume = useCallback((volume: number) => {
		if (audioRef.current) {
			const clampedVolume = Math.max(0, Math.min(1, volume));
			audioRef.current.volume = clampedVolume;
		}
	}, []);

	// Set playback rate
	const setPlaybackRate = useCallback((rate: number) => {
		if (audioRef.current) {
			const clampedRate = Math.max(0.25, Math.min(4, rate)); // Common playback rate limits
			audioRef.current.playbackRate = clampedRate;
		}
	}, []);

	// Toggle play/pause
	const toggle = useCallback(() => {
		if (state.isPlaying) {
			pause();
		} else if (state.isPaused) {
			resume();
		}
	}, [state.isPlaying, state.isPaused, pause, resume]);

	// Utility functions
	const formatTime = useCallback((seconds: number): string => {
		if (!isFinite(seconds) || seconds < 0) return "0:00";

		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}, []);

	const getProgress = useCallback((): number => {
		if (state.duration === 0) return 0;
		return (state.currentTime / state.duration) * 100;
	}, [state.currentTime, state.duration]);

	const canPlay = useCallback(
		(audioUrl?: string): boolean => {
			if (!audioRef.current) return false;
			if (audioUrl && currentUrlRef.current !== audioUrl) return true;
			return !state.isLoading && !state.error;
		},
		[state.isLoading, state.error]
	);

	const isCurrentMessage = useCallback(
		(messageId: string): boolean => {
			return state.currentMessageId === messageId;
		},
		[state.currentMessageId]
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = "";
				audioRef.current = null;
			}
		};
	}, []);

	return {
		state,
		actions: {
			play,
			pause,
			resume,
			stop,
			seek,
			setVolume,
			setPlaybackRate,
			toggle,
		},
		utils: {
			formatTime,
			getProgress,
			canPlay,
			isCurrentMessage,
		},
	};
}
