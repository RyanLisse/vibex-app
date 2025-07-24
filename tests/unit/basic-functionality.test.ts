import { describe, expect, it, vi } from "vitest";

describe("Basic Functionality", () => {
	it("should test basic JavaScript functionality", () => {
		// Test basic data types
		expect(typeof "string").toBe("string");
		expect(typeof 42).toBe("number");
		expect(typeof true).toBe("boolean");
		expect(typeof {}).toBe("object");
		expect(Array.isArray([])).toBe(true);
	});

	it("should test function creation and execution", () => {
		const add = (a: number, b: number) => a + b;
		const multiply = (a: number, b: number) => a * b;

		expect(add(2, 3)).toBe(5);
		expect(multiply(4, 5)).toBe(20);
		expect(typeof add).toBe("function");
		expect(typeof multiply).toBe("function");
	});

	it("should test async/await functionality", async () => {
		const asyncFunction = async (delay = 10) => {
			await new Promise((resolve) => setTimeout(resolve, delay));
			return "async result";
		};

		const result = await asyncFunction();
		expect(result).toBe("async result");
	});

	it("should test Promise functionality", async () => {
		const promise = new Promise((resolve) => {
			setTimeout(() => resolve("promise resolved"), 10);
		});

		const result = await promise;
		expect(result).toBe("promise resolved");
	});

	it("should test error handling", () => {
		const throwError = () => {
			throw new Error("Test error");
		};

		expect(() => throwError()).toThrow("Test error");
		expect(() => throwError()).toThrow(Error);
	});

	it("should test array methods", () => {
		const numbers = [1, 2, 3, 4, 5];

		expect(numbers.map((n) => n * 2)).toEqual([2, 4, 6, 8, 10]);
		expect(numbers.filter((n) => n > 3)).toEqual([4, 5]);
		expect(numbers.reduce((sum, n) => sum + n, 0)).toBe(15);
		expect(numbers.find((n) => n > 3)).toBe(4);
		expect(numbers.some((n) => n > 4)).toBe(true);
		expect(numbers.every((n) => n > 0)).toBe(true);
	});

	it("should test object operations", () => {
		const obj = { a: 1, b: 2, c: 3 };
		const keys = Object.keys(obj);
		const values = Object.values(obj);
		const entries = Object.entries(obj);

		expect(keys).toEqual(["a", "b", "c"]);
		expect(values).toEqual([1, 2, 3]);
		expect(entries).toEqual([
			["a", 1],
			["b", 2],
			["c", 3],
		]);

		const newObj = { ...obj, d: 4 };
		expect(newObj).toEqual({ a: 1, b: 2, c: 3, d: 4 });
	});

	it("should test class functionality", () => {
		class TestClass {
			constructor(public value: number) {}

			getValue() {
				return this.value;
			}

			setValue(newValue: number) {
				this.value = newValue;
			}
		}

		const instance = new TestClass(42);
		expect(instance.getValue()).toBe(42);

		instance.setValue(100);
		expect(instance.getValue()).toBe(100);
		expect(instance instanceof TestClass).toBe(true);
	});

	it("should test mock functions", () => {
		const mockFn = vi.fn();
		const mockFnWithReturn = vi.fn(() => "mocked");

		mockFn("test");
		expect(mockFn).toHaveBeenCalledWith("test");
		expect(mockFn).toHaveBeenCalledTimes(1);

		expect(mockFnWithReturn()).toBe("mocked");
		expect(mockFnWithReturn).toHaveBeenCalledTimes(1);
	});

	it("should test date functionality", () => {
		const now = new Date();
		const specificDate = new Date("2024-01-01");

		expect(now instanceof Date).toBe(true);
		expect(specificDate.getFullYear()).toBe(2024);
		expect(specificDate.getMonth()).toBe(0); // January is 0
		expect(specificDate.getDate()).toBe(1);
	});
});
