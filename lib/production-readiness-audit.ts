/**
 * Production Readiness Audit Tool
 *
 * Scans codebase for production-breaking stubs, TODOs, and placeholders
 * that could cause runtime errors or poor user experience.
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import path from "path";

interface ProductionIssue {
	file: string;
	line: number;
	type: "critical" | "high" | "medium" | "low";
	category: "stub" | "todo" | "placeholder" | "unimplemented" | "test-stub";
	description: string;
	code: string;
	recommendation: string;
}

/**
 * Critical patterns that will cause production failures
 */
const CRITICAL_PATTERNS = [
	{
		pattern: /throw new Error.*not.*implement/gi,
		type: "critical" as const,
		category: "unimplemented" as const,
		description: "Unimplemented function that throws error",
		recommendation: "Implement the function or provide graceful fallback",
	},
	{
		pattern: /return null.*TODO|return undefined.*TODO/gi,
		type: "critical" as const,
		category: "stub" as const,
		description: "Function returns null/undefined with TODO",
		recommendation: "Implement proper return value or error handling",
	},
	{
		pattern: /console\.error.*not.*implement/gi,
		type: "high" as const,
		category: "unimplemented" as const,
		description: "Console error for unimplemented feature",
		recommendation: "Implement feature or remove from production build",
	},
];

/**
 * High-risk patterns that affect user experience
 */
const HIGH_RISK_PATTERNS = [
	{
		pattern: /coming soon\.\.\./gi,
		type: "high" as const,
		category: "placeholder" as const,
		description: "User-facing 'coming soon' message",
		recommendation: "Implement feature or hide from production",
	},
	{
		pattern: /TODO:.*Implement/gi,
		type: "high" as const,
		category: "todo" as const,
		description: "TODO comment for unimplemented functionality",
		recommendation: "Implement or document as future enhancement",
	},
	{
		pattern: /FIXME:.*Memory leak|FIXME:.*Security/gi,
		type: "critical" as const,
		category: "todo" as const,
		description: "Critical FIXME for memory leak or security issue",
		recommendation: "Fix immediately before production deployment",
	},
];

/**
 * Test stub patterns that indicate incomplete testing
 */
const TEST_STUB_PATTERNS = [
	{
		pattern: /expect\(true\)\.toBe\(true\)/gi,
		type: "medium" as const,
		category: "test-stub" as const,
		description: "Placeholder test that always passes",
		recommendation: "Implement meaningful test assertions",
	},
	{
		pattern: /\/\/ Placeholder.*implement actual test/gi,
		type: "medium" as const,
		category: "test-stub" as const,
		description: "Test placeholder comment",
		recommendation: "Implement actual test logic",
	},
];

/**
 * Scan files for production readiness issues
 */
export async function auditProductionReadiness(): Promise<ProductionIssue[]> {
	const issues: ProductionIssue[] = [];

	// Get all TypeScript/JavaScript files
	const files = await glob("**/*.{ts,tsx,js,jsx}", {
		ignore: ["node_modules/**", ".next/**", "coverage/**", "dist/**"],
	});

	for (const file of files) {
		try {
			const content = readFileSync(file, "utf-8");
			const lines = content.split("\n");

			// Check each line against all patterns
			lines.forEach((line, index) => {
				const lineNumber = index + 1;

				// Check critical patterns
				CRITICAL_PATTERNS.forEach((pattern) => {
					if (pattern.pattern.test(line)) {
						issues.push({
							file,
							line: lineNumber,
							type: pattern.type,
							category: pattern.category,
							description: pattern.description,
							code: line.trim(),
							recommendation: pattern.recommendation,
						});
					}
				});

				// Check high-risk patterns
				HIGH_RISK_PATTERNS.forEach((pattern) => {
					if (pattern.pattern.test(line)) {
						issues.push({
							file,
							line: lineNumber,
							type: pattern.type,
							category: pattern.category,
							description: pattern.description,
							code: line.trim(),
							recommendation: pattern.recommendation,
						});
					}
				});

				// Check test stub patterns (only in test files)
				if (file.includes(".test.") || file.includes(".spec.")) {
					TEST_STUB_PATTERNS.forEach((pattern) => {
						if (pattern.pattern.test(line)) {
							issues.push({
								file,
								line: lineNumber,
								type: pattern.type,
								category: pattern.category,
								description: pattern.description,
								code: line.trim(),
								recommendation: pattern.recommendation,
							});
						}
					});
				}
			});
		} catch (error) {
			console.warn(`Could not read file ${file}:`, error);
		}
	}

	return issues;
}

/**
 * Generate production readiness report
 */
export async function generateProductionReadinessReport(): Promise<void> {
	console.log("🔍 Scanning codebase for production readiness issues...");

	const issues = await auditProductionReadiness();

	// Group issues by severity
	const critical = issues.filter((i) => i.type === "critical");
	const high = issues.filter((i) => i.type === "high");
	const medium = issues.filter((i) => i.type === "medium");
	const low = issues.filter((i) => i.type === "low");

	// Generate report
	const report = `# Production Readiness Audit Report

Generated: ${new Date().toISOString()}

## Summary

- 🔴 **Critical Issues**: ${critical.length} (MUST FIX before production)
- 🟠 **High Priority**: ${high.length} (Should fix before production)
- 🟡 **Medium Priority**: ${medium.length} (Fix in next sprint)
- 🟢 **Low Priority**: ${low.length} (Technical debt)

**Total Issues**: ${issues.length}

## 🔴 Critical Issues (Production Blockers)

${critical
	.map(
		(issue) => `
### ${issue.file}:${issue.line}
- **Type**: ${issue.category}
- **Description**: ${issue.description}
- **Code**: \`${issue.code}\`
- **Recommendation**: ${issue.recommendation}
`
	)
	.join("\n")}

## 🟠 High Priority Issues

${high
	.map(
		(issue) => `
### ${issue.file}:${issue.line}
- **Type**: ${issue.category}
- **Description**: ${issue.description}
- **Code**: \`${issue.code}\`
- **Recommendation**: ${issue.recommendation}
`
	)
	.join("\n")}

## 🟡 Medium Priority Issues

${medium
	.map(
		(issue) => `
### ${issue.file}:${issue.line}
- **Type**: ${issue.category}
- **Description**: ${issue.description}
- **Code**: \`${issue.code}\`
- **Recommendation**: ${issue.recommendation}
`
	)
	.join("\n")}

## Action Plan

### Immediate (Before Production)
1. Fix all ${critical.length} critical issues
2. Address ${high.filter((i) => i.category === "placeholder").length} user-facing placeholders
3. Implement ${high.filter((i) => i.category === "unimplemented").length} unimplemented features

### Next Sprint
1. Complete ${medium.filter((i) => i.category === "test-stub").length} test implementations
2. Resolve ${medium.filter((i) => i.category === "todo").length} TODO items

### Technical Debt
1. Address remaining ${low.length} low-priority items
2. Establish process to prevent new stubs in production code

## Files Requiring Immediate Attention

${[...new Set(critical.concat(high).map((i) => i.file))].map((file) => `- ${file}`).join("\n")}
`;

	// Write report
	writeFileSync("PRODUCTION_READINESS_REPORT.md", report);

	console.log(`\n📊 Production Readiness Report generated:`);
	console.log(`🔴 Critical: ${critical.length}`);
	console.log(`🟠 High: ${high.length}`);
	console.log(`🟡 Medium: ${medium.length}`);
	console.log(`🟢 Low: ${low.length}`);
	console.log(`\n📄 Full report saved to: PRODUCTION_READINESS_REPORT.md`);

	// Exit with error code if critical issues found
	if (critical.length > 0) {
		console.error(`\n❌ ${critical.length} critical issues found that will break production!`);
		process.exit(1);
	}
}

// Run audit if called directly
if (require.main === module) {
	generateProductionReadinessReport().catch(console.error);
}
