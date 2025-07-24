// DOM matchers for testing

export const domMatchers = {
	toHaveClass: (received: any, expected: string) => {
		const pass = received.classList.contains(expected);

		return {
			pass,
			message: () => `Expected element to have class "${expected}"`,
		};
	},

	toHaveAttribute: (received: any, attributeName: string, expected?: string) => {
		const attributeValue = received.getAttribute(attributeName);
		const pass = expected ? attributeValue === expected : attributeValue !== null;

		return {
			pass,
			message: () =>
				`Expected element to have attribute "${attributeName}"${expected ? ` with value "${expected}"` : ""}`,
		};
	},
};
