import type React from "react";
import type { ContactForm } from "@/src/schemas/forms";

interface FormFieldProps {
	id: keyof ContactForm;
	label: string;
	type: "text" | "email" | "select" | "textarea";
	value: string;
	placeholder?: string;
	options?: { value: string; label: string }[];
	rows?: number;
	required?: boolean;
	hasError: boolean;
	errorMessage?: string;
	className: string;
	onChange: (value: string) => void;
	onBlur: () => void;
}

export function FormField({
	id,
	label,
	type,
	value,
	placeholder,
	options,
	rows,
	required = true,
	hasError,
	errorMessage,
	className,
	onChange,
	onBlur,
}: FormFieldProps) {
	const renderInput = () => {
		const commonProps = {
			id,
			value,
			onChange: (
				e: React.ChangeEvent<
					HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
				>,
			) => onChange(e.target.value),
			onBlur,
			className,
			"aria-invalid": hasError,
			"aria-describedby": hasError ? `${id}-error` : undefined,
		};

		switch (type) {
			case "select":
				return (
					<select {...commonProps}>
						{options?.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				);
			case "textarea":
				return (
					<textarea {...commonProps} placeholder={placeholder} rows={rows} />
				);
			default:
				return <input {...commonProps} placeholder={placeholder} type={type} />;
		}
	};

	return (
		<div>
			<label
				className="mb-1 block font-medium text-gray-700 text-sm"
				htmlFor={id}
			>
				{label} {required && "*"}
			</label>
			{renderInput()}
			{hasError && errorMessage && (
				<p
					className="mt-1 text-red-600 text-sm"
					id={`${id}-error`}
					role="alert"
				>
					{errorMessage}
				</p>
			)}
		</div>
	);
}
