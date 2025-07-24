"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskErrorFallbackProps {
	error: Error;
	onRetry?: () => void;
	taskId?: string;
}

export function TaskErrorFallback({ error, onRetry, taskId }: TaskErrorFallbackProps) {
	return (
		<Card className="border-destructive">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-destructive">
					<AlertTriangle className="h-5 w-5" />
					Task Error
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Alert variant="destructive">
					<AlertDescription>
						{error.message || "An unexpected error occurred while loading the task."}
					</AlertDescription>
				</Alert>

				{taskId && (
					<div className="text-sm text-muted-foreground">
						Task ID: <code className="font-mono">{taskId}</code>
					</div>
				)}

				<div className="flex gap-2">
					{onRetry && (
						<Button onClick={onRetry} variant="outline" size="sm">
							<RefreshCw className="h-4 w-4 mr-2" />
							Retry
						</Button>
					)}
					<Button variant="outline" size="sm" onClick={() => window.location.reload()}>
						Reload Page
					</Button>
				</div>

				{process.env.NODE_ENV === "development" && (
					<details className="text-xs text-muted-foreground">
						<summary className="cursor-pointer">Error Details</summary>
						<pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
					</details>
				)}
			</CardContent>
		</Card>
	);
}
