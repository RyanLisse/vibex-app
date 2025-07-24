import { z } from "zod/v3";

/**
 * Complex Zod Schema Examples
 *
 * This file contains comprehensive schema definitions for various domain models
 * including products, user profiles, surveys, and forms with advanced validation,
 * nested objects, conditional logic, and type inference.
 */

// =============================================================================
// PRODUCT SCHEMAS
// =============================================================================

/**
 * Product Variant Schema with inventory management
 */
export const ProductVariantSchema = z.object({
	id: z.string().uuid(),
	sku: z.string().min(1),
	name: z.string().min(1),
	price: z.number().positive(),
	compareAtPrice: z.number().positive().optional(),
	inventory: z.object({
		quantity: z.number().int().min(0),
		tracked: z.boolean().default(true),
		policy: z.enum(["deny", "continue"]).default("deny"),
		lowStockThreshold: z.number().int().min(0).optional(),
	}),
	attributes: z.record(z.string()).default({}),
	images: z
		.array(
			z.object({
				id: z.string().uuid(),
				url: z.string().url(),
				altText: z.string().optional(),
				position: z.number().int().min(0),
			})
		)
		.default([]),
	weight: z
		.object({
			value: z.number().positive(),
			unit: z.enum(["kg", "g", "lb", "oz"]),
		})
		.optional(),
	dimensions: z
		.object({
			length: z.number().positive(),
			width: z.number().positive(),
			height: z.number().positive(),
			unit: z.enum(["cm", "m", "in", "ft"]),
		})
		.optional(),
});

/**
 * Main Product Schema with variants and options
 */
export const ProductSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1),
	description: z.string().optional(),
	handle: z
		.string()
		.regex(/^[a-z0-9-]+$/, "Handle must contain only lowercase letters, numbers, and hyphens"),
	vendor: z.string().min(1),
	productType: z.string().min(1),
	tags: z.array(z.string()).default([]),
	status: z.enum(["active", "archived", "draft"]).default("draft"),
	variants: z.array(ProductVariantSchema).min(1, "Product must have at least one variant"),
	options: z
		.array(
			z.object({
				id: z.string().uuid(),
				name: z.string().min(1),
				position: z.number().int().min(0),
				values: z.array(z.string().min(1)),
			})
		)
		.max(3, "Maximum 3 product options allowed"),
	seo: z
		.object({
			title: z.string().max(70).optional(),
			description: z.string().max(160).optional(),
			keywords: z.array(z.string()).optional(),
		})
		.optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export type Product = z.infer<typeof ProductSchema>;

// =============================================================================
// USER PROFILE SCHEMAS
// =============================================================================

/**
 * Social Link Schema with platform validation
 */
export const SocialLinkSchema = z.object({
	platform: z.enum([
		"twitter",
		"facebook",
		"instagram",
		"linkedin",
		"github",
		"youtube",
		"tiktok",
		"website",
		"discord",
		"telegram",
	]),
	url: z.string().url(),
	verified: z.boolean().default(false),
	primary: z.boolean().default(false),
});

/**
 * Notification Preferences Schema with nested settings
 */
export const NotificationPreferencesSchema = z.object({
	email: z
		.object({
			enabled: z.boolean().default(true),
			frequency: z.enum(["immediate", "daily", "weekly", "never"]).default("immediate"),
			types: z
				.object({
					marketing: z.boolean().default(false),
					product: z.boolean().default(true),
					security: z.boolean().default(true),
					social: z.boolean().default(true),
				})
				.default({}),
		})
		.default({}),
	push: z
		.object({
			enabled: z.boolean().default(true),
			browser: z.boolean().default(true),
			mobile: z.boolean().default(true),
			desktop: z.boolean().default(false),
		})
		.default({}),
	sms: z
		.object({
			enabled: z.boolean().default(false),
			emergencyOnly: z.boolean().default(true),
		})
		.default({}),
});

/**
 * Comprehensive User Profile Schema with nested objects and complex validation
 */
export const UserProfileSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	username: z
		.string()
		.min(2)
		.max(50)
		.regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
	profile: z.object({
		firstName: z.string().min(1),
		lastName: z.string().min(1),
		displayName: z.string().optional(),
		bio: z.string().max(500).optional(),
		avatar: z.string().url().optional(),
		location: z
			.object({
				city: z.string().optional(),
				country: z.string().optional(),
				timezone: z.string().optional(),
				coordinates: z
					.object({
						lat: z.number().min(-90).max(90),
						lng: z.number().min(-180).max(180),
					})
					.optional(),
			})
			.optional(),
		contact: z
			.object({
				phone: z.string().optional(),
				website: z.string().url().optional(),
				socialLinks: z
					.array(SocialLinkSchema)
					.max(10, "Maximum 10 social links allowed")
					.default([]),
			})
			.optional(),
		professional: z
			.object({
				title: z.string().optional(),
				company: z.string().optional(),
				industry: z.string().optional(),
				experience: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
				skills: z.array(z.string()).optional(),
				resume: z.string().url().optional(),
			})
			.optional(),
	}),
	preferences: z
		.object({
			theme: z.enum(["light", "dark", "auto"]).default("light"),
			language: z.string().length(2).default("en"),
			currency: z.string().length(3).default("USD"),
			timezone: z.string().default("UTC"),
			notifications: NotificationPreferencesSchema.default({}),
			privacy: z
				.object({
					profile: z
						.object({
							visibility: z.enum(["public", "private", "friends"]).default("public"),
							indexable: z.boolean().default(true),
							showEmail: z.boolean().default(false),
							showPhone: z.boolean().default(false),
							showLocation: z.boolean().default(true),
						})
						.default({}),
					activity: z
						.object({
							showOnline: z.boolean().default(true),
							showLastSeen: z.boolean().default(true),
							showActivity: z.boolean().default(true),
						})
						.default({}),
					content: z
						.object({
							allowComments: z.boolean().default(true),
							allowSharing: z.boolean().default(true),
							allowTagging: z.boolean().default(true),
							moderateComments: z.boolean().default(false),
						})
						.default({}),
				})
				.default({}),
		})
		.default({}),
	verification: z
		.object({
			email: z.object({
				verified: z.boolean().default(false),
				verifiedAt: z.string().datetime().optional(),
			}),
			phone: z.object({
				verified: z.boolean().default(false),
				verifiedAt: z.string().datetime().optional(),
			}),
			identity: z.object({
				verified: z.boolean().default(false),
				verifiedAt: z.string().datetime().optional(),
				method: z.enum(["passport", "license", "government_id"]).optional(),
			}),
		})
		.default({
			email: { verified: false },
			phone: { verified: false },
			identity: { verified: false },
		}),
	subscription: z
		.object({
			plan: z.enum(["free", "basic", "pro", "enterprise"]).default("free"),
			status: z.enum(["active", "inactive", "cancelled", "past_due"]).default("active"),
			currentPeriodStart: z.string().datetime().optional(),
			currentPeriodEnd: z.string().datetime().optional(),
			cancelAtPeriodEnd: z.boolean().default(false),
			trialEnd: z.string().datetime().optional(),
		})
		.optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	lastLoginAt: z.string().datetime().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// =============================================================================
// SURVEY SCHEMAS
// =============================================================================

/**
 * Question Schema with conditional logic and validation
 */
export const QuestionSchema = z
	.object({
		id: z.string().min(1),
		type: z.enum([
			"text",
			"textarea",
			"select",
			"multiselect",
			"radio",
			"checkbox",
			"number",
			"email",
			"url",
			"date",
			"rating",
			"file",
		]),
		title: z.string().min(1),
		description: z.string().optional(),
		options: z
			.array(
				z.object({
					id: z.string().min(1),
					label: z.string().min(1),
					value: z.string().min(1),
					order: z.number().int().min(0),
					image: z.string().url().optional(),
					description: z.string().optional(),
				})
			)
			.optional(),
		validation: z
			.object({
				required: z.boolean().default(false),
				minLength: z.number().int().min(0).optional(),
				maxLength: z.number().int().min(0).optional(),
				min: z.number().optional(),
				max: z.number().optional(),
				pattern: z.string().optional(),
				message: z.string().optional(),
			})
			.default({}),
		logic: z
			.object({
				conditions: z.array(
					z.object({
						field: z.string().min(1),
						operator: z.enum([
							"equals",
							"not_equals",
							"contains",
							"not_contains",
							"greater",
							"less",
							"greater_equal",
							"less_equal",
							"is_empty",
							"is_not_empty",
						]),
						value: z.union([z.string(), z.number(), z.boolean()]).optional(),
					})
				),
				action: z.enum(["show", "hide", "require", "skip"]),
				operator: z.enum(["and", "or"]).default("and"),
			})
			.optional(),
		order: z.number().int().min(0),
		section: z.string().optional(),
		placeholder: z.string().optional(),
		helpText: z.string().optional(),
		defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
	})
	.refine(
		(data) => {
			// Select/multiselect/radio/checkbox questions must have options
			if (["select", "multiselect", "radio", "checkbox"].includes(data.type)) {
				return data.options && data.options.length > 0;
			}
			return true;
		},
		{
			message: "Select, multiselect, radio, and checkbox questions must have options",
		}
	);

/**
 * Survey Schema with questions and configuration
 */
export const SurveySchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	questions: z.array(QuestionSchema).min(1, "Survey must have at least one question"),
	settings: z
		.object({
			allowAnonymous: z.boolean().default(true),
			allowMultipleResponses: z.boolean().default(false),
			requireLogin: z.boolean().default(false),
			showProgressBar: z.boolean().default(true),
			randomizeQuestions: z.boolean().default(false),
			autoSave: z.boolean().default(true),
			collectLocation: z.boolean().default(false),
			collectDevice: z.boolean().default(false),
			thankYouMessage: z.string().optional(),
			redirectUrl: z.string().url().optional(),
		})
		.default({}),
	styling: z
		.object({
			theme: z.enum(["modern", "classic", "minimal", "bold"]).default("modern"),
			primaryColor: z
				.string()
				.regex(/^#[0-9A-Fa-f]{6}$/)
				.default("#007bff"),
			backgroundColor: z
				.string()
				.regex(/^#[0-9A-Fa-f]{6}$/)
				.default("#ffffff"),
			fontFamily: z.string().optional(),
			customCSS: z.string().optional(),
		})
		.optional(),
	schedule: z
		.object({
			startDate: z.string().datetime().optional(),
			endDate: z.string().datetime().optional(),
			timezone: z.string().default("UTC"),
			maxResponses: z.number().int().positive().optional(),
		})
		.optional(),
	status: z.enum(["draft", "published", "paused", "closed"]).default("draft"),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	createdBy: z.string().optional(),
	tags: z.array(z.string()).default([]),
	version: z.number().int().positive().default(1),
});

export type Survey = z.infer<typeof SurveySchema>;

// =============================================================================
// FORM SCHEMAS
// =============================================================================

/**
 * Form Field Schema with conditional logic and styling
 */
export const FormFieldSchema = z.object({
	id: z.string().min(1),
	type: z.enum([
		"text",
		"textarea",
		"email",
		"password",
		"number",
		"tel",
		"url",
		"date",
		"datetime-local",
		"time",
		"month",
		"week",
		"color",
		"range",
		"file",
		"checkbox",
		"radio",
		"select",
		"multiselect",
		"hidden",
	]),
	name: z
		.string()
		.regex(
			/^[a-zA-Z][a-zA-Z0-9_]*$/,
			"Field name must start with letter and contain only letters, numbers, and underscores"
		),
	label: z.string().min(1),
	placeholder: z.string().optional(),
	description: z.string().optional(),
	required: z.boolean().default(false),
	disabled: z.boolean().default(false),
	readonly: z.boolean().default(false),
	hidden: z.boolean().default(false),
	validation: z
		.object({
			pattern: z.string().optional(),
			minLength: z.number().int().min(0).optional(),
			maxLength: z.number().int().min(0).optional(),
			min: z.number().optional(),
			max: z.number().optional(),
			step: z.number().optional(),
			message: z.string().optional(),
			custom: z.string().optional(), // Custom validation function name
		})
		.optional(),
	options: z
		.array(
			z.object({
				value: z.string(),
				label: z.string(),
				disabled: z.boolean().default(false),
				selected: z.boolean().default(false),
			})
		)
		.optional(),
	defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
	conditional: z
		.object({
			show: z
				.object({
					field: z.string(),
					operator: z.enum([
						"equals",
						"not_equals",
						"contains",
						"not_contains",
						"greater",
						"less",
						"greater_equal",
						"less_equal",
						"is_empty",
						"is_not_empty",
					]),
					value: z.union([z.string(), z.number(), z.boolean()]).optional(),
				})
				.optional(),
			hide: z
				.object({
					field: z.string(),
					operator: z.enum([
						"equals",
						"not_equals",
						"contains",
						"not_contains",
						"greater",
						"less",
						"greater_equal",
						"less_equal",
						"is_empty",
						"is_not_empty",
					]),
					value: z.union([z.string(), z.number(), z.boolean()]).optional(),
				})
				.optional(),
			require: z
				.object({
					field: z.string(),
					operator: z.enum([
						"equals",
						"not_equals",
						"contains",
						"not_contains",
						"greater",
						"less",
						"greater_equal",
						"less_equal",
						"is_empty",
						"is_not_empty",
					]),
					value: z.union([z.string(), z.number(), z.boolean()]).optional(),
				})
				.optional(),
		})
		.optional(),
	styling: z
		.object({
			width: z.enum(["full", "half", "third", "quarter", "auto"]).default("full"),
			alignment: z.enum(["left", "center", "right"]).default("left"),
			size: z.enum(["small", "medium", "large"]).default("medium"),
			variant: z.enum(["outlined", "filled", "standard"]).default("outlined"),
			color: z.string().optional(),
			className: z.string().optional(),
			style: z.record(z.string()).optional(),
		})
		.optional(),
	order: z.number().int().min(0),
	section: z.string().optional(),
	helpText: z.string().optional(),
	errorMessage: z.string().optional(),
});

/**
 * Form Schema with fields, settings, and styling
 */
export const FormSchema = z.object({
	id: z.string().min(1),
	name: z
		.string()
		.regex(
			/^[a-zA-Z][a-zA-Z0-9_-]*$/,
			"Form name must start with letter and contain only letters, numbers, hyphens, and underscores"
		),
	title: z.string().min(1),
	description: z.string().optional(),
	fields: z.array(FormFieldSchema).min(1, "Form must have at least one field"),
	settings: z
		.object({
			method: z.enum(["GET", "POST"]).default("POST"),
			action: z.string().optional(),
			multiPage: z.boolean().default(false),
			allowDrafts: z.boolean().default(false),
			autoSave: z.boolean().default(false),
			showProgress: z.boolean().default(false),
			validation: z.enum(["onChange", "onBlur", "onSubmit"]).default("onSubmit"),
			submitText: z.string().default("Submit"),
			resetText: z.string().default("Reset"),
			cancelText: z.string().default("Cancel"),
			successMessage: z.string().optional(),
			errorMessage: z.string().optional(),
			redirectUrl: z.string().url().optional(),
			confirmBeforeSubmit: z.boolean().default(false),
			confirmMessage: z.string().optional(),
		})
		.default({}),
	styling: z
		.object({
			theme: z.enum(["modern", "classic", "minimal", "material"]).default("modern"),
			layout: z.enum(["vertical", "horizontal", "grid"]).default("vertical"),
			spacing: z.enum(["compact", "normal", "relaxed"]).default("normal"),
			primaryColor: z
				.string()
				.regex(/^#[0-9A-Fa-f]{6}$/)
				.default("#007bff"),
			backgroundColor: z
				.string()
				.regex(/^#[0-9A-Fa-f]{6}$/)
				.optional(),
			borderRadius: z.number().min(0).optional(),
			fontFamily: z.string().optional(),
			customCSS: z.string().optional(),
		})
		.optional(),
	security: z
		.object({
			reCaptcha: z.boolean().default(false),
			reCaptchaSiteKey: z.string().optional(),
			honeypot: z.boolean().default(true),
			rateLimit: z
				.object({
					enabled: z.boolean().default(false),
					max: z.number().int().positive().default(5),
					window: z.number().int().positive().default(60), // seconds
				})
				.default({}),
			allowedDomains: z.array(z.string()).optional(),
			requireSSL: z.boolean().default(false),
		})
		.optional(),
	notifications: z
		.object({
			email: z
				.object({
					enabled: z.boolean().default(false),
					to: z.array(z.string().email()).optional(),
					subject: z.string().optional(),
					template: z.string().optional(),
				})
				.optional(),
			webhook: z
				.object({
					enabled: z.boolean().default(false),
					url: z.string().url().optional(),
					method: z.enum(["GET", "POST", "PUT", "PATCH"]).default("POST"),
					headers: z.record(z.string()).optional(),
				})
				.optional(),
		})
		.optional(),
	status: z.enum(["draft", "published", "archived"]).default("draft"),
	version: z.number().int().positive().default(1),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	createdBy: z.string().optional(),
	tags: z.array(z.string()).default([]),
});

export type FormField = z.infer<typeof FormFieldSchema>;
export type Form = z.infer<typeof FormSchema>;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate nested schema with enhanced error handling and context
 */
export function validateNestedSchema<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
	context?: string
): { success: true; data: T } | { success: false; errors: string[] } {
	try {
		const result = schema.safeParse(data);

		if (result.success) {
			return { success: true, data: result.data };
		}
		const errors = result.error.errors.map((err) => {
			const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
			const contextPrefix = context ? `[${context}] ` : "";
			return `${contextPrefix}${path}${err.message}`;
		});

		return { success: false, errors };
	} catch (error) {
		const contextPrefix = context ? `[${context}] ` : "";
		return {
			success: false,
			errors: [
				`${contextPrefix}Schema validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			],
		};
	}
}

/**
 * Validate conditional field logic for form fields
 */
export function validateConditionalField(
	field: FormField,
	formData: Record<string, any>
): { show: boolean; required: boolean; hidden: boolean } {
	// Default state
	let show = !field.hidden;
	let required = field.required;
	let hidden = field.hidden;

	if (!field.conditional) {
		return { show, required, hidden };
	}

	// Helper function to evaluate a condition
	const evaluateCondition = (condition: {
		field: string;
		operator: string;
		value?: string | number | boolean;
	}): boolean => {
		const fieldValue = formData[condition.field];
		const targetValue = condition.value;

		switch (condition.operator) {
			case "equals":
				return fieldValue === targetValue;
			case "not_equals":
				return fieldValue !== targetValue;
			case "contains":
				return typeof fieldValue === "string" && typeof targetValue === "string"
					? fieldValue.includes(targetValue)
					: false;
			case "not_contains":
				return typeof fieldValue === "string" && typeof targetValue === "string"
					? !fieldValue.includes(targetValue)
					: true;
			case "greater":
				return typeof fieldValue === "number" && typeof targetValue === "number"
					? fieldValue > targetValue
					: false;
			case "less":
				return typeof fieldValue === "number" && typeof targetValue === "number"
					? fieldValue < targetValue
					: false;
			case "greater_equal":
				return typeof fieldValue === "number" && typeof targetValue === "number"
					? fieldValue >= targetValue
					: false;
			case "less_equal":
				return typeof fieldValue === "number" && typeof targetValue === "number"
					? fieldValue <= targetValue
					: false;
			case "is_empty":
				return (
					!fieldValue || fieldValue === "" || (Array.isArray(fieldValue) && fieldValue.length === 0)
				);
			case "is_not_empty":
				return !(
					!fieldValue ||
					fieldValue === "" ||
					(Array.isArray(fieldValue) && fieldValue.length === 0)
				);
			default:
				return false;
		}
	};

	// Evaluate show condition
	if (field.conditional.show) {
		show = evaluateCondition(field.conditional.show);
	}

	// Evaluate hide condition
	if (field.conditional.hide) {
		const shouldHide = evaluateCondition(field.conditional.hide);
		if (shouldHide) {
			show = false;
			hidden = true;
		}
	}

	// Evaluate require condition
	if (field.conditional.require) {
		const shouldRequire = evaluateCondition(field.conditional.require);
		if (shouldRequire) {
			required = true;
		}
	}

	// If field is hidden, it should not be shown
	if (hidden) {
		show = false;
	}

	return { show, required, hidden };
}
