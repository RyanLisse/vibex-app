"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface CreateEnvironmentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateEnvironment?: (environment: { name: string; type: string; description?: string }) => void;
}

export function CreateEnvironmentDialog({
	open,
	onOpenChange,
	onCreateEnvironment,
}: CreateEnvironmentDialogProps) {
	const [name, setName] = useState("");
	const [type, setType] = useState("");
	const [description, setDescription] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name || !type) return;

		setIsLoading(true);
		try {
			await onCreateEnvironment?.({
				name,
				type,
				description: description || undefined,
			});

			// Reset form
			setName("");
			setType("");
			setDescription("");
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to create environment:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create New Environment</DialogTitle>
					<DialogDescription>
						Create a new development environment for your project.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Environment Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Development, Staging, Production"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="type">Environment Type</Label>
						<Select value={type} onValueChange={setType} required>
							<SelectTrigger>
								<SelectValue placeholder="Select environment type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="development">Development</SelectItem>
								<SelectItem value="staging">Staging</SelectItem>
								<SelectItem value="production">Production</SelectItem>
								<SelectItem value="testing">Testing</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Input
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brief description of this environment"
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!name || !type || isLoading}>
							{isLoading ? "Creating..." : "Create Environment"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
