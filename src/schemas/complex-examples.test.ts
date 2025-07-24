import { afterEach, beforeEach, describe, expect, it, spyOn, test } from "vitest";
import {
	type FormField,
	FormFieldSchema,
	FormSchema,
	NotificationPreferencesSchema,
	type Product,
	ProductSchema,
	ProductVariantSchema,
	QuestionSchema,
	SocialLinkSchema,
	type Survey,
	SurveySchema,
	type UserProfile,
	UserProfileSchema,
	validateConditionalField,
	validateNestedSchema,
} from "./complex-examples";

describe("Product Schemas", () => {
	describe("ProductVariantSchema", () => {
		it("should validate valid product variant", () => {
			const validVariant = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				sku: "PROD-001",
				name: "Small Red Shirt",
				price: 29.99,
				compareAtPrice: 39.99,
				inventory: {
					quantity: 100,
					tracked: true,
					policy: "deny",
					lowStockThreshold: 10,
				},
				attributes: { color: "red", size: "small" },
				images: [
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
						url: "https://example.com/image.jpg",
						altText: "Red shirt",
						position: 0,
					},
				],
				weight: { value: 0.5, unit: "kg" },
				dimensions: { length: 30, width: 20, height: 2, unit: "cm" },
			};
			const result = ProductVariantSchema.safeParse(validVariant);
			expect(result.success).toBe(true);
		});

		it("should use default values", () => {
			const minimalVariant = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				sku: "PROD-001",
				name: "Basic Product",
				price: 19.99,
				inventory: { quantity: 50 },
			};
			const result = ProductVariantSchema.safeParse(minimalVariant);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.inventory.tracked).toBe(true);
				expect(result.data.inventory.policy).toBe("deny");
				expect(result.data.attributes).toEqual({});
				expect(result.data.images).toEqual([]);
			}
		});

		it("should reject negative price", () => {
			const invalidVariant = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				sku: "PROD-001",
				name: "Product",
				price: -10,
				inventory: { quantity: 50 },
			};
			const result = ProductVariantSchema.safeParse(invalidVariant);
			expect(result.success).toBe(false);
		});

		it("should reject negative inventory", () => {
			const invalidVariant = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				sku: "PROD-001",
				name: "Product",
				price: 19.99,
				inventory: { quantity: -5 },
			};
			const result = ProductVariantSchema.safeParse(invalidVariant);
			expect(result.success).toBe(false);
		});
	});

	describe("ProductSchema", () => {
		it("should validate valid product", () => {
			const validProduct = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				title: "Test Product",
				description: "A great product",
				handle: "test-product",
				vendor: "Test Vendor",
				productType: "Apparel",
				tags: ["test", "product"],
				status: "active",
				variants: [
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
						sku: "PROD-001",
						name: "Default Variant",
						price: 29.99,
						inventory: { quantity: 100 },
						attributes: {},
						images: [],
					},
				],
				options: [
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
						name: "Size",
						position: 0,
						values: ["Small", "Medium", "Large"],
					},
				],
				seo: {
					title: "Test Product - Best Product Ever",
					description: "Buy the best test product available online",
					keywords: ["test", "product", "best"],
				},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = ProductSchema.safeParse(validProduct);
			expect(result.success).toBe(true);
		});

		it("should reject invalid handle", () => {
			const invalidProduct = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				title: "Test Product",
				handle: "Invalid Handle With Spaces",
				vendor: "Test Vendor",
				productType: "Apparel",
				variants: [
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
						sku: "PROD-001",
						name: "Default Variant",
						price: 29.99,
						inventory: { quantity: 100 },
						attributes: {},
						images: [],
					},
				],
				options: [],
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = ProductSchema.safeParse(invalidProduct);
			expect(result.success).toBe(false);
		});

		it("should reject product with no variants", () => {
			const invalidProduct = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				title: "Test Product",
				handle: "test-product",
				vendor: "Test Vendor",
				productType: "Apparel",
				variants: [],
				options: [],
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = ProductSchema.safeParse(invalidProduct);
			expect(result.success).toBe(false);
		});

		it("should reject too many options", () => {
			const invalidProduct = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				title: "Test Product",
				handle: "test-product",
				vendor: "Test Vendor",
				productType: "Apparel",
				variants: [
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
						sku: "PROD-001",
						name: "Default Variant",
						price: 29.99,
						inventory: { quantity: 100 },
						attributes: {},
						images: [],
					},
				],
				options: [
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
						name: "Size",
						position: 0,
						values: ["S", "M", "L"],
					},
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
						name: "Color",
						position: 1,
						values: ["Red", "Blue"],
					},
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d485",
						name: "Material",
						position: 2,
						values: ["Cotton", "Polyester"],
					},
					{
						id: "f47ac10b-58cc-4372-a567-0e02b2c3d486",
						name: "Style",
						position: 3,
						values: ["Casual", "Formal"],
					},
				],
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = ProductSchema.safeParse(invalidProduct);
			expect(result.success).toBe(false);
		});
	});
});

describe("User Profile Schemas", () => {
	describe("SocialLinkSchema", () => {
		it("should validate valid social link", () => {
			const validLink = {
				platform: "twitter",
				url: "https://twitter.com/testuser",
				verified: true,
				primary: false,
			};
			const result = SocialLinkSchema.safeParse(validLink);
			expect(result.success).toBe(true);
		});

		it("should use default values", () => {
			const minimalLink = {
				platform: "github",
				url: "https://github.com/testuser",
			};
			const result = SocialLinkSchema.safeParse(minimalLink);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.verified).toBe(false);
				expect(result.data.primary).toBe(false);
			}
		});

		it("should reject invalid platform", () => {
			const invalidLink = {
				platform: "invalid",
				url: "https://example.com",
			};
			const result = SocialLinkSchema.safeParse(invalidLink);
			expect(result.success).toBe(false);
		});

		it("should reject invalid URL", () => {
			const invalidLink = {
				platform: "twitter",
				url: "not-a-url",
			};
			const result = SocialLinkSchema.safeParse(invalidLink);
			expect(result.success).toBe(false);
		});
	});

	describe("NotificationPreferencesSchema", () => {
		it("should validate valid notification preferences", () => {
			const validPrefs = {
				email: {
					enabled: true,
					frequency: "daily",
					types: {
						marketing: false,
						product: true,
						security: true,
						social: false,
					},
				},
				push: {
					enabled: true,
					browser: true,
					mobile: false,
					desktop: true,
				},
				sms: {
					enabled: false,
					emergencyOnly: true,
				},
			};
			const result = NotificationPreferencesSchema.safeParse(validPrefs);
			expect(result.success).toBe(true);
		});

		it("should use default values", () => {
			const result = NotificationPreferencesSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email.enabled).toBe(true);
				expect(result.data.email.frequency).toBe("immediate");
				expect(result.data.push.enabled).toBe(true);
				expect(result.data.sms.enabled).toBe(false);
			}
		});
	});

	describe("UserProfileSchema", () => {
		it("should validate valid user profile", () => {
			const validProfile = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				email: "test@example.com",
				username: "testuser",
				profile: {
					firstName: "John",
					lastName: "Doe",
					displayName: "John Doe",
					bio: "Software developer",
					avatar: "https://example.com/avatar.jpg",
					location: {
						city: "San Francisco",
						country: "USA",
						timezone: "America/Los_Angeles",
						coordinates: { lat: 37.7749, lng: -122.4194 },
					},
					contact: {
						phone: "+1234567890",
						website: "https://johndoe.com",
						socialLinks: [
							{
								platform: "twitter",
								url: "https://twitter.com/johndoe",
								verified: true,
								primary: true,
							},
						],
					},
					professional: {
						title: "Senior Developer",
						company: "Tech Corp",
						industry: "Technology",
						experience: "senior",
						skills: ["JavaScript", "React", "Node.js"],
						resume: "https://example.com/resume.pdf",
					},
				},
				preferences: {
					theme: "dark",
					language: "en",
					currency: "USD",
					timezone: "America/Los_Angeles",
					notifications: {
						email: { enabled: true, frequency: "daily" },
						push: { enabled: true },
						sms: { enabled: false },
					},
					privacy: {
						profile: { visibility: "public" },
						activity: { showOnline: true },
						content: { allowComments: true },
					},
				},
				verification: {
					email: { verified: true, verifiedAt: "2023-01-01T00:00:00Z" },
					phone: { verified: false },
					identity: { verified: false },
				},
				subscription: {
					plan: "pro",
					status: "active",
					currentPeriodStart: "2023-01-01T00:00:00Z",
					currentPeriodEnd: "2023-12-31T23:59:59Z",
					cancelAtPeriodEnd: false,
				},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
				lastLoginAt: "2023-01-01T00:00:00Z",
			};
			const result = UserProfileSchema.safeParse(validProfile);
			expect(result.success).toBe(true);
		});

		it("should reject invalid email", () => {
			const invalidProfile = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				email: "invalid-email",
				username: "testuser",
				profile: {
					firstName: "John",
					lastName: "Doe",
				},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = UserProfileSchema.safeParse(invalidProfile);
			expect(result.success).toBe(false);
		});

		it("should reject invalid username", () => {
			const invalidProfile = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				email: "test@example.com",
				username: "a",
				profile: {
					firstName: "John",
					lastName: "Doe",
				},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = UserProfileSchema.safeParse(invalidProfile);
			expect(result.success).toBe(false);
		});

		it("should reject too many social links", () => {
			const socialLinks = new Array(11).fill(null).map((_, i) => ({
				platform: "website",
				url: `https://example${i}.com`,
				verified: false,
				primary: false,
			}));

			const invalidProfile = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				email: "test@example.com",
				username: "testuser",
				profile: {
					firstName: "John",
					lastName: "Doe",
					contact: {
						socialLinks,
					},
				},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = UserProfileSchema.safeParse(invalidProfile);
			expect(result.success).toBe(false);
		});
	});
});

describe("Survey Schemas", () => {
	describe("QuestionSchema", () => {
		it("should validate valid question", () => {
			const validQuestion = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d487",
				type: "select",
				title: "What is your favorite color?",
				description: "Please select one option",
				options: [
					{ id: "opt1", label: "Red", value: "red", order: 0 },
					{ id: "opt2", label: "Blue", value: "blue", order: 1 },
					{ id: "opt3", label: "Green", value: "green", order: 2 },
				],
				validation: {
					required: true,
				},
				logic: {
					conditions: [
						{
							field: "q0",
							operator: "equals",
							value: "yes",
						},
					],
					action: "show",
				},
				order: 1,
				section: "preferences",
			};
			const result = QuestionSchema.safeParse(validQuestion);
			expect(result.success).toBe(true);
		});

		it("should reject select question without options", () => {
			const invalidQuestion = {
				id: "q1",
				type: "select",
				title: "What is your favorite color?",
				order: 1,
			};
			const result = QuestionSchema.safeParse(invalidQuestion);
			expect(result.success).toBe(false);
		});

		it("should accept text question without options", () => {
			const validQuestion = {
				id: "q1",
				type: "text",
				title: "What is your name?",
				order: 1,
			};
			const result = QuestionSchema.safeParse(validQuestion);
			expect(result.success).toBe(true);
		});
	});

	describe("SurveySchema", () => {
		it("should validate valid survey", () => {
			const validSurvey = {
				id: "survey-1",
				title: "Customer Satisfaction Survey",
				description: "Help us improve our service",
				questions: [
					{
						id: "q1",
						type: "text",
						title: "What is your name?",
						order: 0,
					},
					{
						id: "q2",
						type: "select",
						title: "How satisfied are you?",
						options: [
							{ id: "opt1", label: "Very Satisfied", value: "5", order: 0 },
							{ id: "opt2", label: "Satisfied", value: "4", order: 1 },
						],
						order: 1,
					},
				],
				settings: {
					allowAnonymous: true,
					showProgressBar: true,
					thankYouMessage: "Thank you for your feedback!",
				},
				styling: {
					theme: "modern",
					primaryColor: "#007bff",
					backgroundColor: "#ffffff",
				},
				schedule: {
					startDate: "2023-01-01T00:00:00Z",
					endDate: "2023-12-31T23:59:59Z",
					timezone: "UTC",
				},
				status: "published",
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = SurveySchema.safeParse(validSurvey);
			expect(result.success).toBe(true);
		});

		it("should reject survey without questions", () => {
			const invalidSurvey = {
				id: "survey-1",
				title: "Empty Survey",
				questions: [],
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = SurveySchema.safeParse(invalidSurvey);
			expect(result.success).toBe(false);
		});
	});
});

describe("Form Schemas", () => {
	describe("FormFieldSchema", () => {
		it("should validate valid form field", () => {
			const validField = {
				id: "field-1",
				type: "email",
				name: "email",
				label: "Email Address",
				placeholder: "Enter your email",
				description: "We will never share your email",
				required: true,
				validation: {
					pattern: "^[^@]+@[^@]+\\.[^@]+$",
					message: "Please enter a valid email address",
				},
				conditional: {
					show: {
						field: "subscribe",
						operator: "equals",
						value: true,
					},
				},
				styling: {
					width: "full",
					alignment: "left",
					size: "medium",
					variant: "outlined",
				},
				order: 1,
				section: "contact",
			};
			const result = FormFieldSchema.safeParse(validField);
			expect(result.success).toBe(true);
		});

		it("should reject invalid field name", () => {
			const invalidField = {
				id: "field-1",
				type: "text",
				name: "123invalid",
				label: "Invalid Field",
				order: 1,
			};
			const result = FormFieldSchema.safeParse(invalidField);
			expect(result.success).toBe(false);
		});

		it("should reject field name with spaces", () => {
			const invalidField = {
				id: "field-1",
				type: "text",
				name: "field name",
				label: "Field with spaces",
				order: 1,
			};
			const result = FormFieldSchema.safeParse(invalidField);
			expect(result.success).toBe(false);
		});

		it("should accept valid field name patterns", () => {
			const validNames = ["field1", "field_1", "fieldName", "field_name_1"];

			validNames.forEach((name) => {
				const field = {
					id: "field-1",
					type: "text",
					name,
					label: "Valid Field",
					order: 1,
				};
				const result = FormFieldSchema.safeParse(field);
				expect(result.success).toBe(true);
			});
		});
	});

	describe("FormSchema", () => {
		it("should validate valid form", () => {
			const validForm = {
				id: "form-1",
				name: "contact-form",
				title: "Contact Form",
				description: "Get in touch with us",
				fields: [
					{
						id: "field-1",
						type: "text",
						name: "name",
						label: "Full Name",
						required: true,
						order: 0,
					},
					{
						id: "field-2",
						type: "email",
						name: "email",
						label: "Email Address",
						required: true,
						order: 1,
					},
				],
				settings: {
					multiPage: false,
					allowDrafts: true,
					validation: "onSubmit",
					submitText: "Send Message",
					successMessage: "Thank you for your message!",
				},
				styling: {
					theme: "modern",
					layout: "vertical",
					spacing: "normal",
					primaryColor: "#007bff",
				},
				security: {
					reCaptcha: true,
					rateLimit: {
						enabled: true,
						max: 5,
						window: 60,
					},
				},
				status: "published",
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = FormSchema.safeParse(validForm);
			expect(result.success).toBe(true);
		});

		it("should reject form without fields", () => {
			const invalidForm = {
				id: "form-1",
				name: "empty-form",
				title: "Empty Form",
				fields: [],
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = FormSchema.safeParse(invalidForm);
			expect(result.success).toBe(false);
		});
	});
});

describe("Utility Functions", () => {
	describe("validateNestedSchema", () => {
		it("should validate valid nested data", () => {
			const schema = UserProfileSchema;
			const validData = {
				id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				email: "test@example.com",
				username: "testuser",
				profile: {
					firstName: "John",
					lastName: "Doe",
				},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const result = validateNestedSchema(schema, validData);
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});

		it("should return errors for invalid nested data", () => {
			const schema = UserProfileSchema;
			const invalidData = {
				id: "invalid-uuid",
				email: "invalid-email",
				username: "a",
				profile: {
					firstName: "",
					lastName: "",
				},
				createdAt: "invalid-date",
				updatedAt: "invalid-date",
			};
			const result = validateNestedSchema(schema, invalidData, "user");
			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
		});
	});

	describe("validateConditionalField", () => {
		it("should show field when condition is met", () => {
			const field: FormField = {
				id: "field-1",
				type: "text",
				name: "dependent_field",
				label: "Dependent Field",
				required: false,
				hidden: false,
				conditional: {
					show: {
						field: "trigger_field",
						operator: "equals",
						value: "yes",
					},
				},
				order: 1,
			};
			const formData = {
				trigger_field: "yes",
			};
			const result = validateConditionalField(field, formData);
			expect(result.show).toBe(true);
		});

		it("should hide field when condition is not met", () => {
			const field: FormField = {
				id: "field-1",
				type: "text",
				name: "dependent_field",
				label: "Dependent Field",
				required: false,
				hidden: false,
				conditional: {
					show: {
						field: "trigger_field",
						operator: "equals",
						value: "yes",
					},
				},
				order: 1,
			};
			const formData = {
				trigger_field: "no",
			};
			const result = validateConditionalField(field, formData);
			expect(result.show).toBe(false);
		});

		it("should make field required when condition is met", () => {
			const field: FormField = {
				id: "field-1",
				type: "text",
				name: "dependent_field",
				label: "Dependent Field",
				required: false,
				hidden: false,
				conditional: {
					require: {
						field: "trigger_field",
						operator: "equals",
						value: "yes",
					},
				},
				order: 1,
			};
			const formData = {
				trigger_field: "yes",
			};
			const result = validateConditionalField(field, formData);
			expect(result.required).toBe(true);
		});

		it("should handle multiple conditions", () => {
			const field: FormField = {
				id: "field-1",
				type: "text",
				name: "dependent_field",
				label: "Dependent Field",
				required: false,
				hidden: false,
				conditional: {
					show: {
						field: "show_field",
						operator: "equals",
						value: "yes",
					},
					hide: {
						field: "hide_field",
						operator: "equals",
						value: "yes",
					},
					require: {
						field: "require_field",
						operator: "equals",
						value: "yes",
					},
				},
				order: 1,
			};
			const formData = {
				show_field: "yes",
				hide_field: "no",
				require_field: "yes",
			};
			const result = validateConditionalField(field, formData);
			expect(result.show).toBe(true);
			expect(result.required).toBe(true);
		});

		it("should handle different operators", () => {
			const testCases = [
				{
					operator: "equals",
					value: "test",
					targetValue: "test",
					expected: true,
				},
				{
					operator: "equals",
					value: "test",
					targetValue: "other",
					expected: false,
				},
				{
					operator: "not_equals",
					value: "test",
					targetValue: "other",
					expected: true,
				},
				{
					operator: "contains",
					value: "test string",
					targetValue: "test",
					expected: true,
				},
				{ operator: "greater", value: 10, targetValue: 5, expected: true },
				{ operator: "less", value: 5, targetValue: 10, expected: true },
				{
					operator: "is_empty",
					value: "",
					targetValue: undefined,
					expected: true,
				},
				{
					operator: "is_not_empty",
					value: "test",
					targetValue: undefined,
					expected: true,
				},
			];

			testCases.forEach(({ operator, value, targetValue, expected }) => {
				const field: FormField = {
					id: "field-1",
					type: "text",
					name: "dependent_field",
					label: "Dependent Field",
					required: false,
					hidden: false,
					conditional: {
						show: {
							field: "trigger_field",
							operator: operator as any,
							value: targetValue,
						},
					},
					order: 1,
				};
				const formData = {
					trigger_field: value,
				};
				const result = validateConditionalField(field, formData);
				expect(result.show).toBe(expected);
			});
		});
	});
});

describe("Type Inference", () => {
	it("should infer correct types", () => {
		const product: Product = {
			id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
			title: "Test Product",
			handle: "test-product",
			vendor: "Test Vendor",
			productType: "Test Type",
			status: "active",
			variants: [
				{
					id: "var-1",
					sku: "TEST-001",
					name: "Test Variant",
					price: 29.99,
					inventory: { quantity: 100, tracked: true, policy: "deny" },
					attributes: {},
					images: [],
				},
			],
			options: [],
			tags: [],
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
		};

		const userProfile: UserProfile = {
			id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
			email: "test@example.com",
			username: "testuser",
			profile: {
				firstName: "John",
				lastName: "Doe",
				contact: { socialLinks: [] },
			},
			preferences: {
				theme: "dark",
				language: "en",
				currency: "USD",
				timezone: "UTC",
				notifications: {
					email: { enabled: true, frequency: "immediate", types: {} },
					push: { enabled: true, browser: true, mobile: true, desktop: false },
					sms: { enabled: false, emergencyOnly: true },
				},
				privacy: {
					profile: {
						visibility: "public",
						indexable: true,
						showEmail: false,
						showPhone: false,
						showLocation: true,
					},
					activity: {
						showOnline: true,
						showLastSeen: true,
						showActivity: true,
					},
					content: {
						allowComments: true,
						allowSharing: true,
						allowTagging: true,
						moderateComments: false,
					},
				},
			},
			verification: {
				email: { verified: false },
				phone: { verified: false },
				identity: { verified: false },
			},
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
		};

		const survey: Survey = {
			id: "survey-1",
			title: "Test Survey",
			questions: [
				{
					id: "q1",
					type: "text",
					title: "Test Question",
					validation: { required: false },
					order: 0,
				},
			],
			settings: {
				allowAnonymous: true,
				allowMultipleResponses: false,
				requireLogin: false,
				showProgressBar: true,
				randomizeQuestions: false,
				autoSave: true,
				collectLocation: false,
				collectDevice: false,
			},
			status: "draft",
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
		};

		expect(product.title).toBeDefined();
		expect(userProfile.email).toBeDefined();
		expect(survey.title).toBeDefined();
	});
});
