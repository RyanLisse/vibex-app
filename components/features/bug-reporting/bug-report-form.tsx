"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Bug, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
	BugReport,
	ScreenshotData,
} from "@/src/schemas/enhanced-task-schemas";
import { ImageAnnotationTools } from "./image-annotation-tools";

const bugReportSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be less than 200 characters"),
	description: z
		.string()
		.min(1, "Description is required")
		.max(2000, "Description must be less than 2000 characters"),
	priority: z.enum(["low", "medium", "high", "critical"]),
	stepsToReproduce: z.string().optional(),
	expectedBehavior: z.string().optional(),
	actualBehavior: z.string().optional(),
});

type BugReportFormData = z.infer<typeof bugReportSchema>;

interface BugReportFormProps {
	screenshot: ScreenshotData;
	onSubmit: (bugReport: BugReport) => void | Promise<void>;
	onCancel?: () => void;
	isSubmitting?: boolean;
	className?: string;
}

export function BugReportForm({
	screenshot,
	onSubmit,
	onCancel,
	isSubmitting = false,
	className = "",
}: BugReportFormProps) {
	const [annotatedScreenshot, setAnnotatedScreenshot] =
		useState<ScreenshotData>(screenshot);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isValid },
	} = useForm<BugReportFormData>({
		resolver: zodResolver(bugReportSchema),
		defaultValues: {
			priority: "medium",
		},
		mode: "onChange",
	});

	const handleAnnotationsChange = (annotations: any[]) => {
		setAnnotatedScreenshot((prev) => ({
			...prev,
			annotations,
		}));
	};

	const onFormSubmit = async (data: BugReportFormData) => {
		setSubmitError(null);

		try {
			const bugReport: BugReport = {
				id: crypto.randomUUID(),
				title: data.title,
				description: data.description,
				screenshot: annotatedScreenshot,
				priority: data.priority,
				tags: ["bug"], // Auto-tag as bug
				stepsToReproduce: data.stepsToReproduce,
				expectedBehavior: data.expectedBehavior,
				actualBehavior: data.actualBehavior,
			};

			await onSubmit(bugReport);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to create bug report";
			setSubmitError(errorMessage);
		}
	};

	const priorityOptions = [
		{ value: "low", label: "Low", description: "Minor issue, low impact" },
		{
			value: "medium",
			label: "Medium",
			description: "Moderate issue, some impact",
		},
		{
			value: "high",
			label: "High",
			description: "Important issue, significant impact",
		},
		{
			value: "critical",
			label: "Critical",
			description: "Blocking issue, major impact",
		},
	];

	return (
		<div className={`space-y-6 ${className}`}>
			<div className="mb-6 flex items-center gap-2">
				<Bug className="h-6 w-6 text-red-500" />
				<h2 className="font-bold text-2xl">Create Bug Report</h2>
			</div>

			{submitError && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{submitError}</AlertDescription>
				</Alert>
			)}

			<form className="space-y-6" onSubmit={handleSubmit(onFormSubmit)}>
				{/* Basic Information */}
				<div className="space-y-4">
					<div>
						<Label htmlFor="title">Title *</Label>
						<Input
							id="title"
							{...register("title")}
							className={errors.title ? "border-red-500" : ""}
							placeholder="Brief description of the bug"
						/>
						{errors.title && (
							<p className="mt-1 text-red-500 text-sm">
								{errors.title.message}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="description">Description *</Label>
						<Textarea
							id="description"
							{...register("description")}
							className={errors.description ? "border-red-500" : ""}
							placeholder="Detailed description of the bug..."
							rows={4}
						/>
						{errors.description && (
							<p className="mt-1 text-red-500 text-sm">
								{errors.description.message}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="priority">Priority *</Label>
						<Select
							defaultValue="medium"
							onValueChange={(value) => setValue("priority", value as any)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select priority" />
							</SelectTrigger>
							<SelectContent>
								{priorityOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										<div>
											<div className="font-medium">{option.label}</div>
											<div className="text-muted-foreground text-sm">
												{option.description}
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Detailed Information */}
				<div className="space-y-4">
					<h3 className="font-semibold text-lg">Additional Details</h3>

					<div>
						<Label htmlFor="stepsToReproduce">Steps to Reproduce</Label>
						<Textarea
							id="stepsToReproduce"
							{...register("stepsToReproduce")}
							placeholder="1. Go to login page&#10;2. Enter invalid credentials&#10;3. Click submit&#10;4. ..."
							rows={3}
						/>
					</div>

					<div>
						<Label htmlFor="expectedBehavior">Expected Behavior</Label>
						<Textarea
							id="expectedBehavior"
							{...register("expectedBehavior")}
							placeholder="What should happen..."
							rows={2}
						/>
					</div>

					<div>
						<Label htmlFor="actualBehavior">Actual Behavior</Label>
						<Textarea
							id="actualBehavior"
							{...register("actualBehavior")}
							placeholder="What actually happens..."
							rows={2}
						/>
					</div>
				</div>

				{/* Screenshot with Annotations */}
				<div className="space-y-4">
					<h3 className="font-semibold text-lg">Screenshot Preview</h3>
					<p className="text-muted-foreground text-sm">
						Use the annotation tools to highlight important areas in your
						screenshot.
					</p>

					<ImageAnnotationTools
						onAnnotationsChange={handleAnnotationsChange}
						screenshot={annotatedScreenshot}
					/>
				</div>

				{/* Form Actions */}
				<div className="flex gap-3 pt-4">
					<Button
						className="gap-2"
						disabled={!isValid || isSubmitting}
						type="submit"
					>
						<Send className="h-4 w-4" />
						{isSubmitting ? "Creating Bug Report..." : "Create Bug Report"}
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
				</div>
			</form>

			{/* Auto-applied Tags Info */}
			<div className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-sm">
				<p>
					<strong>Note:</strong> This report will be automatically tagged as
					"bug" and created with the specified priority level.
				</p>
			</div>
		</div>
	);
}
