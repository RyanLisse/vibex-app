"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Edit, Send, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TranscriptionResult } from "@/src/schemas/enhanced-task-schemas";

const voiceTaskSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be less than 200 characters"),
	description: z
		.string()
		.max(2000, "Description must be less than 2000 characters")
		.optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	assignee: z.string().optional(),
	tags: z.array(z.string()).default(["voice-created"]),
});

type VoiceTaskFormData = z.infer<typeof voiceTaskSchema>;

interface VoiceTaskFormProps {
	transcription: TranscriptionResult;
	onSubmit: (
		task: VoiceTaskFormData & {
			creationMethod: "voice";
			metadata: { transcription: TranscriptionResult; voiceCreated: boolean };
		},
	) => void | Promise<void>;
	onCancel?: () => void;
	isSubmitting?: boolean;
	className?: string;
}

interface ExtractedTaskData {
	title: string;
	description: string;
	priority: "low" | "medium" | "high" | "urgent";
	assignee: string;
}

export function VoiceTaskForm({
	transcription,
	onSubmit,
	onCancel,
	isSubmitting = false,
	className = "",
}: VoiceTaskFormProps) {
	const [extractedData, setExtractedData] = useState<ExtractedTaskData | null>(
		null,
	);
	const [isExtracting, setIsExtracting] = useState(true);
	const [showTranscription, setShowTranscription] = useState(false);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isValid },
	} = useForm<VoiceTaskFormData>({
		resolver: zodResolver(voiceTaskSchema),
		defaultValues: {
			priority: "medium",
			tags: ["voice-created"],
		},
		mode: "onChange",
	});

	// Extract task data from transcription using AI/NLP
	useEffect(() => {
		const extractTaskData = async () => {
			setIsExtracting(true);

			try {
				// This would typically call an AI service
				// For now, we'll implement a simple rule-based extraction
				const extracted = extractTaskFromTranscription(transcription.text);
				setExtractedData(extracted);

				// Auto-populate form fields
				if (extracted.title) setValue("title", extracted.title);
				if (extracted.description)
					setValue("description", extracted.description);
				if (extracted.priority) setValue("priority", extracted.priority);
				if (extracted.assignee) setValue("assignee", extracted.assignee);
			} catch (error) {
				console.error("Failed to extract task data:", error);
				// Fallback to using transcription as description
				setValue("description", transcription.text);
			} finally {
				setIsExtracting(false);
			}
		};

		extractTaskData();
	}, [transcription, setValue]);

	const onFormSubmit = async (data: VoiceTaskFormData) => {
		const taskData = {
			...data,
			creationMethod: "voice" as const,
			metadata: {
				transcription,
				voiceCreated: true,
			},
		};

		await onSubmit(taskData);
	};

	const confidenceColor =
		transcription.confidence >= 0.8
			? "text-green-600"
			: transcription.confidence >= 0.6
				? "text-yellow-600"
				: "text-red-600";

	const confidenceLevel =
		transcription.confidence >= 0.8
			? "High"
			: transcription.confidence >= 0.6
				? "Medium"
				: "Low";

	return (
		<div className={`space-y-6 ${className}`}>
			<div className="mb-6 flex items-center gap-2">
				<Volume2 className="h-6 w-6 text-blue-500" />
				<h2 className="font-bold text-2xl">Create Task from Voice</h2>
			</div>

			{/* Transcription Quality Indicator */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="font-medium text-sm">Transcription Quality:</span>
						<Badge
							variant={
								transcription.confidence >= 0.8 ? "default" : "secondary"
							}
						>
							<span className={confidenceColor}>
								{confidenceLevel} ({Math.round(transcription.confidence * 100)}
								%)
							</span>
						</Badge>
					</div>

					<Button
						onClick={() => setShowTranscription(!showTranscription)}
						size="sm"
						variant="outline"
					>
						{showTranscription ? "Hide" : "Show"} Transcription
					</Button>
				</div>

				{transcription.confidence < 0.6 && (
					<Alert>
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							Low confidence transcription detected. Please review and edit the
							extracted information below.
						</AlertDescription>
					</Alert>
				)}

				{showTranscription && (
					<div className="rounded-lg border bg-muted/50 p-3">
						<h4 className="mb-2 font-medium text-sm">
							Original Transcription:
						</h4>
						<p className="text-muted-foreground text-sm leading-relaxed">
							"{transcription.text}"
						</p>
					</div>
				)}
			</div>

			{/* Extracted Data Preview */}
			{isExtracting ? (
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
					<div className="flex items-center gap-2">
						<div className="h-4 w-4 animate-pulse rounded-full bg-blue-500" />
						<span className="text-blue-700 text-sm">
							Extracting task information from your voice input...
						</span>
					</div>
				</div>
			) : (
				extractedData && (
					<div className="rounded-lg border border-green-200 bg-green-50 p-4">
						<h4 className="mb-2 font-medium text-green-800 text-sm">
							AI Extracted Information:
						</h4>
						<div className="space-y-1 text-green-700 text-sm">
							{extractedData.title && (
								<p>
									<strong>Title:</strong> {extractedData.title}
								</p>
							)}
							{extractedData.priority && (
								<p>
									<strong>Priority:</strong> {extractedData.priority}
								</p>
							)}
							{extractedData.assignee && (
								<p>
									<strong>Assignee:</strong> {extractedData.assignee}
								</p>
							)}
						</div>
					</div>
				)
			)}

			<form className="space-y-6" onSubmit={handleSubmit(onFormSubmit)}>
				{/* Task Information */}
				<div className="space-y-4">
					<div>
						<Label htmlFor="title">Title *</Label>
						<Input
							id="title"
							{...register("title")}
							className={errors.title ? "border-red-500" : ""}
							placeholder="Brief description of the task"
						/>
						{errors.title && (
							<p className="mt-1 text-red-500 text-sm">
								{errors.title.message}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							{...register("description")}
							className={errors.description ? "border-red-500" : ""}
							placeholder="Detailed description of the task..."
							rows={4}
						/>
						{errors.description && (
							<p className="mt-1 text-red-500 text-sm">
								{errors.description.message}
							</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="priority">Priority</Label>
							<Select
								defaultValue="medium"
								onValueChange={(value) => setValue("priority", value as any)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select priority" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="urgent">Urgent</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="assignee">Assignee</Label>
							<Input
								id="assignee"
								{...register("assignee")}
								placeholder="Assign to team member"
							/>
						</div>
					</div>
				</div>

				{/* Voice Metadata Display */}
				<div className="rounded-lg border border-dashed bg-muted/30 p-3">
					<h4 className="mb-2 font-medium text-sm">Voice Task Metadata:</h4>
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">voice-created</Badge>
						<Badge variant="outline">{transcription.language}</Badge>
						<Badge variant="outline">
							{transcription.segments.length} segments
						</Badge>
					</div>
				</div>

				{/* Form Actions */}
				<div className="flex gap-3 pt-4">
					<Button
						className="gap-2"
						disabled={!isValid || isSubmitting || isExtracting}
						type="submit"
					>
						<Send className="h-4 w-4" />
						{isSubmitting ? "Creating Task..." : "Create Task"}
					</Button>

					{onCancel && (
						<Button
							disabled={isSubmitting}
							onClick={onCancel}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
					)}

					<Button
						className="gap-2"
						onClick={() => setShowTranscription(true)}
						type="button"
						variant="ghost"
					>
						<Edit className="h-4 w-4" />
						Review Transcription
					</Button>
				</div>
			</form>
		</div>
	);
}

// Helper function to extract task data from transcription
function extractTaskFromTranscription(text: string): ExtractedTaskData {
	const lowerText = text.toLowerCase();

	// Extract title (first sentence or main action)
	let title = "";
	const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
	if (sentences.length > 0) {
		title = sentences[0].trim();

		// Clean up common voice patterns
		title = title
			.replace(/^(create|add|make|build|fix|update|implement)\s+a?\s*/i, "")
			.replace(/^(task|item|feature|bug)\s+(to|for)?\s*/i, "")
			.trim();

		// Capitalize first letter
		title = title.charAt(0).toUpperCase() + title.slice(1);
	}

	// Extract priority keywords
	let priority: "low" | "medium" | "high" | "urgent" = "medium";
	if (
		lowerText.includes("urgent") ||
		lowerText.includes("critical") ||
		lowerText.includes("asap")
	) {
		priority = "urgent";
	} else if (lowerText.includes("high") || lowerText.includes("important")) {
		priority = "high";
	} else if (lowerText.includes("low") || lowerText.includes("minor")) {
		priority = "low";
	}

	// Extract assignee mentions
	let assignee = "";
	const assigneePatterns = [
		/assign\s+(?:to|this\s+to)\s+(\w+)/i,
		/give\s+(?:to|this\s+to)\s+(\w+)/i,
		/for\s+(\w+)\s+to\s+(?:work\s+on|handle|do)/i,
		/(\w+)\s+should\s+(?:work\s+on|handle|do)/i,
	];

	for (const pattern of assigneePatterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			assignee = match[1].charAt(0).toUpperCase() + match[1].slice(1);
			break;
		}
	}

	return {
		title: title || "Voice-created task",
		description: text,
		priority,
		assignee,
	};
}
