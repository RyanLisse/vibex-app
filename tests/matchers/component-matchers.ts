// Component matchers for testing

export const componentMatchers = {
	toHaveProps: (received: any, expected: Record<string, any>) => {
		const pass = Object.keys(expected).every((key) => received.props[key] === expected[key]);

		return {
			pass,
			message: () => `Expected component to have props ${JSON.stringify(expected)}`,
		};
	},

	toHaveState: (received: any, expected: Record<string, any>) => {
		const pass = Object.keys(expected).every((key) => received.state[key] === expected[key]);

		return {
			pass,
			message: () => `Expected component to have state ${JSON.stringify(expected)}`,
		};
	},
};
