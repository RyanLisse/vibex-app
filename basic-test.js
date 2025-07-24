function assertEqual(actual, expected, message) {
	if (actual !== expected) {
		throw new Error(`${message}: Expected ${expected}, got ${actual}`);
	}
}

assertEqual(2 + 2, 4, "Basic math test");

const obj = { name: "test", value: 42 };
assertEqual(obj.name, "test", "Object property test");

async function asyncTest() {
	const result = await Promise.resolve("async-test");
	assertEqual(result, "async-test", "Basic async test");
}

asyncTest()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		process.exit(1);
	});
