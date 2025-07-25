import { Loader } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskControlButtonProps {
	icon: ReactNode;
	tooltip: string;
	onClick: () => void;
	isLoading: boolean;
	variant?: "default" | "destructive" | "outline";
	disabled?: boolean;
}

export function TaskControlButton({
	icon,
	tooltip,
	onClick,
	isLoading,
	variant = "outline",
	disabled = false,
}: TaskControlButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild={true}>
				<Button
					className="h-8 w-8 rounded-full"
					disabled={isLoading || disabled}
					onClick={onClick}
					size="icon"
					variant={variant}
				>
					{isLoading ? <Loader className="size-4 animate-spin" /> : icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>{tooltip}</p>
			</TooltipContent>
		</Tooltip>
	);
}
