"use client";

import { AlertCircle, Bug, Send } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ScreenshotBugReportSchema } from "@/src/schemas/enhanced-task-schemas";

type BugReportFormData = z.infer<typeof ScreenshotBugReportSchema>;

interface BugReportFormProps {
	screenshot?: Blob | null;
	annotations?: any[];
	onSubmit?: (data: BugReportFormData) => void;
	onCancel?: () => void;
	isSubmitting?: boolean;
	className?: string;
}

export function BugReportForm({
	screenshot,
	annotations = [],
	onSubmit,
	onCancel,
	isSubmitting = false,
	className = "",
}: BugReportFormProps) {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		priority: "medium" as "low" | "medium" | "high" | "critical",
		severity: "medium" as "low" | "medium" | "high" | "critical",
		assignee: "",
		steps: "",
		expectedBehavior: "",
		actualBehavior: "",
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	const [browserInfo] = useState(() => ({
		name: navigator.userAgent.includes("Chrome")
			? "Chrome"
			: navigator.userAgent.includes("Firefox")
				? "Firefox"
				: navigator.userAgent.includes("Safari")
					? "Safari"
					: "Unknown",
		version: navigator.appVersion,
		userAgent: navigator.userAgent,
	}));

	const { toast } = useToast();

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.title.trim()) {
			newErrors.title = "Title is required";
		} else if (formData.title.length > 200) {
			newErrors.title = "Title too long";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Description is required";
		} else if (formData.description.length > 1000) {
			newErrors.description = "Description too long";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		try {
			// Convert form data to bug report format
			const bugReportData: BugReportFormData = {
				taskId: crypto.randomUUID(), // Generate temporary ID
				screenshot: {
					url: screenshot ? URL.createObjectURL(screenshot) : undefined,
					annotations,
				},
				title: formData.title,
				description: formData.description,
				priority: formData.priority,
				userId: crypto.randomUUID(), // Would come from auth context
				assignee: formData.assignee || undefined,
				labels: ["bug"], // Auto-tag as bug
				severity: formData.severity,
				steps: formData.steps ? formData.steps.split("\n").filter((s) => s.trim()) : undefined,
				reproductionSteps: formData.steps
					? formData.steps.split("\n").filter((s) => s.trim())
					: undefined,
				expectedBehavior: formData.expectedBehavior || undefined,
				actualBehavior: formData.actualBehavior || undefined,
				browserInfo,
			};

			onSubmit?.(bugReportData);

			toast({
				title: "Bug Report Submitted",
				description: "Your bug report has been created successfully.",
			});
		} catch (error) {
			console.error("Failed to submit bug report:", error);
			toast({
				title: "Submission Failed",
				description: "Failed to submit bug report. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: "" }));
		}
	};

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Bug className="h-5 w-5" />
					Bug Report
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Title */}
					<FormField label="Title" required={true} error={errors.title}>
						<Input
							placeholder="Brief description of the bug"
							value={formData.title}
							onChange={(e) => handleInputChange("title", e.target.value)}
						/>
					</FormField>

					{/* Description */}
					<FormField label="Description" required={true} error={errors.description}>
						<Textarea
							placeholder="Detailed description of the bug"
							rows={4}
							value={formData.description}
							onChange={(e) => handleInputChange("description", e.target.value)}
						/>
					</FormField>

					{/* Priority and Severity */}
					<div className="grid grid-cols-2 gap-4">
						<FormField label="Priority">
							<Select
								value={formData.priority}
								onValueChange={(value) => handleInputChange("priority", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select priority" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="critical">Critical</SelectItem>
								</SelectContent>
							</Select>
						</FormField>

						<FormField label="Severity">
							<Select
								value={formData.severity}
								onValueChange={(value) => handleInputChange("severity", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select severity" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="critical">Critical</SelectItem>
								</SelectContent>
							</Select>
						</FormField>
					</div>

					{/* Assignee */}
					<FormField label="Assignee">
						<Input
							placeholder="Assign to team member (optional)"
							value={formData.assignee}
							onChange={(e) => handleInputChange("assignee", e.target.value)}
						/>
					</FormField>

					{/* Steps to Reproduce */}
					<FormField label="Steps to Reproduce">
						<Textarea
							placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
							rows={3}
							value={formData.steps}
							onChange={(e) => handleInputChange("steps", e.target.value)}
						/>
					</FormField>

					{/* Expected vs Actual Behavior */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="Expected Behavior">
							<Textarea
								placeholder="What should happen?"
								rows={3}
								value={formData.expectedBehavior}
								onChange={(e) => handleInputChange("expectedBehavior", e.target.value)}
							/>
						</FormField>

						<FormField label="Actual Behavior">
							<Textarea
								placeholder="What actually happened?"
								rows={3}
								value={formData.actualBehavior}
								onChange={(e) => handleInputChange("actualBehavior", e.target.value)}
							/>
						</FormField>
					</div>

					{/* Browser Info Display */}
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							<strong>Browser Info:</strong> {browserInfo.name} -{" "}
							{browserInfo.version.split(" ")[0]}
							{screenshot && (
								<span className="block mt-1">
									<strong>Screenshot:</strong> Attached with {annotations.length} annotation
									{annotations.length !== 1 ? "s" : ""}
								</span>
							)}
						</AlertDescription>
					</Alert>

					{/* Form Actions */}
					<div className="flex gap-3 pt-4">
						<Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
							{isSubmitting ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
									Submitting...
								</>
							) : (
								<>
									<Send className="h-4 w-4" />
									Submit Bug Report
								</>
							)}
						</Button>
						{onCancel && (
							<Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
								Cancel
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
