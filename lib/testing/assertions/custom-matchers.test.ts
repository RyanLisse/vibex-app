import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock custom matcher implementations
interface CustomMatchers {
	toBeWithinRange(
		received: number,
		min: number,
		max: number,
	): { pass: boolean; message: () => string };
	toHaveValidEmail(received: string): { pass: boolean; message: () => string };
	toBeValidUrl(received: string): { pass: boolean; message: () => string };
	toHaveProperty(
		received: object,
		property: string,
		value?: any,
	): { pass: boolean; message: () => string };
	toBeArrayOfType(
		received: any[],
		type: string,
	): { pass: boolean; message: () => string };
	toMatchSchema(
		received: object,
		schema: object,
	): { pass: boolean; message: () => string };
	toBeValidDate(received: any): { pass: boolean; message: () => string };
	toHaveLength(
		received: any[],
		expectedLength: number,
	): { pass: boolean; message: () => string };
	toContainObject(
		received: object[],
		expectedObject: object,
	): { pass: boolean; message: () => string };
	toBeValidJSON(received: string): { pass: boolean; message: () => string };
}

// Mock implementations of custom matchers
const customMatchers: CustomMatchers = {
	toBeWithinRange(received: number, min: number, max: number) {
		const pass = received >= min && received <= max;
		return {
			pass,
			message: () => `Expected ${received} to be within range ${min}-${max}`,
		};
	},

	toHaveValidEmail(received: string) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const pass = emailRegex.test(received);
		return {
			pass,
			message: () => `Expected "${received}" to be a valid email address`,
		};
	},

	toBeValidUrl(received: string) {
		try {
			new URL(received);
			return {
				pass: true,
				message: () => `Expected "${received}" not to be a valid URL`,
			};
		} catch {
			return {
				pass: false,
				message: () => `Expected "${received}" to be a valid URL`,
			};
		}
	},

	toHaveProperty(received: object, property: string, value?: any) {
		const hasProperty = Object.hasOwn(received, property);
		const pass =
			value !== undefined
				? hasProperty && (received as any)[property] === value
				: hasProperty;

		return {
			pass,
			message: () =>
				value !== undefined
					? `Expected object to have property "${property}" with value ${value}`
					: `Expected object to have property "${property}"`,
		};
	},

	toBeArrayOfType(received: any[], type: string) {
		const pass =
			Array.isArray(received) && received.every((item) => typeof item === type);
		return {
			pass,
			message: () => `Expected array to contain only ${type} values`,
		};
	},

	toMatchSchema(received: object, schema: object) {
		// Simplified schema validation - check if all required keys exist
		const schemaKeys = Object.keys(schema);
		const receivedKeys = Object.keys(received);
		const pass = schemaKeys.every((key) => receivedKeys.includes(key));

		return {
			pass,
			message: () => `Expected object to match schema structure`,
		};
	},

	toBeValidDate(received: any) {
		const pass = received instanceof Date && !isNaN(received.getTime());
		return {
			pass,
			message: () => `Expected ${received} to be a valid Date object`,
		};
	},

	toHaveLength(received: any[], expectedLength: number) {
		const pass = Array.isArray(received) && received.length === expectedLength;
		return {
			pass,
			message: () =>
				`Expected array to have length ${expectedLength}, but got ${received.length}`,
		};
	},

	toContainObject(received: object[], expectedObject: object) {
		const pass = received.some(
			(item) => JSON.stringify(item) === JSON.stringify(expectedObject),
		);
		return {
			pass,
			message: () =>
				`Expected array to contain object ${JSON.stringify(expectedObject)}`,
		};
	},

	toBeValidJSON(received: string) {
		try {
			JSON.parse(received);
			return {
				pass: true,
				message: () => `Expected "${received}" not to be valid JSON`,
			};
		} catch {
			return {
				pass: false,
				message: () => `Expected "${received}" to be valid JSON`,
			};
		}
	},
};

// Mock the extend functionality
const mockExtend = vi.fn();

describe("Custom Matchers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("toBeWithinRange", () => {
		it("should pass when number is within range", () => {
			const result = customMatchers.toBeWithinRange(5, 1, 10);
			expect(result.pass).toBe(true);
		});

		it("should fail when number is outside range", () => {
			const result = customMatchers.toBeWithinRange(15, 1, 10);
			expect(result.pass).toBe(false);
		});

		it("should include range boundaries", () => {
			const result1 = customMatchers.toBeWithinRange(1, 1, 10);
			const result2 = customMatchers.toBeWithinRange(10, 1, 10);

			expect(result1.pass).toBe(true);
			expect(result2.pass).toBe(true);
		});
	});

	describe("toHaveValidEmail", () => {
		it("should pass for valid email addresses", () => {
			const validEmails = [
				"test@example.com",
				"user.name@domain.co.uk",
				"admin+tag@company.org",
			];

			validEmails.forEach((email) => {
				const result = customMatchers.toHaveValidEmail(email);
				expect(result.pass).toBe(true);
			});
		});

		it("should fail for invalid email addresses", () => {
			const invalidEmails = [
				"invalid.email",
				"@domain.com",
				"user@",
				"user name@domain.com",
			];

			invalidEmails.forEach((email) => {
				const result = customMatchers.toHaveValidEmail(email);
				expect(result.pass).toBe(false);
			});
		});
	});

	describe("toBeValidUrl", () => {
		it("should pass for valid URLs", () => {
			const validUrls = [
				"https://example.com",
				"http://localhost:3000",
				"ftp://files.example.com",
			];

			validUrls.forEach((url) => {
				const result = customMatchers.toBeValidUrl(url);
				expect(result.pass).toBe(true);
			});
		});

		it("should fail for invalid URLs", () => {
			const invalidUrls = ["not-a-url", "http://", "://missing-protocol"];

			invalidUrls.forEach((url) => {
				const result = customMatchers.toBeValidUrl(url);
				expect(result.pass).toBe(false);
			});
		});
	});

	describe("toHaveProperty", () => {
		const testObject = { name: "test", value: 42, active: true };

		it("should pass when object has the property", () => {
			const result = customMatchers.toHaveProperty(testObject, "name");
			expect(result.pass).toBe(true);
		});

		it("should fail when object doesn't have the property", () => {
			const result = customMatchers.toHaveProperty(testObject, "missing");
			expect(result.pass).toBe(false);
		});

		it("should check property value when provided", () => {
			const result1 = customMatchers.toHaveProperty(testObject, "value", 42);
			const result2 = customMatchers.toHaveProperty(testObject, "value", 99);

			expect(result1.pass).toBe(true);
			expect(result2.pass).toBe(false);
		});
	});

	describe("toBeArrayOfType", () => {
		it("should pass for array of correct type", () => {
			const numbers = [1, 2, 3, 4, 5];
			const strings = ["a", "b", "c"];

			expect(customMatchers.toBeArrayOfType(numbers, "number").pass).toBe(true);
			expect(customMatchers.toBeArrayOfType(strings, "string").pass).toBe(true);
		});

		it("should fail for mixed type arrays", () => {
			const mixed = [1, "2", 3, "4"];

			expect(customMatchers.toBeArrayOfType(mixed, "number").pass).toBe(false);
			expect(customMatchers.toBeArrayOfType(mixed, "string").pass).toBe(false);
		});

		it("should pass for empty arrays", () => {
			const empty: any[] = [];

			expect(customMatchers.toBeArrayOfType(empty, "string").pass).toBe(true);
		});
	});

	describe("toMatchSchema", () => {
		it("should pass when object matches schema", () => {
			const object = { id: 1, name: "test", active: true };
			const schema = { id: "number", name: "string", active: "boolean" };

			const result = customMatchers.toMatchSchema(object, schema);
			expect(result.pass).toBe(true);
		});

		it("should fail when object is missing required properties", () => {
			const object = { id: 1, name: "test" };
			const schema = { id: "number", name: "string", active: "boolean" };

			const result = customMatchers.toMatchSchema(object, schema);
			expect(result.pass).toBe(false);
		});
	});

	describe("toBeValidDate", () => {
		it("should pass for valid Date objects", () => {
			const validDates = [
				new Date(),
				new Date("2023-01-01"),
				new Date(2023, 0, 1),
			];

			validDates.forEach((date) => {
				const result = customMatchers.toBeValidDate(date);
				expect(result.pass).toBe(true);
			});
		});

		it("should fail for invalid dates", () => {
			const invalidDates = [new Date("invalid"), "2023-01-01", null, undefined];

			invalidDates.forEach((date) => {
				const result = customMatchers.toBeValidDate(date);
				expect(result.pass).toBe(false);
			});
		});
	});

	describe("toHaveLength", () => {
		it("should pass when array has expected length", () => {
			const array = [1, 2, 3, 4, 5];

			const result = customMatchers.toHaveLength(array, 5);
			expect(result.pass).toBe(true);
		});

		it("should fail when array has different length", () => {
			const array = [1, 2, 3];

			const result = customMatchers.toHaveLength(array, 5);
			expect(result.pass).toBe(false);
		});
	});

	describe("toContainObject", () => {
		it("should pass when array contains the object", () => {
			const array = [
				{ id: 1, name: "first" },
				{ id: 2, name: "second" },
				{ id: 3, name: "third" },
			];
			const searchObject = { id: 2, name: "second" };

			const result = customMatchers.toContainObject(array, searchObject);
			expect(result.pass).toBe(true);
		});

		it("should fail when array doesn't contain the object", () => {
			const array = [
				{ id: 1, name: "first" },
				{ id: 3, name: "third" },
			];
			const searchObject = { id: 2, name: "second" };

			const result = customMatchers.toContainObject(array, searchObject);
			expect(result.pass).toBe(false);
		});
	});

	describe("toBeValidJSON", () => {
		it("should pass for valid JSON strings", () => {
			const validJson = [
				'{"name": "test"}',
				"[1, 2, 3]",
				'"string"',
				"42",
				"true",
			];

			validJson.forEach((json) => {
				const result = customMatchers.toBeValidJSON(json);
				expect(result.pass).toBe(true);
			});
		});

		it("should fail for invalid JSON strings", () => {
			const invalidJson = [
				"{name: 'test'}",
				"[1, 2, 3,]",
				"undefined",
				"{broken json",
			];

			invalidJson.forEach((json) => {
				const result = customMatchers.toBeValidJSON(json);
				expect(result.pass).toBe(false);
			});
		});
	});

	describe("Matcher Integration", () => {
		it("should provide meaningful error messages", () => {
			const result = customMatchers.toBeWithinRange(15, 1, 10);

			expect(result.message()).toContain("Expected 15 to be within range 1-10");
		});

		it("should handle edge cases gracefully", () => {
			// Test with null/undefined values
			expect(() => customMatchers.toHaveProperty({}, "test")).not.toThrow();
			expect(() => customMatchers.toBeArrayOfType([], "string")).not.toThrow();
		});
	});
});
