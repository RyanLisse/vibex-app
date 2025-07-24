"use client";

import { FileIcon, Upload, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
	onFilesChange: (files: File[]) => void;
	accept?: string;
	multiple?: boolean;
	maxSize?: number; // in bytes
	maxFiles?: number;
	disabled?: boolean;
	className?: string;
	children?: React.ReactNode;
}

export function FileUpload({
	onFilesChange,
	accept,
	multiple = false,
	maxSize = 10 * 1024 * 1024, // 10MB default
	maxFiles = multiple ? 10 : 1,
	disabled = false,
	className,
	children,
}: FileUploadProps) {
	const [files, setFiles] = React.useState<File[]>([]);
	const [dragActive, setDragActive] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleFiles = (newFiles: FileList | null) => {
		if (!newFiles) return;

		const validFiles: File[] = [];
		const fileArray = Array.from(newFiles);

		for (const file of fileArray) {
			// Check file size
			if (file.size > maxSize) {
				console.warn(`File ${file.name} is too large. Max size: ${maxSize} bytes`);
				continue;
			}

			// Check max files limit
			if (files.length + validFiles.length >= maxFiles) {
				console.warn(`Maximum ${maxFiles} files allowed`);
				break;
			}

			validFiles.push(file);
		}

		const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
		setFiles(updatedFiles);
		onFilesChange(updatedFiles);
	};

	const removeFile = (index: number) => {
		const updatedFiles = files.filter((_, i) => i !== index);
		setFiles(updatedFiles);
		onFilesChange(updatedFiles);
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (disabled) return;

		const droppedFiles = e.dataTransfer.files;
		handleFiles(droppedFiles);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		handleFiles(e.target.files);
	};

	const openFileDialog = () => {
		if (inputRef.current) {
			inputRef.current.click();
		}
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	return (
		<div className={cn("w-full", className)}>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				onChange={handleInputChange}
				className="hidden"
				disabled={disabled}
			/>

			{/* Drop Zone */}
			<div
				className={cn(
					"relative border-2 border-dashed rounded-lg p-6 transition-colors",
					dragActive
						? "border-primary bg-primary/5"
						: "border-muted-foreground/25 hover:border-muted-foreground/50",
					disabled && "opacity-50 cursor-not-allowed"
				)}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				onClick={!disabled ? openFileDialog : undefined}
			>
				{children || (
					<div className="flex flex-col items-center justify-center text-center">
						<Upload className="h-10 w-10 text-muted-foreground mb-4" />
						<p className="text-sm font-medium">Drop files here or click to browse</p>
						<p className="text-xs text-muted-foreground mt-1">
							{accept && `Accepted formats: ${accept}`}
							{maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
							{multiple && ` • Max files: ${maxFiles}`}
						</p>
					</div>
				)}
			</div>

			{/* File List */}
			{files.length > 0 && (
				<div className="mt-4 space-y-2">
					<p className="text-sm font-medium">Selected files ({files.length})</p>
					{files.map((file, index) => (
						<div
							key={`${file.name}-${index}`}
							className="flex items-center justify-between p-2 bg-muted rounded-md"
						>
							<div className="flex items-center space-x-2 min-w-0">
								<FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<div className="min-w-0">
									<p className="text-sm font-medium truncate">{file.name}</p>
									<p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									removeFile(index);
								}}
								disabled={disabled}
								className="h-6 w-6 p-0"
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// Simple file upload button variant
interface FileUploadButtonProps {
	onFileChange: (file: File | null) => void;
	accept?: string;
	disabled?: boolean;
	className?: string;
	children?: React.ReactNode;
}

export function FileUploadButton({
	onFileChange,
	accept,
	disabled = false,
	className,
	children,
}: FileUploadButtonProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		onFileChange(file);
	};

	const openFileDialog = () => {
		if (inputRef.current) {
			inputRef.current.click();
		}
	};

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleInputChange}
				className="hidden"
				disabled={disabled}
			/>
			<Button variant="outline" onClick={openFileDialog} disabled={disabled} className={className}>
				{children || (
					<>
						<Upload className="h-4 w-4 mr-2" />
						Upload File
					</>
				)}
			</Button>
		</>
	);
}
