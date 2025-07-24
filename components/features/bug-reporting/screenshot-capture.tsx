"use client";

/**
 * Screenshot Capture Component with Annotation Tools
 * Enhanced screenshot capture with drawing tools for bug reporting
 */

import {
	ArrowRight,
	Camera,
	Download,
	Highlighter,
	Redo,
	Square,
	Type,
	Undo,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { FileUpload } from "@/components/comp-547";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Annotation {
	id: string;
	type: "arrow" | "text" | "highlight" | "rectangle";
	position: { x: number; y: number };
	endPosition?: { x: number; y: number };
	data: string;
	color: string;
}

interface ScreenshotCaptureProps {
	onScreenshotCapture?: (screenshot: File, annotations: Annotation[]) => void;
	onClose?: () => void;
	className?: string;
}

export function ScreenshotCapture({
	onScreenshotCapture,
	onClose,
	className,
}: ScreenshotCaptureProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [screenshot, setScreenshot] = useState<string | null>(null);
	const [annotations, setAnnotations] = useState<Annotation[]>([]);
	const [selectedTool, setSelectedTool] = useState<"arrow" | "text" | "highlight" | "rectangle">(
		"arrow"
	);
	const [isDrawing, setIsDrawing] = useState(false);
	const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
	const [textInput, setTextInput] = useState("");
	const [history, setHistory] = useState<Annotation[][]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [showTextInput, setShowTextInput] = useState(false);
	const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

	const captureScreen = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: { mediaSource: "screen", width: 1920, height: 1080 },
			});

			const video = document.createElement("video");
			video.srcObject = stream;
			video.play();

			video.onloadedmetadata = () => {
				const canvas = document.createElement("canvas");
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const ctx = canvas.getContext("2d");

				if (ctx) {
					ctx.drawImage(video, 0, 0);
					const dataUrl = canvas.toDataURL("image/png");
					setScreenshot(dataUrl);

					// Update the annotation canvas
					const annotationCanvas = canvasRef.current;
					if (annotationCanvas) {
						annotationCanvas.width = video.videoWidth;
						annotationCanvas.height = video.videoHeight;
					}
				}

				// Stop the stream
				stream.getTracks().forEach((track) => track.stop());
			};
		} catch (error) {
			console.error("Failed to capture screen:", error);
		}
	}, []);

	const handleFileUpload = useCallback((file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			setScreenshot(dataUrl);

			// Create an image to get dimensions
			const img = new Image();
			img.onload = () => {
				const annotationCanvas = canvasRef.current;
				if (annotationCanvas) {
					annotationCanvas.width = img.width;
					annotationCanvas.height = img.height;
				}
			};
			img.src = dataUrl;
		};
		reader.readAsDataURL(file);
	}, []);

	const saveToHistory = useCallback(() => {
		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push([...annotations]);
		setHistory(newHistory);
		setHistoryIndex(newHistory.length - 1);
	}, [history, historyIndex, annotations]);

	const undo = useCallback(() => {
		if (historyIndex > 0) {
			setHistoryIndex(historyIndex - 1);
			setAnnotations(history[historyIndex - 1]);
		}
	}, [history, historyIndex]);

	const redo = useCallback(() => {
		if (historyIndex < history.length - 1) {
			setHistoryIndex(historyIndex + 1);
			setAnnotations(history[historyIndex + 1]);
		}
	}, [history, historyIndex]);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			if (selectedTool === "text") {
				setShowTextInput(true);
				setTextPosition({ x, y });
				return;
			}

			setIsDrawing(true);
			const newAnnotation: Annotation = {
				id: Date.now().toString(),
				type: selectedTool,
				position: { x, y },
				data: "",
				color: "#ff0000",
			};

			setCurrentAnnotation(newAnnotation);
		},
		[selectedTool]
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDrawing || !currentAnnotation) return;

			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			setCurrentAnnotation({
				...currentAnnotation,
				endPosition: { x, y },
			});
		},
		[isDrawing, currentAnnotation]
	);

	const handleMouseUp = useCallback(() => {
		if (!isDrawing || !currentAnnotation) return;

		saveToHistory();
		setAnnotations((prev) => [...prev, currentAnnotation]);
		setCurrentAnnotation(null);
		setIsDrawing(false);
	}, [isDrawing, currentAnnotation, saveToHistory]);

	const handleTextSubmit = useCallback(() => {
		if (!textInput.trim()) {
			setShowTextInput(false);
			setTextInput("");
			return;
		}

		const newAnnotation: Annotation = {
			id: Date.now().toString(),
			type: "text",
			position: textPosition,
			data: textInput,
			color: "#ff0000",
		};

		saveToHistory();
		setAnnotations((prev) => [...prev, newAnnotation]);
		setShowTextInput(false);
		setTextInput("");
	}, [textInput, textPosition, saveToHistory]);

	const drawAnnotations = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw all annotations
		[...annotations, currentAnnotation].filter(Boolean).forEach((annotation) => {
			if (!annotation) return;

			ctx.strokeStyle = annotation.color;
			ctx.fillStyle = annotation.color;
			ctx.lineWidth = 2;

			switch (annotation.type) {
				case "arrow":
					if (annotation.endPosition) {
						// Draw arrow
						ctx.beginPath();
						ctx.moveTo(annotation.position.x, annotation.position.y);
						ctx.lineTo(annotation.endPosition.x, annotation.endPosition.y);
						ctx.stroke();

						// Draw arrowhead
						const angle = Math.atan2(
							annotation.endPosition.y - annotation.position.y,
							annotation.endPosition.x - annotation.position.x
						);
						const headLength = 15;
						ctx.beginPath();
						ctx.moveTo(annotation.endPosition.x, annotation.endPosition.y);
						ctx.lineTo(
							annotation.endPosition.x - headLength * Math.cos(angle - Math.PI / 6),
							annotation.endPosition.y - headLength * Math.sin(angle - Math.PI / 6)
						);
						ctx.moveTo(annotation.endPosition.x, annotation.endPosition.y);
						ctx.lineTo(
							annotation.endPosition.x - headLength * Math.cos(angle + Math.PI / 6),
							annotation.endPosition.y - headLength * Math.sin(angle + Math.PI / 6)
						);
						ctx.stroke();
					}
					break;

				case "rectangle":
					if (annotation.endPosition) {
						ctx.strokeRect(
							annotation.position.x,
							annotation.position.y,
							annotation.endPosition.x - annotation.position.x,
							annotation.endPosition.y - annotation.position.y
						);
					}
					break;

				case "highlight":
					if (annotation.endPosition) {
						ctx.globalAlpha = 0.3;
						ctx.fillRect(
							annotation.position.x,
							annotation.position.y,
							annotation.endPosition.x - annotation.position.x,
							annotation.endPosition.y - annotation.position.y
						);
						ctx.globalAlpha = 1;
					}
					break;

				case "text":
					ctx.font = "16px Arial";
					ctx.fillText(annotation.data, annotation.position.x, annotation.position.y);
					break;
			}
		});
	}, [annotations, currentAnnotation]);

	// Redraw annotations whenever they change
	useState(() => {
		drawAnnotations();
	});

	const handleSave = useCallback(async () => {
		if (!screenshot) return;

		// Create a composite canvas with screenshot and annotations
		const compositeCanvas = document.createElement("canvas");
		const annotationCanvas = canvasRef.current;
		if (!annotationCanvas) return;

		compositeCanvas.width = annotationCanvas.width;
		compositeCanvas.height = annotationCanvas.height;
		const ctx = compositeCanvas.getContext("2d");
		if (!ctx) return;

		// Draw screenshot
		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, 0, 0);
			// Draw annotations
			ctx.drawImage(annotationCanvas, 0, 0);

			// Convert to blob
			compositeCanvas.toBlob((blob) => {
				if (blob) {
					const file = new File([blob], "screenshot.png", { type: "image/png" });
					onScreenshotCapture?.(file, annotations);
				}
			}, "image/png");
		};
		img.src = screenshot;
	}, [screenshot, annotations, onScreenshotCapture]);

	const clearAnnotations = useCallback(() => {
		saveToHistory();
		setAnnotations([]);
	}, [saveToHistory]);

	return (
		<Card className={cn("w-full max-w-4xl mx-auto", className)}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center space-x-2">
						<Camera className="h-5 w-5" />
						<span>Screenshot Bug Report</span>
					</CardTitle>
					{onClose && (
						<Button variant="ghost" size="sm" onClick={onClose}>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{screenshot ? (
					<div className="space-y-4">
						{/* Toolbar */}
						<div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
							<div className="flex items-center space-x-2">
								<Button
									variant={selectedTool === "arrow" ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedTool("arrow")}
								>
									<ArrowRight className="h-4 w-4" />
								</Button>
								<Button
									variant={selectedTool === "rectangle" ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedTool("rectangle")}
								>
									<Square className="h-4 w-4" />
								</Button>
								<Button
									variant={selectedTool === "text" ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedTool("text")}
								>
									<Type className="h-4 w-4" />
								</Button>
								<Button
									variant={selectedTool === "highlight" ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedTool("highlight")}
								>
									<Highlighter className="h-4 w-4" />
								</Button>
							</div>
							<div className="flex items-center space-x-2">
								<Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
									<Undo className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={redo}
									disabled={historyIndex >= history.length - 1}
								>
									<Redo className="h-4 w-4" />
								</Button>
								<Separator orientation="vertical" className="h-6" />
								<Button variant="outline" size="sm" onClick={clearAnnotations}>
									Clear
								</Button>
								<Button onClick={handleSave}>
									<Download className="h-4 w-4 mr-2" />
									Save & Use
								</Button>
							</div>
						</div>

						{/* Screenshot with annotations */}
						<div className="relative border rounded-lg overflow-hidden">
							<img src={screenshot} alt="Screenshot" className="w-full h-auto block" />
							<canvas
								ref={canvasRef}
								className="absolute inset-0 cursor-crosshair"
								onMouseDown={handleMouseDown}
								onMouseMove={handleMouseMove}
								onMouseUp={handleMouseUp}
								style={{ pointerEvents: "auto" }}
							/>
						</div>

						{/* Text input modal */}
						{showTextInput && (
							<div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
								<Card className="w-80">
									<CardContent className="p-4 space-y-4">
										<h3 className="font-semibold">Add Text Annotation</h3>
										<Input
											value={textInput}
											onChange={(e) => setTextInput(e.target.value)}
											placeholder="Enter annotation text..."
											autoFocus={true}
											onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
										/>
										<div className="flex space-x-2">
											<Button onClick={handleTextSubmit}>Add</Button>
											<Button
												variant="outline"
												onClick={() => {
													setShowTextInput(false);
													setTextInput("");
												}}
											>
												Cancel
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex space-x-2">
							<Button onClick={captureScreen} className="flex-1">
								<Camera className="h-4 w-4 mr-2" />
								Capture Screen
							</Button>
						</div>
						<div className="text-center text-gray-500">or</div>
						<FileUpload
							onFileSelect={handleFileUpload}
							accept="image/*"
							maxSize={10}
							className="w-full"
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default ScreenshotCapture;
