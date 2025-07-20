// Mock matchers for testing

export const mockMatchers = {
	toHaveBeenCalledWith: (received: any, ...expected: any[]) => {
		const pass = received.mock.calls.some(
			(call: any[]) =>
				call.length === expected.length &&
				call.every((arg, index) => arg === expected[index]),
		);

		return {
			pass,
			message: () =>
				`Expected mock function to have been called with ${JSON.stringify(expected)}`,
		};
	},

	toHaveBeenCalledTimes: (received: any, expected: number) => {
		const pass = received.mock.calls.length === expected;

		return {
			pass,
			message: () =>
				`Expected mock function to have been called ${expected} times, but was called ${received.mock.calls.length} times`,
		};
	},
};
