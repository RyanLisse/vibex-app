"use client";

/**
 * OriginUI comp-547 - File Upload Component
 * Enhanced file upload component from originui.com for screenshot handling
 */

import { useCallback, useState } from "react";
import { Upload, X, Image, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FileUploadProps {
	onFileSelect?: (file: File) => void;
	onFileRemove?: () => void;
	accept?: string;
	maxSize?: number; // in MB
	className?: string;
	disabled?: boolean;
	preview?: boolean;
}

export function FileUpload({
	onFileSelect,
	onFileRemove,
	accept = "image/*",
	maxSize = 10,
	className,
	disabled = false,
	preview = true,
}: FileUploadProps) {
	const [dragActive, setDragActive] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleFiles = useCallback(
		(files: FileList) => {
			const selectedFile = files[0];
			if (!selectedFile) return;

			// Validate file size
			if (selectedFile.size > maxSize * 1024 * 1024) {
				setError(`File size must be less than ${maxSize}MB`);
				return;
			}

			// Validate file type
			if (accept && !selectedFile.type.match(accept.replace(/\*/g, ".*"))) {
				setError(`File type ${selectedFile.type} is not allowed`);
				return;
			}

			setError(null);
			setFile(selectedFile);
			onFileSelect?.(selectedFile);

			// Create preview for images
			if (preview && selectedFile.type.startsWith("image/")) {
				const reader = new FileReader();
				reader.onload = (e) => {
					setPreviewUrl(e.target?.result as string);
				};
				reader.readAsDataURL(selectedFile);
			}
		},
		[accept, maxSize, onFileSelect, preview]
	);

	const handleDrag = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);
			if (disabled) return;

			if (e.dataTransfer.files && e.dataTransfer.files[0]) {
				handleFiles(e.dataTransfer.files);
			}
		},
		[disabled, handleFiles]
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			e.preventDefault();
			if (disabled) return;

			if (e.target.files && e.target.files[0]) {
				handleFiles(e.target.files);
			}
		},
		[disabled, handleFiles]
	);

	const removeFile = useCallback(() => {
		setFile(null);
		setPreviewUrl(null);
		setError(null);
		onFileRemove?.();
	}, [onFileRemove]);

	return (
		<Card className={cn("w-full", className)}>
			<CardContent className="p-6">
				{!file ? (
					<div
						className={cn(
							"relative border-2 border-dashed rounded-lg p-6 transition-colors",
							dragActive
								? "border-blue-500 bg-blue-50"
								: error
									? "border-red-300 bg-red-50"
									: "border-gray-300 hover:border-gray-400",
							disabled && "opacity-50 cursor-not-allowed"
						)}
						onDragEnter={handleDrag}
						onDragLeave={handleDrag}
						onDragOver={handleDrag}
						onDrop={handleDrop}
					>
						<input
							type="file"
							accept={accept}
							onChange={handleChange}
							disabled={disabled}
							className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						/>
						<div className="text-center">
							<Upload className="mx-auto h-12 w-12 text-gray-400" />
							<div className="mt-4">
								<p className="text-sm font-medium text-gray-900">
									Drop files here or click to upload
								</p>
								<p className="text-sm text-gray-500">
									{accept.includes("image") ? "Images" : "Files"} up to {maxSize}MB
								</p>
							</div>
						</div>
						{error && (
							<div className="mt-2 flex items-center text-red-600">
								<AlertCircle className="h-4 w-4 mr-1" />
								<span className="text-sm">{error}</span>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-4">
						{previewUrl && (
							<div className="relative">
								<img
									src={previewUrl}
									alt="Preview"
									className="max-w-full h-48 object-contain rounded-lg border"
								/>
								<Button
									variant="destructive"
									size="sm"
									className="absolute top-2 right-2"
									onClick={removeFile}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						)}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<Image className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-sm font-medium text-gray-900">{file.name}</p>
									<p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
								</div>
							</div>
							<Button variant="outline" size="sm" onClick={removeFile}>
								Remove
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default FileUpload;
