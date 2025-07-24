"use client";

import { Download, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScreenshotCaptureProps {
	screenshot?: Blob | null;
	onScreenshotChange?: (screenshot: Blob | null) => void;
	onAnnotationsChange?: (annotations: any[]) => void;
	className?: string;
}

export function ScreenshotCapture({
	screenshot,
	onScreenshotChange,
	onAnnotationsChange,
	className = "",
}: ScreenshotCaptureProps) {
	const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
	const [annotations, setAnnotations] = useState<any[]>([]);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);

	// Update screenshot URL when screenshot changes
	useEffect(() => {
		if (screenshot) {
			const url = URL.createObjectURL(screenshot);
			setScreenshotUrl(url);
			return () => URL.revokeObjectURL(url);
		} else {
			setScreenshotUrl(null);
		}
	}, [screenshot]);

	// Load image onto canvas when screenshot URL changes
	useEffect(() => {
		if (screenshotUrl && canvasRef.current && imageRef.current) {
			const canvas = canvasRef.current;
			const ctx = canvas.getContext("2d");
			const img = imageRef.current;

			img.onload = () => {
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				ctx?.drawImage(img, 0, 0);
			};
		}
	}, [screenshotUrl]);

	const handleRetake = useCallback(async () => {
		if (!navigator.mediaDevices?.getDisplayMedia) {
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
			});

			const video = document.createElement("video");
			video.srcObject = stream;
			video.play();

			await new Promise((resolve) => {
				video.onloadedmetadata = resolve;
			});

			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");

			if (ctx) {
				ctx.drawImage(video, 0, 0);
				canvas.toBlob((blob) => {
					if (blob) {
						onScreenshotChange?.(blob);
						setAnnotations([]);
						onAnnotationsChange?.([]);
					}
				}, "image/png");
			}

			stream.getTracks().forEach((track) => track.stop());
		} catch (error) {
			console.error("Failed to retake screenshot:", error);
		}
	}, [onScreenshotChange, onAnnotationsChange]);

	const handleDownload = useCallback(() => {
		if (screenshotUrl) {
			const link = document.createElement("a");
			link.href = screenshotUrl;
			link.download = `screenshot-${Date.now()}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}, [screenshotUrl]);

	const handleClear = useCallback(() => {
		onScreenshotChange?.(null);
		setAnnotations([]);
		onAnnotationsChange?.([]);
	}, [onScreenshotChange, onAnnotationsChange]);

	if (!screenshot || !screenshotUrl) {
		return (
			<Card className={`border-2 border-dashed border-gray-300 ${className}`}>
				<CardContent className="flex items-center justify-center p-8">
					<div className="text-center text-gray-500">
						<p className="text-lg font-medium">No screenshot captured</p>
						<p className="text-sm">Click "Quick Bug Report" to capture a screenshot</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">Screenshot</CardTitle>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleRetake}
							className="flex items-center gap-1"
						>
							<RotateCcw className="h-4 w-4" />
							Retake
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownload}
							className="flex items-center gap-1"
						>
							<Download className="h-4 w-4" />
							Download
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleClear}
							className="flex items-center gap-1 text-red-600 hover:text-red-700"
						>
							<Trash2 className="h-4 w-4" />
							Clear
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="relative">
					<img
						ref={imageRef}
						src={screenshotUrl}
						alt="Screenshot"
						className="max-w-full h-auto rounded border"
						style={{ maxHeight: "400px" }}
					/>
					<canvas
						ref={canvasRef}
						className="absolute top-0 left-0 pointer-events-none opacity-50"
						style={{ maxHeight: "400px", maxWidth: "100%" }}
					/>
				</div>
				{annotations.length > 0 && (
					<div className="mt-3 text-sm text-gray-600">
						{annotations.length} annotation{annotations.length !== 1 ? "s" : ""} added
					</div>
				)}
			</CardContent>
		</Card>
	);
}
