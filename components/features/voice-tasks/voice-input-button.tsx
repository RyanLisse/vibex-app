"use client";

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
