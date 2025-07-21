import { describe, expect, it } from "vitest";

describe("Simple Unit Tests", () => {
	it("should perform basic arithmetic operations", () => {
		expect(2 + 2).toBe(4);
		expect(10 - 5).toBe(5);
		expect(3 * 4).toBe(12);
		expect(8 / 2).toBe(4);
	});

	it("should handle string operations", () => {
		const str1 = "Hello";
		const str2 = "World";
		expect(str1 + " " + str2).toBe("Hello World");
		expect(str1.length).toBe(5);
		expect(str2.toLowerCase()).toBe("world");
	});

	it("should handle array operations", () => {
		const arr = [1, 2, 3, 4, 5];
		expect(arr.length).toBe(5);
		expect(arr[0]).toBe(1);
		expect(arr.includes(3)).toBe(true);
		expect(arr.includes(6)).toBe(false);
	});

	it("should handle object operations", () => {
		const obj = { name: "test", value: 42 };
		expect(obj.name).toBe("test");
		expect(obj.value).toBe(42);
		expect(Object.keys(obj)).toEqual(["name", "value"]);
	});

	it("should handle promises", async () => {
		const promise = Promise.resolve("success");
		const result = await promise;
		expect(result).toBe("success");
	});

	it("should handle error throwing", () => {
		expect(() => {
			throw new Error("Test error");
		}).toThrow("Test error");
	});
});
