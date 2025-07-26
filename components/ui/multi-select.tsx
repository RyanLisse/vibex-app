"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
	label: string;
	value: string;
	icon?: React.ComponentType<{ className?: string }>;
}

interface MultiSelectProps {
	options: MultiSelectOption[];
	selected: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	maxSelected?: number;
	searchPlaceholder?: string;
	emptyText?: string;
}

export function MultiSelect({
	options,
	selected,
	onChange,
	placeholder = "Select items...",
	className,
	disabled = false,
	maxSelected,
	searchPlaceholder = "Search...",
	emptyText = "No items found.",
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);

	const handleUnselect = (item: string) => {
		onChange(selected.filter((i) => i !== item));
	};

	const handleSelect = (item: string) => {
		if (selected.includes(item)) {
			handleUnselect(item);
		} else {
			if (maxSelected && selected.length >= maxSelected) {
				return;
			}
			onChange([...selected, item]);
		}
	};

	const selectedOptions = options.filter((option) => selected.includes(option.value));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild={true}>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("w-full justify-between min-h-10 h-auto", className)}
					disabled={disabled}
				>
					<div className="flex gap-1 flex-wrap">
						{selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
						{selectedOptions.map((option) => (
							<Badge
								variant="secondary"
								key={option.value}
								className="mr-1 mb-1"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleUnselect(option.value);
								}}
							>
								{option.icon && <option.icon className="h-3 w-3 mr-1" />}
								{option.label}
								<button
									className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleUnselect(option.value);
										}
									}}
									onMouseDown={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleUnselect(option.value);
									}}
								>
									<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
								</button>
							</Badge>
						))}
					</div>
					<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0" align="start">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandEmpty>{emptyText}</CommandEmpty>
					<CommandGroup className="max-h-64 overflow-auto">
						{options.map((option) => (
							<CommandItem key={option.value} onSelect={() => handleSelect(option.value)}>
								<Check
									className={cn(
										"mr-2 h-4 w-4",
										selected.includes(option.value) ? "opacity-100" : "opacity-0"
									)}
								/>
								{option.icon && <option.icon className="mr-2 h-4 w-4" />}
								{option.label}
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// Simplified version for basic use cases
interface SimpleMultiSelectProps {
	options: string[];
	selected: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function SimpleMultiSelect({
	options,
	selected,
	onChange,
	placeholder = "Select items...",
	className,
	disabled = false,
}: SimpleMultiSelectProps) {
	const multiSelectOptions: MultiSelectOption[] = options.map((option) => ({
		label: option,
		value: option,
	}));

	return (
		<MultiSelect
			options={multiSelectOptions}
			selected={selected}
			onChange={onChange}
			placeholder={placeholder}
			className={className}
			disabled={disabled}
		/>
	);
}
