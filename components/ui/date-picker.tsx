"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
	date?: Date;
	onDateChange?: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function DatePicker({
	date,
	onDateChange,
	placeholder = "Pick a date",
	disabled = false,
	className,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild={true}>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!date && "text-muted-foreground",
						className
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date ? format(date, "PPP") : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={(selectedDate) => {
						onDateChange?.(selectedDate);
						setOpen(false);
					}}
					initialFocus={true}
				/>
			</PopoverContent>
		</Popover>
	);
}

interface DateRangePickerProps {
	dateRange?: {
		from: Date | undefined;
		to: Date | undefined;
	};
	onDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function DateRangePicker({
	dateRange,
	onDateRangeChange,
	placeholder = "Pick a date range",
	disabled = false,
	className,
}: DateRangePickerProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild={true}>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!dateRange?.from && "text-muted-foreground",
						className
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{dateRange?.from ? (
						dateRange.to ? (
							<>
								{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
							</>
						) : (
							format(dateRange.from, "LLL dd, y")
						)
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					initialFocus={true}
					mode="range"
					defaultMonth={dateRange?.from}
					selected={dateRange}
					onSelect={(range) => {
						onDateRangeChange?.(range || { from: undefined, to: undefined });
						if (range?.from && range?.to) {
							setOpen(false);
						}
					}}
					numberOfMonths={2}
				/>
			</PopoverContent>
		</Popover>
	);
}
