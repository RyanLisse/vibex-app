/**
 * Replay Controls Component
 *
 * Provides playback controls for step-by-step execution replay.
 */

"use client";

import {
	FastForward,
	Pause,
	Play,
	Rewind,
	RotateCcw,
	SkipBack,
	SkipForward,
	Square,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ReplaySession } from "@/lib/time-travel/debug-service";
import { cn } from "@/lib/utils";

interface ReplayControlsProps {
	session: ReplaySession | undefined;
	onPlay?: () => void;
	onPause?: () => void;
	onStop?: () => void;
	onStepForward?: () => void;
	onStepBackward?: () => void;
	onJumpToStep?: (step: number) => void;
	onSpeedChange?: (speed: number) => void;
	className?: string;
}

const speedOptions = [
	{ value: 0.25, label: "0.25x" },
	{ value: 0.5, label: "0.5x" },
	{ value: 1, label: "1x" },
	{ value: 2, label: "2x" },
	{ value: 4, label: "4x" },
];

export function ReplayControls({
	session,
	onPlay,
	onPause,
	onStop,
	onStepForward,
	onStepBackward,
	onJumpToStep,
	onSpeedChange,
	className,
}: ReplayControlsProps) {
	const [localStep, setLocalStep] = useState(0);
	const [isDragging, setIsDragging] = useState(false);

	// Sync local step with session
	useEffect(() => {
		if (session && !isDragging) {
			setLocalStep(session.currentStep);
		}
	}, [session?.currentStep, isDragging, session]);

	const handleSliderChange = (value: number[]) => {
		const step = value[0];
		setLocalStep(step);
		setIsDragging(true);
	};

	const handleSliderCommit = (value: number[]) => {
		const step = value[0];
		onJumpToStep?.(step);
		setIsDragging(false);
	};

	const handleSpeedChange = (speed: number) => {
		onSpeedChange?.(speed);
	};

	const formatTime = (step: number, totalSteps: number) => {
		if (!session) return "00:00";

		// Estimate time based on step and playback speed
		const estimatedDuration = totalSteps / (session.playbackSpeed || 1);
		const currentTime = step / (session.playbackSpeed || 1);

		const minutes = Math.floor(currentTime / 60);
		const seconds = Math.floor(currentTime % 60);

		return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	};

	if (!session) {
		return (
			<div className={cn("flex items-center justify-center p-4 text-gray-500", className)}>
				<p>No replay session active</p>
			</div>
		);
	}

	const progress = session.totalSteps > 0 ? (localStep / (session.totalSteps - 1)) * 100 : 0;

	return (
		<div className={cn("space-y-4", className)}>
			{/* Progress bar */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm text-gray-600">
					<span>
						Step {localStep + 1} of {session.totalSteps}
					</span>
					<span>{formatTime(localStep, session.totalSteps)}</span>
				</div>

				<Slider
					value={[localStep]}
					onValueChange={handleSliderChange}
					onValueCommit={handleSliderCommit}
					max={Math.max(0, session.totalSteps - 1)}
					step={1}
					className="w-full"
				/>

				<div className="w-full bg-gray-200 rounded-full h-1">
					<div
						className="bg-blue-500 h-1 rounded-full transition-all duration-200"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			{/* Main controls */}
			<div className="flex items-center justify-center space-x-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onJumpToStep?.(0)}
					disabled={localStep === 0}
				>
					<Rewind className="w-4 h-4" />
				</Button>

				<Button variant="outline" size="sm" onClick={onStepBackward} disabled={localStep === 0}>
					<SkipBack className="w-4 h-4" />
				</Button>

				<Button
					variant="default"
					size="sm"
					onClick={session.isPlaying ? onPause : onPlay}
					className="px-6"
				>
					{session.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={onStepForward}
					disabled={localStep >= session.totalSteps - 1}
				>
					<SkipForward className="w-4 h-4" />
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={() => onJumpToStep?.(session.totalSteps - 1)}
					disabled={localStep >= session.totalSteps - 1}
				>
					<FastForward className="w-4 h-4" />
				</Button>

				<Button variant="outline" size="sm" onClick={onStop} className="ml-4">
					<Square className="w-4 h-4" />
				</Button>
			</div>

			{/* Speed control */}
			<div className="flex items-center justify-center space-x-4">
				<span className="text-sm text-gray-600">Speed:</span>
				<div className="flex space-x-1">
					{speedOptions.map((option) => (
						<Button
							key={option.value}
							variant={session.playbackSpeed === option.value ? "default" : "outline"}
							size="sm"
							onClick={() => handleSpeedChange(option.value)}
							className="px-3 py-1 text-xs"
						>
							{option.label}
						</Button>
					))}
				</div>
			</div>

			{/* Status */}
			<div className="flex items-center justify-between text-xs text-gray-500">
				<div className="flex items-center space-x-4">
					<span>Status: {session.isPlaying ? "Playing" : "Paused"}</span>
					<span>Speed: {session.playbackSpeed}x</span>
				</div>
				<div className="flex items-center space-x-2">
					<RotateCcw className="w-3 h-3" />
					<span>Session: {session.id.slice(-8)}</span>
				</div>
			</div>
		</div>
	);
}
