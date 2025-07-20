import type React from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { ContactForm } from "@/src/schemas/forms";
	contactFormSchema,
	getFieldError,
	hasFieldError,
	validateSchema,
} from "@/src/schemas/forms";

interface ContactFormProps {
	onSubmit: (data: ContactForm) => Promise<void>;
	isLoading?: boolean;
	className?: string;
}

// Helper functions extracted from component
const getInitialFormData = (): Partial<ContactForm> => ({
	name: "",
	email: "",
	subject: "",
	message: "",
	priority: "medium",
});

const clearFieldError = (
	errors: ReturnType<typeof validateSchema>["error"],
	field: keyof ContactForm,
) => {
	if (!errors?.fieldErrors) {
		return null;
	}

	const newErrors = { ...issues };
	if (newErrors.fieldErrors) {
		delete newErrors.fieldErrors[field];
	}
	return newErrors;
};

const getInputClassName = (
	errors: ReturnType<typeof validateSchema>["error"],
	field: keyof ContactForm,
) => {
	const baseClasses =
		"w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
	const errorClasses = "border-red-500 focus:ring-red-500";
	const normalClasses = "border-gray-300 focus:border-blue-500";

	return `${baseClasses} ${hasFieldError(errors, field) ? errorClasses : normalClasses}`;
};

const createFieldProps = (
	field: keyof ContactForm,
	formData: Partial<ContactForm>,
	errors: ReturnType<typeof validateSchema>["error"],
	onInputChange: (field: keyof ContactForm, value: string) => void,
	onBlur: (field: keyof ContactForm) => void,
) => ({
	id: field,
	value: (formData[field] as string) || "",
	hasError: hasFieldError(errors, field),
	errorMessage: getFieldError(errors, field),
	className: getInputClassName(errors, field),
	onChange: (value: string) => onInputChange(field, value),
	onBlur: () => onBlur(field),
});

export function ContactForm({
	onSubmit,
	isLoading = false,
	className = "",
}: ContactFormProps) {
	const [formData, setFormData] = useState<Partial<ContactForm>>(
		getInitialFormData(),
	);
	const [errors, setErrors] =
		useState<ReturnType<typeof validateSchema>["error"]>(null);
	const [, setTouched] = useState<Record<string, boolean>>({});

	const handleInputChange = (field: keyof ContactForm, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		if (errors && hasFieldError(errors, field)) {
			setErrors((prev) => (prev ? clearFieldError(prev, field) : null));
		}
	};

	const handleBlur = (field: keyof ContactForm) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const result = validateSchema(contactFormSchema, formData);

		if (!result.success) {
			setErrors(result.error);
			return;
		}

		setErrors(null);
		await onSubmit(result.data);
	};

	const handleClear = () => {
		setFormData(getInitialFormData());
		setErrors(null);
		setTouched({});
	};

	const nameProps = createFieldProps(
		"name",
		formData,
		errors,
		handleInputChange,
		handleBlur,
	);
	const emailProps = createFieldProps(
		"email",
		formData,
		errors,
		handleInputChange,
		handleBlur,
	);
	const subjectProps = createFieldProps(
		"subject",
		formData,
		errors,
		handleInputChange,
		handleBlur,
	);
	const priorityProps = createFieldProps(
		"priority",
		formData,
		errors,
		handleInputChange,
		handleBlur,
	);
	const messageProps = createFieldProps(
		"message",
		formData,
		errors,
		handleInputChange,
		handleBlur,
	);

	return (
		<form
			className={`space-y-4 ${className}`}
			noValidate
			onSubmit={handleSubmit}
		>
			<FormField
				{...nameProps}
				label="Name"
				placeholder="Enter your full name"
				type="text"
			/>

			<FormField
				{...emailProps}
				label="Email"
				placeholder="Enter your email address"
				type="email"
			/>

			<FormField
				{...subjectProps}
				label="Subject"
				placeholder="Enter the subject"
				type="text"
			/>

			<FormField
				{...priorityProps}
				label="Priority"
				options={[
					{ value: "low", label: "Low" },
					{ value: "medium", label: "Medium" },
					{ value: "high", label: "High" },
				]}
				type="select"
			/>

			<FormField
				{...messageProps}
				label="Message"
				placeholder="Enter your message"
				rows={4}
				type="textarea"
			/>

			{errors?.formErrors && errors.formErrors.length > 0 && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3">
					<p className="text-red-600 text-sm" role="alert">
						{errors.formErrors[0]}
					</p>
				</div>
			)}

			<div className="flex justify-end gap-2">
				<Button
					disabled={isLoading}
					onClick={handleClear}
					type="button"
					variant="outline"
				>
					Clear
				</Button>
				<Button className="min-w-24" disabled={isLoading} type="submit">
					{isLoading ? (
						<>
							<div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							Sending...
						</>
					) : (
						"Send Message"
					)}
				</Button>
			</div>
		</form>
	);
}
