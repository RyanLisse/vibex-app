/**
 * CoverageVisualizer - Test Coverage Analysis and Visualization
 *
 * Provides comprehensive test coverage analysis with visual reporting
 */

export interface CoverageData {
	files: Record<string, FileCoverage>;
	totals: CoverageTotals;
	timestamp: Date;
	testRun: string;
}

export interface FileCoverage {
	path: string;
	functions: FunctionCoverage;
	statements: StatementCoverage;
	branches: BranchCoverage;
	lines: LineCoverage;
}

export interface FunctionCoverage {
	total: number;
	covered: number;
	percentage: number;
	uncovered: string[];
}

export interface StatementCoverage {
	total: number;
	covered: number;
	percentage: number;
	uncovered: number[];
}

export interface BranchCoverage {
	total: number;
	covered: number;
	percentage: number;
	uncovered: BranchInfo[];
}

export interface LineCoverage {
	total: number;
	covered: number;
	percentage: number;
	uncovered: number[];
}

export interface BranchInfo {
	line: number;
	branch: number;
	condition: string;
}

export interface CoverageTotals {
	functions: number;
	statements: number;
	branches: number;
	lines: number;
}

export interface CoverageReport {
	summary: CoverageSummary;
	details: CoverageDetails[];
	recommendations: string[];
	trends: CoverageTrend[];
}

export interface CoverageSummary {
	overall: number;
	functions: number;
	statements: number;
	branches: number;
	lines: number;
	filesAnalyzed: number;
	testFiles: number;
}

export interface CoverageDetails {
	file: string;
	coverage: FileCoverage;
	priority: "high" | "medium" | "low";
	suggestions: string[];
}

export interface CoverageTrend {
	date: Date;
	coverage: CoverageTotals;
	testCount: number;
}

export class CoverageVisualizer {
	private coverageHistory: CoverageData[] = [];
	private thresholds = {
		functions: 80,
		statements: 80,
		branches: 70,
		lines: 80,
	};

	/**
	 * Analyze coverage data and generate comprehensive report
	 */
	async analyzeCoverage(coverageData: CoverageData): Promise<CoverageReport> {
		this.coverageHistory.push(coverageData);

		const summary = this.calculateSummary(coverageData);
		const details = this.analyzeFileDetails(coverageData);
		const recommendations = this.generateRecommendations(coverageData);
		const trends = this.calculateTrends();

		return {
			summary,
			details,
			recommendations,
			trends,
		};
	}

	/**
	 * Generate HTML coverage report
	 */
	generateHtmlReport(report: CoverageReport): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .coverage-bar { height: 20px; background: #ddd; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; transition: width 0.3s ease; }
        .high { background: #4caf50; }
        .medium { background: #ff9800; }
        .low { background: #f44336; }
        .file-details { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .recommendations { background: #e3f2fd; padding: 15px; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>Test Coverage Report</h1>
    
    <div class="summary">
        <h2>Coverage Summary</h2>
        <p>Overall Coverage: ${report.summary.overall.toFixed(1)}%</p>
        <div class="coverage-bar">
            <div class="coverage-fill ${this.getCoverageClass(report.summary.overall)}" 
                 style="width: ${report.summary.overall}%"></div>
        </div>
        
        <h3>Breakdown</h3>
        <ul>
            <li>Functions: ${report.summary.functions.toFixed(1)}%</li>
            <li>Statements: ${report.summary.statements.toFixed(1)}%</li>
            <li>Branches: ${report.summary.branches.toFixed(1)}%</li>
            <li>Lines: ${report.summary.lines.toFixed(1)}%</li>
        </ul>
        
        <p>Files Analyzed: ${report.summary.filesAnalyzed}</p>
        <p>Test Files: ${report.summary.testFiles}</p>
    </div>

    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
        </ul>
    </div>

    <h2>File Details</h2>
    ${report.details.map((detail) => this.generateFileDetailHtml(detail)).join("")}
</body>
</html>`;
	}

	/**
	 * Generate coverage badge SVG
	 */
	generateCoverageBadge(percentage: number): string {
		const color = this.getCoverageColor(percentage);
		const text = `${percentage.toFixed(1)}%`;

		return `
<svg xmlns="http://www.w3.org/2000/svg" width="104" height="20">
    <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
        <rect width="104" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
        <path fill="#555" d="M0 0h63v20H0z"/>
        <path fill="${color}" d="M63 0h41v20H63z"/>
        <path fill="url(#b)" d="M0 0h104v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="31.5" y="15" fill="#010101" fill-opacity=".3">coverage</text>
        <text x="31.5" y="14">coverage</text>
        <text x="82.5" y="15" fill="#010101" fill-opacity=".3">${text}</text>
        <text x="82.5" y="14">${text}</text>
    </g>
</svg>`;
	}

	/**
	 * Export coverage data to JSON
	 */
	exportToJson(report: CoverageReport): string {
		return JSON.stringify(report, null, 2);
	}

	/**
	 * Set coverage thresholds
	 */
	setThresholds(thresholds: Partial<typeof this.thresholds>): void {
		this.thresholds = { ...this.thresholds, ...thresholds };
	}

	private calculateSummary(data: CoverageData): CoverageSummary {
		const files = Object.values(data.files);
		const totals = files.reduce(
			(acc, file) => ({
				functions: acc.functions + file.functions.percentage,
				statements: acc.statements + file.statements.percentage,
				branches: acc.branches + file.branches.percentage,
				lines: acc.lines + file.lines.percentage,
			}),
			{ functions: 0, statements: 0, branches: 0, lines: 0 }
		);

		const fileCount = files.length;
		const testFiles = files.filter((f) => f.path.includes(".test.")).length;

		return {
			overall:
				(totals.functions + totals.statements + totals.branches + totals.lines) / (4 * fileCount),
			functions: totals.functions / fileCount,
			statements: totals.statements / fileCount,
			branches: totals.branches / fileCount,
			lines: totals.lines / fileCount,
			filesAnalyzed: fileCount,
			testFiles,
		};
	}

	private analyzeFileDetails(data: CoverageData): CoverageDetails[] {
		return Object.values(data.files).map((file) => ({
			file: file.path,
			coverage: file,
			priority: this.calculatePriority(file),
			suggestions: this.generateFileSuggestions(file),
		}));
	}

	private calculatePriority(file: FileCoverage): "high" | "medium" | "low" {
		const avgCoverage =
			(file.functions.percentage +
				file.statements.percentage +
				file.branches.percentage +
				file.lines.percentage) /
			4;

		if (avgCoverage < 50) return "high";
		if (avgCoverage < 75) return "medium";
		return "low";
	}

	private generateFileSuggestions(file: FileCoverage): string[] {
		const suggestions: string[] = [];

		if (file.functions.percentage < this.thresholds.functions) {
			suggestions.push(`Add tests for ${file.functions.uncovered.length} uncovered functions`);
		}

		if (file.branches.percentage < this.thresholds.branches) {
			suggestions.push(`Add tests for ${file.branches.uncovered.length} uncovered branches`);
		}

		if (file.statements.percentage < this.thresholds.statements) {
			suggestions.push(
				`Improve statement coverage by ${this.thresholds.statements - file.statements.percentage}%`
			);
		}

		return suggestions;
	}

	private generateRecommendations(data: CoverageData): string[] {
		const recommendations: string[] = [];
		const summary = this.calculateSummary(data);

		if (summary.overall < 80) {
			recommendations.push(
				"Overall coverage is below 80%. Focus on adding more comprehensive tests."
			);
		}

		if (summary.branches < 70) {
			recommendations.push(
				"Branch coverage is low. Add tests for conditional logic and error paths."
			);
		}

		const lowCoverageFiles = Object.values(data.files)
			.filter((f) => (f.functions.percentage + f.statements.percentage) / 2 < 60)
			.slice(0, 5);

		if (lowCoverageFiles.length > 0) {
			recommendations.push(
				`Priority files needing tests: ${lowCoverageFiles.map((f) => f.path).join(", ")}`
			);
		}

		return recommendations;
	}

	private calculateTrends(): CoverageTrend[] {
		return this.coverageHistory.slice(-10).map((data) => ({
			date: data.timestamp,
			coverage: data.totals,
			testCount: Object.keys(data.files).length,
		}));
	}

	private getCoverageClass(percentage: number): string {
		if (percentage >= 80) return "high";
		if (percentage >= 60) return "medium";
		return "low";
	}

	private getCoverageColor(percentage: number): string {
		if (percentage >= 80) return "#4caf50";
		if (percentage >= 60) return "#ff9800";
		return "#f44336";
	}

	private generateFileDetailHtml(detail: CoverageDetails): string {
		return `
<div class="file-details">
    <h3>${detail.file} <span class="priority ${detail.priority}">[${detail.priority} priority]</span></h3>
    <p>Functions: ${detail.coverage.functions.percentage.toFixed(1)}%</p>
    <p>Statements: ${detail.coverage.statements.percentage.toFixed(1)}%</p>
    <p>Branches: ${detail.coverage.branches.percentage.toFixed(1)}%</p>
    <p>Lines: ${detail.coverage.lines.percentage.toFixed(1)}%</p>
    
    ${
			detail.suggestions.length > 0
				? `
    <h4>Suggestions:</h4>
    <ul>
        ${detail.suggestions.map((s) => `<li>${s}</li>`).join("")}
    </ul>
    `
				: ""
		}
</div>`;
	}
}
