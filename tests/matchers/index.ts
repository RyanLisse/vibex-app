// Custom Test Matchers Index
// Enhanced assertion capabilities for comprehensive testing

export * from "./accessibility-matchers";
export * from "./api-matchers";
export * from "./async-matchers";
export * from "./component-matchers";
export * from "./dom-matchers";
export * from "./mock-matchers";
export * from "./performance-matchers";

// Setup function to register all custom matchers
export const setupCustomMatchers = () => {
	// Import and register all matcher modules
	require("./dom-matchers");
	require("./async-matchers");
	require("./mock-matchers");
	require("./component-matchers");
	require("./api-matchers");
	require("./performance-matchers");
	require("./accessibility-matchers");
};
