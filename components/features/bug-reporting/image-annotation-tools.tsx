"use client";

import { ArrowRight, Circle, Palette, Square, Type, Undo } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type AnnotationType = "arrow" | "rectangle" | "circle" | "text";

interface Annotation {
	id: string;
	type: AnnotationType;
	x: number;
	y: number;
	width?: number;
	height?: number;
	text?: string;
	color: string;
}

interface ImageAnnotationToolsProps {
	imageUrl?: string;
	annotations?: Annotation[];
	onAnnotationsChange?: (annotations: Annotation[]) => void;
	className?: string;
}

const COLORS = [
	"#ef4444", // red
	"#f97316", // orange
	"#eab308", // yellow
	"#22c55e", // green
	"#3b82f6", // blue
	"#8b5cf6", // purple
	"#ec4899", // pink
	"#000000", // black
];

export function ImageAnnotationTools({
	imageUrl,
	annotations = [],
	onAnnotationsChange,
	className = "",
}: ImageAnnotationToolsProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const [selectedTool, setSelectedTool] = useState<AnnotationType>("arrow");
	const [selectedColor, setSelectedColor] = useState(COLORS[0]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [currentAnnotation, setCurrentAnnotation] = useState<Partial<Annotation> | null>(null);
	const [textInput, setTextInput] = useState("");
	const [showTextInput, setShowTextInput] = useState(false);

	// Redraw canvas when annotations change
	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const image = imageRef.current;
		if (!canvas || !image) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw image
		ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

		// Draw annotations
		annotations.forEach((annotation) => {
			ctx.strokeStyle = annotation.color;
			ctx.fillStyle = annotation.color;
			ctx.lineWidth = 2;

			switch (annotation.type) {
				case "arrow":
					drawArrow(ctx, annotation.x, annotation.y, annotation.x + 50, annotation.y + 50);
					break;
				case "rectangle":
					if (annotation.width && annotation.height) {
						ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
					}
					break;
				case "circle":
					if (annotation.width) {
						ctx.beginPath();
						ctx.arc(annotation.x, annotation.y, annotation.width / 2, 0, 2 * Math.PI);
						ctx.stroke();
					}
					break;
				case "text":
					if (annotation.text) {
						ctx.font = "16px Arial";
						ctx.fillText(annotation.text, annotation.x, annotation.y);
					}
					break;
			}
		});
	}, [annotations]);

	// Helper function to draw arrow
	const drawArrow = (
		ctx: CanvasRenderingContext2D,
		fromX: number,
		fromY: number,
		toX: number,
		toY: number
	) => {
		const headLength = 10;
		const angle = Math.atan2(toY - fromY, toX - fromX);

		// Draw line
		ctx.beginPath();
		ctx.moveTo(fromX, fromY);
		ctx.lineTo(toX, toY);
		ctx.stroke();

		// Draw arrowhead
		ctx.beginPath();
		ctx.moveTo(toX, toY);
		ctx.lineTo(
			toX - headLength * Math.cos(angle - Math.PI / 6),
			toY - headLength * Math.sin(angle - Math.PI / 6)
		);
		ctx.moveTo(toX, toY);
		ctx.lineTo(
			toX - headLength * Math.cos(angle + Math.PI / 6),
			toY - headLength * Math.sin(angle + Math.PI / 6)
		);
		ctx.stroke();
	};

	// Load image and set canvas size
	useEffect(() => {
		if (imageUrl && imageRef.current && canvasRef.current) {
			const image = imageRef.current;
			const canvas = canvasRef.current;

			image.onload = () => {
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;
				redrawCanvas();
			};
		}
	}, [imageUrl, redrawCanvas]);

	// Redraw when annotations change
	useEffect(() => {
		redrawCanvas();
	}, [redrawCanvas]);

	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		if (selectedTool === "text") {
			setShowTextInput(true);
			setCurrentAnnotation({
				id: Date.now().toString(),
				type: "text",
				x,
				y,
				color: selectedColor,
			});
		} else {
			setIsDrawing(true);
			setCurrentAnnotation({
				id: Date.now().toString(),
				type: selectedTool,
				x,
				y,
				color: selectedColor,
			});
		}
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDrawing || !currentAnnotation) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		if (selectedTool === "rectangle") {
			setCurrentAnnotation({
				...currentAnnotation,
				width: x - currentAnnotation.x!,
				height: y - currentAnnotation.y!,
			});
		} else if (selectedTool === "circle") {
			const radius = Math.sqrt((x - currentAnnotation.x!) ** 2 + (y - currentAnnotation.y!) ** 2);
			setCurrentAnnotation({
				...currentAnnotation,
				width: radius * 2,
			});
		}
	};

	const handleMouseUp = () => {
		if (isDrawing && currentAnnotation) {
			const newAnnotations = [...annotations, currentAnnotation as Annotation];
			onAnnotationsChange?.(newAnnotations);
		}
		setIsDrawing(false);
		setCurrentAnnotation(null);
	};

	const handleTextSubmit = () => {
		if (currentAnnotation && textInput.trim()) {
			const newAnnotation = {
				...currentAnnotation,
				text: textInput.trim(),
			} as Annotation;
			const newAnnotations = [...annotations, newAnnotation];
			onAnnotationsChange?.(newAnnotations);
		}
		setShowTextInput(false);
		setTextInput("");
		setCurrentAnnotation(null);
	};

	const handleUndo = () => {
		if (annotations.length > 0) {
			const newAnnotations = annotations.slice(0, -1);
			onAnnotationsChange?.(newAnnotations);
		}
	};

	if (!imageUrl) {
		return (
			<Card className={className}>
				<CardContent className="flex items-center justify-center p-8">
					<div className="text-center text-gray-500">
						<p>No image to annotate</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<CardTitle className="text-lg">Annotation Tools</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Tool Selection */}
				<div>
					<Label className="text-sm font-medium">Tools</Label>
					<div className="flex gap-2 mt-2">
						<Button
							variant={selectedTool === "arrow" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedTool("arrow")}
							className="flex items-center gap-1"
						>
							<ArrowRight className="h-4 w-4" />
							Arrow
						</Button>
						<Button
							variant={selectedTool === "rectangle" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedTool("rectangle")}
							className="flex items-center gap-1"
						>
							<Square className="h-4 w-4" />
							Rectangle
						</Button>
						<Button
							variant={selectedTool === "circle" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedTool("circle")}
							className="flex items-center gap-1"
						>
							<Circle className="h-4 w-4" />
							Circle
						</Button>
						<Button
							variant={selectedTool === "text" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedTool("text")}
							className="flex items-center gap-1"
						>
							<Type className="h-4 w-4" />
							Text
						</Button>
					</div>
				</div>

				<Separator />

				{/* Color Selection */}
				<div>
					<Label className="text-sm font-medium">Color</Label>
					<div className="flex gap-2 mt-2">
						{COLORS.map((color) => (
							<button
								key={color}
								type="button"
								onClick={() => setSelectedColor(color)}
								className={`w-8 h-8 rounded border-2 ${
									selectedColor === color ? "border-gray-800" : "border-gray-300"
								}`}
								style={{ backgroundColor: color }}
								aria-label={`Select ${color} color`}
							/>
						))}
					</div>
				</div>

				<Separator />

				{/* Actions */}
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleUndo}
						disabled={annotations.length === 0}
						className="flex items-center gap-1"
					>
						<Undo className="h-4 w-4" />
						Undo
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onAnnotationsChange?.([])}
						disabled={annotations.length === 0}
						className="flex items-center gap-1"
					>
						<Palette className="h-4 w-4" />
						Clear All
					</Button>
				</div>

				{/* Canvas */}
				<div className="relative border rounded">
					<img
						ref={imageRef}
						src={imageUrl}
						alt="Annotation target"
						className="max-w-full h-auto"
						style={{ maxHeight: "400px" }}
					/>
					<canvas
						ref={canvasRef}
						className="absolute top-0 left-0 cursor-crosshair"
						style={{ maxHeight: "400px", maxWidth: "100%" }}
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
					/>
				</div>

				{/* Text Input Modal */}
				{showTextInput && (
					<div className="space-y-2">
						<Label htmlFor="annotation-text">Enter text annotation:</Label>
						<div className="flex gap-2">
							<Input
								id="annotation-text"
								value={textInput}
								onChange={(e) => setTextInput(e.target.value)}
								placeholder="Enter text..."
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleTextSubmit();
									} else if (e.key === "Escape") {
										setShowTextInput(false);
										setTextInput("");
										setCurrentAnnotation(null);
									}
								}}
								autoFocus={true}
							/>
							<Button onClick={handleTextSubmit} size="sm">
								Add
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setShowTextInput(false);
									setTextInput("");
									setCurrentAnnotation(null);
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{annotations.length > 0 && (
					<div className="text-sm text-gray-600">
						{annotations.length} annotation{annotations.length !== 1 ? "s" : ""} added
					</div>
				)}
			</CardContent>
		</Card>
	);
}
