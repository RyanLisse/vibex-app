"use client";

import { useCallback, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
	progress: number; // 0-100
	label?: string;
	showPercentage?: boolean;
	size?: "sm" | "md" | "lg";
	variant?: "default" | "success" | "warning" | "danger";
	interactive?: boolean;
	onProgressChange?: (progress: number) => void;
	className?: string;
}

export function ProgressIndicator({
	progress,
	label,
	showPercentage = true,
	size = "md",
	variant = "default",
	interactive = false,
	onProgressChange,
	className = "",
}: ProgressIndicatorProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [tempProgress, setTempProgress] = useState(progress);

	// Clamp progress between 0 and 100
	const clampedProgress = Math.max(0, Math.min(100, progress));

	const getVariantColor = () => {
		if (variant !== "default") {
			switch (variant) {
				case "success":
					return "bg-green-500";
				case "warning":
					return "bg-yellow-500";
				case "danger":
					return "bg-red-500";
				default:
					return "";
			}
		}

		// Auto-determine color based on progress
		if (clampedProgress >= 100) return "bg-green-500";
		if (clampedProgress >= 80) return "bg-blue-500";
		if (clampedProgress >= 60) return "bg-yellow-500";
		if (clampedProgress >= 40) return "bg-orange-500";
		return "bg-red-500";
	};

	const getSizeClasses = () => {
		switch (size) {
			case "sm":
				return "h-2";
			case "lg":
				return "h-4";
			default:
				return "h-3";
		}
	};

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!interactive) return;

			setIsDragging(true);
			const rect = e.currentTarget.getBoundingClientRect();
			const newProgress = Math.round(((e.clientX - rect.left) / rect.width) * 100);
			const clampedNewProgress = Math.max(0, Math.min(100, newProgress));

			setTempProgress(clampedNewProgress);
			onProgressChange?.(clampedNewProgress);
		},
		[interactive, onProgressChange]
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging || !interactive) return;

			const progressBar = document.querySelector("[data-progress-bar]") as HTMLElement;
			if (!progressBar) return;

			const rect = progressBar.getBoundingClientRect();
			const newProgress = Math.round(((e.clientX - rect.left) / rect.width) * 100);
			const clampedNewProgress = Math.max(0, Math.min(100, newProgress));

			setTempProgress(clampedNewProgress);
		},
		[isDragging, interactive]
	);

	const handleMouseUp = useCallback(() => {
		if (!isDragging || !interactive) return;

		setIsDragging(false);
		onProgressChange?.(tempProgress);
	}, [isDragging, interactive, tempProgress, onProgressChange]);

	// Add global mouse event listeners when dragging
	useState(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);

			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	});

	const displayProgress = isDragging ? tempProgress : clampedProgress;

	return (
		<div className={`space-y-2 ${className}`}>
			{label && (
				<div className="flex items-center justify-between">
					<span
						className={`font-medium ${
							size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
						}`}
					>
						{label}
					</span>
					{showPercentage && (
						<span
							className={`font-medium ${
								size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
							} ${
								displayProgress >= 100
									? "text-green-600"
									: displayProgress >= 80
										? "text-blue-600"
										: displayProgress >= 60
											? "text-yellow-600"
											: displayProgress >= 40
												? "text-orange-600"
												: "text-red-600"
							}`}
						>
							{Math.round(displayProgress)}%
						</span>
					)}
				</div>
			)}

			<div
				className={`relative ${interactive ? "cursor-pointer" : ""}`}
				data-progress-bar={true}
				onMouseDown={handleMouseDown}
			>
				<Progress
					value={displayProgress}
					className={`${getSizeClasses()} ${interactive ? "transition-none" : "transition-all"}`}
				/>

				{/* Custom progress bar styling */}
				<div
					className={`absolute top-0 left-0 h-full rounded-full transition-all ${getVariantColor()}`}
					style={{ width: `${displayProgress}%` }}
				/>

				{/* Interactive handle */}
				{interactive && (
					<div
						className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full shadow-md transition-all ${
							isDragging ? "scale-110 border-blue-500" : "hover:scale-105"
						}`}
						style={{ left: `calc(${displayProgress}% - 8px)` }}
					/>
				)}
			</div>

			{!label && showPercentage && (
				<div className="text-center">
					<span
						className={`font-medium ${
							size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm"
						} ${
							displayProgress >= 100
								? "text-green-600"
								: displayProgress >= 80
									? "text-blue-600"
									: displayProgress >= 60
										? "text-yellow-600"
										: displayProgress >= 40
											? "text-orange-600"
											: "text-red-600"
						}`}
					>
						{Math.round(displayProgress)}%
					</span>
				</div>
			)}

			{/* Progress milestones */}
			{size === "lg" && (
				<div className="flex justify-between text-xs text-gray-500 mt-1">
					<span>0%</span>
					<span>25%</span>
					<span>50%</span>
					<span>75%</span>
					<span>100%</span>
				</div>
			)}
		</div>
	);
}
