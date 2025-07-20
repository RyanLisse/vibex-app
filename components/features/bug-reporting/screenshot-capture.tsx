"use client";

import { AlertCircle, Camera, Monitor } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ScreenshotData } from "@/src/schemas/enhanced-task-schemas";

interface ScreenshotCaptureProps {
	onCapture: (screenshot: ScreenshotData) => void;
	onError?: (error: string) => void;
	className?: string;
}

export function ScreenshotCapture({
	onCapture,
	onError,
	className = "",
}: ScreenshotCaptureProps) {
	const [isCapturing, setIsCapturing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const captureScreenshot = async () => {
		setIsCapturing(true);
		setError(null);

		try {
			// Check browser support
			if (!navigator.mediaDevices?.getDisplayMedia) {
				throw new Error("Screen capture is not supported in this browser");
			}

			// Request screen capture
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					mediaSource: "screen",
				},
			});

			// Create video element
			const video = document.createElement("video");
			video.srcObject = stream;
			video.muted = true;

			// Wait for video to be ready
			await new Promise<void>((resolve, reject) => {
				video.onloadedmetadata = () => resolve();
				video.onerror = () => reject(new Error("Failed to load video stream"));
				video.play();
			});

			// Create canvas for screenshot
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const context = canvas.getContext("2d");
			if (!context) {
				throw new Error("Could not get canvas rendering context");
			}

			// Draw video frame to canvas
			context.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Stop all tracks
			stream.getTracks().forEach((track) => track.stop());

			// Convert to blob and create screenshot data
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						const error = "Failed to create image from screenshot";
						setError(error);
						onError?.(error);
						return;
					}

					const screenshotData: ScreenshotData = {
						id: crypto.randomUUID(),
						imageBlob: blob,
						timestamp: new Date(),
						annotations: [],
					};

					onCapture(screenshotData);
				},
				"image/png",
				1.0,
			);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";

			let userFriendlyError = errorMessage;
			if (errorMessage.includes("Permission denied")) {
				userFriendlyError =
					"Permission denied. Please allow screen sharing to capture screenshots.";
			} else if (errorMessage.includes("not supported")) {
				userFriendlyError =
					"Screen capture is not supported in this browser. Please use Chrome, Firefox, or Edge.";
			}

			setError(userFriendlyError);
			onError?.(userFriendlyError);
		} finally {
			setIsCapturing(false);
		}
	};

	return (
		<div className={`space-y-4 ${className}`}>
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-col items-center space-y-4">
				<div className="rounded-lg border border-muted-foreground/25 border-dashed p-8 text-center">
					<Monitor className="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 className="mt-4 font-medium text-lg">Capture Screenshot</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						Click the button below to capture your screen for the bug report
					</p>
				</div>

				<Button
					className="gap-2"
					disabled={isCapturing}
					onClick={captureScreenshot}
					size="lg"
				>
					<Camera className="h-4 w-4" />
					{isCapturing ? "Capturing..." : "Capture Screenshot"}
				</Button>

				<p className="max-w-md text-center text-muted-foreground text-xs">
					Your browser will ask for permission to capture your screen. Choose
					the window or screen you want to include in the bug report.
				</p>
			</div>
		</div>
	);
}
