	afterEach,
	beforeEach,
	describe,
	import { expect,
	import { it,
	import { mock,
	import { spyOn,
	import { test,
} from "bun:test";
	type ExampleFilter,
	type ExampleFormData,
	type ExampleItem,
	import { exampleFilterSchema,
	import { exampleFormSchema,
	import { exampleItemSchema,
} from "./schemas";

describe("exampleItemSchema", () => {
	const validItem = {
		id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		title: "Test Item",
		description: "Test description",
		status: "pending" as const,
		priority: "medium" as const,
		createdAt: new Date("2023-01-01"),
		updatedAt: new Date("2023-01-02"),
	};

	it("should validate a valid item", () => {
		const result = exampleItemSchema.safeParse(validItem);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validItem);
		}
	});

	it("should reject invalid UUID", () => {
		const invalidItem = { ...validItem, id: "invalid-uuid" };
		const result = exampleItemSchema.safeParse(invalidItem);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("Invalid uuid");
		}
	});

	it("should reject empty title", () => {
		const invalidItem = { ...validItem, title: "" };
		const result = exampleItemSchema.safeParse(invalidItem);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("Title is required");
		}
	});

	it("should reject title that is too long", () => {
		const invalidItem = { ...validItem, title: "a".repeat(101) };
		const result = exampleItemSchema.safeParse(invalidItem);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("Title is too long");
		}
	});

	it("should reject description that is too long", () => {
		const invalidItem = { ...validItem, description: "a".repeat(501) };
		const result = exampleItemSchema.safeParse(invalidItem);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("Description is too long");
		}
	});

	it("should accept undefined description", () => {
		const { description, ...itemWithoutDescription } = validItem;
		const result = exampleItemSchema.safeParse(itemWithoutDescription);
		expect(result.success).toBe(true);
	});

	it("should reject invalid status", () => {
		const invalidItem = { ...validItem, status: "invalid" };
		const result = exampleItemSchema.safeParse(invalidItem);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("Invalid enum value");
		}
	});

	it("should reject invalid priority", () => {
		const invalidItem = { ...validItem, priority: "invalid" };
		const result = exampleItemSchema.safeParse(invalidItem);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("Invalid enum value");
		}
	});

	it("should validate all valid status values", () => {
		const statuses = ["pending", "in_progress", "completed"] as const;
		statuses.forEach((status) => {
			const item = { ...validItem, status };
			const result = exampleItemSchema.safeParse(item);
			expect(result.success).toBe(true);
		});
	});

	it("should validate all valid priority values", () => {
		const priorities = ["low", "medium", "high"] as const;
		priorities.forEach((priority) => {
			const item = { ...validItem, priority };
			const result = exampleItemSchema.safeParse(item);
			expect(result.success).toBe(true);
		});
	});
});

describe("exampleFormSchema", () => {
	const validForm = {
		title: "Test Form",
		description: "Test description",
		priority: "medium" as const,
	};

	it("should validate a valid form", () => {
		const result = exampleFormSchema.safeParse(validForm);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validForm);
		}
	});

	it("should use default priority when not provided", () => {
		const { priority, ...formWithoutPriority } = validForm;
		const result = exampleFormSchema.safeParse(formWithoutPriority);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.priority).toBe("medium");
		}
	});

	it("should reject empty title", () => {
		const invalidForm = { ...validForm, title: "" };
		const result = exampleFormSchema.safeParse(invalidForm);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("Title is required");
		}
	});

	it("should accept undefined description", () => {
		const { description, ...formWithoutDescription } = validForm;
		const result = exampleFormSchema.safeParse(formWithoutDescription);
		expect(result.success).toBe(true);
	});

	it("should reject description that is too long", () => {
		const invalidForm = { ...validForm, description: "a".repeat(501) };
		const result = exampleFormSchema.safeParse(invalidForm);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("Description is too long");
		}
	});
});

describe("exampleFilterSchema", () => {
	it("should validate empty filter", () => {
		const result = exampleFilterSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({});
		}
	});

	it("should validate filter with all fields", () => {
		const filter = {
			status: "pending" as const,
			priority: "high" as const,
			searchTerm: "test search",
		};
		const result = exampleFilterSchema.safeParse(filter);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(filter);
		}
	});

	it("should validate filter with only status", () => {
		const filter = { status: "completed" as const };
		const result = exampleFilterSchema.safeParse(filter);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(filter);
		}
	});

	it("should validate filter with only priority", () => {
		const filter = { priority: "low" as const };
		const result = exampleFilterSchema.safeParse(filter);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(filter);
		}
	});

	it("should validate filter with only search term", () => {
		const filter = { searchTerm: "search query" };
		const result = exampleFilterSchema.safeParse(filter);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(filter);
		}
	});

	it("should reject invalid status", () => {
		const invalidFilter = { status: "invalid" };
		const result = exampleFilterSchema.safeParse(invalidFilter);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("Invalid enum value");
		}
	});

	it("should reject invalid priority", () => {
		const invalidFilter = { priority: "invalid" };
		const result = exampleFilterSchema.safeParse(invalidFilter);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("Invalid enum value");
		}
	});

	it("should accept empty search term", () => {
		const filter = { searchTerm: "" };
		const result = exampleFilterSchema.safeParse(filter);
		expect(result.success).toBe(true);
	});
});

describe("Type inference", () => {
	it("should infer correct types", () => {
		// Type-only test to ensure TypeScript inference works
		const item: ExampleItem = {
			id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
			title: "Test",
			status: "pending",
			priority: "medium",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const formData: ExampleFormData = {
			title: "Test",
			priority: "medium",
		};

		const filter: ExampleFilter = {
			status: "pending",
			priority: "high",
			searchTerm: "test",
		};

		expect(item.id).toBeDefined();
		expect(formData.title).toBeDefined();
		expect(filter.status).toBeDefined();
	});
});
