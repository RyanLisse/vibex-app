const React = require("react");

// Create a proxy that returns mock components for any icon
const handler = {
	get(target, prop) {
		if (typeof prop === "string" && prop[0] === prop[0].toUpperCase()) {
			return ({ className, ...props }) =>
				React.createElement("svg", {
					className,
					"data-testid": `${prop.toLowerCase()}-icon`,
					...props,
				});
		}
		return undefined;
	},
};

module.exports = new Proxy({}, handler);
