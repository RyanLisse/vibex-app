// API matchers for testing

export const apiMatchers = {
	toHaveStatus: (received: any, expected: number) => {
		const pass = received.status === expected;

		return {
			pass,
			message: () => `Expected API response to have status ${expected}, got ${received.status}`,
		};
	},

	toHaveHeader: (received: any, headerName: string, expected?: string) => {
		const headerValue = received.headers.get
			? received.headers.get(headerName)
			: received.headers[headerName];
		const pass = expected ? headerValue === expected : headerValue !== null;

		return {
			pass,
			message: () =>
				`Expected API response to have header "${headerName}"${expected ? ` with value "${expected}"` : ""}`,
		};
	},
};
