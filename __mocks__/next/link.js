const React = require("react");

module.exports = {
	__esModule: true,
	default: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children),
};
