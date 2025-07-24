"use client";

import { Camera, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QuickBugReportButtonProps {
	onScreenshotCaptured?: (screenshot: Blob) => void;
	onError?: (error: { type: string; message: string }) => void;
	disabled?: boolean;
	className?: string;
	variant?: "default" | "outline" | "ghost";
}

export function QuickBugReportButton({
	onScreenshotCaptured,
	onError,
	disabled = false,
	className = "",
	variant = "default",
}: QuickBugReportButtonProps) {
	const [isCapturing, setIsCapturing] = useState(false);
	const { toast } = useToast();

	const captureScreenshot = async () => {
		if (!navigator.mediaDevices?.getDisplayMedia) {
			const error = {
				type: "unsupported_browser",
				message: "Screen capture not supported in this browser",
			};
			onError?.(error);
			toast({
				title: "Screen Capture Not Supported",
				description: "Your browser doesn't support screen capture. Please use a modern browser.",
				variant: "destructive",
			});
			return;
		}

		setIsCapturing(true);

		try {
			// Request screen capture
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
			});

			// Create video element to capture frame
			const video = document.createElement("video");
			video.srcObject = stream;
			video.play();

			// Wait for video to load
			await new Promise((resolve) => {
				video.onloadedmetadata = resolve;
			});

			// Create canvas and capture frame
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				throw new Error("Could not get canvas context");
			}

			ctx.drawImage(video, 0, 0);

			// Stop the stream
			stream.getTracks().forEach((track) => track.stop());

			// Convert to blob
			canvas.toBlob((blob) => {
				if (blob) {
					onScreenshotCaptured?.(blob);
					toast({
						title: "Screenshot Captured",
						description: "Screenshot captured successfully. You can now create a bug report.",
					});
				} else {
					const error = {
						type: "capture_failed",
						message: "Failed to create screenshot blob",
					};
					onError?.(error);
					toast({
						title: "Screenshot Failed",
						description: "Failed to process the screenshot. Please try again.",
						variant: "destructive",
					});
				}
			}, "image/png");
		} catch (error) {
			const err = error as Error;
			let errorType = "capture_failed";
			let errorMessage = "Failed to capture screenshot";

			if (err.name === "NotAllowedError") {
				errorType = "permission_denied";
				errorMessage = "Screen capture permission was denied";
				toast({
					title: "Permission Denied",
					description:
						"Screen capture permission was denied. Please allow screen sharing to capture screenshots.",
					variant: "destructive",
				});
			} else if (err.name === "NotSupportedError") {
				errorType = "unsupported_browser";
				errorMessage = "Screen capture is not supported in this browser or context";
				toast({
					title: "Not Supported",
					description: "Screen capture is not supported in this browser or context.",
					variant: "destructive",
				});
			} else {
				errorMessage = err.message;
				toast({
					title: "Screenshot Failed",
					description: `Failed to capture screenshot: ${err.message}`,
					variant: "destructive",
				});
			}

			onError?.({ type: errorType, message: errorMessage });
		} finally {
			setIsCapturing(false);
		}
	};

	return (
		<Button
			onClick={captureScreenshot}
			disabled={disabled || isCapturing}
			className={`flex items-center gap-2 ${variant === "default" ? "bg-red-600 hover:bg-red-700 text-white" : ""} ${variant === "outline" ? "border-red-600 text-red-600 hover:bg-red-50" : ""} ${className}`}
			variant={variant}
			aria-label="Capture screenshot for bug report"
			aria-busy={isCapturing}
		>
			{isCapturing ? (
				<Loader2 className="h-4 w-4 animate-spin" data-testid="loading-spinner" />
			) : (
				<Camera className="h-4 w-4" data-testid="camera-icon" />
			)}
			{isCapturing ? "Capturing..." : "Quick Bug Report"}
		</Button>
	);
}
