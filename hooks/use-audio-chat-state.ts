"use client";

import { useCallback, useReducer, useRef } from "react";
import type {
	AudioChatState,
	AudioChatConfig,
	AudioChatCallbacks,
	AudioChatMessage,
	AudioChatError,
	AudioChatErrorType,
} from "@/types/audio-chat";

type AudioChatAction =
	| { type: "SET_CONNECTION"; payload: Partial<AudioChatState["connection"]> }
	| { type: "SET_RECORDING"; payload: Partial<AudioChatState["recording"]> }
	| { type: "SET_PLAYBACK"; payload: Partial<AudioChatState["playback"]> }
	| { type: "SET_MESSAGES"; payload: Partial<AudioChatState["messages"]> }
	| { type: "ADD_MESSAGE"; payload: AudioChatMessage }
	| { type: "CLEAR_MESSAGES" }
	| { type: "SET_ERROR"; payload: { context: keyof AudioChatState; error: string | null } }
	| { type: "RESET_STATE" };

const initialState: AudioChatState = {
	connection: {
		isConnected: false,
		isLoading: false,
		sessionId: null,
		error: null,
		reconnectAttempts: 0,
	},
	recording: {
		isRecording: false,
		isPaused: false,
		duration: 0,
		error: null,
		audioUrl: null,
	},
	playback: {
		isPlaying: false,
		currentMessageId: null,
		currentTime: 0,
		duration: 0,
		error: null,
		volume: 1.0,
	},
	messages: {
		messages: [],
		error: null,
		hasMore: false,
		isLoading: false,
		totalCount: 0,
	},
};

function audioChatReducer(state: AudioChatState, action: AudioChatAction): AudioChatState {
	switch (action.type) {
		case "SET_CONNECTION":
			return {
				...state,
				connection: { ...state.connection, ...action.payload },
			};
		case "SET_RECORDING":
			return {
				...state,
				recording: { ...state.recording, ...action.payload },
			};
		case "SET_PLAYBACK":
			return {
				...state,
				playback: { ...state.playback, ...action.payload },
			};
		case "SET_MESSAGES":
			return {
				...state,
				messages: { ...state.messages, ...action.payload },
			};
		case "ADD_MESSAGE":
			return {
				...state,
				messages: {
					...state.messages,
					messages: [...state.messages.messages, action.payload],
					totalCount: state.messages.totalCount + 1,
				},
			};
		case "CLEAR_MESSAGES":
			return {
				...state,
				messages: {
					...state.messages,
					messages: [],
					totalCount: 0,
				},
			};
		case "SET_ERROR":
			return {
				...state,
				[action.payload.context]: {
					...state[action.payload.context],
					error: action.payload.error,
				},
			};
		case "RESET_STATE":
			return initialState;
		default:
			return state;
	}
}

export interface UseAudioChatStateOptions {
	config?: Partial<AudioChatConfig>;
	callbacks?: AudioChatCallbacks;
}

export interface UseAudioChatStateReturn {
	state: AudioChatState;
	actions: {
		// Connection actions
		setConnected: (connected: boolean, sessionId?: string) => void;
		setConnectionLoading: (loading: boolean) => void;
		setConnectionError: (error: string | null) => void;
		incrementReconnectAttempts: () => void;
		resetReconnectAttempts: () => void;

		// Recording actions
		startRecording: () => void;
		stopRecording: (audioUrl?: string) => void;
		pauseRecording: () => void;
		resumeRecording: () => void;
		setRecordingDuration: (duration: number) => void;
		setRecordingError: (error: string | null) => void;

		// Playback actions
		startPlayback: (messageId: string, duration?: number) => void;
		stopPlayback: () => void;
		setPlaybackTime: (currentTime: number) => void;
		setVolume: (volume: number) => void;
		setPlaybackError: (error: string | null) => void;

		// Message actions
		addMessage: (message: AudioChatMessage) => void;
		clearMessages: () => void;
		setMessagesLoading: (loading: boolean) => void;
		setMessagesError: (error: string | null) => void;
		setHasMore: (hasMore: boolean) => void;

		// General actions
		resetState: () => void;
		handleError: (error: AudioChatError) => void;
	};
	config: AudioChatConfig;
}

const defaultConfig: AudioChatConfig = {
	voiceName: "en-US-Neural2-A",
	maxMessages: 100,
	autoScroll: true,
	enableRetry: true,
	retryDelay: 1000,
	maxRetries: 3,
	audioQuality: "medium",
	enableTranscription: true,
};

export function useAudioChatState(options: UseAudioChatStateOptions = {}): UseAudioChatStateReturn {
	const [state, dispatch] = useReducer(audioChatReducer, initialState);
	const { callbacks } = options;
	const config = { ...defaultConfig, ...options.config };

	// Keep track of previous state for change detection
	const prevStateRef = useRef<AudioChatState>(state);

	// Connection actions
	const setConnected = useCallback(
		(connected: boolean, sessionId?: string) => {
			dispatch({
				type: "SET_CONNECTION",
				payload: {
					isConnected: connected,
					sessionId: connected ? sessionId || null : null,
					lastConnectedAt: connected ? new Date() : undefined,
					error: null,
				},
			});

			if (connected) {
				callbacks?.onConnect?.();
			} else {
				callbacks?.onDisconnect?.();
			}
		},
		[callbacks]
	);

	const setConnectionLoading = useCallback((loading: boolean) => {
		dispatch({ type: "SET_CONNECTION", payload: { isLoading: loading } });
	}, []);

	const setConnectionError = useCallback(
		(error: string | null) => {
			dispatch({ type: "SET_ERROR", payload: { context: "connection", error } });
			if (error) {
				callbacks?.onError?.(new Error(error), "connection");
			}
		},
		[callbacks]
	);

	const incrementReconnectAttempts = useCallback(() => {
		dispatch({
			type: "SET_CONNECTION",
			payload: { reconnectAttempts: state.connection.reconnectAttempts + 1 },
		});
	}, [state.connection.reconnectAttempts]);

	const resetReconnectAttempts = useCallback(() => {
		dispatch({ type: "SET_CONNECTION", payload: { reconnectAttempts: 0 } });
	}, []);

	// Recording actions
	const startRecording = useCallback(() => {
		dispatch({
			type: "SET_RECORDING",
			payload: {
				isRecording: true,
				isPaused: false,
				duration: 0,
				error: null,
				audioUrl: null,
			},
		});
		callbacks?.onRecordingStart?.();
	}, [callbacks]);

	const stopRecording = useCallback(
		(audioUrl?: string) => {
			const audioBlob = audioUrl ? new Blob() : null; // Simplified for now
			dispatch({
				type: "SET_RECORDING",
				payload: {
					isRecording: false,
					isPaused: false,
					audioUrl: audioUrl || null,
				},
			});
			if (audioBlob) {
				callbacks?.onRecordingStop?.(audioBlob);
			}
		},
		[callbacks]
	);

	const pauseRecording = useCallback(() => {
		dispatch({ type: "SET_RECORDING", payload: { isPaused: true } });
	}, []);

	const resumeRecording = useCallback(() => {
		dispatch({ type: "SET_RECORDING", payload: { isPaused: false } });
	}, []);

	const setRecordingDuration = useCallback((duration: number) => {
		dispatch({ type: "SET_RECORDING", payload: { duration } });
	}, []);

	const setRecordingError = useCallback(
		(error: string | null) => {
			dispatch({ type: "SET_ERROR", payload: { context: "recording", error } });
			if (error) {
				callbacks?.onError?.(new Error(error), "recording");
			}
		},
		[callbacks]
	);

	// Playback actions
	const startPlayback = useCallback(
		(messageId: string, duration?: number) => {
			dispatch({
				type: "SET_PLAYBACK",
				payload: {
					isPlaying: true,
					currentMessageId: messageId,
					currentTime: 0,
					duration: duration || 0,
					error: null,
				},
			});
			callbacks?.onPlaybackStart?.(messageId);
		},
		[callbacks]
	);

	const stopPlayback = useCallback(() => {
		const currentMessageId = state.playback.currentMessageId;
		dispatch({
			type: "SET_PLAYBACK",
			payload: {
				isPlaying: false,
				currentMessageId: null,
				currentTime: 0,
			},
		});
		if (currentMessageId) {
			callbacks?.onPlaybackEnd?.(currentMessageId);
		}
	}, [state.playback.currentMessageId, callbacks]);

	const setPlaybackTime = useCallback((currentTime: number) => {
		dispatch({ type: "SET_PLAYBACK", payload: { currentTime } });
	}, []);

	const setVolume = useCallback((volume: number) => {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		dispatch({ type: "SET_PLAYBACK", payload: { volume: clampedVolume } });
	}, []);

	const setPlaybackError = useCallback(
		(error: string | null) => {
			dispatch({ type: "SET_ERROR", payload: { context: "playback", error } });
			if (error) {
				callbacks?.onError?.(new Error(error), "playback");
			}
		},
		[callbacks]
	);

	// Message actions
	const addMessage = useCallback(
		(message: AudioChatMessage) => {
			dispatch({ type: "ADD_MESSAGE", payload: message });
			callbacks?.onMessage?.(message);
		},
		[callbacks]
	);

	const clearMessages = useCallback(() => {
		dispatch({ type: "CLEAR_MESSAGES" });
	}, []);

	const setMessagesLoading = useCallback((loading: boolean) => {
		dispatch({ type: "SET_MESSAGES", payload: { isLoading: loading } });
	}, []);

	const setMessagesError = useCallback(
		(error: string | null) => {
			dispatch({ type: "SET_ERROR", payload: { context: "messages", error } });
			if (error) {
				callbacks?.onError?.(new Error(error), "messages");
			}
		},
		[callbacks]
	);

	const setHasMore = useCallback((hasMore: boolean) => {
		dispatch({ type: "SET_MESSAGES", payload: { hasMore } });
	}, []);

	// General actions
	const resetState = useCallback(() => {
		dispatch({ type: "RESET_STATE" });
	}, []);

	const handleError = useCallback(
		(error: AudioChatError) => {
			const contextMap: Record<AudioChatErrorType, keyof AudioChatState> = {
				connection: "connection",
				recording: "recording",
				playback: "playback",
				message: "messages",
				permission: "connection",
				network: "connection",
				validation: "messages",
			};

			const context = contextMap[error.type] || "connection";
			dispatch({ type: "SET_ERROR", payload: { context, error: error.message } });
			callbacks?.onError?.(new Error(error.message), error.type);
		},
		[callbacks]
	);

	// Trigger state change callback when state changes
	if (prevStateRef.current !== state) {
		callbacks?.onStateChange?.(state);
		prevStateRef.current = state;
	}

	return {
		state,
		actions: {
			// Connection actions
			setConnected,
			setConnectionLoading,
			setConnectionError,
			incrementReconnectAttempts,
			resetReconnectAttempts,

			// Recording actions
			startRecording,
			stopRecording,
			pauseRecording,
			resumeRecording,
			setRecordingDuration,
			setRecordingError,

			// Playback actions
			startPlayback,
			stopPlayback,
			setPlaybackTime,
			setVolume,
			setPlaybackError,

			// Message actions
			addMessage,
			clearMessages,
			setMessagesLoading,
			setMessagesError,
			setHasMore,

			// General actions
			resetState,
			handleError,
		},
		config,
	};
}
