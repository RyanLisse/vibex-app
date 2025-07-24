describe("Emergency Jest Test", () => {
	test("basic math", () => {
		expect(2 + 2).toBe(4);
	});

	test("basic object", () => {
		const obj = { name: "test", value: 42 };
		expect(obj.name).toBe("test");
		expect(obj.value).toBe(42);
	});

	test("basic async", async () => {
		const result = await Promise.resolve("test");
		expect(result).toBe("test");
	});
});
