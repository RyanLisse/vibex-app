#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const filePath = join(process.cwd(), "app/globals.css");
let content = readFileSync(filePath, "utf-8");

// Replace @theme blocks with :root and proper CSS variable syntax
content = content.replace(/@theme\s*{([^}]+)}/g, (match, vars) => {
	// Convert --color-* to --* and oklch colors to hsl format approximations
	const converted = vars
		.replace(/--color-/g, "--")
		.replace(/oklch\(1 0 0\)/g, "hsl(0 0% 100%)")
		.replace(/oklch\(0\.145 0 0\)/g, "hsl(0 0% 14.5%)")
		.replace(/oklch\(0\.205 0 0\)/g, "hsl(0 0% 20.5%)")
		.replace(/oklch\(0\.985 0 0\)/g, "hsl(0 0% 98.5%)")
		.replace(/oklch\(0\.97 0 0\)/g, "hsl(0 0% 97%)")
		.replace(/oklch\(0\.556 0 0\)/g, "hsl(0 0% 55.6%)")
		.replace(/oklch\(0\.577 0\.245 27\.325\)/g, "hsl(0 84.2% 60.2%)")
		.replace(/oklch\(0\.922 0 0\)/g, "hsl(0 0% 92.2%)")
		.replace(/oklch\(0\.708 0 0\)/g, "hsl(0 0% 70.8%)")
		.replace(/oklch\(0\.269 0 0\)/g, "hsl(0 0% 26.9%)")
		.replace(/oklch\(0\.704 0\.191 22\.216\)/g, "hsl(0 62.8% 50.6%)")
		.replace(/oklch\(1 0 0 \/ 10%\)/g, "hsl(0 0% 100% / 10%)")
		.replace(/oklch\(1 0 0 \/ 15%\)/g, "hsl(0 0% 100% / 15%)")
		// Chart colors - approximate conversions
		.replace(/oklch\(0\.646 0\.222 41\.116\)/g, "hsl(24.6 79.8% 58.5%)")
		.replace(/oklch\(0\.6 0\.118 184\.704\)/g, "hsl(184.7 100% 60%)")
		.replace(/oklch\(0\.398 0\.07 227\.392\)/g, "hsl(227.4 100% 39.8%)")
		.replace(/oklch\(0\.828 0\.189 84\.429\)/g, "hsl(84.4 73% 82.8%)")
		.replace(/oklch\(0\.769 0\.188 70\.08\)/g, "hsl(70.1 73% 76.9%)")
		.replace(/oklch\(0\.488 0\.243 264\.376\)/g, "hsl(264.4 60.7% 50.5%)")
		.replace(/oklch\(0\.696 0\.17 162\.48\)/g, "hsl(162.5 68.8% 59.2%)")
		.replace(/oklch\(0\.627 0\.265 303\.9\)/g, "hsl(303.9 69.1% 52.8%)")
		.replace(/oklch\(0\.645 0\.246 16\.439\)/g, "hsl(16.4 79.8% 60.2%)");
	return ":root {" + converted + "}";
});

// Handle media query dark mode
content = content.replace(
	/@media \(prefers-color-scheme: dark\)\s*{\s*@theme\s*{([^}]+)}\s*}/g,
	(match, vars) => {
		const converted = vars
			.replace(/--color-/g, "--")
			.replace(/oklch\(1 0 0\)/g, "hsl(0 0% 100%)")
			.replace(/oklch\(0\.145 0 0\)/g, "hsl(0 0% 14.5%)")
			.replace(/oklch\(0\.205 0 0\)/g, "hsl(0 0% 20.5%)")
			.replace(/oklch\(0\.985 0 0\)/g, "hsl(0 0% 98.5%)")
			.replace(/oklch\(0\.97 0 0\)/g, "hsl(0 0% 97%)")
			.replace(/oklch\(0\.556 0 0\)/g, "hsl(0 0% 55.6%)")
			.replace(/oklch\(0\.577 0\.245 27\.325\)/g, "hsl(0 84.2% 60.2%)")
			.replace(/oklch\(0\.922 0 0\)/g, "hsl(0 0% 92.2%)")
			.replace(/oklch\(0\.708 0 0\)/g, "hsl(0 0% 70.8%)")
			.replace(/oklch\(0\.269 0 0\)/g, "hsl(0 0% 26.9%)")
			.replace(/oklch\(0\.704 0\.191 22\.216\)/g, "hsl(0 62.8% 50.6%)")
			.replace(/oklch\(1 0 0 \/ 10%\)/g, "hsl(0 0% 100% / 10%)")
			.replace(/oklch\(1 0 0 \/ 15%\)/g, "hsl(0 0% 100% / 15%)")
			// Chart colors - approximate conversions
			.replace(/oklch\(0\.646 0\.222 41\.116\)/g, "hsl(24.6 79.8% 58.5%)")
			.replace(/oklch\(0\.6 0\.118 184\.704\)/g, "hsl(184.7 100% 60%)")
			.replace(/oklch\(0\.398 0\.07 227\.392\)/g, "hsl(227.4 100% 39.8%)")
			.replace(/oklch\(0\.828 0\.189 84\.429\)/g, "hsl(84.4 73% 82.8%)")
			.replace(/oklch\(0\.769 0\.188 70\.08\)/g, "hsl(70.1 73% 76.9%)")
			.replace(/oklch\(0\.488 0\.243 264\.376\)/g, "hsl(264.4 60.7% 50.5%)")
			.replace(/oklch\(0\.696 0\.17 162\.48\)/g, "hsl(162.5 68.8% 59.2%)")
			.replace(/oklch\(0\.627 0\.265 303\.9\)/g, "hsl(303.9 69.1% 52.8%)")
			.replace(/oklch\(0\.645 0\.246 16\.439\)/g, "hsl(16.4 79.8% 60.2%)");
		return (
			"@media (prefers-color-scheme: dark) {\n  :root {" + converted + "  }\n}"
		);
	},
);

// Handle .dark class
content = content.replace(
	/\.dark\s*{\s*@theme\s*{([^}]+)}\s*}/g,
	(match, vars) => {
		const converted = vars
			.replace(/--color-/g, "--")
			.replace(/oklch\(1 0 0\)/g, "hsl(0 0% 100%)")
			.replace(/oklch\(0\.145 0 0\)/g, "hsl(0 0% 14.5%)")
			.replace(/oklch\(0\.205 0 0\)/g, "hsl(0 0% 20.5%)")
			.replace(/oklch\(0\.985 0 0\)/g, "hsl(0 0% 98.5%)")
			.replace(/oklch\(0\.97 0 0\)/g, "hsl(0 0% 97%)")
			.replace(/oklch\(0\.556 0 0\)/g, "hsl(0 0% 55.6%)")
			.replace(/oklch\(0\.577 0\.245 27\.325\)/g, "hsl(0 84.2% 60.2%)")
			.replace(/oklch\(0\.922 0 0\)/g, "hsl(0 0% 92.2%)")
			.replace(/oklch\(0\.708 0 0\)/g, "hsl(0 0% 70.8%)")
			.replace(/oklch\(0\.269 0 0\)/g, "hsl(0 0% 26.9%)")
			.replace(/oklch\(0\.704 0\.191 22\.216\)/g, "hsl(0 62.8% 50.6%)")
			.replace(/oklch\(1 0 0 \/ 10%\)/g, "hsl(0 0% 100% / 10%)")
			.replace(/oklch\(1 0 0 \/ 15%\)/g, "hsl(0 0% 100% / 15%)")
			// Chart colors - approximate conversions
			.replace(/oklch\(0\.646 0\.222 41\.116\)/g, "hsl(24.6 79.8% 58.5%)")
			.replace(/oklch\(0\.6 0\.118 184\.704\)/g, "hsl(184.7 100% 60%)")
			.replace(/oklch\(0\.398 0\.07 227\.392\)/g, "hsl(227.4 100% 39.8%)")
			.replace(/oklch\(0\.828 0\.189 84\.429\)/g, "hsl(84.4 73% 82.8%)")
			.replace(/oklch\(0\.769 0\.188 70\.08\)/g, "hsl(70.1 73% 76.9%)")
			.replace(/oklch\(0\.488 0\.243 264\.376\)/g, "hsl(264.4 60.7% 50.5%)")
			.replace(/oklch\(0\.696 0\.17 162\.48\)/g, "hsl(162.5 68.8% 59.2%)")
			.replace(/oklch\(0\.627 0\.265 303\.9\)/g, "hsl(303.9 69.1% 52.8%)")
			.replace(/oklch\(0\.645 0\.246 16\.439\)/g, "hsl(16.4 79.8% 60.2%)");
		return ".dark {" + converted + "}";
	},
);

writeFileSync(filePath, content);
console.log("✅ Fixed Tailwind CSS v4 syntax to v3");
