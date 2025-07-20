"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertCircle, LogOut, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnthropicAuth } from "@/hooks/use-anthropic-auth";

export function AnthropicAuthStatus() {
	const { authenticated, loading, logout, expires, type, error } =
		useAnthropicAuth();

	if (loading) {
		return (
			<div className="flex items-center gap-2">
				<div className="h-4 w-4 animate-spin rounded-full border-primary border-b-2" />
				<span className="text-muted-foreground text-sm">Checking auth...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center gap-2">
				<AlertCircle className="size-4 text-red-500" />
				<span className="text-red-600 text-sm">Auth Error</span>
			</div>
		);
	}

	if (!authenticated) {
		return (
			<div className="flex items-center gap-2">
				<Shield className="size-4 text-muted-foreground" />
				<span className="text-muted-foreground text-sm">Not authenticated</span>
			</div>
		);
	}

	const isExpiringSoon = expires && expires < Date.now() + 300_000; // 5 minutes
	const timeToExpiry = expires
		? formatDistanceToNow(expires, { addSuffix: true })
		: null;

	return (
		<div className="flex items-center gap-2">
			<User className="size-4 text-green-600" />
			<Badge className="bg-green-100 text-green-800" variant="secondary">
				{type === "oauth" ? "OAuth" : "API"}
			</Badge>
			{expires && (
				<span
					className={`text-xs ${isExpiringSoon ? "text-amber-600" : "text-muted-foreground"}`}
				>
					{timeToExpiry}
				</span>
			)}
			<Button className="h-6 px-2" onClick={logout} size="sm" variant="ghost">
				<LogOut className="size-3" />
			</Button>
		</div>
	);
}
