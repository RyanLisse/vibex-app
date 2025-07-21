"use client";

import { Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ShellOutputLine {
	id: string;
	content: string;
	type: "stdout" | "stderr" | "info";
	timestamp: Date;
}

interface ShellOutputPanelProps {
	output: ShellOutputLine[];
	isActive?: boolean;
	title?: string;
}

export function ShellOutputPanel({
	output,
	isActive = false,
	title = "Shell Output",
}: ShellOutputPanelProps) {
	const getLineClass = (type: ShellOutputLine["type"]) => {
		switch (type) {
			case "stderr":
				return "text-red-600 font-mono text-sm";
			case "stdout":
				return "text-green-600 font-mono text-sm";
			case "info":
				return "text-blue-600 font-mono text-sm";
			default:
				return "text-gray-600 font-mono text-sm";
		}
	};

	return (
		<Card className={`h-full ${isActive ? "border-green-500" : ""}`}>
			<CardHeader className="flex flex-row items-center gap-2">
				<Terminal className="h-4 w-4" />
				<CardTitle className="text-sm">{title}</CardTitle>
				{isActive && (
					<Badge variant="secondary" className="text-xs">
						Active
					</Badge>
				)}
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-[400px] p-4">
					<div className="space-y-1">
						{output.length === 0 ? (
							<div className="text-gray-500 text-sm italic">
								No output yet...
							</div>
						) : (
							output.map((line) => (
								<div key={line.id} className={getLineClass(line.type)}>
									{line.content}
								</div>
							))
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
